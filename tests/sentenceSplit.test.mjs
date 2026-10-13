/**
 * Self-check pemecah kalimat + penjaga notulen.
 * Jalankan: node tests/sentenceSplit.test.mjs
 */
import assert from 'node:assert/strict';
import splitModule from '../lib/sentenceSplit.js';
import notesModule from '../meetingNotes.js';

const { splitSentences, MAX_WORDS_PER_SENTENCE } = splitModule;
const { generateMeetingNotesWithNLP } = notesModule;

// --- Dasar: pecah di tanda baca ---
assert.deepEqual(splitSentences('Halo dunia. Apa kabar? Baik!'), ['Halo dunia.', 'Apa kabar?', 'Baik!']);
assert.deepEqual(splitSentences(''), []);
assert.deepEqual(splitSentences('   '), []);
assert.deepEqual(splitSentences('Satu kalimat saja'), ['Satu kalimat saja']);

// --- Baris baru juga jadi batas ---
assert.deepEqual(splitSentences('Baris pertama\nBaris kedua'), ['Baris pertama', 'Baris kedua']);

// --- INVARIAN UTAMA: tidak ada kalimat yang melebihi batas kata ---
const runOn = Array.from({ length: 400 }, (_, i) => `kata${i}`).join(' ') + ' untuk itu ' +
  Array.from({ length: 200 }, (_, i) => `lanjut${i}`).join(' ');

const potongan = splitSentences(runOn);
assert.ok(potongan.length > 5, 'kalimat raksasa harus terpecah jadi banyak bagian');
for (const s of potongan) {
  assert.ok(s.split(/\s+/).length <= MAX_WORDS_PER_SENTENCE, `bagian terlalu panjang: ${s.slice(0, 60)}…`);
}

// --- Penanda wacana kuat memecah; kata sambung lemah TIDAK ---
const teks = ('a '.repeat(40) + 'untuk itu ' + 'b '.repeat(40)).trim();
const hasil = splitSentences(teks);
assert.equal(hasil.length, 2, 'penanda "untuk itu" harus memecah');
assert.ok(hasil[1].startsWith('untuk itu'), 'potongan kedua dimulai dari penandanya');

// Kata sambung lemah tidak memotong di tengah pikiran
const denganNamun = ('c '.repeat(100) + 'namun ' + 'd '.repeat(60)).trim();
for (const s of splitSentences(denganNamun)) {
  assert.ok(!/^namun\b/i.test(s), 'potongan tidak boleh dimulai dengan "namun"');
}

// --- Penjaga notulen: tidak ada butir yang sepanjang seluruh transkrip ---
const transkrip = 'Pemahaman serta wawasan yang bermanfaat bagi kita semua dalam mendukung proses pengadaan barang dan jasa pemerintah. ' +
  ('korupsi pengadaan barang jasa harus dicegah melalui pengawasan integritas strategi pencegahan ' .repeat(20)).trim();

const hasilNotulen = generateMeetingNotesWithNLP(transkrip);
for (const butir of hasilNotulen.summaryItems) {
  assert.ok(butir.length < 600, `butir ringkasan terlalu panjang (${butir.length} char) — transkrip mentah bocor ke ringkasan`);
}
for (const butir of hasilNotulen.decisions) {
  assert.ok(butir.length < 600, `butir keputusan terlalu panjang (${butir.length} char)`);
}

// --- Topik tidak boleh hasil karangan template lama ---
assert.ok(!/Koordinasi progres integrasi sistem/.test(hasilNotulen.topic), 'topik template lama muncul lagi');

console.log('sentenceSplit.mjs + penjaga notulen: semua assertion lolos');
