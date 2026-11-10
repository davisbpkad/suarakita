/** Do not include provider bodies: they can echo credentials or meeting content. */
const { readQuota } = require('./providerQuota.js');

function providerError(status, headers = {}) {
  const error = new Error(`Provider HTTP ${status}`);
  error.status = status;
  error.quota = readQuota(headers);
  const retry = headers['retry-after'];
  if (typeof retry === 'string' && retry.length <= 128) error.retryAfter = retry;
  return error;
}

module.exports = { providerError };
