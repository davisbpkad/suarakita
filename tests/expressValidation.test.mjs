import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import http from 'node:http';

// Isolated local process; never touch the user's server or port 3000.
const PASSWORD = 'uji-password-bersama-123';
const child = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '3089', GEMINI_API_KEY: '', GROQ_API_KEY: '', APP_PASSWORD: PASSWORD, SESSION_SECRET: 'uji-session-secret' }, stdio: ['ignore', 'pipe', 'pipe'] });
const exited = once(child, 'exit');
let count = 0;
try {
  await Promise.race([
    once(child.stdout, 'data'),
    exited.then(() => { throw new Error('Test server exited before readiness'); }),
    new Promise((_, reject) => { const t = setTimeout(() => reject(new Error('Server readiness timeout')), 5000); t.unref(); }),
  ]);
  const base = 'http://127.0.0.1:3089';

  // Tanpa sesi: semua endpoint AI menolak sebelum body diproses.
  const noSession = await fetch(`${base}/api/correct-transcript`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Rapat selesai.' }) });
  assert.equal(noSession.status, 401);
  count++;
  const wrong = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'salah-password-panjang' }) });
  assert.equal(wrong.status, 401);
  count++;
  const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: PASSWORD }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  assert.match(login.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(login.headers.get('set-cookie'), /SameSite=Strict/i);
  count++;
  const auth = { 'Content-Type': 'application/json', Cookie: cookie };

  for (const endpoint of ['correct-transcript', 'meeting-notes', 'generate-meeting-notes']) {
    for (const text of [null, 42, [], {}, '', '   ']) {
      const r = await fetch(`${base}/api/${endpoint}`, { method: 'POST', headers: auth, body: JSON.stringify({ text }) });
      assert.equal(r.status, 400);
      assert.equal(r.headers.get('cache-control'), 'no-store');
      count++;
    }
    const ok = await fetch(`${base}/api/${endpoint}`, { method: 'POST', headers: auth, body: JSON.stringify({ text: 'Andi melaporkan integrasi sudah selesai.' }) });
    assert.equal(ok.status, 200);
    for (const stream of [false, true]) {
      const dual = await fetch(`${base}/api/${endpoint}`, { method: 'POST', headers: auth, body: JSON.stringify({ text: 'Andi belum selesai.', ai: {}, stream }) });
      assert.equal(dual.status, 200);
      if (stream) {
        assert.ok(dual.headers.get('cache-control').includes('no-store'), 'SSE tidak boleh dicache');
        const events = (await dual.text()).split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)));
        assert.equal(events.find(event => event.result)?.result.engine, 'local');
        assert.equal(events.at(-1).done, true);
      } else assert.equal((await dual.json()).engine, 'local');
      count++;
    }
    count++;
  }
  const malformed = await fetch(`${base}/api/correct-transcript`, { method: 'POST', headers: auth, body: '{' });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.headers.get('cache-control'), 'no-store');
  count++;
  const foreignStatus = await new Promise((resolve, reject) => {
    const req = http.get(`${base}/api/status`, { headers: { Host: 'attacker.invalid:3089' } }, res => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
  });
  assert.equal(foreignStatus, 403, 'SEC-08: Host asing ditolak');
  count++;
  for (const origin of ['https://evil.invalid', 'null', 'http://127.0.0.1:3089/path', 'https://127.0.0.1:3089']) {
    const response = await fetch(`${base}/api/correct-transcript`, { method: 'POST', headers: { ...auth, Origin: origin }, body: JSON.stringify({ text: 'Rapat selesai.' }) });
    assert.equal(response.status, 403);
    count++;
  }
  const sameOrigin = await fetch(`${base}/api/correct-transcript`, { method: 'POST', headers: { ...auth, Origin: 'http://127.0.0.1:3089' }, body: JSON.stringify({ text: 'Rapat selesai.' }) });
  assert.equal(sameOrigin.status, 200);
  count++;
  console.log(`Express: ${count} pemeriksaan aktual lolos pada 127.0.0.1:3089; sesi password, tanpa provider eksternal`);
} finally {
  child.kill('SIGTERM');
  await exited;
}
