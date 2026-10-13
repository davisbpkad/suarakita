/**
 * Daftar provider LLM. Datanya ada di lib/providers.json supaya dipakai bersama
 * oleh server (require) dan frontend (import JSON) tanpa duplikasi.
 *
 * Dua bentuk request:
 *   kind 'gemini'  -> POST {base}/models/{model}:generateContent
 *   kind 'openai'  -> POST {base}/chat/completions   (Groq, Cerebras, OpenRouter)
 *
 * ponytail: daftar model cepat basi (gemini-2.0-* sudah shutdown, 1.5 hilang).
 * Urutan model = urutan percobaan. Kalau semua gagal, aplikasi jatuh ke NLP lokal.
 */
const PROVIDERS = require('./providers.json');

const DEFAULT_PROVIDER = 'gemini';

function getProvider(id) {
  return PROVIDERS[id] || PROVIDERS[DEFAULT_PROVIDER];
}

/** Daftar model untuk provider, model pilihan pengguna ditaruh paling depan. */
function modelChainFor(providerId, preferredModel) {
  const models = getProvider(providerId).models.map((m) => m.id);
  return [...new Set([preferredModel, ...models].filter(Boolean))];
}

module.exports = { PROVIDERS, DEFAULT_PROVIDER, getProvider, modelChainFor };
