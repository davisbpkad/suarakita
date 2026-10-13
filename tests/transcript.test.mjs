/**
 * Self-check logika penggabungan transkrip.
 * Jalankan: node tests/transcript.test.mjs
 */
import assert from 'node:assert/strict';
import { collapseExcessiveRepetitions, appendTranscriptCleanly } from '../resources/js/lib/text/transcript.mjs';

// Pengulangan 3x+ dipangkas jadi 2x; 2x dibiarkan.
assert.equal(collapseExcessiveRepetitions('halo halo halo halo'), 'halo halo');
assert.equal(collapseExcessiveRepetitions('halo halo'), 'halo halo');

// Teks pertama apa adanya.
assert.equal(appendTranscriptCleanly('', 'selamat pagi'), 'selamat pagi');
assert.equal(appendTranscriptCleanly('selamat', '   '), 'selamat');

// Overlap multi-kata di batas sambungan dibuang (buffer ulang dari engine).
assert.equal(
  appendTranscriptCleanly('kita bahas anggaran', 'bahas anggaran kuartal empat'),
  'kita bahas anggaran kuartal empat'
);
// Overlap 1 kata juga dibuang.
assert.equal(
  appendTranscriptCleanly('kita bahas anggaran', 'anggaran kuartal empat'),
  'kita bahas anggaran kuartal empat'
);

// Overlap 1 kata dengan jeda singkat = buffer ulang, dibuang.
assert.equal(appendTranscriptCleanly('halo', 'halo', 100), 'halo');

// Overlap 1 kata setelah jeda normal = pembicara memang mengulang.
assert.equal(appendTranscriptCleanly('tes', 'tes', 5000), 'tes tes');

// Kata berbeda selalu ditambahkan.
assert.equal(appendTranscriptCleanly('satu dua', 'tiga empat'), 'satu dua tiga empat');

console.log('transcript.mjs: semua assertion lolos');
