/** Allowlist rate-limit headers; never forward arbitrary response headers. */
function readQuota(headers = {}) {
  const quota = {};
  for (const [header, field] of [['x-ratelimit-limit-requests', 'limitRequests'], ['x-ratelimit-limit-tokens', 'limitTokens'], ['x-ratelimit-remaining-requests', 'remainingRequests'], ['x-ratelimit-remaining-tokens', 'remainingTokens']]) {
    const value = headers[header];
    if (typeof value === 'string' && /^\d+$/.test(value) && Number.isSafeInteger(Number(value))) quota[field] = Number(value);
  }
  for (const [header, field] of [['x-ratelimit-reset-requests', 'resetRequests'], ['x-ratelimit-reset-tokens', 'resetTokens'], ['retry-after', 'retryAfter']]) {
    const value = headers[header];
    if (typeof value === 'string' && value.length > 0 && value.length <= 128 && /^[\w\s.,:+-]+$/.test(value)) quota[field] = value;
  }
  if (Object.keys(quota).length) quota.observedAt = Date.now();
  return quota;
}

module.exports = { readQuota };
