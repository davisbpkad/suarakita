/**
 * corrector.js
 * Modul Koreksi Transkrip (Transcript Correction)
 * - Pembersihan filler words (kata jeda: eh, um, anu) dan pengulangan kata gagap
 * - Koreksi kata salah dengar kontekstual (speech-to-text recognition errors: biaya/bisa, setting/meeting)
 * - Normalisasi singkatan lisan Indonesia (yg -> yang, dgn -> dengan, dll)
 * - Pemformatan tanda baca, kapitalisasi kalimat, dan akronim teknologi
 * 
 * Filosofi: Ringan, stateless (tanpa bug regex stateful), sub-milidetik, tanpa dependensi berat.
 */

const https = require('https');

// Daftar singkatan percakapan lisan Indonesia ke bentuk baku
const ORAL_CONTRACTIONS = [
  [/\byg\b/gi, 'yang'],
  [/\bdgn\b/gi, 'dengan'],
  [/\butk\b/gi, 'untuk'],
  [/\bkpd\b/gi, 'kepada'],
  [/\bkrn\b/gi, 'karena'],
  [/\btp\b/gi, 'tapi'],
  [/\bsdh\b/gi, 'sudah'],
  [/\bblm\b/gi, 'belum'],
  [/\bsy\b/gi, 'saya'],
  [/\bkm\b/gi, 'kamu'],
  [/\btdk\b/gi, 'tidak'],
  [/\bgak\b|\bnggak\b|\bga\b/gi, 'tidak'],
  [/\bbgt\b/gi, 'sangat'],
  [/\bbbrp\b/gi, 'beberapa'],
  [/\bkordinasi\b|\bkordinir\b/gi, 'koordinasi'],
  [/\bterimakasih\b/gi, 'terima kasih'],
  [/\bberfikir\b/gi, 'berpikir'],
  [/\bpraktek\b/gi, 'praktik'],
  [/\bijin\b/gi, 'izin'],
  [/\bresiko\b/gi, 'risiko']
];

// Akronim dan istilah teknologi yang harus berhuruf kapital
const TECH_ACRONYMS = [
  [/\bqa\b/gi, 'QA'],
  [/\bui\b/gi, 'UI'],
  [/\bux\b/gi, 'UX'],
  [/\bapi\b/gi, 'API'],
  [/\bit\b/gi, 'IT'],
  [/\bid\b/gi, 'ID'],
  [/\bpdf\b/gi, 'PDF'],
  [/\bmd\b/gi, 'MD'],
  [/\bmom\b/gi, 'MoM'],
  [/\bpr\b/gi, 'PR'],
  [/\bpic\b/gi, 'PIC']
];

/**
 * Koreksi Transkrip Menggunakan Mesin NLP Lokal
 */
