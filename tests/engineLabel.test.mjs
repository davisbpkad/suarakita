import assert from 'node:assert/strict';
import { engineLabel } from '../resources/js/lib/engineLabel.mjs';
assert.equal(engineLabel({ engine: 'groq', method: 'llm_ai', modelUsed: 'test-model' }), 'Groq · test-model');
assert.equal(engineLabel({ engine: 'gemini', method: 'llm_ai' }), 'Gemini');
assert.equal(engineLabel({ engine: 'local' }), 'Mesin lokal');
assert.equal(engineLabel({}), 'Menunggu hasil');
assert.equal(engineLabel({ engine: 'local', method: 'nlp_builtin' }), 'Mesin lokal');
console.log('Label mesin: 7 assertion lulus');
