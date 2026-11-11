const { PROVIDERS } = require('./providers.js');
const MAX_TEXT_LENGTH = 50000;

function validateRequest(data, { maxChars = MAX_TEXT_LENGTH } = {}) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { status: 400, error: 'Body harus berupa objek JSON.' };
  if (typeof data.text !== 'string' || !data.text.trim()) return { status: 400, error: 'Teks transkrip tidak boleh kosong dan harus berupa string.' };
  if (data.text.length > maxChars) return { status: 413, error: `Maaf, maksimal input ${maxChars.toLocaleString('id-ID')} karakter.` };
  const provider = data.provider === undefined ? 'gemini' : data.provider;
  if (typeof provider !== 'string' || !Object.hasOwn(PROVIDERS, provider)) return { status: 400, error: 'Provider tidak dikenal.' };
  if (data.model !== undefined && !PROVIDERS[provider].models.some(m => m.id === data.model)) return { status: 400, error: 'Model tidak dikenal untuk provider ini.' };
  if (data.stream !== undefined && typeof data.stream !== 'boolean') return { status: 400, error: 'stream harus berupa boolean.' };
  if (data.ai !== undefined) {
    const ai = data.ai;
    if (!ai || typeof ai !== 'object' || Array.isArray(ai)) return { status: 400, error: 'Konfigurasi AI tidak valid.' };
    for (const field of ['geminiKey', 'groqKey']) {
      if (ai[field] !== undefined && (typeof ai[field] !== 'string' || ai[field].length > 512 || /[\r\n]/.test(ai[field]))) return { status: 400, error: 'Key AI tidak valid.' };
    }
    if (ai.allowGroq !== undefined && typeof ai.allowGroq !== 'boolean') return { status: 400, error: 'Izin Groq harus berupa boolean.' };
    for (const id of ['gemini', 'groq']) {
      if (ai[`${id}Model`] !== undefined && !PROVIDERS[id].models.some(m => m.id === ai[`${id}Model`])) return { status: 400, error: 'Model AI tidak dikenal.' };
    }
  }
  return null;
}

module.exports = { validateRequest, MAX_TEXT_LENGTH };
