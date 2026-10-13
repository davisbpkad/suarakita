/**
 * Self-check matematika level audio.
 * Jalankan: node tests/level.test.mjs
 */
import assert from 'node:assert/strict';
import { rmsLevel, isQuiet, QUIET_RMS } from '../resources/js/lib/audio/level.mjs';

const bytes = (...values) => Uint8Array.from(values);

// Diam total: semua sampel di titik tengah 128 -> RMS 0.
assert.equal(rmsLevel(bytes(128, 128, 128, 128)), 0);
assert.equal(rmsLevel(bytes()), 0);
assert.equal(rmsLevel(null), 0);
assert.equal(isQuiet(rmsLevel(bytes(128, 128))), true);

// Sinyal penuh: bergantian 0 dan 255 -> RMS mendekati 1.
assert.ok(rmsLevel(bytes(0, 255, 0, 255)) > 0.99);

// Amplitudo kecil konstan: 140 -> 12/128 = 0.09375.
assert.ok(Math.abs(rmsLevel(bytes(140, 140, 140, 140)) - 0.09375) < 1e-9);
assert.equal(isQuiet(rmsLevel(bytes(140, 140, 140, 140))), false);

// Persis di ambang dianggap tidak pelan.
assert.equal(isQuiet(QUIET_RMS), false);
assert.equal(isQuiet(QUIET_RMS - 0.001), true);

console.log('level.mjs: semua assertion lolos');
