const https = require('https');
const { postSse } = require('./httpSse.js');

/**
 * Client untuk API yang mengikuti bentuk OpenAI /chat/completions.
 * Dipakai Groq, Cerebras, dan OpenRouter.
 *
 * Kontraknya sama dengan GeminiClient (lihat lib/geminiClient.js).
 */
class OpenAiCompatibleClient {
  constructor(apiKey, { baseUrl, timeout = 20000, extraHeaders = {} } = {}) {
    this.apiKey = (apiKey || '').trim();
    this.baseUrl = (baseUrl || '').replace(/\/$/, '');
    this.timeout = timeout;
    this.extraHeaders = extraHeaders;
  }

  get enabled() {
    return Boolean(this.apiKey);
  }

  _headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      ...this.extraHeaders,
    };
  }

  _payload(model, prompt, stream) {
    return JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      ...(stream ? { stream: true } : {}),
    });
  }

  generateContent(modelName, prompt) {
    return new Promise((resolve, reject) => {
      const payload = this._payload(modelName, prompt, false);
      const req = https.request(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...this._headers(),
        },
        timeout: this.timeout,
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
            const text = JSON.parse(data).choices?.[0]?.message?.content;
            if (!text) return reject(new Error('Empty content'));
            resolve(text);
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });

      req.write(payload);
      req.end();
    });
  }

  async generateWithFallback(candidateModels, prompt, isUsable) {
    for (const model of [...new Set(candidateModels.filter(Boolean))]) {
      try {
        const text = await this.generateContent(model, prompt);
        if (!isUsable || isUsable(text)) return { result: text, model };
      } catch (e) {
        // lanjut ke model berikutnya
      }
    }
    return null;
  }

  streamContent(modelName, prompt, onDelta) {
    let text = '';
    return postSse(`${this.baseUrl}/chat/completions`, {
      body: this._payload(modelName, prompt, true),
      timeout: this.timeout,
      headers: this._headers(),
    }, (event) => {
      const delta = event.choices?.[0]?.delta?.content;
      if (delta) {
        text += delta;
        onDelta(delta);
      }
    }).then(() => text);
  }

  async streamWithFallback(candidateModels, prompt, onDelta) {
    const models = [...new Set(candidateModels.filter(Boolean))];
    for (const model of models) {
      let sent = false;
      try {
        const text = await this.streamContent(model, prompt, (delta) => {
          sent = true;
          onDelta(delta);
        });
        if (text) return { text, model };
      } catch (e) {
        if (sent) throw e;
      }
    }
    return null;
  }
}

module.exports = { OpenAiCompatibleClient };
