import assert from 'node:assert/strict';
import fs from 'node:fs';
// Load browser-only module without changing the project's CommonJS package type.
const source = fs.readFileSync(new URL('../resources/js/lib/api/client.js', import.meta.url), 'utf8');
const { ApiClient } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const original = globalThis.fetch;
let count = 0;
try {
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    assert.equal(body.ai.geminiKey, 'synthetic-g');
    assert.equal(body.ai.groqKey, 'synthetic-q');
    assert.equal(body.ai.allowGroq, false);
    assert.equal(init.headers['X-Api-Key'], undefined);
    assert.ok(!url.includes('synthetic'));
    count++;
    return new Response(JSON.stringify({ engine: 'local' }), { headers: { 'Content-Type': 'application/json' } });
  };
  const api = new ApiClient();
  for (const action of ['correction', 'notes']) {
    assert.equal((await api.runAiAction(action, 'Rapat.', { geminiKey: 'synthetic-g', groqKey: 'synthetic-q', allowGroq: false })).engine, 'local');
  }
} finally { globalThis.fetch = original; }
console.log(`UI/API dua key: ${count} request tiruan lolos`);
