/**
 * Netlify Function: dashboard admin — kelola user, kuota, dan rotasi password admin.
 * Semua aksi butuh sesi role admin.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { passwordUsable, verifyPassword: comparePlain } = require('../../lib/auth.js');
const { generatePassword, hashPassword, verifyPassword: verifyEntry } = require('../../lib/accounts.js');
const { jsonResponse, corsHeaders, allowedOrigin, readJson, requireAdmin, sessionOf, adminEnvPassword, accounts } = require('./_auth.js');

export default async (request) => {
  const headers = corsHeaders(request, 'POST, GET, OPTIONS');
  if (!allowedOrigin(request)) return jsonResponse({ error: 'Origin tidak diizinkan.' }, 403, headers);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (!['GET', 'POST'].includes(request.method)) return jsonResponse({ error: 'Method Not Allowed' }, 405, headers);

  const blocked = requireAdmin(request);
  if (blocked) return blocked;
  const actor = sessionOf(request).username;
  const store = accounts();

  try {
    if (request.method === 'GET') {
      const users = await store.listUsers();
      if (!users.some(user => user.username === 'admin')) {
        users.unshift({ username: 'admin', role: 'admin', active: true, quotaPerDay: null, source: 'env' });
      }
      const usage = await store.usageToday();
      const audit = await store.auditLog(30);
      return jsonResponse({ users, usage, audit }, 200, headers);
    }

    const body = await readJson(request);
    if (!body) return jsonResponse({ error: 'JSON tidak valid.' }, 400, headers);
    const action = body.action;
    const target = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';

    if (action === 'create') {
      const password = generatePassword();
      const user = await store.createUser({ username: target, password, quotaPerDay: body.quotaPerDay });
      await store.audit(actor, 'create-user', user.username);
      return jsonResponse({ user: { username: user.username, quotaPerDay: user.quotaPerDay }, password }, 201, headers);
    }

    if (action === 'reset') {
      if (target === 'admin') return jsonResponse({ error: 'Pakai rotasi password admin.' }, 400, headers);
      const password = generatePassword();
      await store.setPassword(target, password);
      await store.audit(actor, 'reset-password', target);
      return jsonResponse({ password }, 200, headers);
    }

    if (action === 'activate' || action === 'deactivate') {
      if (target === 'admin') return jsonResponse({ error: 'Akun admin tidak bisa dinonaktifkan.' }, 400, headers);
      await store.setActive(target, action === 'activate');
      await store.audit(actor, action, target);
      return jsonResponse({ ok: true }, 200, headers);
    }

    if (action === 'delete') {
      await store.removeUser(target);
      await store.audit(actor, 'delete-user', target);
      return jsonResponse({ ok: true }, 200, headers);
    }

    if (action === 'rotate-admin') {
      const current = body.currentPassword;
      const next = body.newPassword;
      if (!passwordUsable(next, 20)) return jsonResponse({ error: 'Password admin baru minimal 20 karakter.' }, 400, headers);
      const stored = await store.getUser('admin');
      const envPassword = adminEnvPassword();
      const currentOk = (stored && verifyEntry(stored, current)) || (envPassword && comparePlain(envPassword, current));
      if (!currentOk) return jsonResponse({ error: 'Password admin saat ini salah.' }, 401, headers);
      const { salt, hash } = hashPassword(next);
      const existing = stored || { username: 'admin', role: 'admin', active: true, quotaPerDay: null, createdAt: new Date().toISOString(), lastLogin: null };
      await store.putUser({ ...existing, salt, hash });
      await store.audit(actor, 'rotate-admin', 'admin');
      return jsonResponse(
        { ok: true, note: 'Password admin baru tersimpan. Ganti juga ADMIN_PASSWORD di environment Netlify bila ingin jalur darurat tetap ada.' },
        200,
        headers,
      );
    }

    return jsonResponse({ error: 'Aksi tidak dikenal.' }, 400, headers);
  } catch (err) {
    return jsonResponse({ error: err.message || 'Aksi gagal.' }, 400, headers);
  }
};
