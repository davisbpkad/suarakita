import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

process.env.SESSION_SECRET = 'uji-session-secret-origin-panjang';
process.env.ADMIN_PASSWORD = '';
process.env.GROQ_API_KEY = '';

const { createAccounts, memoryStore } = require('../lib/accounts.js');
const auth = require('../netlify/functions/_auth.js');
const store = memoryStore();
auth.setAccountsFactory(() => createAccounts(store));
await auth.accounts().createUser({ username: 'budi', password: 'uji-password-bersama-123', quotaPerDay: 30 });

const load = async name => (await import(`../netlify/functions/${name}.mjs`)).default;
const [correct, notes, login] = await Promise.all(['correct-transcript', 'meeting-notes', 'login'].map(load));

const send = (handler, headers, body) => handler(new Request('https://app.example/api/x', {
  method: 'POST',
  headers: { host: 'app.example', ...headers },
  body: JSON.stringify(body),
}));

const session = await send(login, {}, { username: 'budi', password: 'uji-password-bersama-123' });
assert.equal(session.status, 200);
const cookie = (session.headers.get('set-cookie') || '').split(';')[0];

let checks = 0;
for (const handler of [correct, notes]) {
  for (const origin of ['https://evil.invalid', 'null', 'garbage', 'http://app.example', 'https://app.example/path']) {
    const result = await send(handler, { Cookie: cookie, origin }, { text: 'Rapat selesai.' });
    assert.equal(result.status, 403, `SEC-08: ${origin}`);
    checks++;
  }
  const ok = await send(handler, { Cookie: cookie, origin: 'https://app.example' }, { text: 'Rapat selesai.' });
  assert.equal(ok.status, 200);
  checks++;
}
console.log(`SEC-08: ${checks} pemeriksaan origin Netlify lulus`);
