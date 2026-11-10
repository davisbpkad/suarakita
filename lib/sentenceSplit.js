/**
 * Pemecah transkrip menjadi kalimat.
 *
 * KENAPA INI PERLU: keluaran STT sering TANPA tanda baca. Satu "kalimat" bisa
 * memuat ratusan kata (pernah diuji: 726 kata, nol koma, satu titik di akhir).
 * Tanpa pemecahan tambahan, seluruh transkrip jadi satu butir ringkasan, dan
 * notulen berisi teks mentah.
 *
 * Tiga tahap:
 *   1. pecah per baris (jeda paragraf)
 *   2. pecah per tanda baca akhir kalimat
 *   3. kalau masih kepanjangan: pecah di penanda wacana, lalu batas jumlah kata
 */

const MAX_WORDS_PER_SENTENCE = 60;

// Hanya penanda pembuka yang kuat. Kata sambung lemah (tetapi, namun, sedangkan,
// sebab) sengaja TIDAK dipakai: memotong di sana menghasilkan serpihan seperti
// "Namun juga kepada setiap pelaku pengadaan..." yang kehilangan konteks.
const DISCOURSE_MARKERS = [
  'selain daripada itu', 'sehubungan dengan itu', 'pada kesempatan ini',
  'sebagai tambahan', 'di samping itu', 'terkait hal itu', 'dalam hal ini',
  'perlu diketahui', 'oleh karena itu', 'oleh sebab itu', 'dengan demikian',
  'sementara itu', 'untuk itu', 'selain itu', 'di antaranya', 'diantaranya',
  'mari kita', 'marilah', 'berikutnya', 'selanjutnya', 'sebaliknya',
  'adapun', 'yaitu',
];

const MARKER_RE = new RegExp(`\\s+(?=(?:${DISCOURSE_MARKERS.join('|')})\\b)`, 'i');

/** ponytail: batas kalimat berbasis penanda Indonesia; gunakan AI untuk jeda yang ambigu tanpa penanda. */
function restorePunctuation(text) {
  let result = String(text || '').replace(/\s+/g, ' ').trim();
  // Jangan memotong anak kalimat seperti "bahwa Andi melaporkan ...".
  const boundary = /\s+(?=(?:(?:lalu\s+)?(?:bagaimana|apakah|kenapa|mengapa|siapa|kapan)\b|lalu\s+ada\s+(?:kendala|masalah)\s+apa\b|untuk\s+keputusan\s+akhir\b|sekian\s+dari\s+saya\b|(?:lalu\s+)?[a-zÀ-ÿ]+\s+(?:dari\s+(?:tim\s+)?[a-zÀ-ÿ]+\s+)?(?:melaporkan|menyampaikan|tolong\s+pastikan|siapkan)\b))/gi;
  result = result.replace(boundary, (space, offset, source) => {
    const before = source.slice(0, offset);
    if (/[.!?,;:]$/.test(before) || /\b(?:dari|lalu|bahwa|karena|ketika|jika|agar|supaya|dan|yang|keputusan\s+akhir)$/i.test(before) || /\b(?:bahwa|karena|ketika|jika|agar|supaya|dan|yang|lalu)\s+\S+$/i.test(before)) return space;
    return '\n';
  });
  return result.split(/\n|(?<=[.!?])\s+/).filter(Boolean).map(sentence => {
    let s = sentence.trim();
    s = s.replace(/^(selamat\s+(?:pagi|siang|sore|malam)\s+.+?)\s+(mari\s+kita\s+mulai)/i, (_, greeting, opening) => `${greeting.replace(/,$/, '')}, ${opening}`);
    s = s.replace(/^(untuk\s+keputusan\s+akhir|sekian\s+dari\s+saya)\s+(?![,])/i, '$1, ');
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (!/[.!?]$/.test(s)) s += /^(?:lalu\s+)?(?:bagaimana|apakah|kenapa|mengapa|siapa|kapan|ada\s+(?:kendala|masalah)\s+apa)\b/i.test(s) ? '?' : '.';
    return s;
  }).join(' ');
}

function wordsOf(text) {
  return text.split(/\s+/).filter(Boolean);
}

/** Potong paksa per `maxWords` kata — jaring terakhir supaya butir tidak meledak. */
function chunkByWords(segment, maxWords) {
  const words = wordsOf(segment);
  const chunks = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(' '));
  }
  return chunks;
}

/** Kalau satu kalimat masih > maxWords, pecah lagi di penanda wacana. */
function splitLongSentence(sentence, maxWords) {
  if (wordsOf(sentence).length <= maxWords) return [sentence];

  const parts = sentence.split(MARKER_RE).map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const part of parts) {
    if (wordsOf(part).length <= maxWords) out.push(part);
    else out.push(...chunkByWords(part, maxWords));
  }
  return out;
}

/**
 * @param {string} text
 * @param {{maxWords?: number}} [options]
 * @returns {string[]} kalimat, masing-masing tidak lebih dari maxWords kata
 */
function splitSentences(text, { maxWords = MAX_WORDS_PER_SENTENCE } = {}) {
  const out = [];

  for (const block of String(text || '').split(/\n+/)) {
    const cleaned = block.replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;

    for (const raw of cleaned.split(/(?<=[.!?])\s+/)) {
      const sentence = raw.trim();
      if (sentence) out.push(...splitLongSentence(sentence, maxWords));
    }
  }

  return out;
}

module.exports = { splitSentences, restorePunctuation, MAX_WORDS_PER_SENTENCE, DISCOURSE_MARKERS };
