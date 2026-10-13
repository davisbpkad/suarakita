const https = require('https');
const { postSse } = require('./httpSse.js');

/**
 * Client untuk Gemini API (generateContent + streaming).
 *
 * Kontrak yang sama dipakai OpenAiCompatibleClient:
 *   generateWithFallback(models, prompt, isUsable) -> {result, model} | null
 *   streamWithFallback(models, prompt, onDelta)    -> {text, model} | null
 */
class GeminiClient {
  constructor(apiKey, { baseUrl = 'https://generativelanguage.googleapis.com/v1beta', timeout = 20000 } = {}) {
    this.apiKey = (apiKey || '').trim();
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  get enabled() {
    return Boolean(this.apiKey);
  }

  _url(model, { stream = false } = {}) {
    const method = stream ? 'streamGenerateContent' : 'generateContent';
    const suffix = stream ? '&alt=sse' : '';
    return `${this.baseUrl}/models/${model}:${method}?key=${encodeURIComponent(this.apiKey)}${suffix}`;
  }

  _payload(prompt) {
    return JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 },
    });
  }

  /** Satu panggilan generateContent. Resolve ke teks jawaban model. */
  generateContent(modelName, prompt) {
    return new Promise((resolve, reject) => {
      const payload = this._payload(prompt);
      const req = https.request(this._url(modelName), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: this.timeout,
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
            const text = JSON.parse(data).candidates?.[0]?.content?.parts?.[0]?.text;
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

  /** Coba tiap model berurutan, kembalikan hasil pertama yang lolos `isUsable`. */
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

  /**
   * Streaming satu model. `onDelta` dipanggil tiap potongan teks.
   * Tidak ada fallback di tengah stream: begitu ada teks terkirim ke klien,
   * mencoba model lain hanya akan menggandakan output.
   */
  streamContent(modelName, prompt, onDelta) {
    let text = '';
    return postSse(this._url(modelName, { stream: true }), {
      body: this._payload(prompt),
      timeout: this.timeout,
    }, (event) => {
      const delta = event.candidates?.[0]?.content?.parts?.[0]?.text;
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
        if (sent) throw e; // sudah ada output terkirim; jangan ulang
      }
    }
    return null;
  }
}

module.exports = { GeminiClient };
