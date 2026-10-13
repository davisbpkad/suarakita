/**
 * GeminiClient - satu-satunya jalur HTTP ke Gemini API.
 *
 * Sebelumnya corrector.js dan meetingNotes.js masing-masing menyalin blok
 * https.request yang sama. Sekarang keduanya memakai kelas ini.
 *
 * ponytail: fallback model tetap sequential supaya tidak membakar kuota saat
 * model pertama gagal. Naikkan ke paralel kalau kuota longgar.
 */
const https = require('https');

const DEFAULT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
];

class GeminiClient {
  constructor(apiKey, { timeout = 15000 } = {}) {
    this.apiKey = (apiKey || '').trim();
    this.timeout = timeout;
  }

  get enabled() {
    return Boolean(this.apiKey);
  }

  /** Satu panggilan generateContent. Resolve ke JSON hasil parsing. */
  generateContent(modelName, prompt) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
      });
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

      const req = https.request(url, {
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
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            const rawJson = JSON.parse(data).candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawJson) return reject(new Error('Empty content'));
            resolve(JSON.parse(rawJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()));
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

  /**
   * Coba tiap model berurutan, kembalikan hasil pertama yang lolos `isUsable`.
   * @returns {Promise<{result: object, model: string}|null>}
   */
  async generateWithFallback(candidateModels, prompt, isUsable) {
    for (const model of [...new Set(candidateModels.filter(Boolean))]) {
      try {
        const result = await this.generateContent(model, prompt);
        if (isUsable(result)) return { result, model };
      } catch (e) {
        // lanjut ke model berikutnya
      }
    }
    return null;
  }
}

module.exports = { GeminiClient, DEFAULT_MODELS };
