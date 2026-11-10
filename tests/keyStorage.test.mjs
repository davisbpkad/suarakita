import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../resources/js/App.vue', import.meta.url), 'utf8');
assert.doesNotMatch(app, /localStorage\.getItem\('gemini_api_key'\)/, 'SEC-01: key lama tidak boleh dimuat');
assert.doesNotMatch(app, /localStorage\.setItem\('gemini_api_key'/, 'SEC-01: key tidak boleh disimpan');
const { removeLegacyKey } = await import('../resources/js/lib/keyStorage.mjs');
const removed = [];
removeLegacyKey({ removeItem: key => removed.push(key) });
assert.deepEqual(removed, ['gemini_api_key']);
assert.doesNotThrow(() => removeLegacyKey({ removeItem() { throw new Error('blocked'); } }));
assert.doesNotThrow(() => removeLegacyKey(null));
console.log('SEC-01/SEC-02: penyimpanan key dan storage terblokir lolos');
