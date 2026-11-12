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
      if (action === 'correction') assert.ok(prompt.includes('salah dengar') && prompt.includes('konteks'), 'Correction prompt must fix misheard words from context');
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

// Hitung permintaan Gemini (perkiraan kuota harian) dan tandai 429 harian.
const geminiOnly = { geminiKey: 'synthetic', geminiModel: 'gemini-3.5-flash-lite' };
const ok = await runAiAction('correction', 'Andi belum selesai.', geminiOnly, () => ({ generateContent: async () => '<<<TEXT>>>\nAndi belum selesai.\n<<<CHANGES>>>\n- Tidak ada' }));
assert.deepEqual([ok.geminiCalls, ok.geminiExhausted], [1, false]);
const daily = await runAiAction('correction', 'Andi belum selesai.', geminiOnly, () => ({ generateContent: async () => { throw Object.assign(new Error('limited'), { status: 429, dailyLimit: true }); } }));
assert.deepEqual([daily.geminiCalls, daily.geminiExhausted], [0, true]);
console.log('Kuota Gemini: hitungan permintaan dan penanda 429 harian lolos');
