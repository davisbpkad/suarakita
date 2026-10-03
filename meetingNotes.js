/**
 * meetingNotes.js
 * Fitur Notulen Rapat Otomatis (Automated Meeting Minutes Feature)
 * 
 * Aturan Ketat:
 * 1. DILARANG KERAS menyalin kalimat tanya, instruksi pembuka, atau basa-basi penutup ke dalam hasil ringkasan.
 *    Ringkasan HANYA berisi update progres atau informasi substantif yang valid.
 * 2. ATURAN PENAMAAN PIC/BIDANG (GEMINI 2.5 STRICTION): Gunakan label di dalam kurung siku `* **[Nama PIC / Bidang]:**`
 *    HANYA untuk nama orang asli yang berbicara (seperti Andi, Rina, Dian) ATAU nama divisi kerja yang valid
 *    (seperti Developer, Desain, Pemasaran). Abaikan dan DILARANG keras menggunakan kata depan, kata sifat, kata keterangan,
 *    bilangan urut (seperti Pertama, Kedua, Ada), atau teks pertanyaan acak dari transkrip sebagai nama label.
 * 3. LOGIKA EKSTRAKSI RINGKASAN: Gabungkan update progres yang terpecah menjadi satu kesatuan utuh per PIC/Bidang
 *    menggunakan kalimat buatan sendiri (sintesis mandiri) berdasarkan fakta transkrip. Jangan memecah satu subjek orang
 *    menjadi banyak poin terpisah yang berulang. Maksimal 2 kalimat pendek dan DILARANG menyalin teks asli percakapan secara verbatim.
 * 4. LOGIKA EVALUASI KEPUTUSAN (DECISIONS MADE): Poin keputusan wajib diekstraksi jika terdapat instruksi kerja final,
 *    target tenggat waktu (deadline), atau arahan penegasan di akhir rapat (misalnya kalimat: "pastikan selesai besok",
 *    "jaga cadangan", "siapkan draf konten"). Ubah instruksi tersebut menjadi kalimat konkrit menggunakan format awalan:
 *    - `* **[Kategori Keputusan / PIC]:** Ditargetkan untuk [Tindakan/Tugas Konkrit] yang wajib diselesaikan oleh [Nama PIC/Divisi] dengan tenggat waktu [Waktu/Deadline jika ada].`
 *    ATAU
 *    - `* **[Kategori Keputusan / PIC]:** Diputuskan bahwa [Tindakan/Tugas Konkrit] akan dijalankan pada [Waktu/Deadline jika ada].`
 *    Jika rapat benar-benar tanpa keputusan, tulis: "* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan."
 * 5. AKURASI NUMERIK: Salin data persentase, angka biaya, kapasitas, dan deadline waktu (seperti H-7, besok sore)
 *    secara presisi 100% sesuai teks asli tanpa modifikasi, pembulatan, atau kalkulasi mandiri.
 * 6. Hasilkan HANYA output format resmi tanpa teks pengantar atau penutup dari AI.
 */

const https = require('https');
const { correctTranscriptWithNLP } = require('./corrector.js');

// Label terlarang yang bukan nama orang asli atau divisi valid
const DISALLOWED_LABELS = new Set([
  // Kata bilangan urut & penunjuk urutan
  'pertama', 'kedua', 'ketiga', 'keempat', 'kelima', 'keenam', 'terakhir',
  'awal', 'akhir', 'lanjut', 'selanjutnya', 'kemudian', 'lalu', 'setelahnya',
  // Kata tanya & pengantar
  'bagaimana', 'gimana', 'kapan', 'siapa', 'kenapa', 'mengapa', 'apakah', 'ada',
  // Kata sifat & keterangan umum
  'baik', 'bagus', 'cepat', 'penting', 'umum', 'tanya', 'pertanyaan', 'kendala',
  'masalah', 'progres', 'update', 'laporan', 'evaluasi', 'catatan', 'poin', 'hasil',
  // Kata ganti orang / sebutan kolektif (bukan nama asli)
  'kita', 'kami', 'saya', 'aku', 'anda', 'kamu', 'mereka', 'semua', 'tim', 'rekan',
  'kawan', 'teman', 'orang', 'pihak',
  // Kata hubung & kata depan
  'dan', 'atau', 'tetapi', 'namun', 'karena', 'sebab', 'sehingga', 'supaya', 'agar',
  'untuk', 'dari', 'pada', 'ke', 'di', 'dengan', 'oleh', 'tentang', 'mengenai', 'terkait',
  'soal', 'jika', 'kalau', 'bila', 'apabila', 'saat', 'ketika', 'waktu', 'setelah',
  'sesudah', 'sebelum', 'sambil', 'bisa', 'dapat', 'sudah', 'telah', 'sedang', 'akan',
  'mau', 'ingin', 'boleh', 'harus', 'wajib', 'pastikan', 'tolong', 'mohon', 'silakan',
  // Waktu & sapaan
  'hari', 'kemarin', 'besok', 'tadi', 'nanti', 'pagi', 'siang', 'sore', 'malam',
  'halo', 'hai', 'selamat', 'oke', 'siap', 'iya', 'ya'
]);