function correctTranscriptWithNLP(rawText) {
  if (!rawText || !rawText.trim()) {
    return {
      originalText: '',
      correctedText: '',
      changes: [],
      method: 'nlp_builtin'
    };
  }

  let text = rawText.trim();
  const changes = [];

  // 1. Bersihkan filler words lisan
  const beforeFiller = text;
  text = text.replace(/\b(?:eh+|anu|umm?|uhh?|hmmm?|eee+|aaa+|you know)\b\s*/gi, ' ');
  if (text !== beforeFiller) {
    changes.push('Pembersihan kata jeda lisan (filler words: eh, anu, dll)');
  }

  // 2. Bersihkan pengulangan kata gagap (misal "saya saya mau" -> "saya mau")
  const beforeStutter = text;
  text = text.replace(/\b([a-zA-ZÀ-ÿ]{2,})\s+\1\b/gi, '$1');
  if (text !== beforeStutter) {
    changes.push('Penghapusan pengulangan kata berulang / gagap');
  }

  // 3. Normalisasi singkatan percakapan lisan
  let contractionCount = 0;
  ORAL_CONTRACTIONS.forEach(([pattern, replacement]) => {
    if (new RegExp(pattern.source, 'i').test(text)) {
      text = text.replace(new RegExp(pattern.source, 'gi'), replacement);
      contractionCount++;
    }
  });
  if (contractionCount > 0) {
    changes.push(`Normalisasi ${contractionCount} kata singkatan lisan ke bentuk baku`);
  }

  // 4. Koreksi kata salah dengar kontekstual (Speech-to-Text Recognition Errors)
  // A. "biaya" vs "bisa"
  const beforeBiaya = text;
  text = text.replace(/\b(apakah\s+(?:kita|kamu|anda|dia|mereka))\s+biaya\b/gi, '$1 bisa');
  text = text.replace(/\b(kita|saya|aku|kamu|mereka|pasti|harus|tidak|belum|sudah|[A-Z][a-z]+)\s+biaya\b/gi, '$1 bisa');
  text = text.replace(/\bbiaya\s+(hadir|datang|ikut|bantu|mengerjakan|selesai|cek|perbaiki|siapkan|menyiapkan|rilis)\b/gi, 'bisa $1');
  // Sebaliknya: "bisa" yang seharusnya "biaya" (konteks harga/keuangan)
  text = text.replace(/\b(berapa|total|rincian|estimasi|anggaran)\s+bisa\b/gi, '$1 biaya');
  text = text.replace(/\bbisa\s+(perbaikan|langganan|operasional|server|domain)\b/gi, 'biaya $1');
  if (text !== beforeBiaya) {
    changes.push("Koreksi salah dengar fonetik 'biaya' ↔ 'bisa' berdasarkan konteks kalimat");
  }

  // B. "setting" vs "meeting"
  const beforeSetting = text;
  text = text.replace(/\b(ruang|jadwal|waktu|agenda|link|hasil|ikutan|hadir\s+di|adakan|selesai)\s+setting\b/gi, '$1 meeting');
  text = text.replace(/\b(kita|kami)\s+setting\b/gi, '$1 meeting');
  text = text.replace(/\bsetting\s+(evaluasi|mingguan|bulanan|proyek|tim|koordinasi|zoom|online|daring)\b/gi, 'meeting $1');
  text = text.replace(/\bzoom\s+setting\b/gi, 'zoom meeting');
  if (text !== beforeSetting) {
    changes.push("Koreksi salah dengar 'setting' -> 'meeting' pada konteks pertemuan rapat");
  }

  // 5. Huruf kapital untuk akronim teknologi
  TECH_ACRONYMS.forEach(([pattern, replacement]) => {
    text = text.replace(new RegExp(pattern.source, 'gi'), replacement);
  });

  // 6. Normalisasi spasi dan tanda baca
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.?!:;])/g, '$1')
    .replace(/([,.?!:;])(?=[^\s,.?!:;0-9])/g, '$1 ')
    .trim();

  // 7. Segmentasi kalimat cerdas (tanpa pemotongan sepihak)
  // Pisahkan berdasarkan tanda baca asli atau transisi klausa utama
  const sentenceDelim = /(?<=[.?!])\s+|(?<=[a-z0-9])\s+(?=(?:hari ini|kita sepakat|budi|davis|tim QA|desain antarmuka|apakah|bagaimana|selain itu|untuk itu)\b)/gi;
  let rawSentences = text.split(sentenceDelim).map(s => s.trim()).filter(Boolean);

  if (rawSentences.length === 0) {
    rawSentences = [text];
  }

  const formattedSentences = rawSentences.map(sentence => {
    let s = sentence.trim();
    if (!s) return '';
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (!/[.?!]$/.test(s)) {
      const isQuestion = /^(?:apakah|bagaimana|gimana|kapan|siapa|kenapa|mengapa|apa\b|bolehkah|bisakah)\b/i.test(s);
      s += isQuestion ? '?' : '.';
    }
    return s;
  });

  const correctedText = formattedSentences.join(' ');
  if (changes.length === 0) {
    changes.push('Normalisasi tata bahasa, huruf kapital, dan tanda baca akhir kalimat');
  }

  return {
    originalText: rawText,
    correctedText,
    changes,
    method: 'nlp_builtin'
  };
}

/**
 * Koreksi Transkrip Menggunakan AI Gemini (Jika API Key Disediakan)
 */
async function correctTranscriptWithAI(rawText, apiKey) {
  if (!apiKey || !apiKey.trim()) {
    return correctTranscriptWithNLP(rawText);
  }

  const prompt = `Anda adalah asisten ahli koreksi transkrip suara bahasa Indonesia.
Tugas Anda:
1. Bersihkan transkrip mentah dari filler words (eh, um, anu, dsb) dan kata berulang karena keraguan bicara.
2. Koreksi kata-kata yang salah tangkap akibat salah dengar Speech-to-Text (misal: "biaya hadir" -> "bisa hadir", "ruang setting" -> "ruang meeting", istilah teknologi/nama).
3. Perbaiki tata bahasa, tanda baca (. , ?), dan format kalimat agar profesional namun tetap mempertahankan makna dan gaya asli pembicara.
4. HANYA berikan teks hasil koreksi bersih tanpa tanda kutip pembuka/penutup dan tanpa komentar atau penjelasan tambahan apa pun.

Transkrip Mentah:
"""
${rawText}
"""`;

  const payload = JSON.stringify({
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048
    }
  });

  return new Promise((resolve) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const candidate = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidate && candidate.trim()) {
            resolve({
              originalText: rawText,
              correctedText: candidate.trim(),
              changes: [
                'Pembersihan filler words dan pemulihan semantik mendalam oleh Gemini 2.0 Flash',
                'Koreksi kata salah dengar kontekstual tingkat lanjut',
                'Penyempurnaan tata bahasa dan tanda baca profesional'
              ],
              method: 'gemini_ai'
            });
            return;
          }
        } catch (e) {
          // fallback
        }
        resolve(correctTranscriptWithNLP(rawText));
      });
    });

    req.on('error', () => resolve(correctTranscriptWithNLP(rawText)));
    req.on('timeout', () => {
      req.destroy();
      resolve(correctTranscriptWithNLP(rawText));
    });

    req.write(payload);
    req.end();
  });
}

module.exports = {
  correctTranscriptWithNLP,
  correctTranscriptWithAI
};
