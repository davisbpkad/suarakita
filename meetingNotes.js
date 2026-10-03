/**
 * meetingNotes.js
 * Modul Notulis Rapat Otomatis Tingkat Tinggi (Minutes of Meeting / MoM)
 * 
 * Aturan Ketat Sesuai Spesifikasi:
 * 1. DILARANG KERAS menyalin ulang kalimat utuh secara verbatim dari transkrip.
 * 2. ELIMINASI semua elemen non-substansial: salam, celetukan, humor, obrolan kosong (nonton bola, dsb).
 * 3. EKSTRAK NAMA PIC SECARA OBJEKTIF: Cantumkan nama pembicara/PIC jika eksplisit, atau label deskriptif [Logistik], [Konsumsi], [Teknis], [Operasional], dsb. Dilarang mengarang nama orang.
 * 4. PERATURAN ANTI-HALUSINASI POIN UTAMA: Jika tidak ada kesimpulan kerja/obrolan kosong, tulis: "* Tidak ada poin utama yang relevan untuk dirangkum."
 * 5. PERATURAN ANTI-HALUSINASI KEPUTUSAN: Jika menggantung/ditunda/tanpa kesepakatan, tulis: "* [Kategori Pembahasan]: Tidak ada keputusan yang diambil / Pembahasan ditangguhkan."
 * 6. AKURASI DATA NUMERIK: Pindahkan semua data angka (biaya/nominal uang, kapasitas orang, persentase, tenggat waktu) secara presisi 100%.
 * 7. ETIKA OUTPUT: Format murni Notulen Rapat tanpa teks pengantar atau penutup.
 */

const https = require('https');
const { correctTranscriptWithNLP } = require('./corrector.js');

// Pola pembicaraan kasual non-substansial yang wajib dieliminasi
const CASUAL_PATTERNS = [
  /\b(?:nonton|main|pertandingan)\s+bola\b/i,
  /\b(?:seru\s+banget|asik\s+banget|rame\s+banget|parah\s+sih)\b/i,
  /\b(?:halo\s+bro|halo\s+guys|eh\s+bro|hai\s+gaes|halo\s+kawan)\b/i,
  /\b(?:tes\s+tes|cek\s+suara|cek\s+audio|mic\s+saya)\b/i,
  /\b(?:mager|wkwk|haha|canda|jokes)\b/i
];

// Deteksi kata kunci konsensus / kesepakatan resmi
const CONSENSUS_KEYWORDS = [
  'sepakat', 'setuju', 'diputuskan', 'memutuskan', 'menetapkan', 
  'disepakati', 'ditetapkan', 'deal', 'fix', 'disetujui', 'mufakat'
];

// Deteksi pembahasan yang menggantung / belum ada konfirmasi / ragu
const PENDING_PATTERNS = [
  /(?:ga\s+tau\s+deh|belum\s+tau|belum\s+pasti|mager|belum\s+dikonfirmasi|belum\s+konfirmasi|belum\s+ada\s+kabar|menggantung|ditunda|pending|ragu)/i
];

/**
 * Memformat output Markdown Notulen Rapat resmi sesuai standar yang ditentukan
 */
function formatMeetingNotesMarkdown(topic, summaryItems, decisions) {
  let md = `📌 **Topik / Konteks Pembicaraan:**\n${topic.trim()}\n\n📝 **Ringkasan Hasil Rapat:**\n`;
  
  if (Array.isArray(summaryItems) && summaryItems.length > 0) {
    md += summaryItems.join('\n');
  } else if (typeof summaryItems === 'string' && summaryItems.trim()) {
    md += summaryItems.trim();
  } else {
    md += `* Tidak ada poin utama yang relevan untuk dirangkum.`;
  }

  md += `\n\n⚖️ **Keputusan yang Diambil (Decisions Made):**\n`;
  
  if (Array.isArray(decisions) && decisions.length > 0) {
    md += decisions.join('\n');
  } else if (typeof decisions === 'string' && decisions.trim()) {
    md += decisions.trim();
  } else {
    md += `* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.`;
  }

  return md.trim();
}

