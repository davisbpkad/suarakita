/**
 * Self-check logika penggabungan transkrip.
 * Jalankan: node tests/transcript.test.mjs
 */
import assert from 'node:assert/strict';
import { collapseExcessiveRepetitions, appendTranscriptCleanly, paragraphize, PARAGRAPH_WORD_INTERVAL } from '../resources/js/lib/text/transcript.mjs';

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

// --- Paragraf tiap 400 kata ---
assert.equal(PARAGRAPH_WORD_INTERVAL, 400);
assert.equal(paragraphize(''), '');
assert.equal(paragraphize('a b c', 5), 'a b c');
assert.equal(paragraphize('a b c d e f g', 5), 'a b c d e\n\nf g');

// Paragraf terakhir sudah penuh -> potongan berikutnya mulai paragraf baru.
assert.equal(appendTranscriptCleanly('w1 w2 w3 w4 w5', 'w6 w7', 0, 5), 'w1 w2 w3 w4 w5\n\nw6 w7');
// Belum penuh -> tetap satu paragraf.
assert.equal(appendTranscriptCleanly('w1 w2', 'w3', 0, 5), 'w1 w2 w3');

console.log('transcript.mjs: semua assertion lolos');
