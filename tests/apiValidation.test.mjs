import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

process.env.SESSION_SECRET = 'uji-session-secret-minimal-32-karakter';
process.env.ADMIN_PASSWORD = '';
process.env.GROQ_API_KEY = '';

const { createAccounts, memoryStore } = require('../lib/accounts.js');
const auth = require('../netlify/functions/_auth.js');
const store = memoryStore();
auth.setAccountsFactory(() => createAccounts(store, { defaultDailyQuota: 5, globalDailyQuota: 100 }));
const accounts = auth.accounts();

const load = async name => (await import(`../netlify/functions/${name}.mjs`)).default;
const [correct, notes, login, logout, admin, status] = await Promise.all(
  ['correct-transcript', 'meeting-notes', 'login', 'logout', 'admin-users', 'status'].map(load),
);

/** Panggil fungsi API modern dengan Request asli. */
function call(handler, { method = 'POST', headers = {}, body, path = '/api/x' } = {}) {
  const init = { method, headers: { host: 'app.example', ...headers } };
  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  return handler(new Request(`https://app.example${path}`, init));
}
const cookieOf = response => (response.headers.get('set-cookie') || '').split(';')[0];

const PASSWORD = 'uji-password-bersama-123';
await accounts.createUser({ username: 'budi', password: PASSWORD, quotaPerDay: 2 });
await accounts.createUser({ username: 'sari', password: PASSWORD, quotaPerDay: 30 });

const unauth = await call(correct, { body: { text: 'Rapat selesai.' } });
assert.equal(unauth.status, 401, 'tanpa sesi harus 401');

const wrong = await call(login, { body: { username: 'budi', password: 'salah-password-panjang' } });
assert.equal(wrong.status, 401);
const unknown = await call(login, { body: { username: 'tidak-ada', password: PASSWORD } });
assert.equal(unknown.status, 401);
const good = await call(login, { body: { username: 'budi', password: PASSWORD } });
assert.equal(good.status, 200);
assert.match(good.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Strict/);
const authHeaders = { Cookie: cookieOf(good) };

const tooLong = await call(correct, { headers: authHeaders, body: { text: 'x'.repeat(50001) } });
assert.equal(tooLong.status, 413, 'batas panjang tetap berlaku sebelum kuota');
const statusBody = await (await call(status, { method: 'GET' })).json();
assert.equal(statusBody.authRequired, true);
assert.equal(statusBody.accounts, true);
const logoutResponse = await call(logout, { headers: authHeaders, body: {} });
assert.match(logoutResponse.headers.get('set-cookie'), /Max-Age=0/);
let checks = 7;

const aiHandlers = [correct, notes];
for (const handler of aiHandlers) {
  for (const text of [undefined, null, 42, [], {}, '', '   ']) {
    const r = await call(handler, { headers: authHeaders, body: { text } });
    assert.equal(r.status, 400, `API-01: ${JSON.stringify(text)}`);
    checks++;
  }
  for (const body of ['{', 'null', '[]']) {
    const r = await call(handler, { headers: authHeaders, body });
    assert.equal(r.status, 400, 'API-03: malformed/non-object body');
    checks++;
  }
  for (const extra of [{ provider: 'evil' }, { provider: 'groq', model: 'evil' }, { stream: 'yes' }, { ai: null }, { ai: { allowGroq: 'yes' } }, { ai: { geminiKey: 42 } }, { ai: { groqModel: 'evil' } }]) {
    const r = await call(handler, { headers: authHeaders, body: { text: 'Rapat hari ini.', ...extra } });
    assert.equal(r.status, 400, 'invalid provider/model/stream');
    checks++;
  }
  const method = await call(handler, { method: 'GET', headers: authHeaders });
  assert.equal(method.status, 405);
  checks += 1;
}

