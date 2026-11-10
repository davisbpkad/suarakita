/**
 * Netlify Function: keluar — hapus cookie sesi.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { jsonResponse, corsHeaders, allowedOrigin, clearedCookie } = require('./_auth.js');

export default async (request) => {
  const headers = corsHeaders(request, 'POST, OPTIONS');
  if (!allowedOrigin(request)) return jsonResponse({ error: 'Origin tidak diizinkan.' }, 403, headers);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, 405, headers);
  return jsonResponse({ ok: true }, 200, { ...headers, 'Set-Cookie': clearedCookie() });
};
