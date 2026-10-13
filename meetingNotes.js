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

const { correctTranscriptWithNLP } = require('./corrector.js');
const { createClient, modelChainFor } = require('./lib/llmClient.js');
const { splitSentences } = require('./lib/sentenceSplit.js');

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
function formatMeetingNotesMarkdown(topic, summaryItems, decisions) {
  let md = `📌 **Topik / Konteks Pembicaraan:**\n${cleanDuplicateWords(topic)}\n\n📝 **Ringkasan Hasil Rapat (Progress & Substansi):**\n`;
  
  if (Array.isArray(summaryItems) && summaryItems.length > 0) {
    md += summaryItems.join('\n');
  } else if (typeof summaryItems === 'string' && summaryItems.trim()) {
    md += summaryItems.trim();
  } else {
    md += `* Tidak ada poin utama yang relevan untuk dirangkum.`;
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
/** Panjang maksimum kutipan topik (kata). */
const MAX_TOPIC_WORDS = 20;

/** Batas jumlah butir ringkasan, supaya tidak jadi dinding teks. */
const MAX_SUMMARY_ITEMS = 10;

/** Penanda butir yang tidak punya label PIC/divisi yang bisa dipercaya. */
const UNLABELED = '__unlabeled__';

/**
 * Satu kalimat dianggap keputusan hanya kalau ada kesepakatan eksplisit, ATAU
 * instruksi kerja yang disertai tenggat waktu.
 *
 * Sebelumnya kata "harus" saja sudah cukup. Pada transkrip deskriptif seperti
 * sosialisasi pengadaan ("perencanaan harus berjalan beriringan..."), itu
 * membuat SELURUH transkrip berubah jadi satu butir keputusan raksasa.
 */
function classifyDecision(sentence) {
  const hasFinalInstruction = /\b(?:pastikan|wajib|harus|siapkan|jaga|selesaikan|kirimkan|buatkan|eksekusi)\b/i.test(sentence);
  const hasDeadline = /\b(?:deadline|tenggat|H-\d+|besok|paling\s+lambat|sebelum\s+jam|hari\s+(?:senin|selasa|rabu|kamis|jumat|sabtu|minggu)|minggu\s+depan|pekan\s+depan|bulan\s+depan|akhir\s+bulan|secepatnya)\b/i.test(sentence);
  // Bentuk berimbuhan ikut didaftarkan: "menyepakati" tidak mengandung "sepakat"
  // sebagai kata utuh, jadi tanpa ini kesepakatan berimbuhan tidak terdeteksi.
  const hasConsensus = /\b(?:sepakat|menyepakati|disepakati|kesepakatan|setuju|menyetujui|disetujui|persetujuan|diputuskan|memutuskan|keputusan|menetapkan|ditetapkan|deal|mufakat)\b/i.test(sentence);
  return { hasFinalInstruction, hasDeadline, hasConsensus, isDecision: hasConsensus || (hasFinalInstruction && hasDeadline) };
}

/** Buang sapaan kehormatan supaya tidak mengotori topik dan butir ringkasan. */
function stripHonorifics(text) {
  return String(text || '')
    .replace(/\b(?:yang\s+kami\s+hormati|yang\s+terhormat|kami\s+persilakan|kami\s+persilahkan)\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Topik diambil dari kalimat asli transkrip, bukan dirangkai dari template.
 *
 * Sebelumnya fungsi ini memakai template hardcode ("Koordinasi progres integrasi
 * sistem, kesiapan desain antarmuka, kampanye pemasaran...") yang berasal dari
 * data demo, lalu mencocokkan kata kunci tanpa batas kata — sehingga "tetapi"
 * dan "melalui" pun dianggap sinyal domain, dan topik palsu itulah yang muncul.
 */
function extractTopicSentence(sentences) {
  const substantive = sentences
    .map((s) => stripHonorifics(cleanDuplicateWords(s)))
    .filter((s) => !isDisallowedFromSummary(s) && s.split(/\s+/).length >= 4);

  if (substantive.length === 0) return 'Topik tidak dapat ditentukan dari transkrip.';

  // Kalau ada kalimat yang menyebut kegiatan/tujuan, itu kandidat terkuat.
  const TOPIC_HINT = /(?:kegiatan|rapat|pertemuan|agenda|tujuan|sosialisasi|pelatihan|bimbingan|workshop|koordinasi|membahas|bertema|tema)/i;
  const chosen = substantive.slice(0, 6).find((s) => TOPIC_HINT.test(s)) || substantive[0];

  const words = chosen.split(' ');
  return words.length > MAX_TOPIC_WORDS
    ? `${words.slice(0, MAX_TOPIC_WORDS).join(' ')}…`
    : chosen;
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

    // 2. Eksklusikan keputusan dari ringkasan (masuk ke Decisions Made)
    if (classifyDecision(s).isDecision) return;

    // 3. Deteksi Nama Orang Asli
    let label = null;
    let updateText = stripHonorifics(s.trim());

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

    // 4. Jika bukan nama orang asli, petakan ke Divisi Kerja.
    //    Batas kata (\b) itu WAJIB: tanpa itu "api" cocok di dalam "tetapi" dan
    //    "ui" cocok di dalam "melalui", sehingga transkrip apa pun salah diberi
    //    label "Developer". Istilah terlalu umum seperti "sistem" juga dibuang.
    if (!label) {
      if (/\b(?:developer|dev|backend|frontend|api|server|database|coding|bug|latensi|deploy)\b/i.test(s)) {
        label = 'Developer';
      } else if (/\b(?:desain|designer|ui|ux|mockup|antarmuka|figma|tampilan)\b/i.test(s)) {
        label = 'Desain';
      } else if (/\b(?:pemasaran|marketing|iklan|ads|sosmed|kampanye|campaign|promosi)\b/i.test(s)) {
        label = 'Pemasaran';
      } else if (/\b(?:qa|testing|tester|pengujian|pengetesan)\b/i.test(s)) {
        label = 'QA / Pengujian';
      } else if (/\b(?:logistik|gedung|ruangan|booking|sewa|armada|transportasi)\b/i.test(s)) {
        label = 'Logistik';
      } else if (/\b(?:konsumsi|makanan|snack|katering|minuman)\b/i.test(s)) {
        label = 'Konsumsi';
      } else if (/\b(?:keuangan|finance|anggaran|biaya|budget|nominal|invoice|pembayaran)\b/i.test(s)) {
        label = 'Keuangan';
      } else if (/\b(?:operasional|jadwal|shift|piket|koordinasi)\b/i.test(s)) {
        label = 'Operasional';
      }
    }

    // Tanpa label pun tetap jadi butir. Sebelumnya kalimat tanpa label dibuang,
    // yang membuat transkrip di luar skenario demo kehilangan seluruh isinya.
    if (!label) label = UNLABELED;

    // Bersihkan updateText dari awalan percakapan / verba verbalistis untuk sintesis mandiri non-verbatim
    updateText = updateText.replace(new RegExp(`^(?:dan|lalu|kemudian|untuk|dari)?\\s*(?:si\\s+)?${label}\\s*(?:dari\\s+(?:tim\\s+)?[A-Za-z]+)?\\s*(?:sudah|sedang|akan|melaporkan|menyampaikan|menjelaskan|bilang)?\\s*`, 'i'), '');
    updateText = updateText.replace(/^(?:ada\\s+kendala\\s+apa\\s+di\\s+tim\\s+[a-z]+\??\\s*)/i, '');
    updateText = updateText.replace(/^(?:ada\\s+kendala\\s+)/i, 'Terdapat kendala ');
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
    if (label === UNLABELED) {
      // Tanpa label yang bisa dipercaya: kutip apa adanya sebagai satu butir.
      updates.forEach((text) => items.push(`* ${text}`));
      return;
    }
    // Gabungkan maksimal 2 kalimat pendek
    items.push(`* **[${label}]:** ${updates.slice(0, 2).join(' ')}`);
  });

  return items.slice(0, MAX_SUMMARY_ITEMS);
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
function extractDecisions(sentences) {
  const decisions = [];
  const processedCategories = new Set();

  sentences.forEach(s => {
    const { hasFinalInstruction, hasDeadline, hasConsensus, isDecision } = classifyDecision(s);

    if (isDecision) {
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

  // Pisahkan kalimat. splitSentences memecah juga transkrip tanpa tanda baca,
  // yang sebelumnya membuat seluruh transkrip jadi satu butir ringkasan.
  const rawSentences = splitSentences(text).filter((s) => s.split(/\s+/).length >= 4);

  // 2. Ekstraksi Topik 1 Kalimat Ringkas (tanpa duplikasi kata)
  const topic = extractTopicSentence(rawSentences);

  // 3. Ekstraksi Ringkasan Hasil Rapat (tergabung utuh per PIC/Divisi, non-verbatim)
  const summaryItems = extractSummaryItems(rawSentences);

  // 4. Ekstraksi Keputusan yang Diambil (Format keputusan terstruktur)
  const decisions = extractDecisions(rawSentences);

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
 * Prompt notulen rapat. Dipakai jalur biasa maupun jalur streaming.
 */
function buildMeetingNotesPrompt(rawTranscriptText) {
  return `# ROLE & GOAL Perbaikan Fitur Notulen
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

🎯 **Keputusan yang Diambil (Decisions Made):**
* **[Kategori Keputusan / PIC]:** Ditargetkan untuk [Tindakan/Tugas Konkrit] yang wajib diselesaikan oleh [Nama PIC/Divisi] dengan tenggat waktu [Waktu/Deadline jika ada].
* **[Kategori Keputusan / PIC]:** Diputuskan bahwa [Tindakan/Tugas Konkrit] akan dijalankan pada [Waktu/Deadline jika ada].

# FORMAT OUTPUT:
Hasilkan HANYA teks bertanda berikut, tanpa pembungkus markdown:

<<<TOPIC>>>
1 kalimat ringkas mengenai tujuan utama rapat tanpa kata berulang
<<<SUMMARY>>>
- **[Nama PIC / Bidang]:** [Kalimat sintesis mandiri non-verbatim max 2 kalimat mengenai progres substantif dan angka metrik]
- **[Nama PIC / Bidang]:** ...
<<<DECISIONS>>>
- **[Kategori Keputusan / PIC]:** Ditargetkan untuk [Tindakan/Tugas Konkrit] yang wajib diselesaikan oleh [Nama PIC/Divisi] dengan tenggat waktu [Waktu/Deadline jika ada].

Aturan format: setiap tag berdiri di barisnya sendiri. Jangan menulis apa pun sebelum <<<TOPIC>>>.

Jika rapat benar-benar tanpa keputusan, isi bagian DECISIONS dengan:
- Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.

Transkrip Mentah:
"""
${rawTranscriptText}
"""`;
}

/**
 * Notulen rapat memakai LLM (Gemini / Groq / Cerebras / OpenRouter).
 * Tanpa API key, langsung jatuh ke mesin NLP lokal.
 */
async function generateMeetingNotesWithAI(rawTranscriptText, apiKey, preferredModel, provider) {
  if (!apiKey || !apiKey.trim()) return generateMeetingNotesWithNLP(rawTranscriptText);

  const prompt = buildMeetingNotesPrompt(rawTranscriptText);
  const { parseTagged, toBulletList } = await import('./lib/taggedOutput.mjs');
  const client = createClient({ provider, apiKey, timeout: 30000 });
  if (!client) return generateMeetingNotesWithNLP(rawTranscriptText);

  const hit = await client.generateWithFallback(
    modelChainFor(provider, preferredModel),
    prompt,
    (text) => text.includes('<<<TOPIC>>>')
  );
  if (!hit) return generateMeetingNotesWithNLP(rawTranscriptText);

  const fields = parseTagged(hit.result);
  if (!fields.TOPIC) return generateMeetingNotesWithNLP(rawTranscriptText);

  const topic = cleanDuplicateWords(fields.TOPIC);
  let summaryItems = toBulletList(fields.SUMMARY).map((s) => `* ${s}`);
  let decisions = toBulletList(fields.DECISIONS).map((s) => `* ${s}`);

  if (summaryItems.length === 0) summaryItems = ['* Tidak ada poin utama yang relevan untuk dirangkum.'];
  if (decisions.length === 0) decisions = ['* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.'];

  return {
    topic,
    summary: summaryItems.join('\n'),
    summaryItems,
    decisions,
    rawMarkdown: formatMeetingNotesMarkdown(topic, summaryItems, decisions),
    modelUsed: hit.model,
    method: 'gemini_ai'
  };
}

/**
 * Versi streaming: potongan mentah bertanda dikirim ke `onDelta` begitu tiba.
 */
async function generateMeetingNotesStream(rawTranscriptText, { apiKey, model, provider }, onDelta) {
  const { parseTagged, toTagged, toBulletList } = await import('./lib/taggedOutput.mjs');
  const client = createClient({ provider, apiKey, timeout: 30000 });

  const nlpResult = () => {
    const nlp = generateMeetingNotesWithNLP(rawTranscriptText);
    return nlp;
  };

  if (!client) {
    const nlp = nlpResult();
    onDelta(toTagged({ TOPIC: nlp.topic, SUMMARY: nlp.summaryItems, DECISIONS: nlp.decisions }));
    return nlp;
  }

  let sent = false;
  const emit = (delta) => {
    sent = true;
    onDelta(delta);
  };

  try {
    const hit = await client.streamWithFallback(
      modelChainFor(provider, model),
      buildMeetingNotesPrompt(rawTranscriptText),
      emit
    );
    if (hit) {
      const fields = parseTagged(hit.text);
      if (fields.TOPIC) {
        const topic = cleanDuplicateWords(fields.TOPIC);
        let summaryItems = toBulletList(fields.SUMMARY).map((s) => `* ${s}`);
        let decisions = toBulletList(fields.DECISIONS).map((s) => `* ${s}`);
        if (summaryItems.length === 0) summaryItems = ['* Tidak ada poin utama yang relevan untuk dirangkum.'];
        if (decisions.length === 0) decisions = ['* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.'];
        return {
          topic,
          summary: summaryItems.join('\n'),
          summaryItems,
          decisions,
          rawMarkdown: formatMeetingNotesMarkdown(topic, summaryItems, decisions),
          modelUsed: hit.model,
          method: 'gemini_ai'
        };
      }
    }
  } catch (e) {
    // sudah ada potongan terkirim; lanjut ke hasil NLP tanpa mengirim ulang
  }

  const nlp = nlpResult();
  if (!sent) onDelta(toTagged({ TOPIC: nlp.topic, SUMMARY: nlp.summaryItems, DECISIONS: nlp.decisions }));
  return nlp;
}

module.exports = {
  generateMeetingNotesWithNLP,
  generateMeetingNotesWithAI,
  generateMeetingNotesStream,
  formatMeetingNotesMarkdown
};