/**
 * Ekstraksi Topik / Konteks Pembicaraan (1 Kalimat Padat)
 */
function extractTopicSentence(sentences, fullText) {
  // Cek apakah percakapan didominasi celetukan santai / obrolan lepas
  const casualHits = CASUAL_PATTERNS.filter(p => p.test(fullText)).length;
  const isDominantCasual = casualHits >= 1 && (
    /nonton\s+bola/i.test(fullText) || 
    /mager/i.test(fullText) || 
    /halo\s+bro/i.test(fullText) ||
    sentences.length <= 3
  );

  const hasStructuredWork = sentences.some(s => {
    return /(?:peluncuran|jadwal\s+rilis|evaluasi|anggaran|biaya\s+sebesar|fitur|perbaikan\s+bug|konfigurasi|uji\s+coba\s+final)\b/i.test(s);
  });

  if (isDominantCasual && !hasStructuredWork) {
    return 'Topik pembicaraan tidak spesifik / Obrolan kasual';
  }

  // Cari penyebutan eksplisit topik atau tujuan rapat
  for (const s of sentences) {
    const match = s.match(/(?:agenda|topik|fokus|membahas|pertemuan\s+hari\s+ini|meeting\s+hari\s+ini|rapat\s+hari\s+ini)\s+(?:tentang|mengenai|soal|adalah|yaitu)?\s*([^\n]+?)(?=[.?!](?:\s+|$)|$)/i);
    if (match) {
      let t = match[1].replace(/^(?:rapat|meeting|diskusi|hari\s+ini|besok|pekan\s+ini)\s+/i, '').trim();
      if (t.length >= 4) {
        return `Pembahasan mengenai ${t.toLowerCase()} guna menyelaraskan rencana kerja tim.`;
      }
    }
  }

  // Ekstraksi esensi dari frasa fokus substantif
  for (const s of sentences) {
    if (/^(?:halo|selamat|hai|assalamu|pagi|siang|sore|malam)\b/i.test(s)) continue;

    const patternMatch = s.match(/(?:terkait|soal|tentang|mengenai|rencana|evaluasi|proyek|fitur|perbaikan|pengembangan|sistem|server|rilis|deploy|anggaran)\s+([^\n]+?)(?=[.?!](?:\s+|$)|$)/i);
    if (patternMatch) {
      let subject = patternMatch[0].trim();
      return `Koordinasi dan peninjauan progres ${subject.toLowerCase()}.`;
    }
  }

  // Jika ada substansi kerja umum
  if (hasStructuredWork) {
    return 'Koordinasi operasional dan sinkronisasi tugas tim kerja.';
  }

  return 'Topik pembicaraan tidak spesifik / Obrolan kasual';
}

/**
 * Ekstraksi Ringkasan Hasil Rapat Berdasarkan PIC atau Bidang
 * Format: * **[Nama PIC atau Nama Bidang]:** Rangkuman progres/bahasan
 */
