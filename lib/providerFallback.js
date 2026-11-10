const { modelChainFor } = require('./providers.js');
const { readQuota } = require('./providerQuota.js');

function checkAbort(signal) {
  if (signal?.aborted) {
    const error = new Error('Permintaan dibatalkan.');
    error.name = 'AbortError';
    throw error;
  }
}

/** Only allowlisted metadata leaves the orchestrator; never include credentials/errors. */
async function runProviderFallback(options = {}, attempt, local) {
  const candidates = [];
  if (typeof options.geminiKey === 'string' && options.geminiKey.trim()) candidates.push({ provider: 'gemini', apiKey: options.geminiKey.trim(), model: modelChainFor('gemini', options.geminiModel)[0] });
  if (options.allowGroq === true && typeof options.groqKey === 'string' && options.groqKey.trim()) candidates.push({ provider: 'groq', apiKey: options.groqKey.trim(), model: modelChainFor('groq', options.groqModel)[0] });
  const attempts = [];
  for (const candidate of candidates) {
    checkAbort(options.signal);
    try {
      const result = await attempt({ ...candidate, signal: options.signal });
      checkAbort(options.signal);
      if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Respons AI tidak valid.');
      attempts.push({ provider: candidate.provider, outcome: 'success' });
      return { ...result, engine: candidate.provider, modelUsed: candidate.model, attempts };
    } catch (error) {
      checkAbort(options.signal);
      if (error.name === 'AbortError' || error.status === 400 || error.status === 413) throw error;
      const reason = error.status === 429 ? 'rate_limited' : [401, 403].includes(error.status) ? 'access_denied' : 'unavailable';
      const entry = { provider: candidate.provider, outcome: reason };
      if (candidate.provider === 'groq' && error.quota) {
        // Revalidate even error metadata rather than forwarding arbitrary fields.
        const q = error.quota;
        entry.quota = readQuota({
          'x-ratelimit-remaining-requests': q.remainingRequests === undefined ? undefined : String(q.remainingRequests),
          'x-ratelimit-remaining-tokens': q.remainingTokens === undefined ? undefined : String(q.remainingTokens),
          'x-ratelimit-reset-requests': q.resetRequests,
          'x-ratelimit-reset-tokens': q.resetTokens,
          'retry-after': q.retryAfter,
        });
      }
      attempts.push(entry);
    }
  }
  checkAbort(options.signal);
  return { ...await local(), engine: 'local', attempts };
}

module.exports = { runProviderFallback };
