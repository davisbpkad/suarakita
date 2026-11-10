import assert from 'node:assert/strict';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const child = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '3089', GEMINI_API_KEY: '', GROQ_API_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
let socket;
try {
  await once(child.stdout, 'data');
  // Kirim header parsial lalu diam: server harus menutup, bukan menahan selamanya.
  socket = net.connect(3089, '127.0.0.1');
  socket.on('error', () => {});
  await once(socket, 'connect');
  const started = Date.now();
  socket.write('POST /api/correct-transcript HTTP/1.1\r\nHost: 127.0.0.1:3089\r\nContent-Type: application/json\r\n');
  await Promise.race([
    once(socket, 'close'),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout header tidak menutup koneksi')), 20000)),
  ]);
  const elapsed = Date.now() - started;
  assert.ok(elapsed >= 10000 && elapsed < 20000, `penutupan header di luar jendela: ${elapsed}ms`);
  const status = await fetch('http://127.0.0.1:3089/api/status', { signal: AbortSignal.timeout(3000) });
  assert.equal(status.status, 200);
  console.log(`Header timeout: koneksi header parsial ditutup pada ${elapsed}ms, health tetap 200`);
} finally {
  socket?.destroy();
  child.kill('SIGTERM');
  await once(child, 'exit');
}
