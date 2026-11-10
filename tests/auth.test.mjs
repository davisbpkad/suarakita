import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { issueToken, verifyToken, verifyPassword, passwordUsable, TTL_MS } = require('../lib/auth.js');

const secret = 'synthetic-session-secret';
const now = 1_700_000_000_000;
const token = issueToken(secret, now);
assert.equal(verifyToken(secret, token, now + 1000), true);
assert.equal(verifyToken(secret, token, now + TTL_MS + 1), false, 'token kedaluwarsa');
assert.equal(verifyToken(secret, token + 'x', now), false, 'tanda tangan diubah');
assert.equal(verifyToken('other-secret', token, now), false, 'secret berbeda');
assert.equal(verifyToken(secret, `${now + 999}.`, now), false, 'tanpa MAC');
assert.equal(verifyToken(secret, 'abc', now), false, 'format salah');
assert.equal(verifyToken(secret, '9'.repeat(300), now), false, 'terlalu panjang');
assert.equal(verifyToken(undefined, token, now), false, 'tanpa secret');

assert.equal(verifyPassword('rahasia-bersama-panjang', 'rahasia-bersama-panjang'), true);
assert.equal(verifyPassword('rahasia-bersama-panjang', 'rahasia-bersama-panjan9'), false);
assert.equal(verifyPassword('rahasia-bersama-panjang', 'rahasia-bersama-panjang '), false);
assert.equal(verifyPassword('pendek', 'pendek'), false, 'password lemah ditolak');
assert.equal(passwordUsable('123456789012'), true);
assert.equal(passwordUsable('12345678901'), false);
console.log('Auth: token HMAC, kedaluwarsa, tamper, dan verifikasi password lulus');
