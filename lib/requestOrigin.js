/** Origin checks reduce browser cross-site abuse; they are not authentication. */
function validOrigin(origin, expected) {
  if (!origin) return true; // Non-browser clients still use their own credentials.
  if (typeof origin !== 'string') return false;
  try {
    const url = new URL(origin);
    return ['http:', 'https:'].includes(url.protocol) && url.origin === origin && origin === expected;
  } catch {
    return false;
  }
}

module.exports = { validOrigin };
