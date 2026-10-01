/**
 * corrector.js
 * Modul Koreksi Transkrip Cerdas (Smart Transcript Correction)
 * 
 * Fitur:
 * 1. Perbaikan Kesalahan Dengar Fonetis Kontekstual Industri Teknologi & Bisnis:
 *    - "range roaming" -> "brainstorming"
 *    - "convention Redmi" -> "conversion rate"
 *    - "downline total" -> "downtime total"
 *    - "bab / BAB" -> "bug" (kecuali jika Bab buku)
 *    - "untuk 4 / di 4" -> "untuk Kuartal 4 / Q4"
 *    - "setting" -> "meeting" (konteks rapat/ruangan)
 *    - "biaya" ↔ "bisa" (konteks kesanggupan vs harga)
 *    - Istilah tech lainnya: deploy, launching, backend, frontend, pull request, merge, database, REST API, dll.
 * 2. Pembersihan Interupsi Pembicara & Audio Test:
 *    - Tes mic ("tes tes 1 2 3", "cek audio")
 *    - Pengecekan suara ("suara saya kedengaran gak", "mic saya jelas gak")
 *    - Selaan obrolan ("tunggu bentar bentar", "sorry kepotong", "oke lanjut")
 * 3. Pembersihan Filler Words & Pengulangan Kata / Gagap Lisan
 * 4. Normalisasi Singkatan Lisan Indonesia ke Bentuk Baku
 * 5. Kapitalisasi Akronim & Format Tanda Baca
 * 
 * Filosofi: Ringan, stateless (tanpa bug regex stateful), sub-milidetik, tanpa dependensi berat (Ponytail).
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
  [/\bresiko\b/gi, 'risiko'],
  [/\banalisa\b/gi, 'analisis'],
  [/\bjadual\b/gi, 'jadwal'],
  [/\befektip\b/gi, 'efektif'],
  [/\bkwalitas\b/gi, 'kualitas']
];

// Akronim teknologi dan bisnis yang harus berhuruf kapital
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
  [/\bpic\b/gi, 'PIC'],
  [/\bkpi\b/gi, 'KPI'],
  [/\bokr\b/gi, 'OKR'],
  [/\broas\b/gi, 'ROAS'],
  [/\bceo\b/gi, 'CEO'],
  [/\bcto\b/gi, 'CTO'],
  [/\bcpo\b/gi, 'CPO'],
  [/\bcfo\b/gi, 'CFO'],
  [/\bsop\b/gi, 'SOP'],
  [/\bsla\b/gi, 'SLA'],
  [/\bdb\b/gi, 'DB'],
  [/\bsql\b/gi, 'SQL'],
  [/\baws\b/gi, 'AWS'],
  [/\bgcp\b/gi, 'GCP']
];

/**
 * Koreksi Transkrip Menggunakan Mesin NLP Lokal Bawaan
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

  // 1. Pembersihan Interupsi Pembicara & Audio Test
  const beforeInterruption = text;
  text = text.replace(/\b(?:halo\s+)?(?:tes|test)\s+(?:tes|test)?\s*(?:1\s*2\s*3|audio|suara|mic)?\b[.?!,]?\s*/gi, '');
  text = text.replace(/\b(?:suara\s+saya\s+(?:kedengaran|jelas|masuk)\s*(?:gak|tidak|ya)?|kedengaran\s+gak\s+suara\s+saya|mic\s+saya\s+(?:jelas|kedengaran)\s*(?:gak|tidak|ya)?)\s*(?:ya)?[.?!,]?\s*/gi, '');
  text = text.replace(/\b(?:tunggu\s+)?(?:bentar|sebentar)+(?:[,\s]+(?:bentar|sebentar|dulu|ya))*\b[.?!,]?\s*/gi, '');
  text = text.replace(/\b(?:eh\s+)?(?:sori|sorry|maaf)\s*(?:kepotong|sorry|sori)?\b[.?!,]?\s*/gi, '');
  text = text.replace(/\b(?:bisa\s+diulang\s+gak|tadi\s+putus[\s-]putus)\b[.?!,]?\s*/gi, '');
  text = text.replace(/\b(?:oke\s+lanjut\s+lanjut|oke\s+lanjut|silakan\s+lanjut)\b[.?!,]?\s*/gi, '');
  if (text !== beforeInterruption) {
    changes.push('Pembersihan interupsi pembicara dan pengujian mikrofon/audio');
  }

  // 2. Bersihkan filler words lisan (kata jeda)
  const beforeFiller = text;
  text = text.replace(/\b(?:eh+|anu|umm?|uhh?|hmmm?|eee+|aaa+|you\s+know)\b\s*/gi, ' ');
  if (text !== beforeFiller) {
    changes.push('Pembersihan kata jeda lisan (filler words: eh, anu, dll)');
  }

  // 3. Bersihkan pengulangan kata gagap / kata berulang
  const beforeStutter = text;
  text = text.replace(/\b([a-zA-ZÀ-ÿ0-9]{2,})[,\s]+\1\b/gi, '$1');
  text = text.replace(/\b(kita harus|saya mau|akan ada|bisa kita|sudah kita|untuk itu)[,\s]+\1\b/gi, '$1');
  if (text !== beforeStutter) {
    changes.push('Penghapusan pengulangan kata berulang / gagap');
  }

  // 4. Perbaikan Kesalahan Dengar Berbasis Fonetis (Konteks Industri Teknologi & Bisnis)
  const beforePhonetic = text;

  // A. "range roaming" -> "brainstorming"
  text = text.replace(/\b(?:range\s+roaming|renge\s+roming|renj\s+roming|bren\s+storming|brain\s+stroming|brain\s+storming)\b/gi, 'brainstorming');

  // B. "convention Redmi" -> "conversion rate"
  text = text.replace(/\b(?:convention\s+redmi|konvensi\s+redmi|konvesi\s+redmi|conversion\s+redmi|convention\s+rate)\b/gi, 'conversion rate');

  // C. "downline total" -> "downtime total"
  text = text.replace(/\b(?:downline\s+total|down\s+line\s+total)\b/gi, 'downtime total');
  text = text.replace(/\bdownline\b(?=\s+(?:server|sistem|aplikasi|database|website|jaringan|infrastruktur))/gi, 'downtime');
  text = text.replace(/\b(?:server|sistem|aplikasi|database|website)\s+downline\b/gi, '$1 downtime');

  // D. "bab / BAB" -> "bug" (Kecuali jika merujuk pada Bab buku/dokumen seperti "Bab 1", "Bab 2")
  text = text.replace(/\b(ada|laporan|temukan|menemukan|banyak|semua|seluruh|fix|fixing|perbaiki|perbaikan|penanganan|analisis|cek|daftar|list|tumpukan)\s+(?:bab|bak)\b/gi, '$1 bug');
  text = text.replace(/\b(?:bab|bak)\b(?=\s+(?:ini|itu|tersebut|kritis|blocker|major|minor|aplikasi|sistem|tampilan|alur|payment|transaksi|login|database|crash))/gi, 'bug');
  text = text.replace(/\b(?:fix|fixing|perbaiki|atasi)\s+(?:semua\s+)?(?:bab|bak)\b/gi, 'perbaiki bug');
  text = text.replace(/\bBAB\b(?=\s+(?:kritis|blocker|aplikasi|sistem|di|pada|payment|login|baru|lama|ini|itu))/g, 'bug');
  text = text.replace(/\b(?:laporan|banyak|semua|fix|ada)\s+BAB\b/g, '$1 bug');

  // E. "untuk 4" / "di 4" -> "untuk Kuartal 4 / Q4"
  text = text.replace(/\b(kuarter|kuartir|kiu)\s*4\b/gi, 'Kuartal 4 (Q4)');
  text = text.replace(/\b(kuarter|kuartir|kiu)\s*1\b/gi, 'Kuartal 1 (Q1)');
  text = text.replace(/\b(kuarter|kuartir|kiu)\s*2\b/gi, 'Kuartal 2 (Q2)');
  text = text.replace(/\b(kuarter|kuartir|kiu)\s*3\b/gi, 'Kuartal 3 (Q3)');
  text = text.replace(/\b(untuk|target|pada|di|rencana|jadwal)\s+(?:kuartal\s+)?4\b(?=\s+(?:nanti|mendatang|tahun\s+ini|depan|ini|[.,?!]|$))/gi, '$1 Kuartal 4 (Q4)');
  text = text.replace(/\b(untuk|target|pada|di|rencana|jadwal)\s+(?:kuartal\s+)?1\b(?=\s+(?:nanti|mendatang|tahun\s+ini|depan|ini|[.,?!]|$))/gi, '$1 Kuartal 1 (Q1)');
  text = text.replace(/\b(untuk|target|pada|di|rencana|jadwal)\s+(?:kuartal\s+)?2\b(?=\s+(?:nanti|mendatang|tahun\s+ini|depan|ini|[.,?!]|$))/gi, '$1 Kuartal 2 (Q2)');
  text = text.replace(/\b(untuk|target|pada|di|rencana|jadwal)\s+(?:kuartal\s+)?3\b(?=\s+(?:nanti|mendatang|tahun\s+ini|depan|ini|[.,?!]|$))/gi, '$1 Kuartal 3 (Q3)');
  text = text.replace(/Kuartal\s*4\s*\(Kuartal\s*4\s*\(Q4\)\)/gi, 'Kuartal 4 (Q4)');

  // F. "setting" vs "meeting"
  text = text.replace(/\b(ruang|jadwal|waktu|agenda|link|hasil|ikutan|hadir\s+di|adakan|selesai|undangan)\s+setting\b/gi, '$1 meeting');
  text = text.replace(/\b(kita|kami)\s+setting\b/gi, '$1 meeting');
  text = text.replace(/\bsetting\s+(evaluasi|mingguan|bulanan|proyek|tim|koordinasi|zoom|online|daring|internal)\b/gi, 'meeting $1');
  text = text.replace(/\bzoom\s+setting\b/gi, 'zoom meeting');

  // G. "biaya" vs "bisa"
  text = text.replace(/\b(apakah\s+(?:kita|kamu|anda|dia|mereka))\s+biaya\b/gi, '$1 bisa');
  text = text.replace(/\b(kita|saya|aku|kamu|mereka|pasti|harus|tidak|belum|sudah)\s+biaya\b/gi, '$1 bisa');
  text = text.replace(/\bbiaya\s+(hadir|datang|ikut|bantu|mengerjakan|selesai|cek|perbaiki|siapkan|menyiapkan|rilis|deploy|merge)\b/gi, 'bisa $1');
  text = text.replace(/\b(berapa|total|rincian|estimasi|anggaran)\s+bisa\b/gi, '$1 biaya');
  text = text.replace(/\bbisa\s+(perbaikan|langganan|operasional|server|domain|cloud|maintenance)\b/gi, 'biaya $1');

  // H. Istilah Tech & Bisnis lainnya
  text = text.replace(/\bloncing\b|\blouncing\b/gi, 'launching');
  text = text.replace(/\bdiploy\b|\bdi\s+ploy\b|\bdeploi\b/gi, 'deploy');
  text = text.replace(/\brelese\b|\breles\b/gi, 'rilis');
  text = text.replace(/\bback\s+end\b|\bbeken\b|\bbeck\s+end\b/gi, 'backend');
  text = text.replace(/\bfront\s+end\b|\bfronte\b|\bfronen\b/gi, 'frontend');
  text = text.replace(/\bpull\s+rekues\b|\bpol\s+request\b|\bpul\s+rekues\b/gi, 'pull request');
  text = text.replace(/\bdedline\b|\bdetlen\b|\bdateline\b/gi, 'deadline');
  text = text.replace(/\bstan\s+ap\b|\bsten\s+ap\b/gi, 'standup');
  text = text.replace(/\bdata\s+bes\b|\bdatabes\b/gi, 'database');
  text = text.replace(/\bres\s+api\b|\brest\s+api\b/gi, 'REST API');
  text = text.replace(/\bprodaksen\b/gi, 'production');
  text = text.replace(/\bstejing\b|\bstageing\b/gi, 'staging');
  text = text.replace(/\bcek\s+out\b|\bcekot\b/gi, 'checkout');
  text = text.replace(/\btrefik\b|\btrafik\b/gi, 'traffic');

  if (text !== beforePhonetic) {
    changes.push('Koreksi salah dengar fonetis industri teknologi & bisnis (brainstorming, conversion rate, downtime, bug, Q4, dll)');
  }

  // 5. Normalisasi singkatan percakapan lisan
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

  // 6. Huruf kapital untuk akronim teknologi & bisnis
  TECH_ACRONYMS.forEach(([pattern, replacement]) => {
    text = text.replace(new RegExp(pattern.source, 'gi'), replacement);
  });

  // 7. Perapihan spasi berlebih
  text = text.replace(/\s{2,}/g, ' ').trim();

  // 8. Kapitalisasi awal kalimat dan tanda baca alami
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
    // Tambahkan tanda baca titik jika belum diakhiri tanda baca terminal
    if (!/[.?!]$/.test(text)) {
      if (/^(?:apakah|bagaimana|kapan|kenapa|mengapa|siapa|berapa)\b/i.test(text)) {
        text += '?';
      } else {
        text += '.';
      }
    }
  }

  return {
    originalText: rawText,
    correctedText: text,
    changes,
    method: 'nlp_builtin'
  };
}

