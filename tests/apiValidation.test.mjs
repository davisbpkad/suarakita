import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const handlers = ['correct-transcript', 'meeting-notes'].map(name => require(`../netlify/functions/${name}.js`).handler);
let count = 0;
for (const handler of handlers) {
  for (const text of [undefined, null, 42, [], {}, '', '   ']) {
    const r = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ text }) });
    assert.equal(r.statusCode, 400, `API-01: ${JSON.stringify(text)}`);
    count++;
  }
  for (const body of ['{', 'null', '[]']) {
    const r = await handler({ httpMethod: 'POST', headers: {}, body });
    assert.equal(r.statusCode, 400, 'API-03: malformed/non-object body');
    count++;
  }
  for (const extra of [{ provider: 'evil' }, { provider: 'groq', model: 'evil' }, { stream: 'yes' }, { ai: null }, { ai: { allowGroq: 'yes' } }, { ai: { geminiKey: 42 } }, { ai: { groqModel: 'evil' } }]) {
    const r = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ text: 'Rapat hari ini.', ...extra }) });
    assert.equal(r.statusCode, 400, 'invalid provider/model/stream');
    count++;
  }
  const long = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ text: 'a'.repeat(50001) }) });
  assert.equal(long.statusCode, 413);
  const ok = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ text: 'Andi melaporkan integrasi sudah selesai.' }) });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.headers['Cache-Control'], 'no-store');
  const dual = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ text: 'Andi belum selesai.', ai: {} }) });
  assert.equal(dual.statusCode, 200);
  assert.equal(JSON.parse(dual.body).engine, 'local');
  const method = await handler({ httpMethod: 'GET', headers: {} });
  assert.equal(method.statusCode, 405);
  count += 4;
}
console.log(`API-01/API-02/API-03/SEC-11: ${count} pemeriksaan Netlify lolos (tanpa key/provider eksternal)`);
