/**
 * Pemecah teks panjang menjadi potongan yang aman diproses model.
 *
 * Hasil pengukuran (produksi, 11 Nov 2026):
 * - Satu permintaan 100.000 karakter ke Gemini: 63 detik, hasil TERPOTONG
 *   (469 karakter dari 100.000, `finishReason` STOP).
 * - Dipecah jadi 6.000 karakter: tiap permintaan ±8 detik, hasil utuh
 *   (rasio 1,00); 100.000 karakter pulih penuh dalam 28 detik dengan 10 paralel.
 * - Groq free tier: 8.000 token/menit. 12.000 karakter masih muat satu
 *   permintaan (±8 detik); 15.000 karakter kena 429; 22.000 karakter kena 413.
 *
 * Potongan diambil dari teks asli apa adanya (tanpa rekonstruksi), sehingga
 * gabungan potongan selalu sama persis dengan teks masuk.
 */

/** Di bawah ini satu permintaan cukup; di atasnya perlu dipecah. */
const CHUNK_MIN_CHARS = 12000;

/**
 * Rencana per provider:
 * - gemini: potongan 6.000 karakter, 10 paralel (burst 10 OK; 46 dari 48
 *   permintaan berturut-turut sukses dalam 3 menit).
 * - groq: potongan 8.000 karakter, berurutan, jeda 30 detik agar tidak kena
 *   8.000 token/menit.
 */
const PROVIDER_CHUNK = {
  gemini: { target: 5000, concurrency: 8, delayMs: 0 },
  groq: { target: 6000, concurrency: 1, delayMs: 30000 },
};

/**
 * Batas aman jalur sinkron. Fungsi Netlify di akun ini dibunuh tepat pada
 * 30 detik (terukur: `Duration: 30377 ms` lalu 504 Inactivity Timeout).
 * Di atas batas ini pekerjaan pindah ke background function (batas 15 menit).
 */
const SYNC_MAX_CHARS = { gemini: 24000, groq: 12000 };

function splitForChunking(text, target = PROVIDER_CHUNK.gemini.target) {
  const source = String(text || '');
  if (source.length <= target) return [source];
  const chunks = [];
  let rest = source;
  while (rest.length > 0) {
    if (rest.length <= target) { chunks.push(rest); break; }
    // Potong di batas kalimat agar potongan tetap masuk akal bagi model.
    let cut = rest.lastIndexOf('. ', target);
    if (cut < target * 0.5) cut = rest.lastIndexOf(' ', target);
    if (cut < 1) cut = target;
    chunks.push(rest.slice(0, cut + 1));
    rest = rest.slice(cut + 1);
  }
  return chunks;
}

/** Jalankan `worker` untuk tiap item, maksimal `limit` berjalan bersamaan. */
async function mapWithLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const size = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: size }, async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }));
  return results;
}

/** Provider yang dipakai: Gemini kalau key-nya ada, selain itu Groq. */
function providerOf(options = {}) {
  if (typeof options.geminiKey === 'string' && options.geminiKey.trim()) return 'gemini';
  if (options.allowGroq === true && typeof options.groqKey === 'string' && options.groqKey.trim()) return 'groq';
  return 'local';
}

/** Rencana pemecahan: teks pendek tetap satu permintaan. */
function chunkPlan(options, text) {
  const provider = providerOf(options);
  const plan = PROVIDER_CHUNK[provider] || PROVIDER_CHUNK.gemini;
  if (text.length <= CHUNK_MIN_CHARS) return { provider, chunks: [text], concurrency: plan.concurrency, delayMs: 0 };
  return { provider, chunks: splitForChunking(text, plan.target), concurrency: plan.concurrency, delayMs: plan.delayMs };
}

/**
 * Teks yang terlalu besar untuk jalur sinkron → harus lewat background function.
 * Tanpa key provider, mesin lokal memproses apa pun dalam hitungan milidetik.
 */
function needsBackground(options, text) {
  const provider = providerOf(options);
  if (provider === 'local') return false;
  const limit = SYNC_MAX_CHARS[provider];
  return Number.isSafeInteger(limit) && text.length > limit;
}

module.exports = { splitForChunking, mapWithLimit, chunkPlan, providerOf, needsBackground, CHUNK_MIN_CHARS, SYNC_MAX_CHARS, PROVIDER_CHUNK };
