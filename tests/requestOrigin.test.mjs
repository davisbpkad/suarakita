import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const handlers = ['correct-transcript', 'meeting-notes'].map(name => require(`../netlify/functions/${name}.js`).handler);
let checks = 0;
for (const handler of handlers) {
  for (const origin of ['https://evil.invalid', 'null', 'garbage', 'http://app.example', 'https://app.example/path']) {
    const result = await handler({ httpMethod: 'POST', headers: { host: 'app.example', origin, 'x-forwarded-proto': 'https' }, body: JSON.stringify({ text: 'Rapat selesai.' }) });
    assert.equal(result.statusCode, 403, `SEC-08: ${origin}`);
    checks++;
  }
  const ok = await handler({ httpMethod: 'POST', headers: { host: 'app.example', origin: 'https://app.example', 'x-forwarded-proto': 'https' }, body: JSON.stringify({ text: 'Rapat selesai.' }) });
  assert.equal(ok.statusCode, 200);
  checks++;
}
console.log(`SEC-08: ${checks} pemeriksaan origin Netlify lulus`);
