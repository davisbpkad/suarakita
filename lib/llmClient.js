const { GeminiClient } = require('./geminiClient.js');
const { OpenAiCompatibleClient } = require('./openAiCompatibleClient.js');
const { getProvider, modelChainFor } = require('./providers.js');

/**
 * Buat client LLM sesuai provider.
 * @returns {GeminiClient|OpenAiCompatibleClient|null} null kalau API key kosong,
 *          supaya pemanggil bisa langsung jatuh ke mesin NLP lokal.
 */
function createClient({ provider, apiKey, timeout } = {}) {
  if (!apiKey || !apiKey.trim()) return null;
  const preset = getProvider(provider);
  if (preset.kind === 'gemini') {
    return new GeminiClient(apiKey, { baseUrl: preset.baseUrl, timeout });
  }
  return new OpenAiCompatibleClient(apiKey, { baseUrl: preset.baseUrl, timeout });
}

module.exports = { createClient, modelChainFor, getProvider };
