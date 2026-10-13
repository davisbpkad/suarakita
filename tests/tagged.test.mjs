/**
 * Self-check parser keluaran bertanda (dipakai jalur streaming).
 * Jalankan: node tests/tagged.test.mjs
 */
import assert from 'node:assert/strict';
import { parseTagged, toTagged, toBulletList } from '../lib/taggedOutput.mjs';

// Dasar
const f = parseTagged('<<<TEXT>>>\nHalo dunia\n<<<CHANGES>>>\n- satu\n- dua');
assert.equal(f.TEXT, 'Halo dunia');
assert.equal(f.CHANGES, '- satu\n- dua');

// Tahan banting: bungkus markdown, teks pembuka sebelum tag, tag tanpa baris baru
assert.equal(parseTagged('```\n<<<TEXT>>>Halo\n```').TEXT, 'Halo');
assert.equal(parseTagged('pembuka\n<<<TEXT>>>\nHalo').TEXT, 'Halo');
assert.deepEqual(parseTagged(''), {});
assert.deepEqual(parseTagged(null), {});

// Simulasi streaming: hasil akhir tiap potongan harus stabil
const full = '<<<TEXT>>>\nHalo dunia\n<<<CHANGES>>>\n- satu';
let acc = '';
let lastText = '';
for (const ch of full) {
  acc += ch;
  lastText = parseTagged(acc).TEXT;
}
assert.equal(lastText, 'Halo dunia');

// Field yang belum selesai belum diisi
assert.equal(parseTagged('<<<TEXT>>>\nHalo\n<<<CHANGES>>>').CHANGES, '');

// toBulletList membuang penanda bullet dan baris kosong
assert.deepEqual(toBulletList('- a\n* b\n\nc'), ['a', 'b', 'c']);
assert.deepEqual(toBulletList(''), []);

// toTagged bolak-balik
const round = parseTagged(toTagged({ TEXT: 'x', CHANGES: ['- y'] }));
assert.equal(round.TEXT, 'x');
assert.equal(round.CHANGES, '- y');

console.log('taggedOutput.mjs: semua assertion lolos');
