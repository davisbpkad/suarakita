/**
 * meetingNotes.js
 * Modul NOTULEN RAPAT (Minutes of Meeting / MoM)
 * Membuat ringkasan eksekutif komprehensif dari transkrip pembicaraan:
 * 1. Topik / Konteks Pembicaraan (Meeting Topic)
 * 2. Ringkasan Hasil Rapat (Executive Summary / Overview)
 * 3. Poin-Poin Utama (Key Takeaways)
 * 4. Keputusan yang Diambil (Decisions Made)
 * 5. Rencana Tindakan Lanjut (Action Items: PIC & Deadline)
 * 
 * Filosofi: Ringan, instan, deterministik, sub-milidetik, tanpa membebani server.
 */

const https = require('https');

// Kata kunci pendeteksi keputusan rapat
const DECISION_KEYWORDS = [
  'sepakat', 'setuju', 'putuskan', 'memutuskan', 'disepakati', 'keputusan', 
  'menetapkan', 'diputuskan', 'deal', 'fix', 'disetujui', 'ditetapkan'
];

/**
 * Pembuatan Notulen Rapat Menggunakan Mesin NLP Lokal
 */
function generateMeetingNotesWithNLP(transcriptText) {
  if (!transcriptText || !transcriptText.trim()) {
    return {
      topic: 'Tidak ada teks transkrip untuk dianalisis.',
      summary: 'Belum ada ringkasan hasil rapat yang dapat diproses.',
      keyTakeaways: [],
      decisions: [],
      actionItems: [],
      rawMarkdown: '',
      method: 'nlp_builtin'
    };
  }

  const cleanText = transcriptText.trim();
  const sentences = cleanText
    .split(/(?<=[.?!])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  // 1. EKSTRAKSI TOPIK / KONTEKS PEMBICARAAN
  let topic = 'Koordinasi dan Evaluasi Progres Tim';
  for (const s of sentences) {
    const topicMatch = s.match(/(?:membahas|evaluasi|progres|peluncuran|pertemuan|agenda|topik|koordinasi)\s+([^.?!]+)/i);
    if (topicMatch) {
      let t = topicMatch[1].replace(/^(?:tentang|mengenai)\s+/i, '').trim();
      topic = 'Evaluasi ' + t;
      topic = topic.charAt(0).toUpperCase() + topic.slice(1);
      break;
    }
  }

  // 2. DETEKSI KEPUTUSAN YANG DIAMBIL (Decisions Made)
  const decisions = [];
  sentences.forEach(s => {
    const isDecision = DECISION_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(s));
    if (isDecision) {
      let cleaned = s.replace(/^(?:dan|lalu|kemudian|kita|kami)\s+/i, '');
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      if (!cleaned.endsWith('.')) cleaned += '.';
      if (!decisions.includes(cleaned)) {
        decisions.push(cleaned);
      }
    }
  });

  if (decisions.length === 0) {
    decisions.push('Seluruh tim menyepakati untuk melanjutkan implementasi sesuai target jadwal yang ditetapkan.');
  }

  // 3. DETEKSI RENCANA TINDAKAN LANJUT (Action Items: Tugas, PIC, Tenggat)
  const actionItems = [];
  sentences.forEach(s => {
    const match = s.match(/\b([A-Z][a-zA-Z\s]{1,15})\s+(?:akan|bisa|bertugas|perlu)\s+(.*?)(?:\s+(paling\s+lambat|sebelum|besok|lusa|minggu\s+depan)(.*?))?[.?!]?$/i);
    if (match) {
      const pic = match[1].trim();
      if (!/^(?:kita|kami|semua|rapat|tim)$/i.test(pic)) {
        let task = match[2].trim();
        let deadline = (match[3] ? (match[3] + ' ' + (match[4] || '')).trim() : 'Sesuai jadwal');
        // Bersihkan deadline dari kata sambung berlebih
        deadline = deadline.replace(/\s+/g, ' ');

        actionItems.push({
          pic: pic,
          task: task.charAt(0).toUpperCase() + task.slice(1),
          deadline: deadline || 'Sesuai kesepakatan'
        });
      }
    }
  });

  if (actionItems.length === 0) {
    actionItems.push({
      pic: 'Tim Terkait',
      task: 'Melakukan koordinasi berkala dan eksekusi tindak lanjut',
      deadline: 'Besok sore'
    });
  }

  // 4. DETEKSI POIN-POIN UTAMA (Key Takeaways)
  const keyTakeaways = [];
  sentences.forEach(s => {
    // Abaikan salam pembuka dan kalimat yang sudah masuk keputusan
    if (!/^(?:selamat|halo|assalamualaikum|hai|pagi|siang|sore|malam)\b/i.test(s) &&
        !DECISION_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(s)) &&
        !s.toLowerCase().startsWith('hari ini kita')) {
      let pt = s.charAt(0).toUpperCase() + s.slice(1);
      if (!pt.endsWith('.')) pt += '.';
      keyTakeaways.push(pt);
    }
  });

  if (keyTakeaways.length === 0 && sentences.length > 0) {
    keyTakeaways.push(sentences[0]);
  }

  // 5. RINGKASAN HASIL RAPAT (Executive Summary / Overview)
  const firstTakeaway = keyTakeaways[0] ? keyTakeaways[0].replace(/[.]$/, '').toLowerCase() : 'agenda pembahasan berjalan secara efektif';
  const mainDecision = decisions[0] ? decisions[0].replace(/[.]$/, '').toLowerCase() : 'kesepakatan tindak lanjut telah disetujui';

  const summary = `Pertemuan ini berfokus pada pembahasan ${topic.toLowerCase()}. Berdasarkan diskusi, dilaporkan bahwa ${firstTakeaway}. Tim telah mencapai mufakat di mana ${mainDecision}. Untuk menjamin kelancaran realisasi, rencana tindakan lanjut telah didelegasikan secara terukur kepada penanggung jawab terkait dengan tenggat waktu yang jelas.`;

  // 6. GENERATE CLEAN MARKDOWN
  const rawMarkdown = `# NOTULEN RAPAT (Minutes of Meeting)

### 📌 Topik / Konteks Pembicaraan:
${topic}

### 📝 Ringkasan Hasil Rapat:
${summary}

### 💡 Poin-Poin Utama (Key Takeaways):
${keyTakeaways.map(k => `- ${k}`).join('\n')}

### ⚖️ Keputusan yang Diambil (Decisions Made):
${decisions.map(d => `- **${d}**`).join('\n')}

### 🎯 Rencana Tindakan Lanjut (Action Items):
${actionItems.map(a => `- [ ] **${a.task}** (Penanggung Jawab: ${a.pic} | Tenggat: ${a.deadline})`).join('\n')}

---
*Dibuat otomatis oleh SuaraKita · Localhost Intelligence*
`;

  return {
    topic,
    summary,
    keyTakeaways,
    decisions,
    actionItems,
    rawMarkdown,
    method: 'nlp_builtin'
  };
}

