const crypto = require('node:crypto');

const TTL_MS = 12 * 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 12;

function sign(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function issueToken(secret, now = Date.now()) {
  const exp = String(now + TTL_MS);
  return `${exp}.${sign(secret, exp)}`;
}

function verifyToken(secret, token, now = Date.now()) {
  if (typeof secret !== 'string' || !secret) return false;
  if (typeof token !== 'string' || token.length > 200) return false;
  const [exp, mac] = token.split('.');
  if (!/^\d{1,16}$/.test(exp || '') || !mac) return false;
  if (Number(exp) < now) return false;
  const expected = sign(secret, exp);
  return mac.length === expected.length && crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected));
}

/** Panjang minimum mencegah password bersama yang mudah ditebak. */
function passwordUsable(password) {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH && password.length <= 200;
}

function verifyPassword(expected, given) {
  if (!passwordUsable(expected) || typeof given !== 'string' || given.length > 200) return false;
  const a = crypto.createHash('sha256').update(expected).digest();
  const b = crypto.createHash('sha256').update(given).digest();
  return crypto.timingSafeEqual(a, b) && given.length === expected.length;
}

module.exports = { issueToken, verifyToken, verifyPassword, passwordUsable, TTL_MS, MIN_PASSWORD_LENGTH };
