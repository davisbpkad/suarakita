import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { runProviderFallback } = require('../lib/providerFallback.js');
const options = { geminiKey: 'synthetic-g', groqKey: 'synthetic-q', allowGroq: true };
let checks = 0;
for (const scenario of [
  { name: 'Gemini berhasil', options, fail: [], expected: ['gemini'], engine: 'gemini' },
  { name: 'Gemini 429', options, fail: ['gemini'], expected: ['gemini', 'groq'], engine: 'groq' },
  { name: 'Semua gagal', options, fail: ['gemini', 'groq'], expected: ['gemini', 'groq'], engine: 'local' },
  { name: 'Tanpa izin Groq', options: { ...options, allowGroq: false }, fail: ['gemini'], expected: ['gemini'], engine: 'local' },
  { name: 'Tanpa key', options: {}, fail: [], expected: [], engine: 'local' },
  { name: 'Groq saja', options: { groqKey: 'synthetic-q', allowGroq: true }, fail: [], expected: ['groq'], engine: 'groq' },
]) {
  const calls = [];
  const result = await runProviderFallback(scenario.options, async ({ provider }) => {
    calls.push(provider);
    if (scenario.fail.includes(provider)) throw Object.assign(new Error('DO NOT EXPOSE synthetic-secret'), { status: 429 });
    return { correctedText: 'Hasil sintetis.' };
  }, () => ({ correctedText: 'Hasil lokal.' }));
  assert.deepEqual(calls, scenario.expected, scenario.name);
  assert.equal(result.engine, scenario.engine);
  assert.doesNotMatch(JSON.stringify(result), /synthetic-secret|synthetic-g|synthetic-q/);
  checks++;
}
const controller = new AbortController();
await assert.rejects(runProviderFallback({ ...options, signal: controller.signal }, async () => {
  controller.abort();
  throw new Error('failed');
}, () => { throw new Error('local must not run'); }), { name: 'AbortError' });
checks++;
await assert.rejects(runProviderFallback(options, async () => { throw Object.assign(new Error('invalid'), { status: 400 }); }, () => ({})), /invalid/);
checks++;
console.log(`AI-01/02/05/06/07/08/09: ${checks} skenario orkestrasi tiruan lolos`);