// Kuota: user budi hanya 2 aksi, dipakai bersama endpoint koreksi dan notulen.
const first = await call(correct, { headers: authHeaders, body: { text: 'Andi melaporkan integrasi sudah selesai.', ai: {} } });
assert.equal(first.status, 200);
assert.equal((await first.json()).engine, 'local');
const second = await call(notes, { headers: authHeaders, body: { text: 'Andi belum selesai.', ai: {} } });
assert.equal(second.status, 200);
assert.deepEqual((await second.json()).quota, { used: 2, limit: 2 });
const third = await call(correct, { headers: authHeaders, body: { text: 'Rapat selesai.', ai: {} } });
assert.equal(third.status, 429, 'kuota habis harus 429');
assert.match((await third.json()).error, /Kuota harian Anda habis/);
checks += 3;

// Admin: hanya role admin yang boleh menyentuh dashboard.
const loginAdmin = await call(login, { body: { username: 'admin', password: 'admin-darurat-32-karakter-panjang' } });
assert.equal(loginAdmin.status, 401, 'ADMIN_PASSWORD kosong berarti jalur darurat mati');
process.env.ADMIN_PASSWORD = 'admin-darurat-32-karakter-panjang';
const adminLogin = await call(login, { body: { username: 'admin', password: process.env.ADMIN_PASSWORD } });
assert.equal(adminLogin.status, 200);
const adminHeaders = { Cookie: cookieOf(adminLogin) };
const adminList = await call(admin, { method: 'GET', headers: adminHeaders });
assert.equal(adminList.status, 200);
assert.ok((await adminList.json()).users.some(user => user.username === 'budi'));
const createAsUser = await call(admin, { headers: authHeaders, body: { action: 'create', username: 'bahlil' } });
assert.equal(createAsUser.status, 403, 'user biasa tidak boleh membuat user');
const create = await call(admin, { headers: adminHeaders, body: { action: 'create', username: 'bahlil', quotaPerDay: 10 } });
assert.equal(create.status, 201);
const created = await create.json();
assert.ok(created.password.length >= 12);
const duplicate = await call(admin, { headers: adminHeaders, body: { action: 'create', username: 'bahlil' } });
assert.equal(duplicate.status, 400, 'username ganda ditolak');
const reset = await call(admin, { headers: adminHeaders, body: { action: 'reset', username: 'bahlil' } });
assert.equal(reset.status, 200);
const newPassword = (await reset.json()).password;
const relogin = await call(login, { body: { username: 'bahlil', password: newPassword } });
assert.equal(relogin.status, 200);
const deactivate = await call(admin, { headers: adminHeaders, body: { action: 'deactivate', username: 'sari' } });
assert.equal(deactivate.status, 200);
const blockedLogin = await call(login, { body: { username: 'sari', password: PASSWORD } });
assert.equal(blockedLogin.status, 401, 'user nonaktif tidak bisa masuk');
const rotateWrong = await call(admin, { headers: adminHeaders, body: { action: 'rotate-admin', currentPassword: 'salah-panjang-panjang-panjang', newPassword: 'password-admin-baru-20-lebih' } });
assert.equal(rotateWrong.status, 401);
const rotate = await call(admin, { headers: adminHeaders, body: { action: 'rotate-admin', currentPassword: process.env.ADMIN_PASSWORD, newPassword: 'password-admin-baru-20-lebih' } });
assert.equal(rotate.status, 200);
process.env.ADMIN_PASSWORD = '';
const afterRotate = await call(login, { body: { username: 'admin', password: 'password-admin-baru-20-lebih' } });
assert.equal(afterRotate.status, 200, 'password admin hasil rotasi tetap berlaku walau env dikosongkan');
checks += 12;

const foreign = await call(correct, { headers: { ...authHeaders, Origin: 'https://evil.invalid' }, body: {} });
assert.equal(foreign.status, 403);
checks++;
console.log(`API/AUTH/KUOTA/ADMIN: ${checks} pemeriksaan Netlify lolos (Blobs tiruan, tanpa provider eksternal)`);