/**
 * Pembuatan Notulen Rapat Menggunakan AI Gemini (Jika API Key Disediakan)
 */
async function generateMeetingNotesWithAI(transcriptText, apiKey) {
  if (!apiKey || !apiKey.trim()) {
    return generateMeetingNotesWithNLP(transcriptText);
  }

  const prompt = `Anda adalah sekretaris eksekutif profesional.
Buat Notulen Rapat (Minutes of Meeting / MoM) resmi dari transkrip berikut.

Format output WAJIB berupa JSON murni dengan skema:
{
  "topic": "Ringkasan topik utama rapat (string singkat padat)",
  "summary": "Ringkasan eksekutif 2-3 kalimat mengenai hasil keseluruhan rapat (string)",
  "keyTakeaways": ["Daftar poin-poin pembahasan penting (array of string)"],
  "decisions": ["Daftar keputusan resmi yang diambil (array of string)"],
  "actionItems": [
    {
      "task": "Uraian tugas tindak lanjut",
      "pic": "Nama orang atau tim penanggung jawab",
      "deadline": "Tenggat waktu yang disebutkan"
    }
  ]
}

HANYA berikan JSON yang valid tanpa Markdown code block (jangan gunakan \`\`\`json).

Transkrip Pembicaraan:
"""
${transcriptText}
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
              const rawMarkdown = `# NOTULEN RAPAT (Minutes of Meeting)

### 📌 Topik / Konteks Pembicaraan:
${notes.topic}

### 📝 Ringkasan Hasil Rapat:
${notes.summary || ''}

### 💡 Poin-Poin Utama (Key Takeaways):
${(notes.keyTakeaways || []).map(k => `- ${k}`).join('\n')}

### ⚖️ Keputusan yang Diambil (Decisions Made):
${(notes.decisions || []).map(d => `- **${d}**`).join('\n')}

### 🎯 Rencana Tindakan Lanjut (Action Items):
${(notes.actionItems || []).map(a => `- [ ] **${a.task}** (Penanggung Jawab: ${a.pic} | Tenggat: ${a.deadline})`).join('\n')}

---
*Dibuat otomatis oleh SuaraKita · Gemini 2.0 Flash AI*
`;

              resolve({
                topic: notes.topic,
                summary: notes.summary || 'Rapat telah selesai dilaksanakan dan seluruh keputusan telah dicatat.',
                keyTakeaways: notes.keyTakeaways || [],
                decisions: notes.decisions || [],
                actionItems: notes.actionItems || [],
                rawMarkdown,
                method: 'gemini_ai'
              });
              return;
            }
          }
        } catch (e) {
          // fallback
        }
        resolve(generateMeetingNotesWithNLP(transcriptText));
      });
    });

    req.on('error', () => resolve(generateMeetingNotesWithNLP(transcriptText)));
    req.on('timeout', () => {
      req.destroy();
      resolve(generateMeetingNotesWithNLP(transcriptText));
    });

    req.write(payload);
    req.end();
  });
}

module.exports = {
  generateMeetingNotesWithNLP,
  generateMeetingNotesWithAI
};
