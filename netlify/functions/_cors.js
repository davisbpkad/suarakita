/**
 * Header CORS untuk Netlify Functions — hanya mengizinkan origin sendiri.
 *
 * PENTING: ini BUKAN pertahanan utama. CORS hanya menghalangi origin lain
 * MEMBACA respons; request-nya tetap sampai dan tetap diproses server.
 * Karena itu fungsi-fungsi di folder ini sengaja TIDAK memakai API key milik
 * server untuk pemanggil anonim — setiap pemanggil wajib membawa key sendiri.
 * Dengan begitu tidak ada kuota server yang bisa dihabiskan pihak lain.
 */

function headerValue(headers, name) {
  return headers?.[name] || headers?.[name.toLowerCase()] || headers?.[name.toUpperCase()] || '';
}

function buildCorsHeaders(event, methods) {
  const origin = headerValue(event.headers, 'Origin');
  const host = headerValue(event.headers, 'Host');

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': methods,
    Vary: 'Origin',
  };

  // Hanya pantulkan origin kalau host-nya sama dengan host situs ini.
  try {
    if (origin && host && new URL(origin).host === host) {
      headers['Access-Control-Allow-Origin'] = origin;
    }
  } catch (e) {
    // Origin tidak bisa diparse -> biarkan tanpa header CORS
  }

  return headers;
}

module.exports = { buildCorsHeaders };
