/**
 * Header CORS untuk Netlify Functions — hanya mengizinkan origin sendiri.
 *
 * PENTING: ini BUKAN pertahanan utama. CORS hanya menghalangi origin lain
 * MEMBACA respons; request-nya tetap sampai dan tetap diproses server.
 * Karena itu fungsi-fungsi di folder ini sengaja TIDAK memakai API key milik
 * server untuk pemanggil anonim — setiap pemanggil wajib membawa key sendiri.
 * Dengan begitu tidak ada kuota server yang bisa dihabiskan pihak lain.
 */

const { validOrigin } = require('../../lib/requestOrigin.js');

function headerValue(headers, name) {
  const key = Object.keys(headers || {}).find(key => key.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : '';
}

function isAllowedOrigin(event) {
  const host = headerValue(event.headers, 'Host');
  // Netlify public functions are served over HTTPS; do not trust forwarded protocol.
  return validOrigin(headerValue(event.headers, 'Origin'), `https://${host}`);
}

function buildCorsHeaders(event, methods) {
  const origin = headerValue(event.headers, 'Origin');
  const host = headerValue(event.headers, 'Host');

  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
    'Access-Control-Allow-Methods': methods,
    Vary: 'Origin',
  };

  // Hanya pantulkan origin kalau host-nya sama dengan host situs ini.
  try {
    if (origin && isAllowedOrigin(event)) {
      headers['Access-Control-Allow-Origin'] = origin;
    }
  } catch (e) {
    // Origin tidak bisa diparse -> biarkan tanpa header CORS
  }

  return headers;
}

module.exports = { buildCorsHeaders, headerValue, isAllowedOrigin };
