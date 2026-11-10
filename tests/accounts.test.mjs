import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createAccounts, memoryStore, hashPassword, verifyPassword, todayKey } = require('../lib/accounts.js');
const { issueSession, verifySession, TTL_MS } = require('../lib/auth.js');

const accounts = createAccounts(memoryStore(), { defaultDailyQuota: 3, globalDailyQuota: 5 });
const secret = 'uji-session-secret-32-karakter-panjang';

const alice = await accounts.createUser({ username: 'Alice', password: 'password-panjang-123' });
assert.equal(alice.username, 'alice', 'username dinormalkan ke huruf kecil');
assert.equal(await accounts.createUser({ username: 'alice', password: 'password-panjang-123' }).catch(e => e.message), 'Username sudah dipakai.');
await assert.rejects(accounts.createUser({ username: 'ab', password: 'password-panjang-123' }), /Username harus/);
await assert.rejects(accounts.createUser({ username: 'budi', password: 'pendek' }), /minimal 12/);

assert.equal(await accounts.authenticate('alice', 'password-panjang-123').then(Boolean), true);
assert.equal(await accounts.authenticate('alice', 'password-panjang-124'), null);
assert.equal(await accounts.authenticate('tidak-ada', 'password-panjang-123'), null);
assert.equal(verifyPassword(hashPassword('rahasia-panjang-123'), 'rahasia-panjang-123'), true);
assert.equal(verifyPassword(hashPassword('rahasia-panjang-123'), 'rahasia-panjang-124'), false);
assert.equal(verifyPassword({ salt: 'x', hash: 'x' }, 'apa pun'), false);

// Kuota harian per user dan total harian.
assert.deepEqual(await accounts.consume('alice'), { allowed: true, used: 1, limit: 3, total: 1, globalLimit: 5 });
await accounts.consume('alice');
const third = await accounts.consume('alice');
assert.equal(third.allowed, true);
const blocked = await accounts.consume('alice');
assert.equal(blocked.allowed, false);
assert.equal(blocked.reason, 'user');

await accounts.createUser({ username: 'budi', password: 'password-panjang-456', quotaPerDay: 10 });
await accounts.consume('budi');
await accounts.consume('budi');
const globalBlocked = await accounts.consume('budi');
assert.equal(globalBlocked.allowed, false, 'batas total harian menolak walau kuota user masih ada');
assert.equal(globalBlocked.reason, 'global', 'batas total harian menang saat jatah bersama habis');
// Sisa total: alice 3 + budi 2 = 5, jadi budi kena batas global pada percobaan ketiga.
const usage = await accounts.usageToday();
assert.equal(usage.usage.__total, 5);
assert.equal(usage.date, todayKey());

// Kunci percobaan masuk.
for (let i = 0; i < 10; i++) await accounts.registerLoginFailure('alice');
assert.equal(await accounts.loginBlocked('alice'), true);
await accounts.clearLoginFailures('alice');
assert.equal(await accounts.loginBlocked('alice'), false);
assert.equal(await accounts.loginBlocked('alice', Date.now() + 16 * 60 * 1000), false, 'jendela lama kedaluwarsa');

// Sesi berisi identitas.
const token = issueSession(secret, { username: 'alice', role: 'user' });
assert.deepEqual(verifySession(secret, token), { username: 'alice', role: 'user', exp: JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString()).exp });
assert.equal(verifySession(secret, token + 'x'), null);
assert.equal(verifySession('secret-lain-yang-panjang-sekali', token), null);
assert.equal(verifySession(secret, issueSession(secret, { username: 'alice', role: 'user' }, Date.now() - TTL_MS - 1)), null, 'sesi kedaluwarsa');
assert.equal(verifySession(secret, issueSession(secret, { username: 'alice', role: 'superuser' })), null, 'role asing ditolak');
assert.equal(verifySession(secret, 'abc'), null);

// Nonaktif dan hapus user.
await accounts.setActive('alice', false);
assert.equal(await accounts.authenticate('alice', 'password-panjang-123'), null);
await accounts.setActive('alice', true);
assert.equal(await accounts.authenticate('alice', 'password-panjang-123').then(Boolean), true);
await accounts.removeUser('budi');
assert.equal(await accounts.getUser('budi'), null);

// Cuplikan kuota provider untuk dashboard admin.
await accounts.recordProviderQuota({ remainingRequests: 10, limitRequests: 100, resetRequests: '1m2s', observedAt: 12345, evil: 'x' }, 'groq');
assert.deepEqual(await accounts.providerQuota(), { limitRequests: 100, remainingRequests: 10, resetRequests: '1m2s', observedAt: 12345, provider: 'groq' });
await accounts.recordProviderQuota({ remainingRequests: 1 });
assert.deepEqual(await accounts.providerQuota(), { limitRequests: 100, remainingRequests: 10, resetRequests: '1m2s', observedAt: 12345, provider: 'groq' }, 'tanpa observedAt tidak menimpa');

// Pilihan model AI untuk koreksi/notulen.
assert.equal(await accounts.readAiSettings(), null, 'belum ada pilihan tersimpan');
assert.deepEqual(await accounts.writeAiSettings({ provider: 'gemini', model: 'gemini-3.5-flash-lite', evil: 1 }), { provider: 'gemini', model: 'gemini-3.5-flash-lite' });
assert.deepEqual(await accounts.readAiSettings(), { provider: 'gemini', model: 'gemini-3.5-flash-lite' });

// Audit.
await accounts.audit('admin', 'create-user', 'alice');
const log = await accounts.auditLog();
assert.equal(log[0].action, 'create-user');

console.log('Akun: hash, login, kuota per user + total, kunci percobaan, sesi beridentitas, audit lulus');