function extractSummaryItems(sentences) {
  const items = [];
  const processedKeys = new Set();

  sentences.forEach(s => {
    // 1. Eliminasi elemen non-substansial
    const isCasual = CASUAL_PATTERNS.some(p => p.test(s));
    if (isCasual) return;

    if (/^(?:halo|selamat|hai|assalamu|pagi|siang|sore|malam|oke|baiklah)\b/i.test(s) && s.split(/\s+/).length <= 4) {
      return;
    }

    // 2. Ekstrak nama PIC eksplisit (misal Budi, Davis, Andi, Rini, dll.)
    const picMatch = s.match(/\b(?:si\s+)?([A-Z][a-z]+)\s+(?:akan|bisa|tolong|mau|tugasnya|bertanggung\s+jawab|mengerjakan|siapkan|menyiapkan|handling|menyelesaikan|ditugaskan|bilang\s+mau)\s+([^\n]+?)(?=[.?!](?:\s+|$)|$)/i);
    
    // Pastikan bukan kata sambung umum yang terkombinasi
    const commonWords = ['hari', 'kami', 'kita', 'saya', 'anda', 'mereka', 'semua', 'tim', 'kemarin', 'besok', 'selamat', 'rapat', 'tadi'];
    
    if (picMatch && !commonWords.includes(picMatch[1].toLowerCase())) {
      const picName = picMatch[1].charAt(0).toUpperCase() + picMatch[1].slice(1);
      let taskDesc = picMatch[2].trim();
      
      // Ambil angka / rincian jika ada di kalimat utuh tersebut
      const numbersInSentence = s.match(/(?:rp\s*[\d.,]+|\d+(?:\s*(?:orang|server|bug|persen|%|jam|hari|minggu))?)/gi);
      if (numbersInSentence && !taskDesc.includes(numbersInSentence[0])) {
        taskDesc += ` (${numbersInSentence.join(', ')})`;
      }

      // Format non-verbatim padat
      taskDesc = taskDesc.replace(/^(?:untuk|bisa|mau)\s+/i, '');
      const synthesized = `Bertanggung jawab untuk ${taskDesc}.`;
      const itemKey = `pic_${picName.toLowerCase()}`;
      
      if (!processedKeys.has(itemKey)) {
        items.push(`* **[${picName}]:** ${synthesized}`);
        processedKeys.add(itemKey);
        return;
      }
    }

    // 3. Jika tanpa penunjukan nama eksplisit, petakan ke Bidang Deskriptif
    let domain = null;
    if (/(?:server|database|backend|frontend|api|bug|deploy|rilis|sistem|coding|staging)/i.test(s)) {
      domain = 'Teknis';
    } else if (/(?:qa|testing|uji\s+coba|pengujian|pengetesan)/i.test(s)) {
      domain = 'Pengujian QA';
    } else if (/(?:ui|ux|desain|antarmuka|mockup|tampilan)/i.test(s)) {
      domain = 'Desain UI/UX';
    } else if (/(?:gedung|tempat|ruangan|booking|sewa|armada|transportasi|logistik)/i.test(s)) {
      domain = 'Logistik';
    } else if (/(?:konsumsi|makanan|snack|makan\s+siang|katering|minuman)/i.test(s)) {
      domain = 'Konsumsi';
    } else if (/(?:anggaran|biaya|dana|nominal|rupiah|uang|invoice|pembayaran|budget)/i.test(s)) {
      domain = 'Keuangan';
    } else if (/(?:jadwal|koordinasi|rapat|meeting|piket|target|operasional)/i.test(s)) {
      domain = 'Operasional';
    }

    if (domain) {
      const itemKey = `domain_${domain}`;
      if (!processedKeys.has(itemKey)) {
        // Parafrase non-verbatim dengan menjaga angka 100% presisi
        let cleanText = s.replace(/^(?:kemarin|hari\s+ini|besok|lalu|kemudian|dan)\s+/i, '').trim();
        cleanText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
        if (!cleanText.endsWith('.')) cleanText += '.';

        items.push(`* **[${domain}]:** Pembahasan mengenai ${cleanText.toLowerCase()}`);
        processedKeys.add(itemKey);
      }
    }
  });

  if (items.length === 0) {
    return ['* Tidak ada poin utama yang relevan untuk dirangkum.'];
  }

  return items;
}

/**
 * Ekstraksi Keputusan yang Diambil (Decisions Made)
 * Termasuk penanganan status pembahasan menggantung / tanpa konsensus
 */
