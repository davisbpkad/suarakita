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

  // 2. EKSTRAKSI TOPIK / KONTEKS PEMBICARAAN
  let topic = 'Evaluasi dan Koordinasi Rapat';
  for (const s of rawSentences) {
    const topicMatch = s.match(/(?:membahas|evaluasi|progres|peluncuran|pertemuan|agenda|topik|koordinasi|fokus|tinjauan)\s+([^.?!]+)/i);
    if (topicMatch) {
      let t = topicMatch[1]
        .replace(/^(?:rapat\s+hari\s+ini|hari\s+ini|besok|pekan\s+ini|tentang|mengenai|soal|pada|terkait)\s+/i, '')
        .replace(/\b(?:rapat\s+hari\s+ini|hari\s+ini|besok|pekan\s+ini)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (t.length > 3) {
        topic = t.charAt(0).toUpperCase() + t.slice(1);
        if (!topic.toLowerCase().startsWith('evaluasi') && !topic.toLowerCase().startsWith('pembahasan') && !topic.toLowerCase().startsWith('koordinasi')) {
          topic = 'Evaluasi ' + topic;
        }
        break;
      }
    }
  }

  // 3. EKSTRAKSI KEPUTUSAN YANG DIAMBIL (Tanpa Argumen / Perdebatan)
  const decisions = [];
  rawSentences.forEach(s => {
    const hasDecisionKw = DECISION_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(s));
    if (hasDecisionKw) {
      // Hilangkan klausa perdebatan/argumen di awal jika ada
      let cleanDecision = s;
      cleanDecision = cleanDecision.replace(/^.*?(?:setelah\s+(?:perdebatan|diskusi\s+panjang|mempertimbangkan|pro\s+kontra)[^,]*,\s*)/i, '');
      cleanDecision = cleanDecision.replace(/^.*?(?:meskipun\s+sempat[^,]*,\s*)/i, '');
      
      // Ambil inti hasil kesepakatan
      const matchAgreed = cleanDecision.match(/(?:disepakati|sepakat|setuju|diputuskan|memutuskan|menetapkan|ditetapkan|mufakat)\s+(?:bahwa\s+)?([^.?!]+)/i);
      if (matchAgreed) {
        let outcome = matchAgreed[1].trim();
        // Bersihkan dari argumen sisa
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

  if (decisions.length === 0) {
    decisions.push('Seluruh tim menyepakati untuk mengeksekusi rencana kerja sesuai target yang telah ditetapkan.');
  }

  // 4. EKSTRAKSI POIN-POIN UTAMA (Key Takeaways) - Termasuk Data/Angka
  const keyTakeaways = [];
  rawSentences.forEach(s => {
    // Abaikan salam pembuka, kalimat pengantar agenda, kalimat keputusan, dan perdebatan murni
    const isDebate = DEBATE_PATTERNS.some(p => p.test(s));
    if (!/^(?:selamat|halo|assalamualaikum|hai|pagi|siang|sore|malam)\b/i.test(s) &&
        !DECISION_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(s)) &&
        !s.toLowerCase().startsWith('agenda rapat') &&
        !s.toLowerCase().startsWith('topik hari ini') &&
        !isDebate) {
      
      let pt = s.replace(/^(?:dan|lalu|kemudian|selanjutnya)\s+/i, '').trim();
      pt = pt.charAt(0).toUpperCase() + pt.slice(1);
      if (!pt.endsWith('.')) pt += '.';
      
      // Prioritaskan poin yang memuat data/angka atau fakta teknis/bisnis
      if (!keyTakeaways.includes(pt) && pt.length > 10) {
        keyTakeaways.push(pt);
      }
    }
  });

  if (keyTakeaways.length === 0 && rawSentences.length > 0) {
    keyTakeaways.push(rawSentences[0]);
  }

  // 5. RINGKASAN HASIL RAPAT (Tepat 2-3 Kalimat Padat)
  const firstPoint = keyTakeaways[0] 
    ? keyTakeaways[0].replace(/[.]$/, '').toLowerCase() 
    : 'berbagai aspek operasional dan teknis telah ditinjau secara mendalam';
  
  const mainDecision = decisions[0] 
    ? decisions[0].replace(/^[A-Z][a-z]+\s+/i, '').replace(/[.]$/, '').toLowerCase() 
    : 'arah pelaksanaan tindak lanjut telah disepakati bersama';

  // Susun tepat 2-3 kalimat eksekutif
  const sentence1 = `Rapat ini difokuskan pada ${topic.toLowerCase()} guna menyelaraskan strategi dan operasional tim.`;
  const sentence2 = `Dalam sesi pembahasan, dilaporkan bahwa ${firstPoint}.`;
  const sentence3 = `Sebagai tindak lanjut konkret, disepakati bahwa ${mainDecision}.`;

  const summary = `${sentence1} ${sentence2} ${sentence3}`;

  // 6. FORMAT OUTPUT RESMI SESUAI SPESIFIKASI PENGGUNA
  const rawMarkdown = `NOTULEN RAPAT (Minutes of Meeting)

📌 Topik / Konteks Pembicaraan:
${topic}

📝 Ringkasan Hasil Rapat:
${summary}

💡 Poin-Poin Utama (Key Takeaways):
${keyTakeaways.map(k => `* ${k}`).join('\n')}

⚖️ Keputusan yang Diambil (Decisions Made):
${decisions.map(d => `* ${d}`).join('\n')}
`;

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

  const prompt = `Anda adalah sekretaris eksekutif profesional.
Buat Notulen Rapat (Minutes of Meeting / MoM) resmi dari transkrip percakapan berikut dengan mematuhi ATURAN KETAT ini:

1. PERBAIKAN KATA (Contextual Correction):
   Perbaiki semua kesalahan dengar berbasis fonetis industri teknologi/bisnis secara otomatis:
   - "range roaming" -> "brainstorming"
   - "convention Redmi" -> "conversion rate"
   - "downline total" -> "downtime total"
   - "bab/BAB" -> "bug" (kecuali jika Bab buku)
   - "untuk 4 / di 4" -> "untuk Kuartal 4 / Q4"
   - Bersihkan kata-kata berulang/gagap dan interupsi pembicara (tes audio, cek mic, selaan).

2. KEPUTUSAN YANG DIAMBIL:
   Tuliskan HANYA poin hasil akhir yang disepakati secara ringkas.
   JANGAN PERNAH memasukkan draf perdebatan, argumen pro-kontra, komparasi, atau dialog panjang pembicara di bagian ini. Ekstrak HANYA inti keputusan konkritnya.

3. RINGKASAN:
   Buat ringkasan eksekutif dalam TEPAT 2-3 kalimat yang padat dan komprehensif.

4. FORMAT OUTPUT:
   Format output WAJIB berupa JSON murni dengan skema berikut:
   {
     "topic": "Tulis topik rapat dengan jelas di sini",
     "summary": "Tulis tepat 2-3 kalimat ringkasan eksekutif padat di sini",
     "keyTakeaways": [
       "Poin penting 1 beserta data/angka jika ada",
       "Poin penting 2"
     ],
     "decisions": [
       "Keputusan konkrit 1 tanpa argumen perdebatan",
       "Keputusan konkrit 2"
     ]
   }

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
              const topic = notes.topic;
              const summary = notes.summary || 'Rapat telah diselenggarakan dan keputusan penting telah disepakati bersama.';
              const keyTakeaways = notes.keyTakeaways || [];
              const decisions = notes.decisions || [];

              const rawMarkdown = `NOTULEN RAPAT (Minutes of Meeting)

📌 Topik / Konteks Pembicaraan:
${topic}

📝 Ringkasan Hasil Rapat:
${summary}

💡 Poin-Poin Utama (Key Takeaways):
${keyTakeaways.map(k => `* ${k}`).join('\n')}

⚖️ Keputusan yang Diambil (Decisions Made):
${decisions.map(d => `* ${d}`).join('\n')}
`;

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