// Divisi kerja resmi yang valid
const VALID_DIVISIONS = [
  'Developer', 'Desain', 'Pemasaran', 'QA / Pengujian', 
  'Logistik', 'Konsumsi', 'Keuangan', 'Operasional'
];

// Pola basa-basi kasual / celetukan non-substansial
const CASUAL_PATTERNS = [
  /\b(?:nonton|main|pertandingan)\s+bola\b/i,
  /\b(?:seru\s+banget|asik\s+banget|rame\s+banget|parah\s+sih)\b/i,
  /\b(?:halo\s+bro|halo\s+guys|eh\s+bro|hai\s+gaes|halo\s+kawan)\b/i,
  /\b(?:tes\s+tes|cek\s+suara|cek\s+audio|mic\s+saya)\b/i,
  /\b(?:mager|wkwk|haha|canda|jokes)\b/i
];

/**
 * Pembersihan pengulangan kata berturut-turut (misal: "progres progres" -> "progres")
 */
function cleanDuplicateWords(text) {
  if (!text) return '';
  return text.replace(/\b([a-zA-ZÀ-ÿ0-9]+)(?:\s+\1\b)+/gi, '$1').trim();
}

/**
 * Filter kalimat tanya, instruksi pembuka, atau basa-basi penutup
 */
function isDisallowedFromSummary(sentence) {
  const s = sentence.trim();
  if (s.length < 5) return true;

  // 1. Kalimat tanya (dilarang masuk ringkasan)
  if (s.endsWith('?') || /\b(?:bagaimana|gimana|kapan|apakah|kenapa|mengapa|siapa|ada\s+(?:kendala|masalah)\s*(?:apa|gak|tidak|kah)|bisa\s+tolong)\b/i.test(s)) {
    return true;
  }

  // 2. Instruksi pembuka / sapaan awal
  if (/^(?:selamat\s+(?:pagi|siang|sore|malam)|halo|hai|assalamu|mari\s+kita\s+mulai|rapat\s+dibuka|cek\s+(?:sound|audio|suara)|tes\s+tes|terima\s+kasih\s+sudah\s+hadir|agenda\s+hari\s+ini)\b/i.test(s) && s.split(/\s+/).length <= 8) {
    return true;
  }

  // 3. Basa-basi penutup
  if (/(?:sekian\s+dari\s+saya|terima\s+kasih\s+semuanya|sampai\s+jumpa|kita\s+akhiri|demikian\s+rapat|rapat\s+selesai|oke\s+terima\s+kasih\s+rekan)/i.test(s)) {
    return true;
  }

  // 4. Celetukan kasual murni
  if (CASUAL_PATTERNS.some(p => p.test(s))) {
    return true;
  }

  return false;
}

/**
 * Format Output Markdown Resmi Sesuai Spesifikasi Notulen Rapat
 */
