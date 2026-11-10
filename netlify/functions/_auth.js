/**
 * Guard sesi akun untuk Netlify Functions (API modern: Request/Response).
 */
const { verifySession } = require('../../lib/auth.js');
const { createAccounts, blobsStore } = require('../../lib/accounts.js');

const SESSION_COOKIE = 'sk_sess';
const ADMIN_TTL_MS = 2 * 60 * 60 * 1000;

const sessionSecret = () => process.env.SESSION_SECRET || '';

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}

/** Event-like object supaya helper CORS lama tetap dipakai apa adanya. */
const eventLike = request => ({ headers: Object.fromEntries(request.headers) });

function corsHeaders(request, methods) {
  const { buildCorsHeaders } = require('./_cors.js');
  return buildCorsHeaders(eventLike(request), methods);
}

function allowedOrigin(request) {
  const { isAllowedOrigin } = require('./_cors.js');
  return isAllowedOrigin(eventLike(request));
}

/** Body JSON; mengembalikan null bila bukan JSON objek. */
async function readJson(request) {
  try {
    const data = await request.json();
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

function readCookie(header, name) {
  if (typeof header !== 'string') return '';
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return '';
}

function sessionOf(request) {
  return verifySession(sessionSecret(), readCookie(request.headers.get('cookie'), SESSION_COOKIE));
}

function requireUser(request) {
  if (!sessionSecret()) return jsonResponse({ error: 'SESSION_SECRET belum diatur di environment Netlify.' }, 503, corsHeaders(request, 'POST, OPTIONS'));
  if (!sessionOf(request)) return jsonResponse({ error: 'Perlu masuk.' }, 401, corsHeaders(request, 'POST, OPTIONS'));
  return null;
}

function requireAdmin(request) {
  const blocked = requireUser(request);
  if (blocked) return blocked;
  if (sessionOf(request).role !== 'admin') return jsonResponse({ error: 'Hanya admin.' }, 403, corsHeaders(request, 'POST, OPTIONS'));
  return null;
}

function accounts() {
  return createAccounts(blobsStore());
}

/** Pengujian memakai store in-memory; produksi tetap Netlify Blobs. */
let accountsFactory = null;
function setAccountsFactory(factory) {
  accountsFactory = factory;
}

function adminEnvPassword() {
  const password = process.env.ADMIN_PASSWORD || '';
  return password.length >= 12 ? password : '';
}

function sessionCookie(token, ttl = ADMIN_TTL_MS) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.floor(ttl / 1000)}`;
}

const clearedCookie = () => `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

module.exports = {
  jsonResponse, corsHeaders, allowedOrigin, readJson, eventLike, readCookie, sessionOf, requireUser, requireAdmin,
  accounts: () => (accountsFactory ? accountsFactory() : accounts()),
  setAccountsFactory, adminEnvPassword, sessionCookie, clearedCookie, SESSION_COOKIE, ADMIN_TTL_MS,
};
