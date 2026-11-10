/**
 * Daftar provider LLM. Datanya ada di lib/providers.json supaya dipakai bersama
 * oleh server (require) dan frontend (import JSON) tanpa duplikasi.
 *
 * Dua bentuk request:
 *   kind 'gemini'  -> POST {base}/models/{model}:generateContent
 *   kind 'openai'  -> POST {base}/chat/completions   (Groq, Cerebras, OpenRouter)
 *
 * ponytail: daftar model cepat basi (gemini-2.0-* sudah shutdown, 1.5 hilang).
 * Model harus diverifikasi terhadap dokumentasi provider sebelum rilis.
 */
const PROVIDERS = require('./providers.json');

const DEFAULT_PROVIDER = 'gemini';

function getProvider(id) {
  return PROVIDERS[id] || PROVIDERS[DEFAULT_PROVIDER];
}

/** Satu model per provider agar satu tindakan tidak menghabiskan rantai kuota. */
function modelChainFor(providerId, preferredModel) {
  const id = providerId === undefined ? DEFAULT_PROVIDER : providerId;
  if (!Object.hasOwn(PROVIDERS, id)) throw new Error('Provider tidak dikenal.');
  const models = PROVIDERS[id].models;
  const selected = preferredModel === undefined ? models[0].id : preferredModel;
  if (!models.some(model => model.id === selected)) throw new Error('Model tidak dikenal untuk provider ini.');
  return [selected];
}

module.exports = { PROVIDERS, DEFAULT_PROVIDER, getProvider, modelChainFor };
