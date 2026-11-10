import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PROVIDERS, modelChainFor } = require('../lib/providers.js');
let count = 0;
for (const [id, provider] of Object.entries(PROVIDERS)) {
  assert.deepEqual(modelChainFor(id), [provider.models[0].id], `${id}: hanya satu model default`);
  count++;
  for (const model of provider.models) {
    assert.deepEqual(modelChainFor(id, model.id), [model.id]);
    count++;
  }
  assert.throws(() => modelChainFor(id, 'https://attacker.invalid/model'), /Model/);
  count++;
}
assert.throws(() => modelChainFor('unknown'), /Provider/);
count++;
console.log(`QUO-04/AI-09 parsial: ${count} pemeriksaan pemilihan model lolos`);
