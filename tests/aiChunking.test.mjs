import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { splitForChunking, mapWithLimit, chunkPlan, providerOf, needsBackground, SYNC_MAX_CHARS, CHUNK_MIN_CHARS } = require('../lib/aiChunking.js');
const { createJobStore } = require('../lib/aiJobs.js');
const { memoryStore } = require('../lib/accounts.js');

// Pemecahan: potongan digabung kembali persis sama dengan teks asal.
const text = 'Kalimat pertama. Kalimat kedua. Kalimat ketiga. Kalimat keempat.';
const chunks = splitForChunking(text, 25);
assert.ok(chunks.length > 1, 'teks panjang dipecah');
assert.equal(chunks.join(''), text, 'gabungan potongan sama dengan teks asal');
assert.ok(chunks.every(chunk => chunk.length <= 25), 'tiap potongan maksimal 25 karakter');

const short = 'Pendek.';
assert.deepEqual(splitForChunking(short, 1000), [short], 'teks pendek tidak dipecah');

// Batas pemotongan di dalam kalimat: potong di spasi terakhir.
const noSpace = 'a'.repeat(100);
const forced = splitForChunking(noSpace, 30);
assert.equal(forced.join(''), noSpace);
assert.ok(forced.length >= 3, 'teks tanpa spasi tetap terpecah');

// Pelaksanaan paralel:.
let active = 0;
let peak = 0;
const order = [];
const results = await mapWithLimit([1, 2, 3, 4, 5, 6], 2, async item => {
  active++;
  peak = Math.max(peak, active);
  await new Promise(resolve => setTimeout(resolve, 5));
  order.push(item);
  active--;
  return item * 2;
});
assert.deepEqual(results, [2, 4, 6, 8, 10, 12]);
assert.ok(peak <= 2, `paralel dibatasi (peak ${peak})`);

// Provider terdeteksi dari opsi.
assert.equal(providerOf({ geminiKey: 'k' }), 'gemini');
assert.equal(providerOf({ allowGroq: true, groqKey: 'k' }), 'groq');
assert.equal(providerOf({}), 'local');

// Rencana: teks pendek = satu permintaan.
const planShort = chunkPlan({ geminiKey: 'k' }, 'pendek');
assert.equal(planShort.chunks.length, 1);
const planLong = chunkPlan({ geminiKey: 'k' }, 'x'.repeat(CHUNK_MIN_CHARS + 1000));
assert.ok(planLong.chunks.length > 1, 'teks panjang dipecah');

// Batas jalur sinkron: di atas batas → background; tanpa key → lokal (cepat).
assert.equal(needsBackground({ geminiKey: 'k' }, 'x'.repeat(SYNC_MAX_CHARS.gemini + 1)), true);
assert.equal(needsBackground({ geminiKey: 'k' }, 'x'.repeat(SYNC_MAX_CHARS.gemini)), false);
assert.equal(needsBackground({ allowGroq: true, groqKey: 'k' }, 'x'.repeat(SYNC_MAX_CHARS.groq + 1)), true);
assert.equal(needsBackground({}, 'x'.repeat(200000)), false, 'tanpa key provider, mesin lokal memproses apa pun');

// Store pekerjaan: buat, baca, selesai, gagal.
const store = createJobStore(memoryStore());
const job = await store.create({ username: 'budi', action: 'correction', text: 'isi', provider: 'gemini', model: 'gemini-3.5-flash-lite' });
assert.match(job.id, /^[a-f0-9]{24}$/);
const loaded = await store.get(job.id);
assert.equal(loaded.username, 'budi');
assert.equal(loaded.status, 'running');
assert.equal(await store.get('bukan-id-valid'), null, 'id tidak valid ditolak');
await store.finish(job.id, { correctedText: 'hasil' });
const done = await store.get(job.id);
assert.equal(done.status, 'done');
assert.equal(done.result.correctedText, 'hasil');
assert.equal(done.text, '', 'teks panjang dibuang setelah selesai');
const failed = await store.create({ username: 'sari', action: 'notes', text: 'isi' });
await store.fail(failed.id, 'boom');
assert.equal((await store.get(failed.id)).error, 'boom');

console.log('Chunking + pekerjaan latar: pemecahan, batas sinkron, dan store job lulus');