/**
 * Koreksi Transkrip Menggunakan Google Gemini AI (Jika API Key Disediakan)
 */
async function correctTranscriptWithAI(rawText, apiKey) {
  if (!apiKey || !apiKey.trim()) {
    return correctTranscriptWithNLP(rawText);
  }

  const prompt = `Anda adalah editor transkrip percakapan bahasa Indonesia profesional khusus industri teknologi dan bisnis.
Tugas Anda adalah membersihkan dan mengoreksi draf transkrip mentah berikut.

Aturan Ketat Koreksi:
1. PERBAIKAN KATA (Contextual Correction): Perbaiki kesalahan dengar berbasis fonetis secara otomatis berdasarkan konteks industri teknologi/bisnis:
   - Contoh: "range roaming" -> "brainstorming"
   - "convention Redmi" -> "conversion rate"
   - "downline total" -> "downtime total"
   - "bab/BAB" -> "bug" (kecuali jika merujuk pada Bab buku/laporan)
   - "untuk 4 / di 4" -> "untuk Kuartal 4 / Q4"
   - "ruang setting" -> "ruang meeting"
   - "biaya hadir" -> "bisa hadir"
2. Bersihkan interupsi pembicara (tes audio, cek mic, selaan "tunggu bentar", "sorry kepotong", dll).
3. Hapus kata-kata berulang/gagap lisan dan filler words (eh, anu, um, hmmm).
4. Ubah kata singkatan tidak baku (yg, dgn, utk, sdh, blm, sy, tdk) menjadi kata baku bahasa Indonesia.
5. Pertahankan substansi dan fakta asli pembicaraan tanpa mengurangi informasi penting.

Format output WAJIB berupa JSON murni dengan skema:
{
  "correctedText": "Teks transkrip yang telah dikoreksi bersih dan rapi",
  "changes": ["Daftar ringkas perbaikan yang telah dilakukan"]
}

HANYA berikan JSON valid tanpa markdown formatting (jangan gunakan \`\`\`json).

Draf Transkrip Mentah:
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
      responseMimeType: 'application/json'
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
          const rawJson = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawJson) {
            const cleanJson = rawJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            const result = JSON.parse(cleanJson);
            if (result && result.correctedText) {
              resolve({
                originalText: rawText,
                correctedText: result.correctedText,
                changes: result.changes || ['Pembersihan dan koreksi cerdas via Gemini 2.0 Flash AI'],
                method: 'gemini_ai'
              });
              return;
            }
          }
        } catch (e) {
          // fallback to local NLP
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
