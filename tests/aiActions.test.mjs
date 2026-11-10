import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { runAiAction } = require('../lib/aiActions.js');
const options = { geminiKey: 'synthetic', groqKey: 'synthetic', allowGroq: true };
let count = 0;
for (const action of ['correction', 'notes']) {
  const calls = [];
  const result = await runAiAction(action, 'Andi belum selesai.', options, ({ provider }) => ({
    quota: { remainingRequests: 940 },
    async generateContent(model, prompt) {
      calls.push(provider);
      assert.ok(prompt.includes('Andi belum selesai.'));
      if (provider === 'gemini') throw Object.assign(new Error('limited'), { status: 429 });
      return action === 'correction' ? '<<<TEXT>>>\nAndi belum selesai.\n<<<CHANGES>>>\n- Kapitalisasi' : '<<<TOPIC>>>\nProgres proyek\n<<<SUMMARY>>>\nAndi belum selesai.\n<<<DECISIONS>>>\nTidak ada keputusan.';
    },
  }));
  assert.deepEqual(calls, ['gemini', 'groq']);
  assert.equal(result.engine, 'groq');
  assert.equal(result.quota.remainingRequests, 940);
  assert.equal(result.attempts[0].outcome, 'rate_limited');
  assert.ok(action === 'correction' ? result.correctedText : result.topic);
  const invalid = await runAiAction(action, 'Andi belum selesai.', options, () => ({ generateContent: async () => 'invalid output' }));
  assert.equal(invalid.engine, 'local');
  const local = await runAiAction(action, 'Andi belum selesai.', {}, () => { throw new Error('must not call provider'); });
  assert.equal(local.engine, 'local');
  count += 3;
}
console.log(`Koreksi/notulen: ${count} skenario integrasi orkestrator tiruan lolos`);
