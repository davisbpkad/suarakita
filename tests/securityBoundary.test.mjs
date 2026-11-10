import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const child = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '3089', GEMINI_API_KEY: '', GROQ_API_KEY: '', APP_PASSWORD: 'uji-password-bersama-123', SESSION_SECRET: 'uji-session-secret' }, stdio: ['ignore', 'pipe', 'pipe'] });
try {
  await once(child.stdout, 'data');
  const base = 'http://127.0.0.1:3089';
  const home = await fetch(base);
  assert.equal(home.headers.get('x-powered-by'), null);
  for (const path of ['/.env', '/.git/config', '/%2eenv']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 404);
  }
  const disabled = await fetch(base + '/api/transcribe', { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: 'not audio' });
  assert.equal(disabled.status, 410);
  const crossSite = await fetch(base + '/api/correct-transcript', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.invalid' }, body: '{' });
  assert.equal(crossSite.status, 403, 'origin must be checked before parsing');
  // Tanpa sesi, body tidak pernah diparse: 401, bukan 400.
  let blocked = false;
  for (let i = 0; i < 125; i++) {
    const response = await fetch(base + '/api/correct-transcript', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    await response.arrayBuffer();
    if (response.status === 429) { blocked = true; break; }
    assert.equal(response.status, 401);
  }
  assert.equal(blocked, true, 'unauthenticated flood must be rate limited');
  const status = await fetch(base + '/api/status');
  assert.equal((await status.json()).authRequired, true);
  console.log('Security boundary: secrets, disabled audio, pre-parser origin and unauth flood PASS');
} finally {
  child.kill('SIGTERM');
  await once(child, 'exit');
}
