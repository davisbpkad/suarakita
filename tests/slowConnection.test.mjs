import assert from 'node:assert/strict';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
const PASSWORD = 'uji-password-bersama-123';
const child = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '3089', GEMINI_API_KEY: '', GROQ_API_KEY: '', APP_PASSWORD: PASSWORD, SESSION_SECRET: 'uji-session-secret' }, stdio: ['ignore', 'pipe', 'pipe'] });
const sockets = [];
try {
  await once(child.stdout, 'data');
  const login = await fetch('http://127.0.0.1:3089/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: PASSWORD }) });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  for (let i = 0; i < 8; i++) {
    const socket = net.connect(3089, '127.0.0.1');
    socket.on('error', () => {});
    await once(socket, 'connect');
    socket.write(`POST /api/correct-transcript HTTP/1.1\r\nHost: 127.0.0.1:3089\r\nContent-Type: application/json\r\nCookie: ${cookie}\r\nContent-Length: 10000\r\n\r\n{`);
    sockets.push(socket);
  }
  await new Promise(resolve => setTimeout(resolve, 100));
  const status = await fetch('http://127.0.0.1:3089/api/status', { signal: AbortSignal.timeout(3000) });
  assert.equal(status.status, 200);
  const blocked = await fetch('http://127.0.0.1:3089/api/correct-transcript', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: '{' });
  assert.equal(blocked.status, 429);
  for (const socket of sockets) socket.destroy();
  await new Promise(resolve => setTimeout(resolve, 200));
  const recovered = await fetch('http://127.0.0.1:3089/api/correct-transcript', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: '{' });
  assert.equal(recovered.status, 400);
  console.log('Slow body: 8 held authenticated uploads bounded, health reachable, slots recovered');
} finally {
  for (const socket of sockets) socket.destroy();
  child.kill('SIGTERM');
  await once(child, 'exit');
}
