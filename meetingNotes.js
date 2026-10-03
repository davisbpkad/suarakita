/**
 * meetingNotes.js
 * Modul NOTULEN RAPAT (Minutes of Meeting / MoM)
 * 
 * Aturan Ketat:
 * 1. PERBAIKAN KATA (Contextual Correction):
 *    Transkrip mentah otomatis dibersihkan dan dikoreksi fonetis kontekstual teknologi/bisnis terlebih dahulu.
 * 2. KEPUTUSAN YANG DIAMBIL (Decisions Made):
 *    Hanya menuliskan poin hasil akhir yang disepakati secara ringkas.
 *    TIDAK PERNAH memasukkan draf perdebatan, argumen pro-kontra, atau dialog panjang pembicara.
 * 3. RINGKASAN:
 *    Ringkasan eksekutif tepat 2-3 kalimat yang padat dan komprehensif.
 * 4. FORMAT OUTPUT WAJIB:
 *    NOTULEN RAPAT (Minutes of Meeting)
 * 
 *    📌 Topik / Konteks Pembicaraan:
 *    ...
 * 
 *    📝 Ringkasan Hasil Rapat:
 *    ...
 * 
 *    💡 Poin-Poin Utama (Key Takeaways):
 *    * ...
 * 
 *    ⚖️ Keputusan yang Diambil (Decisions Made):
 *    * ...
 * 
 * Filosofi: Ringan, instan, deterministik, sub-milidetik, tanpa membebani server (Ponytail).
 */

const https = require('https');
const { correctTranscriptWithNLP } = require('./corrector.js');

// Kata kunci pendeteksi keputusan rapat resmi
const DECISION_KEYWORDS = [
  'sepakat', 'setuju', 'putuskan', 'memutuskan', 'disepakati', 'keputusan',
  'menetapkan', 'diputuskan', 'deal', 'fix', 'disetujui', 'ditetapkan', 'mufakat'
];

// Kata-kata yang menandakan perdebatan/argumen (wajib disaring dari bagian keputusan)
const DEBATE_PATTERNS = [
  /\b(?:sempat\s+ada\s+perdebatan|ada\s+perdebatan|perdebatan\s+panjang)\b/i,
  /\b(?:pro\s+dan\s+kontra|ada\s+yang\s+menolak|sempat\s+menolak)\b/i,
  /\b(?:berpendapat\s+bahwa|menurut\s+saya|menurut\s+pandangan|argumen)\b/i,
  /\b(?:awalnya\s+diusulkan|sebagian\s+mengusulkan|ada\s+keraguan)\b/i
];

/**
 * Ekstraksi Topik Cerdas Berdasarkan Substansi Percakapan Nyata
 * (Menghindari topik template generik)
 */
function extractSmartTopic(sentences, fullText) {
  // 1. Deteksi penyebutan eksplisit topik atau agenda rapat
  for (const s of sentences) {
    const explicitMatch = s.match(/(?:agenda|topik|fokus|bahasan|membahas|pertemuan\s+hari\s+ini|meeting\s+hari\s+ini|rapat\s+hari\s+ini)\s+(?:tentang|mengenai|soal|adalah|yaitu)?\s*([^.?!,;]+)/i);
    if (explicitMatch) {
      let candidate = explicitMatch[1]
        .replace(/^(?:rapat|meeting|diskusi|hari\s+ini|besok|pekan\s+ini)\s+/i, '')
        .trim();
      candidate = cleanTopicString(candidate);
      if (candidate.length >= 4 && candidate.length <= 60) {
        return candidate;
      }
    }
  }

  // 2. Ekstrak frasa inti dari kalimat pembuka yang bermakna (mengabaikan salam)
  for (const s of sentences) {
    if (/^(?:halo|selamat|hai|assalamu|pagi|siang|sore|malam|tes|cek)\b/i.test(s)) continue;

    // Pola fokus spesifik: masalah, proyek, fitur, jadwal, kendala, server, dsb.
    const patternMatch = s.match(/(?:terkait|soal|tentang|mengenai|rencana|masalah|kendala|evaluasi|proyek|fitur|jadwal|target|perbaikan|pengembangan|sistem|server|database|anggaran|biaya|rilis|deploy)\s+([^.?!,;]+)/i);
    if (patternMatch) {
      let candidate = cleanTopicString(patternMatch[0]);
      if (candidate.length >= 6 && candidate.length <= 60) {
        return candidate;
      }
    }

    // Ambil klausa utama pertama yang padat
    const firstClause = s.split(/[,;]/)[0].trim();
    if (firstClause.length >= 8 && firstClause.length <= 55) {
      let candidate = cleanTopicString(firstClause);
      if (candidate.length >= 6) {
        return candidate;
      }
    }
  }

  // 3. Ekstraksi kata-kata kunci utama jika kalimat tidak terstruktur formal
  const cleanWords = fullText
    .replace(/^(?:halo|selamat\s+(?:pagi|siang|sore|malam)|assalamualaikum|hai)\s*[,.?!]?\s*/i, '')
    .trim()
    .split(/\s+/)
    .slice(0, 7)
    .join(' ')
    .replace(/[.?!,]+$/, '');

  if (cleanWords.length >= 5) {
    return cleanTopicString(cleanWords);
  }

  return 'Catatan Percakapan';
}