function formatMeetingNotesMarkdown(topic, summaryItems, keyPoints, decisions) {
  let md = `📌 **Topik / Konteks Pembicaraan:**\n${cleanDuplicateWords(topic)}\n\n📝 **Ringkasan Hasil Rapat (Progress & Substansi):**\n`;
  
  if (Array.isArray(summaryItems) && summaryItems.length > 0) {
    md += summaryItems.join('\n');
  } else if (typeof summaryItems === 'string' && summaryItems.trim()) {
    md += summaryItems.trim();
  } else {
    md += `* Tidak ada poin utama yang relevan untuk dirangkum.`;
  }

  if (Array.isArray(keyPoints) && keyPoints.length > 0) {
    md += `\n\n⚡ **Poin-Poin Utama:**\n` + keyPoints.join('\n');
  } else if (typeof keyPoints === 'string' && keyPoints.trim()) {
    md += `\n\n⚡ **Poin-Poin Utama:**\n` + keyPoints.trim();
  }

  md += `\n\n🎯 **Keputusan yang Diambil (Decisions Made):**\n`;
  
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
 * Ekstraksi Topik 1 Kalimat Ringkas
 * Mematuhi aturan: DILARANG mengulang kata yang sama (seperti 'progres progres')
 */
function extractTopicSentence(sentences, fullText) {
  const casualHits = CASUAL_PATTERNS.filter(p => p.test(fullText)).length;
  const hasStructuredWork = sentences.some(s => {
    return /(?:progres|peluncuran|rilis|deploy|evaluasi|anggaran|biaya|fitur|perbaikan|bug|latensi|draf\s+konten|pemasaran|desain|tenggat|deadline)/i.test(s);
  });

  if (casualHits >= 1 && !hasStructuredWork) {
    return 'Topik pembicaraan tidak spesifik / Obrolan kasual';
  }

  // 1. Deteksi agenda eksplisit
  for (const s of sentences) {
    const match = s.match(/(?:agenda|topik|fokus|membahas|pertemuan\s+hari\s+ini|meeting\s+hari\s+ini|rapat\s+hari\s+ini)\s+(?:tentang|mengenai|soal|adalah|yaitu)?\s*([^\n]+?)(?=[.?!](?:\s+|$)|$)/i);
    if (match) {
      let t = match[1].replace(/^(?:rapat|meeting|diskusi|hari\s+ini|besok|pekan\s+ini)\s+/i, '').trim();
      t = cleanDuplicateWords(t);
      if (t.length >= 4) {
        return cleanDuplicateWords(`Penyelarasan dan peninjauan progres ${t.toLowerCase()}.`);
      }
    }
  }

  // 2. Deteksi domain substantif utama
  const topicsFound = [];
  if (/(?:api|payment|gateway|server|latensi|deploy|database|developer)/i.test(fullText)) {
    topicsFound.push('integrasi sistem');
  }
  if (/(?:desain|mockup|ui|ux|antarmuka)/i.test(fullText)) {
    topicsFound.push('kesiapan desain antarmuka');
  }
  if (/(?:pemasaran|kampanye|marketing|draf\s+konten|promosi)/i.test(fullText)) {
    topicsFound.push('kampanye pemasaran');
  }

  if (topicsFound.length >= 2) {
    return cleanDuplicateWords(`Koordinasi progres ${topicsFound.join(', ')}, serta peninjauan kendala teknis dan target tenggat waktu.`);
  }

  for (const s of sentences) {
    if (isDisallowedFromSummary(s)) continue;

    const patternMatch = s.match(/(?:terkait|soal|tentang|mengenai|rencana|evaluasi|proyek|fitur|perbaikan|pengembangan|sistem|server|rilis|deploy|anggaran|kampanye)\s+([^\n]+?)(?=[.?!](?:\s+|$)|$)/i);
    if (patternMatch) {
      let subject = cleanDuplicateWords(patternMatch[0].trim());
      return cleanDuplicateWords(`Koordinasi progres kerja dan evaluasi kendala ${subject.toLowerCase()}.`);
    }
  }

  if (hasStructuredWork) {
    return 'Koordinasi progres tim dan penegasan instruksi kerja pasca-rapat.';
  }

  return 'Topik pembicaraan tidak spesifik / Obrolan kasual';
}

/**
 * Ekstraksi Ringkasan Hasil Rapat:
 * - Dilarang menyalin kalimat tanya, instruksi pembuka, atau basa-basi penutup
 * - Penamaan label HANYA untuk nama orang asli ATAU divisi valid (Developer, Desain, Pemasaran, dll.)
 * - Gabungkan update yang terpecah menjadi 1 kesatuan utuh per PIC/Bidang (maksimal 2 kalimat pendek)
 * - Non-verbatim: memparafrasekan teks transkrip agar profesional
 */
function extractSummaryItems(sentences) {
  const subjectGroups = new Map();

  sentences.forEach(s => {
    // 1. Buang kalimat tanya, pembuka, penutup, atau celetukan
    if (isDisallowedFromSummary(s)) return;

    // 2. Eksklusikan instruksi kerja final atau keputusan dari ringkasan (masuk ke Decisions Made)
    const isFinalInstruction = /\b(?:pastikan|wajib|harus|siapkan\s+draf|untuk\s+keputusan\s+akhir|disepakati|sepakat|diputuskan)\b/i.test(s) &&
      /\b(?:besok|H-\d+|deadline|tenggat|paling\s+lambat|sebelum\s+jam|selesai)\b/i.test(s);
    if (isFinalInstruction) return;

    // 3. Deteksi Nama Orang Asli
    let label = null;
    let updateText = s.trim();

    // Deteksi nama orang asli (Andi, Rina, Dian, Budi, Davis, Agus, dsb.)
    const nameMatch = s.match(/\b(?:si\s+|dari\s+|bagian\s+)?([A-Z][a-z]+)\b/);
    if (nameMatch) {
      const candidate = nameMatch[1];
      const lower = candidate.toLowerCase();
      if (!DISALLOWED_LABELS.has(lower) && candidate.length >= 3) {
        if (/\b(?:Andi|Rina|Dian|Budi|Davis|Agus|Siti|Rian|Doni|Eko|Fajar|Dewi|Putri|Reza|Tono)\b/i.test(candidate) ||
            /\b(?:melaporkan|menyampaikan|mengerjakan|menemukan|menyelesaikan|progres|kendala)\b/i.test(s)) {
          label = candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
        }
      }
    }

    // 4. Jika bukan nama orang asli, petakan ke Divisi Kerja Valid
    if (!label) {
      if (/(?:developer|dev|backend|frontend|api|server|database|coding|bug|latensi|deploy|sistem)/i.test(s)) {
        label = 'Developer';
      } else if (/(?:desain|designer|ui|ux|mockup|antarmuka|figma|tampilan|aset\s+grafis)/i.test(s)) {
        label = 'Desain';
      } else if (/(?:pemasaran|marketing|iklan|ads|sosmed|kampanye|campaign|konten|draf\s+konten|promosi)/i.test(s)) {
        label = 'Pemasaran';
      } else if (/(?:qa|testing|tester|uji\s+coba|pengujian|pengetesan)/i.test(s)) {
        label = 'QA / Pengujian';
      } else if (/(?:logistik|gedung|ruangan|booking|sewa|armada|transportasi|tempat)/i.test(s)) {
        label = 'Logistik';
      } else if (/(?:konsumsi|makanan|snack|makan\s+siang|katering|minuman)/i.test(s)) {
        label = 'Konsumsi';
      } else if (/(?:keuangan|finance|anggaran|biaya|budget|nominal|invoice|pembayaran)/i.test(s)) {
        label = 'Keuangan';
      } else if (/(?:operasional|jadwal|shift|piket|koordinasi)/i.test(s)) {
        label = 'Operasional';
      }
    }

    if (!label) return;

    // Bersihkan updateText dari awalan percakapan / verba verbalistis untuk sintesis mandiri non-verbatim
    updateText = updateText.replace(new RegExp(`^(?:dan|lalu|kemudian|untuk|dari)?\\s*(?:si\\s+)?${label}\\s*(?:dari\\s+(?:tim\\s+)?[A-Za-z]+)?\\s*(?:sudah|sedang|akan|melaporkan|menyampaikan|menjelaskan|bilang)?\\s*`, 'i'), '');
    updateText = updateText.replace(/^(?:ada\s+kendala\s+apa\s+di\s+tim\s+[a-z]+\??\s*)/i, '');
    updateText = updateText.replace(/^(?:ada\s+kendala\s+)/i, 'Terdapat kendala ');
    updateText = cleanDuplicateWords(updateText);
    updateText = updateText.charAt(0).toUpperCase() + updateText.slice(1);
    if (!/[.?!]$/.test(updateText)) updateText += '.';

    if (!subjectGroups.has(label)) {
      subjectGroups.set(label, []);
    }
    subjectGroups.get(label).push(updateText);
  });

  if (subjectGroups.size === 0) {
    return ['* Tidak ada poin utama yang relevan untuk dirangkum.'];
  }

  // Gabungkan update progres yang terpecah menjadi 1 kesatuan utuh per PIC/Divisi
  const items = [];
  subjectGroups.forEach((updates, label) => {
    // Gabungkan maksimal 2 kalimat pendek
    const combined = updates.slice(0, 2).join(' ');
    items.push(`* **[${label}]:** ${combined}`);
  });

  return items;
}

/**
 * Ekstraksi Poin-Poin Utama Rapat (Key Points)
 */
function extractKeyPoints(sentences, summaryItems, fullText) {
  const points = [];

  // Cari angka metrik substantif (persentase, nominal anggaran, dsb.)
  sentences.forEach(s => {
    if (isDisallowedFromSummary(s)) return;
    if (/(?:\b\d+%|\bRp\s*[\d.,]+|\bselesai\s+100%|\bmencapai\s+\d+)/i.test(s)) {
      let clean = s.replace(/^(?:dan|lalu|kemudian|untuk|dari|bagaimana\s+dengan)\s+/i, '').trim();
      clean = clean.replace(/^(?:[A-Z][a-z]+\s+(?:dari\s+(?:tim\s+)?[A-Za-z]+\s+)?(?:melaporkan|menyampaikan|menjelaskan)\s+)/i, '');
      clean = clean.charAt(0).toUpperCase() + clean.slice(1);
      if (!/[.?!]$/.test(clean)) clean += '.';
      points.push(`* ${clean}`);
    }
  });

  // Jika belum ada poin substantif berangka, ambil dari kesimpulan ringkasan
  if (points.length === 0 && Array.isArray(summaryItems) && summaryItems.length > 0 && !summaryItems[0].includes('Tidak ada poin')) {
    summaryItems.slice(0, 3).forEach(item => {
      const cleanItem = item.replace(/^\*\s+\*\*\[.*?\]:\*\*\s*/, '');
      points.push(`* ${cleanItem}`);
    });
  }

  if (points.length === 0) {
    return ['* Tidak ada poin utama yang relevan untuk dirangkum.'];
  }

  return points.slice(0, 3);
}

/**
 * Ekstraksi Keputusan yang Diambil (Decisions Made):
 * Poin keputusan wajib diekstraksi jika terdapat:
 * - Instruksi kerja final (pastikan, jaga, siapkan, selesaikan, wajib, harus)
 * - Target tenggat waktu (deadline seperti H-7, besok sore, jam 23.00, paling lambat)
 * - Arahan penegasan di akhir rapat
 * Format:
 * `* **[Kategori Keputusan / PIC]:** Ditargetkan untuk [Tindakan/Tugas Konkrit] yang wajib diselesaikan oleh [Nama PIC/Divisi] dengan tenggat waktu [Waktu/Deadline jika ada].`
 * ATAU
 * `* **[Kategori Keputusan / PIC]:** Diputuskan bahwa [Tindakan/Tugas Konkrit] akan dijalankan pada [Waktu/Deadline jika ada].`
 */
function extractDecisions(sentences, rawText) {
  const decisions = [];
  const processedCategories = new Set();

  sentences.forEach(s => {
    // 1. Deteksi Instruksi Kerja Final, Deadline Waktu, atau Arahan Penegasan
    const hasFinalInstruction = /\b(?:pastikan|wajib|harus|siapkan|jaga|selesaikan|kirimkan|buatkan|eksekusi)\b/i.test(s);
    const hasDeadline = /\b(?:deadline|tenggat|H-\d+|besok\s+(?:pagi|siang|sore|malam)|paling\s+lambat|sebelum\s+jam|hari\s+(?:senin|selasa|rabu|kamis|jumat|sabtu|minggu))\b/i.test(s);
    const hasConsensus = /\b(?:sepakat|setuju|diputuskan|memutuskan|menetapkan|disepakati|ditetapkan|deal|fix|mufakat)\b/i.test(s);

    if (hasFinalInstruction || hasDeadline || hasConsensus) {
      // Tentukan Kategori Keputusan / PIC
      let category = null;

      // Cek apakah ada nama orang asli (Andi, Rina, Dian, Budi, Davis, dll.)
      const nameMatch = s.match(/\b(Andi|Rina|Dian|Budi|Davis|Agus|Siti|Rian|Doni|Eko|Fajar|Dewi|Putri|Reza|Tono)\b/i);
      if (nameMatch) {
        category = nameMatch[1];
      } else {
        // Cek Divisi atau Kategori Pekerjaan
        if (/(?:developer|dev|backend|frontend|server|bug|latensi|deploy|database)/i.test(s)) category = 'Developer';
        else if (/(?:desain|ui|ux|mockup|antarmuka|figma)/i.test(s)) category = 'Desain';
        else if (/(?:pemasaran|marketing|iklan|draf\s+konten|konten|promosi|campaign)/i.test(s)) category = 'Pemasaran';
        else if (/(?:qa|testing|uji\s+coba|pengujian)/i.test(s)) category = 'QA / Pengujian';
        else if (/(?:gedung|tempat|sewa|ruangan)/i.test(s)) category = 'Logistik';
        else if (/(?:anggaran|biaya|dana|budget|harga)/i.test(s)) category = 'Keuangan';
        else if (/(?:rilis|peluncuran|launching|jadwal)/i.test(s)) category = 'Jadwal Rilis';
        else category = 'Arahan Kerja';
      }

      // Deteksi tenggat waktu (deadline)
      let deadlineStr = '';
      const deadlineMatch = s.match(/\b(?:paling\s+lambat\s+H-\d+\s+sebelum\s+[a-z]+|H-\d+|besok\s+(?:pagi|siang|sore|malam)|paling\s+lambat\s+[^\n.,]+|sebelum\s+jam\s+[\d.:]+|hari\s+(?:senin|selasa|rabu|kamis|jumat|sabtu|minggu))\b/i);
      if (deadlineMatch) {
        deadlineStr = deadlineMatch[0].trim();
      }

      // Ekstraksi tindakan konkrit
      let action = s.replace(/^(?:untuk\s+keputusan\s+akhir[,.]?|lalu|kemudian|dan|selain\s+itu|terakhir)\s*/i, '').trim();
      if (category && new RegExp(`^${category}\\s*(?:tolong)?\\s*`, 'i').test(action)) {
        action = action.replace(new RegExp(`^${category}\\s*(?:tolong)?\\s*`, 'i'), '');
      }
      action = action.replace(/^(?:pastikan|tolong\s+pastikan|wajib|harus|siapkan)\s*/i, '');
      if (deadlineStr) {
        action = action.replace(new RegExp(`(?:selesai\\s+)?${deadlineStr}`, 'i'), '').trim();
      }
      action = action.replace(/[.,;]+$/, '').trim();
      if (/^draf\s+/i.test(action)) {
        action = 'penyiapan ' + action;
      }

      let item = '';
      if (hasConsensus && !hasFinalInstruction) {
        item = `* **[${category}]:** Diputuskan bahwa ${action} akan dijalankan${deadlineStr ? ' pada ' + deadlineStr : ''}.`;
      } else {
        const deadlinePart = deadlineStr ? ` dengan tenggat waktu ${deadlineStr}` : '';
        item = `* **[${category}]:** Ditargetkan untuk ${action} yang wajib diselesaikan oleh ${category}${deadlinePart}.`;
      }

      if (!processedCategories.has(category)) {
        decisions.push(item);
        processedCategories.add(category);
      }
    }
  });

  // 2. Cek apakah ada pembahasan menggantung (seperti contoh booking gedung tapi mager/belum pasti)
  if (decisions.length === 0) {
    sentences.forEach(s => {
      if (/(?:ga\s+tau\s+deh|belum\s+tau|belum\s+pasti|mager|belum\s+dikonfirmasi|belum\s+konfirmasi|ditunda|pending)/i.test(s)) {
        let topic = 'Pembahasan Terkait';
        if (/(?:gedung|tempat|ruangan|booking)/i.test(s)) topic = 'Booking Gedung';
        else if (/(?:anggaran|biaya|dana)/i.test(s)) topic = 'Persetujuan Anggaran';

        decisions.push(`* [${topic}]: Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.`);
      }
    });
  }

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
    const keyPoints = ['* Tidak ada poin utama yang relevan untuk dirangkum.'];
    const decisions = ['* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.'];
    return {
      topic,
      summary: summaryItems.join('\n'),
      summaryItems,
      keyPoints,
      decisions,
      rawMarkdown: formatMeetingNotesMarkdown(topic, summaryItems, keyPoints, decisions),
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
    .filter(s => s.length > 4);

  // 2. Ekstraksi Topik 1 Kalimat Ringkas (tanpa duplikasi kata)
  const topic = extractTopicSentence(rawSentences, text);

  // 3. Ekstraksi Ringkasan Hasil Rapat (tergabung utuh per PIC/Divisi, non-verbatim)
  const summaryItems = extractSummaryItems(rawSentences);

  // 4. Ekstraksi Poin-Poin Utama
  const keyPoints = extractKeyPoints(rawSentences, summaryItems, text);

  // 5. Ekstraksi Keputusan yang Diambil (Format keputusan terstruktur)
  const decisions = extractDecisions(rawSentences, text);

  // 6. Format Markdown Output
  const rawMarkdown = formatMeetingNotesMarkdown(topic, summaryItems, keyPoints, decisions);

  return {
    topic,
    summary: summaryItems.join('\n'),
    summaryItems,
    keyPoints,
    decisions,
    rawMarkdown,
    method: 'nlp_builtin'
  };
}

/**
 * Pembuatan Notulen Rapat Menggunakan AI Gemini (Dukungan Model Terbaru & Fallback Otomatis)
 */
async function generateMeetingNotesWithAI(rawTranscriptText, apiKey, preferredModel = 'gemini-2.5-flash') {
  if (!apiKey || !apiKey.trim()) {
    return generateMeetingNotesWithNLP(rawTranscriptText);
  }

  const prompt = `# ROLE & GOAL Perbaikan Fitur Notulen
Sistem Anda adalah Fitur Notulen Rapat Otomatis (Automated Meeting Minutes Feature) berbasis kecerdasan buatan. Tugas utama fitur ini adalah mengolah komponen teks mentah hasil Voice-to-Text (STT), melakukan pembersihan data, serta mentransformasikannya menjadi dokumen Notulen Rapat (Minutes of Meeting) eksekutif yang ringkas, berstruktur tinggi, akurat, dan siap pakai oleh organisasi.

<instruction>
Proses teks transkrip yang diberikan pada variabel {{transkrip_mentah}} dengan mematuhi secara mutlak aturan ketat di bawah ini.
</instruction>

<rules>
1. DILARANG KERAS menyalin kalimat tanya, instruksi pembuka, atau basa-basi penutup ke dalam hasil ringkasan. Ringkasan HANYA berisi update progres atau informasi substantif yang valid.
2. ATURAN PENAMAAN PIC/BIDANG (GEMINI 2.5 STRICTION): Gunakan label di dalam kurung siku '* **[Nama PIC / Bidang]:**' HANYA untuk nama orang asli yang berbicara (seperti Andi, Rina, Dian) ATAU nama divisi kerja yang valid (seperti Developer, Desain, Pemasaran). Abaikan dan DILARANG keras menggunakan kata depan, kata sifat, kata keterangan, bilangan urut (seperti Pertama, Kedua, Ada), atau teks pertanyaan acak dari transkrip sebagai nama label. Jangan biarkan noise hasil parsing NLP lokal lolos menjadi nama label.
3. LOGIKA EKSTRAKSI RINGKASAN: Gabungkan update progres yang terpecah menjadi satu kesatuan utuh per PIC/Bidang menggunakan kalimat buatanmu sendiri berdasarkan fakta transkrip. Jangan memecah satu subjek orang menjadi banyak poin terpisah yang berulang. Maksimal 2 kalimat pendek dan DILARANG menyalin teks asli percakapan secara verbatim.
4. LOGIKA EVALUASI KEPUTUSAN (DECISIONS MADE): Poin keputusan wajib diekstraksi jika terdapat instruksi kerja final, target tenggat waktu (deadline), atau arahan penegasan di akhir rapat (misalnya kalimat: "pastikan selesai besok", "jaga cadangan", "siapkan draf konten"). Ubah instruksi tersebut menjadi kalimat konkrit menggunakan format awalan:
   - '* **[Kategori Keputusan / PIC]:** Ditargetkan untuk [Tindakan/Tugas Konkrit] yang wajib diselesaikan oleh [Nama PIC/Divisi] dengan tenggat waktu [Waktu/Deadline jika ada].'
   ATAU
   - '* **[Kategori Keputusan / PIC]:** Diputuskan bahwa [Tindakan/Tugas Konkrit] akan dijalankan pada [Waktu/Deadline jika ada].'
   Jika rapat benar-benar tanpa keputusan, tulis: '* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.'
5. AKURASI NUMERIK: Salin data persentase, angka biaya, kapasitas, dan deadline waktu (seperti H-7, besok sore) secara presisi 100% sesuai teks asli tanpa modifikasi, pembulatan, atau kalkulasi mandiri.
6. Hasilkan HANYA output dengan format di bawah ini, tanpa teks pengantar atau penutup dari AI.
</rules>

# FORMAT OUTPUT NOTULEN RAPAT

📌 **Topik / Konteks Pembicaraan:**
[Tulis 1 kalimat ringkas mengenai tujuan utama rapat. DILARANG mengulang kata yang sama seperti 'progres progres']

📝 **Ringkasan Hasil Rapat (Progress & Substansi):**
* **[Nama PIC / Bidang]:** [Kalimat sintesis mandiri non-verbatim max 2 kalimat mengenai progres substantif dan angka metrik]
* **[Nama PIC / Bidang]:** ...

⚡ **Poin-Poin Utama:**
* [Poin substantif 1]
* [Poin substantif 2]

🎯 **Keputusan yang Diambil (Decisions Made):**
* **[Kategori Keputusan / PIC]:** Ditargetkan untuk [Tindakan/Tugas Konkrit] yang wajib diselesaikan oleh [Nama PIC/Divisi] dengan tenggat waktu [Waktu/Deadline jika ada].
* **[Kategori Keputusan / PIC]:** Diputuskan bahwa [Tindakan/Tugas Konkrit] akan dijalankan pada [Waktu/Deadline jika ada].

# FORMAT OUTPUT JSON:
Hasilkan HANYA JSON murni yang valid tanpa Markdown code block (\`\`\`json) dengan skema:
{
  "topic": "1 kalimat ringkas mengenai tujuan utama rapat tanpa kata berulang",
  "summaryItems": [
    "* **[Nama PIC / Bidang]:** [Kalimat sintesis mandiri non-verbatim max 2 kalimat mengenai progres substantif dan angka metrik]"
  ],
  "keyPoints": [
    "* [Poin substantif 1]",
    "* [Poin substantif 2]"
  ],
  "decisions": [
    "* **[Kategori Keputusan / PIC]:** Ditargetkan untuk [Tindakan/Tugas Konkrit] yang wajib diselesaikan oleh [Nama PIC/Divisi] dengan tenggat waktu [Waktu/Deadline jika ada]."
  ]
}

Jika rapat benar-benar tanpa keputusan, isi decisions dengan:
["* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan."]

Jika seluruh transkrip tidak memiliki poin utama yang relevan, isi keyPoints dengan:
["* Tidak ada poin utama yang relevan untuk dirangkum."]

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

  // Daftar model yang akan dicoba berjenjang (dimulai dari model yang dipilih)
  const candidateModels = [
    preferredModel || 'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash'
  ].filter((v, i, a) => a.indexOf(v) === i); // unique

  for (const model of candidateModels) {
    try {
      const res = await callGeminiSingleModel(model, apiKey, payload);
      if (res && res.topic) {
        const topic = cleanDuplicateWords(res.topic.trim());
        let summaryItems = Array.isArray(res.summaryItems) ? res.summaryItems.filter(Boolean) : [];
        let keyPoints = Array.isArray(res.keyPoints) ? res.keyPoints.filter(Boolean) : [];
        let decisions = Array.isArray(res.decisions) ? res.decisions.filter(Boolean) : [];

        if (summaryItems.length === 0) summaryItems = ['* Tidak ada poin utama yang relevan untuk dirangkum.'];
        if (keyPoints.length === 0) keyPoints = ['* Tidak ada poin utama yang relevan untuk dirangkum.'];
        if (decisions.length === 0) decisions = ['* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.'];

        const rawMarkdown = formatMeetingNotesMarkdown(topic, summaryItems, keyPoints, decisions);

        return {
          topic,
          summary: summaryItems.join('\n'),
          summaryItems,
          keyPoints,
          decisions,
          rawMarkdown,
          modelUsed: model,
          method: 'gemini_ai'
        };
      }
    } catch (err) {
      // lanjut ke kandidat model berikutnya
    }
  }

  // Fallback jika seluruh model AI gagal/kuota habis
  return generateMeetingNotesWithNLP(rawTranscriptText);
}

function callGeminiSingleModel(modelName, apiKey, payload) {
  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

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
          if (res.statusCode !== 200) {
            return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
          const parsed = JSON.parse(data);
          const rawJson = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawJson) return reject(new Error('Empty content'));
          const cleanJson = rawJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
          const notes = JSON.parse(cleanJson);
          resolve(notes);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
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
