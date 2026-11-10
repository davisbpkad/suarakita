import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

// Isolated local process; never touch the user's server or port 3000.
const child = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '3089' }, stdio: ['ignore', 'pipe', 'pipe'] });
const exited = once(child, 'exit');
let count = 0;
try {
  await Promise.race([
    once(child.stdout, 'data'),
    exited.then(() => { throw new Error('Test server exited before readiness'); }),
    new Promise((_, reject) => { const t = setTimeout(() => reject(new Error('Server readiness timeout')), 5000); t.unref(); }),
  ]);
  for (const endpoint of ['correct-transcript', 'meeting-notes', 'generate-meeting-notes']) {
    for (const text of [null, 42, [], {}, '', '   ']) {
      const r = await fetch(`http://127.0.0.1:3089/api/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      assert.equal(r.status, 400);
      assert.equal(r.headers.get('cache-control'), 'no-store');
      count++;
    }
    const ok = await fetch(`http://127.0.0.1:3089/api/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Andi melaporkan integrasi sudah selesai.' }) });
    assert.equal(ok.status, 200);
    for (const stream of [false, true]) {
      const dual = await fetch(`http://127.0.0.1:3089/api/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Andi belum selesai.', ai: {}, stream }) });
      assert.equal(dual.status, 200);
      if (stream) {
        const events = (await dual.text()).split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)));
        assert.equal(events.find(event => event.result)?.result.engine, 'local');
        assert.equal(events.at(-1).done, true);
      } else assert.equal((await dual.json()).engine, 'local');
      count++;
    }
    count++;
  }
  const malformed = await fetch('http://127.0.0.1:3089/api/correct-transcript', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.headers.get('cache-control'), 'no-store');
  count++;
  console.log(`Express: ${count} pemeriksaan aktual lolos pada 127.0.0.1:3089; tanpa provider eksternal`);
} finally {
  child.kill('SIGTERM');
  await exited;
}