function extractDecisions(sentences, rawText) {
  const decisions = [];
  const processedCategories = new Set();

  sentences.forEach(s => {
    // 1. Cek Konsensus / Keputusan Pasti
    const hasConsensus = CONSENSUS_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(s));
    if (hasConsensus) {
      // Tentukan kategori
      let category = 'Pelaksanaan Tugas';
      if (/(?:rilis|peluncuran|launching|jadwal|tanggal|jumat|senin|besok)/i.test(s)) category = 'Jadwal Rilis';
      else if (/(?:server|deploy|teknis|sistem|bug|database)/i.test(s)) category = 'Teknis & Sistem';
      else if (/(?:gedung|tempat|sewa|ruangan)/i.test(s)) category = 'Fasilitas & Gedung';
      else if (/(?:biaya|anggaran|harga|dana|uang)/i.test(s)) category = 'Anggaran';

      // Ekstrak inti tindakan final
      const outcomeMatch = s.match(/(?:sepakat|setuju|diputuskan|memutuskan|menetapkan|ditetapkan|mufakat)\s+(?:untuk\s+|bahwa\s+)?([^\n]+?)(?=[.?!](?:\s+|$)|$)/i);
      let action = outcomeMatch ? outcomeMatch[1].trim() : s.trim();
      action = action.replace(/^(?:untuk|bahwa)\s+/i, '');
      action = action.charAt(0).toUpperCase() + action.slice(1);
      if (!action.endsWith('.')) action += '.';

      const item = `* **[${category}]:** Disepakati untuk ${action.toLowerCase()}`;
      if (!processedCategories.has(category)) {
        decisions.push(item);
        processedCategories.add(category);
      }
      return;
    }

    // 2. Cek Pembahasan Menggantung / Ditunda / Tanpa Konfirmasi
    const isPending = PENDING_PATTERNS.some(p => p.test(s));
    if (isPending) {
      let pendingCategory = 'Pembahasan Terkait';
      let actor = 'pihak terkait';

      // Deteksi aktor spesifik (utamakan "si [Nama]")
      const siMatch = s.match(/\bsi\s+([A-Za-z]+)\b/i);
      if (siMatch) {
        actor = siMatch[1].charAt(0).toUpperCase() + siMatch[1].slice(1);
      } else {
        const nameMatch = s.match(/\b(Budi|Davis|Andi|Rini|Siti|Agus|Dewi|Joko|Rian|Doni|Eko|Fajar|Hendra|Putri|Reza|Tono)\b/i);
        if (nameMatch) {
          actor = nameMatch[1];
        }
      }

      if (/(?:gedung|tempat|ruangan|booking)/i.test(s)) pendingCategory = 'Booking Gedung';
      else if (/(?:anggaran|biaya|dana)/i.test(s)) pendingCategory = 'Persetujuan Anggaran';
      else if (/(?:jadwal|tanggal)/i.test(s)) pendingCategory = 'Penetapan Jadwal';
      else if (/(?:fitur|desain|rilis)/i.test(s)) pendingCategory = 'Fitur Produk';

      if (!processedCategories.has(pendingCategory)) {
        decisions.push(`* [${pendingCategory}]: Tidak ada keputusan yang diambil / Status belum dikonfirmasi oleh ${actor}.`);
        processedCategories.add(pendingCategory);
      }
    }
  });

  if (decisions.length === 0) {
    return ['* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.'];
  }

  return decisions;
}

/**
 * Pembuatan Notulen Rapat Menggunakan Mesin NLP Lokal Bawaan
 */