function cleanTopicString(str) {
  let s = (str || '').trim().replace(/\s+/g, ' ');
  s = s.replace(/^(?:dan|lalu|kemudian|bahwa|kita|kami|saya|jadi|untuk)\s+/i, '');
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Format Output Markdown Resmi (Hanya menampilkan bagian yang benar-benar ada)
 */
function formatMeetingNotesMarkdown(topic, summary, keyTakeaways, decisions) {
  let md = `NOTULEN RAPAT (Minutes of Meeting)\n\n📌 Topik / Konteks Pembicaraan:\n${topic}\n\n📝 Ringkasan Hasil Rapat:\n${summary}\n`;

  if (Array.isArray(keyTakeaways) && keyTakeaways.length > 0) {
    md += `\n💡 Poin-Poin Utama (Key Takeaways):\n${keyTakeaways.map(k => `* ${k}`).join('\n')}\n`;
  }

  if (Array.isArray(decisions) && decisions.length > 0) {
    md += `\n⚖️ Keputusan yang Diambil (Decisions Made):\n${decisions.map(d => `* ${d}`).join('\n')}\n`;
  }

  return md.trim();
}

/**
 * Pembuatan Notulen Rapat Menggunakan Mesin NLP Lokal Bawaan
 */
function generateMeetingNotesWithNLP(rawTranscriptText) {
  if (!rawTranscriptText || !rawTranscriptText.trim()) {
    return {
      topic: 'Tidak ada teks transkrip untuk dianalisis.',
      summary: 'Belum ada ringkasan hasil rapat yang dapat diproses.',
      keyTakeaways: [],
      decisions: [],
      rawMarkdown: '',
      method: 'nlp_builtin'
    };
  }

  // 1. Jalankan Koreksi Kontekstual & Pembersihan Terlebih Dahulu
  const cleanedResult = correctTranscriptWithNLP(rawTranscriptText);
  const text = cleanedResult.correctedText || rawTranscriptText.trim();

  // Pisahkan kalimat berdasarkan tanda baca atau jeda bermakna
  const rawSentences = text
    .split(/(?<=[.?!])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  // 2. EKSTRAKSI TOPIK CERDAS (Berbasis isi percakapan nyata, bukan template)
  const topic = extractSmartTopic(rawSentences, text);

  // 3. EKSTRAKSI KEPUTUSAN YANG DIAMBIL (Tanpa Argumen / Perdebatan)
  // Aturan Ketat: Jika TIDAK ADA keputusan yang disepakati, decisions HARUS KOSONG ([]).
  const decisions = [];
  rawSentences.forEach(s => {
    const hasDecisionKw = DECISION_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(s));
    if (hasDecisionKw) {
      // Hilangkan klausa perdebatan/argumen di awal jika ada
      let cleanDecision = s;
      cleanDecision = cleanDecision.replace(/^.*?(?:setelah\s+(?:perdebatan|diskusi\s+panjang|mempertimbangkan|pro\s+kontra)[^,]*,\s*)/i, '');
      cleanDecision = cleanDecision.replace(/^.*?(?:meskipun\s+sempat[^,]*,\s*)/i, '');
      
      // Ambil inti hasil kesepakatan (presisi tanpa memotong angka ber-titik seperti jam 23.00 atau 1.5)
      const matchAgreed = cleanDecision.match(/(?:disepakati|sepakat|setuju|diputuskan|memutuskan|menetapkan|ditetapkan|mufakat)\s+(?:bahwa\s+)?([^\n]+?)(?=[.?!](?:\s+|$)|$)/i);
      if (matchAgreed) {
        let outcome = matchAgreed[1].trim();
        outcome = outcome.replace(/\s+karena\s+sebelumnya.*$/i, '');
        let formatted = `Disepakati ${outcome}`;
        formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
        if (!formatted.endsWith('.')) formatted += '.';
        if (!decisions.some(d => d.toLowerCase() === formatted.toLowerCase())) {
          decisions.push(formatted);
        }
      } else {
        // Cek apakah kalimat tidak mengandung perdebatan murni
        const isDebate = DEBATE_PATTERNS.some(p => p.test(cleanDecision));
        if (!isDebate) {
          let formatted = cleanDecision.replace(/^(?:dan|lalu|kemudian|kita|kami)\s+/i, '');
          formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
          if (!formatted.endsWith('.')) formatted += '.';
          if (!decisions.some(d => d.toLowerCase() === formatted.toLowerCase())) {
            decisions.push(formatted);
          }
        }
      }
    }
  });

  // 4. EKSTRAKSI POIN-POIN UTAMA (Key Takeaways) - Termasuk Data/Angka
  const keyTakeaways = [];
  rawSentences.forEach(s => {
    // Abaikan salam pembuka, kalimat pengantar agenda, kalimat keputusan, dan perdebatan murni
    const isDebate = DEBATE_PATTERNS.some(p => p.test(s));
    const isGreeting = /^(?:selamat|halo|assalamualaikum|hai|pagi|siang|sore|malam)\b/i.test(s);
    const isDecision = DECISION_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(s));

    if (!isGreeting && !isDecision && !isDebate &&
        !s.toLowerCase().startsWith('agenda rapat') &&
        !s.toLowerCase().startsWith('topik hari ini')) {
      
      let pt = s.replace(/^(?:dan|lalu|kemudian|selanjutnya)\s+/i, '').trim();
      pt = pt.charAt(0).toUpperCase() + pt.slice(1);
      if (!pt.endsWith('.')) pt += '.';
      
      // Ambil poin yang berbobot dan belum ada di daftar
      if (!keyTakeaways.includes(pt) && pt.length > 10) {
        keyTakeaways.push(pt);
      }
    }
  });

  // 5. RINGKASAN HASIL PERCAKAPAN (Versi lebih jelas & padat dari percakapan nyata, BUKAN formula template)
  let summary = '';
  if (rawSentences.length === 1) {
    summary = rawSentences[0];
    if (!summary.endsWith('.')) summary += '.';
  } else if (rawSentences.length === 2) {
    summary = `${rawSentences[0]} ${rawSentences[1]}`;
    if (!summary.endsWith('.')) summary += '.';
  } else {
    // Bangun 2-3 kalimat padat representatif dari percakapan nyata
    let s1 = rawSentences[0].replace(/^(?:selamat\s+(?:pagi|siang|sore|malam)|halo|hai|assalamualaikum)\s*[,.?!]?\s*/i, '');
    s1 = s1.charAt(0).toUpperCase() + s1.slice(1);
    if (!s1.endsWith('.')) s1 += '.';

    let s2 = '';
    if (keyTakeaways.length > 0 && keyTakeaways[0] !== s1) {
      s2 = keyTakeaways[0];
    } else {
      s2 = rawSentences[Math.floor(rawSentences.length / 2)];
    }
    if (!s2.endsWith('.')) s2 += '.';

    let s3 = '';
    if (decisions.length > 0) {
      s3 = decisions[0];
    } else if (rawSentences.length >= 3 && rawSentences[rawSentences.length - 1] !== s2 && rawSentences[rawSentences.length - 1] !== s1) {
      s3 = rawSentences[rawSentences.length - 1];
    }
    if (s3 && !s3.endsWith('.')) s3 += '.';

    const summaryParts = [s1, s2, s3].filter(Boolean);
    summary = summaryParts.join(' ');
  }

  // 6. FORMAT OUTPUT MARKDOWN DINAMIS
  const rawMarkdown = formatMeetingNotesMarkdown(topic, summary, keyTakeaways, decisions);

  return {
    topic,
    summary,
    keyTakeaways,
    decisions,
    rawMarkdown,
    method: 'nlp_builtin'
  };
}

