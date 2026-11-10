/**
 * Netlify Function: masuk dengan akun (username + password).
 * Admin memakai `ADMIN_PASSWORD` dari environment sebagai jalur darurat
 * bila password admin yang tersimpan di dashboard lupa.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { issueSession, verifyPassword } = require('../../lib/auth.js');
const { jsonResponse, corsHeaders, allowedOrigin, readJson, accounts, adminEnvPassword, sessionCookie } = require('./_auth.js');

const USER_TTL_MS = 12 * 60 * 60 * 1000;
const ADMIN_TTL_MS = 2 * 60 * 60 * 1000;

export default async (request) => {
  const headers = corsHeaders(request, 'POST, OPTIONS');
  if (!allowedOrigin(request)) return jsonResponse({ error: 'Origin tidak diizinkan.' }, 403, headers);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, 405, headers);
  if (!process.env.SESSION_SECRET) return jsonResponse({ error: 'SESSION_SECRET belum diatur di environment Netlify.' }, 503, headers);

  const body = await readJson(request);
  if (!body) return jsonResponse({ error: 'JSON tidak valid.' }, 400, headers);

  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = body.password;
  if (!username || !password) return jsonResponse({ error: 'Username dan password wajib diisi.' }, 400, headers);
  if (username.length > 32 || typeof password !== 'string' || password.length > 200) {
    return jsonResponse({ error: 'Input tidak valid.' }, 400, headers);
  }

  const store = accounts();
  if (await store.loginBlocked(username)) {
    return jsonResponse({ error: 'Terlalu banyak percobaan. Tunggu 15 menit.' }, 429, headers);
  }

  let identity = null;
  if (username === 'admin') {
    const emergency = adminEnvPassword();
    if (emergency && verifyPassword(emergency, password)) identity = { username: 'admin', role: 'admin' };
  }
  if (!identity) identity = await store.authenticate(username, password);

  if (!identity) {
    await store.registerLoginFailure(username);
    return jsonResponse({ error: 'Username atau password salah.' }, 401, headers);
  }
  await store.clearLoginFailures(username);
  await store.audit(identity.username, 'login', identity.username);

  const ttl = identity.role === 'admin' ? ADMIN_TTL_MS : USER_TTL_MS;
  const token = issueSession(process.env.SESSION_SECRET, { username: identity.username, role: identity.role }, Date.now(), ttl);
  return jsonResponse(
    { ok: true, username: identity.username, role: identity.role },
    200,
    { ...headers, 'Set-Cookie': sessionCookie(token, ttl) },
  );
};