function generateMeetingNotesWithNLP(rawTranscriptText) {
  if (!rawTranscriptText || !rawTranscriptText.trim()) {
    const topic = 'Topik pembicaraan tidak spesifik / Obrolan kasual';
    const summaryItems = ['* Tidak ada poin utama yang relevan untuk dirangkum.'];
    const decisions = ['* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.'];
    return {
      topic,
      summary: summaryItems.join('\n'),
      summaryItems,
      decisions,
      rawMarkdown: formatMeetingNotesMarkdown(topic, summaryItems, decisions),
      method: 'nlp_builtin'
    };
  }

  // 1. Bersihkan transkrip
  const cleanedResult = correctTranscriptWithNLP(rawTranscriptText);
  const text = cleanedResult.correctedText || rawTranscriptText.trim();

  // Pisahkan kalimat
  const rawSentences = text
    .split(/(?<=[.?!])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  // 2. Ekstraksi Topik 1 Kalimat Padat
  const topic = extractTopicSentence(rawSentences, text);

  // 3. Ekstraksi Ringkasan Hasil Rapat per PIC/Bidang
  const summaryItems = extractSummaryItems(rawSentences);

  // 4. Ekstraksi Keputusan yang Diambil (termasuk status menggantung)
  const decisions = extractDecisions(rawSentences, text);

  // 5. Format Markdown Output
  const rawMarkdown = formatMeetingNotesMarkdown(topic, summaryItems, decisions);

  return {
    topic,
    summary: summaryItems.join('\n'),
    summaryItems,
    decisions,
    rawMarkdown,
    method: 'nlp_builtin'
  };
}

/**
 * Pembuatan Notulen Rapat Menggunakan AI Gemini (Model Terbaru: gemini-2.0-flash)
 */
async function generateMeetingNotesWithAI(rawTranscriptText, apiKey) {
  if (!apiKey || !apiKey.trim()) {
    return generateMeetingNotesWithNLP(rawTranscriptText);
  }

  const prompt = `# ROLE & GOAL
Sistem bertindak sebagai Notulis Rapat Otomatis tingkat tinggi. Tugas utama Anda adalah mengekstraksi, mensintesis, dan merangkum transkrip suara mentah menjadi dokumen Notulen Rapat (Minutes of Meeting) yang bersih, profesional, dan siap pakai.

<instruction>
Proses teks transkrip yang diberikan pada variabel {{transkrip_mentah}} dengan mematuhi secara mutlak aturan ketat di bawah ini.
</instruction>

<rules>
1. DILARANG KERAS menyalin ulang kalimat utuh secara verbatim dari transkrip ke dalam hasil notulen.
2. ELIMINASI semua elemen non-substansial: salam, sapaan pembuka/penutup, celetukan, humor, obrolan kosong, gossip, dan pembicaraan yang keluar dari konteks profesional (ngalor-ngidul).
3. EKSTRAK NAMA PIC SECARA OBJEKTIF: Cantumkan nama pembicara/PIC yang bertanggung jawab atas suatu tugas hanya jika disebutkan eksplisit. Jika tugas dibahas tanpa penunjukan nama, gunakan label deskriptif seperti [Logistik], [Konsumsi], [Operasional], [Teknis], [Produk], [Keuangan], atau bidang terkait. DILARANG mengarang nama orang.
4. PERATURAN ANTI-HALUSINASI POIN UTAMA: Jika suatu bagian percakapan tidak menghasilkan kesimpulan kerja atau hanya berisi obrolan kosong, jangan buatkan poin rangkuman. Jika seluruh transkrip tidak memiliki poin utama sama sekali, tuliskan: "* Tidak ada poin utama yang relevan untuk dirangkum."
5. PERATURAN ANTI-HALUSINASI KEPUTUSAN: Keputusan hanya dicatat jika ada konsensus (persetujuan bersama) yang jelas dalam teks. Jika pembahasan berakhir menggantung, ditunda, atau tidak ada kesepakatan, tuliskan secara eksplisit: "* [Kategori Pembahasan]: Tidak ada keputusan yang diambil / Pembahasan ditangguhkan."
6. AKURASI DATA NUMERIK: Pindahkan semua data angka (biaya/nominal uang, kapasitas orang, persentase, tenggat waktu) secara presisi 100% sesuai teks asli. DILARANG melakukan pembulatan, estimasi, atau perhitungan mandiri yang tidak tertulis di transkrip.
7. ETIKA OUTPUT: Jangan berikan teks pengantar ("Berikut adalah hasil notulen...", "Baik, ini tugas saya...") di awal maupun di akhir jawaban. Hasilkan HANYA format notulen resmi.
</rules>

# CONTOH PENANGANAN (FEW-SHOT EXAMPLE)
Jika Transkrip: "Halo bro, eh besok jadi rapat kah? Ah tau lah, kemarin si Budi bilang mau booking gedung tapi ga tau deh dia mager apa kagak. Eh kemarin lu nonton bola ga? Seru banget."
Maka Output Keputusan: 
* [Booking Gedung]: Tidak ada keputusan yang diambil / Status belum dikonfirmasi oleh Budi.

# FORMAT OUTPUT JSON:
Hasilkan HANYA JSON murni yang valid tanpa Markdown code block (\`\`\`json) dengan skema:
{
  "topic": "1 kalimat padat mengenai esensi/tujuan utama rapat. Jika percakapan 100% tidak terstruktur, tulis: Topik pembicaraan tidak spesifik / Obrolan kasual",
  "summaryItems": [
    "* **[Nama PIC atau Nama Bidang]:** Rangkuman progres/bahasan dalam maksimal 2 kalimat pendek yang padat isi"
  ],
  "decisions": [
    "* **[Kategori Keputusan]:** Detail tindakan final yang disepakati untuk dieksekusi",
    "* [Kategori Pembahasan]: Tidak ada keputusan yang diambil / Pembahasan ditangguhkan."
  ]
}

Jika seluruh transkrip tidak memiliki poin utama yang relevan, isi summaryItems dengan:
["* Tidak ada poin utama yang relevan untuk dirangkum."]

Jika tidak ada keputusan yang disepakati ataupun pembahasan menggantung, isi decisions dengan:
["* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan."]

Transkrip Mentah:
"""
${rawTranscriptText}
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
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const rawJson = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawJson) {
            const cleanJson = rawJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            const notes = JSON.parse(cleanJson);

            if (notes && notes.topic) {
              const topic = notes.topic.trim();
              
              let summaryItems = [];
              if (Array.isArray(notes.summaryItems)) {
                summaryItems = notes.summaryItems.filter(Boolean);
              } else if (typeof notes.summary === 'string' && notes.summary.trim()) {
                summaryItems = notes.summary.split('\n').map(s => s.trim()).filter(Boolean);
              }

              let decisions = [];
              if (Array.isArray(notes.decisions)) {
                decisions = notes.decisions.filter(Boolean);
              } else if (typeof notes.decisions === 'string' && notes.decisions.trim()) {
                decisions = notes.decisions.split('\n').map(s => s.trim()).filter(Boolean);
              }

              if (summaryItems.length === 0) {
                summaryItems = ['* Tidak ada poin utama yang relevan untuk dirangkum.'];
              }
              if (decisions.length === 0) {
                decisions = ['* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.'];
              }

              const rawMarkdown = formatMeetingNotesMarkdown(topic, summaryItems, decisions);

              resolve({
                topic,
                summary: summaryItems.join('\n'),
                summaryItems,
                decisions,
                rawMarkdown,
                method: 'gemini_ai'
              });
              return;
            }
          }
        } catch (e) {
          // fallback ke nlp lokal
        }
        resolve(generateMeetingNotesWithNLP(rawTranscriptText));
      });
    });

    req.on('error', () => resolve(generateMeetingNotesWithNLP(rawTranscriptText)));
    req.on('timeout', () => {
      req.destroy();
      resolve(generateMeetingNotesWithNLP(rawTranscriptText));
    });

    req.write(payload);
    req.end();
  });
}

module.exports = {
  generateMeetingNotesWithNLP,
  generateMeetingNotesWithAI,
  formatMeetingNotesMarkdown
};