/**
 * Pembuatan Notulen Rapat Menggunakan AI Gemini (Jika API Key Disediakan)
 */
async function generateMeetingNotesWithAI(rawTranscriptText, apiKey) {
  if (!apiKey || !apiKey.trim()) {
    return generateMeetingNotesWithNLP(rawTranscriptText);
  }

  const prompt = `Anda adalah analis percakapan dan notulis eksekutif profesional.
Tugas Anda adalah membuat Notulen Rapat (Minutes of Meeting / MoM) cerdas, presisi, dan kontekstual dari transkrip percakapan berikut.

ATURAN KETAT WAJIB DIPATUHI:
1. TOPIK / KONTEKS PEMBICARAAN (topic):
   - Simpulkan topik spesifik apa yang BENAR-BENAR dibicarakan dari konten percakapan.
   - JANGAN PERNAH membuat topik template generik (seperti "Evaluasi dan Koordinasi Tim", "Pembahasan Proyek", "Rapat Koordinasi") jika percakapan membahas hal spesifik (misal: "Penanganan Downtime Database", "Rencana Peluncuran Fitur Pembayaran", "Jadwal Piket Kantor", atau "Diskusi Santai Menu Makan Siang").
   - Judul topik harus singkat (3-8 kata), jelas, dan mencerminkan subjek pembicaraan.

2. RINGKASAN HASIL PERCAKAPAN (summary):
   - Buat ringkasan eksekutif tepat 2-3 kalimat yang merupakan VERSI LEBIH BERSIH, JELAS, DAN PADAT dari apa yang terekam.
   - JANGAN PERNAH menggunakan rumus kalimat template kaku (seperti "Rapat ini difokuskan pada...", "Dalam sesi pembahasan dilaporkan bahwa...", "Sebagai tindak lanjut konkret...").
   - Ceritakan secara mengalir apa inti duduk perkara yang dibicarakan, fakta/kendala yang muncul, dan dinamika akhirnya.

3. POIN-POIN UTAMA (keyTakeaways):
   - Ekstrak fakta penting, angka, persentase, tenggat waktu, atau data krusial yang memang ada dalam pembicaraan.
   - JIKA percakapan sangat pendek atau hanya obrolan biasa yang tidak memiliki poin-poin utama terpisah, KEMBALIKAN ARRAY KOSONG [].

4. KEPUTUSAN YANG DIAMBIL (decisions):
   - Ekstrak HANYA jika ada keputusan konkrit, kesepakatan mufakat, persetujuan bersama, atau tindakan final yang disepakati bersama.
   - JANGAN PERNAH memasukkan perdebatan, argumen pro-kontra, komparasi, atau dialog panjang.
   - SANGAT PENTING: Jika TIDAK ADA keputusan yang disepakati (misalnya hanya diskusi biasa, curhat masalah, brainstorming tanpa mufakat, atau percakapan belum selesai), KEMBALIKAN ARRAY KOSONG []. JANGAN PERNAH MENGARANG KEPUTUSAN TEMPLATE!

Format output WAJIB berupa JSON murni dengan skema:
{
  "topic": "Topik spesifik hasil analisis isi percakapan",
  "summary": "Ringkasan eksekutif 2-3 kalimat yang natural dan jelas",
  "keyTakeaways": ["Poin penting 1", "Poin penting 2"],
  "decisions": ["Keputusan konkrit 1"]
}
Jika tidak ada keyTakeaways atau decisions, kembalikan array kosong [] pada field terkait.

HANYA berikan JSON yang valid tanpa Markdown code block (jangan gunakan \`\`\`json).

Transkrip Pembicaraan:
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
      timeout: 12000
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
              const summary = notes.summary ? notes.summary.trim() : '';
              const keyTakeaways = Array.isArray(notes.keyTakeaways) ? notes.keyTakeaways.filter(Boolean) : [];
              const decisions = Array.isArray(notes.decisions) ? notes.decisions.filter(Boolean) : [];

              const rawMarkdown = formatMeetingNotesMarkdown(topic, summary, keyTakeaways, decisions);

              resolve({
                topic,
                summary,
                keyTakeaways,
                decisions,
                rawMarkdown,
                method: 'gemini_ai'
              });
              return;
            }
          }
        } catch (e) {
          // fallback
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
  generateMeetingNotesWithAI
};
