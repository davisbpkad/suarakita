<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class MeetingNotesService
{
    protected array $disallowedLabels = [
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
    ];

    protected array $casualPatterns = [
        '/\b(?:nonton|main|pertandingan)\s+bola\b/i',
        '/\b(?:seru\s+banget|asik\s+banget|rame\s+banget|parah\s+sih)\b/i',
        '/\b(?:halo\s+bro|halo\s+guys|eh\s+bro|hai\s+gaes|halo\s+kawan)\b/i',
        '/\b(?:tes\s+tes|cek\s+suara|cek\s+audio|mic\s+saya)\b/i',
        '/\b(?:mager|wkwk|haha|canda|jokes)\b/i'
    ];

    public function generate(string $text, ?string $apiKey = null, string $preferredModel = 'gemini-2.5-flash'): array
    {
        $corrector = new TranscriptCorrectionService();
        $corrected = $corrector->correctWithNLP($text);
        $cleanText = $corrected['correctedText'] ?? $text;

        if ($apiKey && trim($apiKey) !== '') {
            $ai = $this->generateWithAI($cleanText, $apiKey, $preferredModel);
            if ($ai) return $ai;
        }

        return $this->generateWithNLP($cleanText);
    }

    public function generateWithNLP(string $text): array
    {
        if (trim($text) === '') {
            $topic = 'Topik pembicaraan tidak spesifik / Obrolan kasual';
            $summaryItems = ['* Tidak ada poin utama yang relevan untuk dirangkum.'];
            $keyPoints = ['* Tidak ada poin utama yang relevan untuk dirangkum.'];
            $decisions = ['* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.'];
            return [
                'topic' => $topic,
                'summary' => implode("\n", $summaryItems),
                'summaryItems' => $summaryItems,
                'keyPoints' => $keyPoints,
                'decisions' => $decisions,
                'rawMarkdown' => $this->formatMeetingNotesMarkdown($topic, $summaryItems, $keyPoints, $decisions),
                'method' => 'nlp_builtin'
            ];
        }

        $sentences = preg_split('/(?<=[.?!])\s+|\n+/', trim($text), -1, PREG_SPLIT_NO_EMPTY);
        $sentences = array_values(array_filter($sentences, fn($s) => strlen(trim($s)) > 4));

        $topic = $this->extractTopicSentence($sentences, $text);
        $summaryItems = $this->extractSummaryItems($sentences);
        $keyPoints = $this->extractKeyPoints($sentences, $summaryItems, $text);
        $decisions = $this->extractDecisions($sentences, $text);
        $rawMarkdown = $this->formatMeetingNotesMarkdown($topic, $summaryItems, $keyPoints, $decisions);

        return [
            'topic' => $topic,
            'summary' => implode("\n", $summaryItems),
            'summaryItems' => $summaryItems,
            'keyPoints' => $keyPoints,
            'decisions' => $decisions,
            'rawMarkdown' => $rawMarkdown,
            'method' => 'nlp_builtin'
        ];
    }

    protected function cleanDuplicateWords(string $text): string
    {
        if (trim($text) === '') return '';
        return trim(preg_replace('/\b([a-zA-ZÀ-ÿ0-9]+)(?:\s+\1\b)+/i', '$1', $text));
    }

    protected function isDisallowedFromSummary(string $sentence): bool
    {
        $s = trim($sentence);
        if (strlen($s) < 5) return true;

        if (str_ends_with($s, '?') || preg_match('/\b(?:bagaimana|gimana|kapan|apakah|kenapa|mengapa|siapa|ada\s+(?:kendala|masalah)\s*(?:apa|gak|tidak|kah)|bisa\s+tolong)\b/i', $s)) {
            return true;
        }

        if (preg_match('/^(?:selamat\s+(?:pagi|siang|sore|malam)|halo|hai|assalamu|mari\s+kita\s+mulai|rapat\s+dibuka|cek\s+(?:sound|audio|suara)|tes\s+tes|terima\s+kasih\s+sudah\s+hadir|agenda\s+hari\s+ini)\b/i', $s) && count(preg_split('/\s+/', $s)) <= 8) {
            return true;
        }

        if (preg_match('/(?:sekian\s+dari\s+saya|terima\s+kasih\s+semuanya|sampai\s+jumpa|kita\s+akhiri|demikian\s+rapat|rapat\s+selesai|oke\s+terima\s+kasih\s+rekan)/i', $s)) {
            return true;
        }

        foreach ($this->casualPatterns as $p) {
            if (preg_match($p, $s)) return true;
        }

        return false;
    }

    protected function extractTopicSentence(array $sentences, string $fullText): string
    {
        $casualHits = 0;
        foreach ($this->casualPatterns as $p) {
            if (preg_match($p, $fullText)) $casualHits++;
        }

        $hasStructuredWork = false;
        foreach ($sentences as $s) {
            if (preg_match('/(?:progres|peluncuran|rilis|deploy|evaluasi|anggaran|biaya|fitur|perbaikan|bug|latensi|draf\s+konten|pemasaran|desain|tenggat|deadline)\b/i', $s)) {
                $hasStructuredWork = true;
                break;
            }
        }

        if ($casualHits >= 1 && !$hasStructuredWork) {
            return 'Topik pembicaraan tidak spesifik / Obrolan kasual';
        }

        // 1. Deteksi agenda eksplisit
        foreach ($sentences as $s) {
            if (preg_match('/(?:agenda|topik|fokus|membahas|pertemuan\s+hari\s+ini|meeting\s+hari\s+ini|rapat\s+hari\s+ini)\s+(?:tentang|mengenai|soal|adalah|yaitu)?\s*([^\n]+?)(?=[.?!](?:\s+|$)|$)/i', $s, $m)) {
                $t = preg_replace('/^(?:rapat|meeting|diskusi|hari\s+ini|besok|pekan\s+ini)\s+/i', '', trim($m[1]));
                $t = $this->cleanDuplicateWords($t);
                if (strlen($t) >= 4) {
                    return $this->cleanDuplicateWords('Penyelarasan dan peninjauan progres ' . strtolower($t) . '.');
                }
            }
        }

        // 2. Deteksi domain substantif utama
        $topicsFound = [];
        if (preg_match('/(?:api|payment|gateway|server|latensi|deploy|database|developer)/i', $fullText)) {
            $topicsFound[] = 'integrasi sistem';
        }
        if (preg_match('/(?:desain|mockup|ui|ux|antarmuka)/i', $fullText)) {
            $topicsFound[] = 'kesiapan desain antarmuka';
        }
        if (preg_match('/(?:pemasaran|kampanye|marketing|draf\s+konten|promosi)/i', $fullText)) {
            $topicsFound[] = 'kampanye pemasaran';
        }

        if (count($topicsFound) >= 2) {
            return $this->cleanDuplicateWords('Koordinasi progres ' . implode(', ', $topicsFound) . ', serta peninjauan kendala teknis dan target tenggat waktu.');
        }

        foreach ($sentences as $s) {
            if ($this->isDisallowedFromSummary($s)) continue;

            if (preg_match('/(?:terkait|soal|tentang|mengenai|rencana|evaluasi|proyek|fitur|perbaikan|pengembangan|sistem|server|rilis|deploy|anggaran|kampanye)\s+([^\n]+?)(?=[.?!](?:\s+|$)|$)/i', $s, $m)) {
                $subject = $this->cleanDuplicateWords(trim($m[0]));
                return $this->cleanDuplicateWords('Koordinasi progres kerja dan evaluasi kendala ' . strtolower($subject) . '.');
            }
        }

        if ($hasStructuredWork) {
            return 'Koordinasi progres tim dan penegasan instruksi kerja pasca-rapat.';
        }

        return 'Topik pembicaraan tidak spesifik / Obrolan kasual';
    }

    protected function extractSummaryItems(array $sentences): array
    {
        $subjectGroups = [];

        foreach ($sentences as $s) {
            if ($this->isDisallowedFromSummary($s)) continue;

            $isFinalInstruction = preg_match('/\b(?:pastikan|wajib|harus|siapkan\s+draf|untuk\s+keputusan\s+akhir|disepakati|sepakat|diputuskan)\b/i', $s) &&
                preg_match('/\b(?:besok|H-\d+|deadline|tenggat|paling\s+lambat|sebelum\s+jam|selesai)\b/i', $s);
            if ($isFinalInstruction) continue;

            $label = null;
            $updateText = trim($s);

            if (preg_match('/\b(?:si\s+|dari\s+|bagian\s+)?([A-Z][a-z]+)\b/', $s, $nameMatch)) {
                $candidate = $nameMatch[1];
                $lower = strtolower($candidate);
                if (!in_array($lower, $this->disallowedLabels) && strlen($candidate) >= 3) {
                    if (preg_match('/\b(?:Andi|Rina|Dian|Budi|Davis|Agus|Siti|Rian|Doni|Eko|Fajar|Dewi|Putri|Reza|Tono)\b/i', $candidate) ||
                        preg_match('/\b(?:melaporkan|menyampaikan|mengerjakan|menemukan|menyelesaikan|progres|kendala)\b/i', $s)) {
                        $label = ucfirst($lower);
                    }
                }
            }

            if (!$label) {
                if (preg_match('/(?:developer|dev|backend|frontend|api|server|database|coding|bug|latensi|deploy|sistem)/i', $s)) {
                    $label = 'Developer';
                } elseif (preg_match('/(?:desain|designer|ui|ux|mockup|antarmuka|figma|tampilan|aset\s+grafis)/i', $s)) {
                    $label = 'Desain';
                } elseif (preg_match('/(?:pemasaran|marketing|iklan|ads|sosmed|kampanye|campaign|konten|draf\s+konten|promosi)/i', $s)) {
                    $label = 'Pemasaran';
                } elseif (preg_match('/(?:qa|testing|tester|uji\s+coba|pengujian|pengetesan)/i', $s)) {
                    $label = 'QA / Pengujian';
                } elseif (preg_match('/(?:logistik|gedung|ruangan|booking|sewa|armada|transportasi|tempat)/i', $s)) {
                    $label = 'Logistik';
                } elseif (preg_match('/(?:konsumsi|makanan|snack|makan\s+siang|katering|minuman)/i', $s)) {
                    $label = 'Konsumsi';
                } elseif (preg_match('/(?:keuangan|finance|anggaran|biaya|budget|nominal|invoice|pembayaran)/i', $s)) {
                    $label = 'Keuangan';
                } elseif (preg_match('/(?:operasional|jadwal|shift|piket|koordinasi)/i', $s)) {
                    $label = 'Operasional';
                }
            }

            if (!$label) continue;

            $updateText = preg_replace('/^(?:dan|lalu|kemudian|untuk|dari)?\s*(?:si\s+)?' . preg_quote($label, '/') . '\s*(?:dari\s+(?:tim\s+)?[A-Za-z]+)?\s*(?:sudah|sedang|akan|melaporkan|menyampaikan|menjelaskan|bilang)?\s*/i', '', $updateText);
            $updateText = preg_replace('/^(?:ada\s+kendala\s+apa\s+di\s+tim\s+[a-z]+\??\s*)/i', '', $updateText);
            $updateText = preg_replace('/^(?:ada\s+kendala\s+)/i', 'Terdapat kendala ', $updateText);
            $updateText = $this->cleanDuplicateWords($updateText);
            $updateText = ucfirst($updateText);
            if (!preg_match('/[.?!]$/', $updateText)) $updateText .= '.';

            if (!isset($subjectGroups[$label])) {
                $subjectGroups[$label] = [];
            }
            $subjectGroups[$label][] = $updateText;
        }

        if (empty($subjectGroups)) {
            return ['* Tidak ada poin utama yang relevan untuk dirangkum.'];
        }

        $items = [];
        foreach ($subjectGroups as $label => $updates) {
            $combined = implode(' ', array_slice($updates, 0, 2));
            $items[] = "* **[{$label}]:** {$combined}";
        }

        return $items;
    }

    protected function extractKeyPoints(array $sentences, array $summaryItems, string $fullText): array
    {
        $points = [];

        foreach ($sentences as $s) {
            if ($this->isDisallowedFromSummary($s)) continue;
            if (preg_match('/(?:\b\d+%|\bRp\s*[\d.,]+|\bselesai\s+100%|\bmencapai\s+\d+)/i', $s)) {
                $clean = preg_replace('/^(?:dan|lalu|kemudian|untuk|dari|bagaimana\s+dengan)\s+/i', '', trim($s));
                $clean = preg_replace('/^(?:[A-Z][a-z]+\s+(?:dari\s+(?:tim\s+)?[A-Za-z]+\s+)?(?:melaporkan|menyampaikan|menjelaskan)\s+)/i', '', $clean);
                $clean = ucfirst($clean);
                if (!preg_match('/[.?!]$/', $clean)) $clean .= '.';
                $points[] = "* {$clean}";
            }
        }

        if (empty($points) && !empty($summaryItems) && !str_contains($summaryItems[0], 'Tidak ada poin')) {
            foreach (array_slice($summaryItems, 0, 3) as $item) {
                $cleanItem = preg_replace('/^\*\s+\*\*\[.*?\]:\*\*\s*/', '', $item);
                $points[] = "* {$cleanItem}";
            }
        }

        if (empty($points)) {
            return ['* Tidak ada poin utama yang relevan untuk dirangkum.'];
        }

        return array_slice($points, 0, 3);
    }

    protected function extractDecisions(array $sentences, string $rawText): array
    {
        $decisions = [];
        $processedCategories = [];

        foreach ($sentences as $s) {
            $hasFinalInstruction = preg_match('/\b(?:pastikan|wajib|harus|siapkan|jaga|selesaikan|kirimkan|buatkan|eksekusi)\b/i', $s);
            $hasDeadline = preg_match('/\b(?:deadline|tenggat|H-\d+|besok\s+(?:pagi|siang|sore|malam)|paling\s+lambat|sebelum\s+jam|hari\s+(?:senin|selasa|rabu|kamis|jumat|sabtu|minggu))\b/i', $s);
            $hasConsensus = preg_match('/\b(?:sepakat|setuju|diputuskan|memutuskan|menetapkan|disepakati|ditetapkan|deal|fix|mufakat)\b/i', $s);

            if ($hasFinalInstruction || $hasDeadline || $hasConsensus) {
                $category = null;

                if (preg_match('/\b(Andi|Rina|Dian|Budi|Davis|Agus|Siti|Rian|Doni|Eko|Fajar|Dewi|Putri|Reza|Tono)\b/i', $s, $nameMatch)) {
                    $category = $nameMatch[1];
                } else {
                    if (preg_match('/(?:developer|dev|backend|frontend|server|bug|latensi|deploy|database)/i', $s)) $category = 'Developer';
                    elseif (preg_match('/(?:desain|ui|ux|mockup|antarmuka|figma)/i', $s)) $category = 'Desain';
                    elseif (preg_match('/(?:pemasaran|marketing|iklan|draf\s+konten|konten|promosi|campaign)/i', $s)) $category = 'Pemasaran';
                    elseif (preg_match('/(?:qa|testing|uji\s+coba|pengujian)/i', $s)) $category = 'QA / Pengujian';
                    elseif (preg_match('/(?:gedung|tempat|sewa|ruangan)/i', $s)) $category = 'Logistik';
                    elseif (preg_match('/(?:anggaran|biaya|dana|budget|harga)/i', $s)) $category = 'Keuangan';
                    elseif (preg_match('/(?:rilis|peluncuran|launching|jadwal)/i', $s)) $category = 'Jadwal Rilis';
                    else $category = 'Arahan Kerja';
                }

                $deadlineStr = '';
                if (preg_match('/\b(?:paling\s+lambat\s+H-\d+\s+sebelum\s+[a-z]+|H-\d+|besok\s+(?:pagi|siang|sore|malam)|paling\s+lambat\s+[^\n.,]+|sebelum\s+jam\s+[\d.:]+|hari\s+(?:senin|selasa|rabu|kamis|jumat|sabtu|minggu))\b/i', $s, $dMatch)) {
                    $deadlineStr = trim($dMatch[0]);
                }

                $action = preg_replace('/^(?:untuk\s+keputusan\s+akhir[,.]?|lalu|kemudian|dan|selain\s+itu|terakhir)\s*/i', '', trim($s));
                if ($category && preg_match('/^' . preg_quote($category, '/') . '\s*(?:tolong)?\s*/i', $action)) {
                    $action = preg_replace('/^' . preg_quote($category, '/') . '\s*(?:tolong)?\s*/i', '', $action);
                }
                $action = preg_replace('/^(?:pastikan|tolong\s+pastikan|wajib|harus|siapkan)\s*/i', '', $action);
                if ($deadlineStr) {
                    $action = preg_replace('/(?:selesai\s+)?' . preg_quote($deadlineStr, '/') . '/i', '', $action);
                }
                $action = trim(rtrim($action, '.,;'));
                if (preg_match('/^draf\s+/i', $action)) {
                    $action = 'penyiapan ' . $action;
                }

                if ($hasConsensus && !$hasFinalInstruction) {
                    $deadlinePart = $deadlineStr ? " pada {$deadlineStr}" : '';
                    $item = "* **[{$category}]:** Diputuskan bahwa {$action} akan dijalankan{$deadlinePart}.";
                } else {
                    $deadlinePart = $deadlineStr ? " dengan tenggat waktu {$deadlineStr}" : '';
                    $item = "* **[{$category}]:** Ditargetkan untuk {$action} yang wajib diselesaikan oleh {$category}{$deadlinePart}.";
                }

                if (!isset($processedCategories[$category])) {
                    $decisions[] = $item;
                    $processedCategories[$category] = true;
                }
            }
        }

        if (empty($decisions)) {
            foreach ($sentences as $s) {
                if (preg_match('/(?:ga\s+tau\s+deh|belum\s+tau|belum\s+pasti|mager|belum\s+dikonfirmasi|belum\s+konfirmasi|ditunda|pending)/i', $s)) {
                    $topic = 'Pembahasan Terkait';
                    if (preg_match('/(?:gedung|tempat|ruangan|booking)/i', $s)) $topic = 'Booking Gedung';
                    elseif (preg_match('/(?:anggaran|biaya|dana)/i', $s)) $topic = 'Persetujuan Anggaran';

                    $decisions[] = "* [{$topic}]: Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.";
                }
            }
        }

        if (empty($decisions)) {
            return ['* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.'];
        }

        return $decisions;
    }

    protected function formatMeetingNotesMarkdown(string $topic, array $summaryItems, array $keyPoints, array $decisions): string
    {
        $md = "📌 **Topik / Konteks Pembicaraan:**\n" . $this->cleanDuplicateWords($topic) . "\n\n📝 **Ringkasan Hasil Rapat (Progress & Substansi):**\n";

        if (!empty($summaryItems)) {
            $md .= implode("\n", $summaryItems);
        } else {
            $md .= "* Tidak ada poin utama yang relevan untuk dirangkum.";
        }

        if (!empty($keyPoints)) {
            $md .= "\n\n⚡ **Poin-Poin Utama:**\n" . implode("\n", $keyPoints);
        }

        $md .= "\n\n🎯 **Keputusan yang Diambil (Decisions Made):**\n";

        if (!empty($decisions)) {
            $md .= implode("\n", $decisions);
        } else {
            $md .= "* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.";
        }

        return trim($md);
    }

    protected function generateWithAI(string $text, string $apiKey, string $preferredModel = 'gemini-2.5-flash'): ?array
    {
        $prompt = "# ROLE & GOAL Perbaikan Fitur Notulen
Sistem Anda adalah Fitur Notulen Rapat Otomatis (Automated Meeting Minutes Feature) berbasis kecerdasan buatan. Tugas utama fitur ini adalah mengolah komponen teks mentah hasil Voice-to-Text (STT), melakukan pembersihan data, serta mentransformasikannya menjadi dokumen Notulen Rapat (Minutes of Meeting) eksekutif yang ringkas, berstruktur tinggi, akurat, dan siap pakai oleh organisasi.

<instruction>
Proses teks transkrip yang diberikan pada variabel {{transkrip_mentah}} dengan mematuhi secara mutlak aturan ketat di bawah ini.
</instruction>

<rules>
1. DILARANG KERAS menyalin kalimat tanya, instruksi pembuka, atau basa-basi penutup ke dalam hasil ringkasan. Ringkasan HANYA berisi update progres atau informasi substantif yang valid.
2. ATURAN PENAMAAN PIC/BIDANG (GEMINI 2.5 STRICTION): Gunakan label di dalam kurung siku '* **[Nama PIC / Bidang]:**' HANYA untuk nama orang asli yang berbicara (seperti Andi, Rina, Dian) ATAU nama divisi kerja yang valid (seperti Developer, Desain, Pemasaran). Abaikan dan DILARANG keras menggunakan kata depan, kata sifat, kata keterangan, bilangan urut (seperti Pertama, Kedua, Ada), atau teks pertanyaan acak dari transkrip sebagai nama label. Jangan biarkan noise hasil parsing NLP lokal lolos menjadi nama label.
3. LOGIKA EKSTRAKSI RINGKASAN: Gabungkan update progres yang terpecah menjadi satu kesatuan utuh per PIC/Bidang menggunakan kalimat buatanmu sendiri berdasarkan fakta transkrip. Jangan memecah satu subjek orang menjadi banyak poin terpisah yang berulang. Maksimal 2 kalimat pendek dan DILARANG menyalin teks asli percakapan secara verbatim.
4. LOGIKA EVALUASI KEPUTUSAN (DECISIONS MADE): Poin keputusan wajib diekstraksi jika terdapat instruksi kerja final, target tenggat waktu (deadline), atau arahan penegasan di akhir rapat (misalnya kalimat: 'pastikan selesai besok', 'jaga cadangan', 'siapkan draf konten'). Ubah instruksi tersebut menjadi kalimat konkrit menggunakan format awalan:
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
Hasilkan HANYA JSON murni yang valid tanpa Markdown code block (```json) dengan skema:
{
  \"topic\": \"1 kalimat ringkas mengenai tujuan utama rapat tanpa kata berulang\",
  \"summaryItems\": [
    \"* **[Nama PIC / Bidang]:** Kalimat sintesis mandiri non-verbatim max 2 kalimat mengenai progres substantif dan angka metrik\"
  ],
  \"keyPoints\": [
    \"* Poin substantif 1\",
    \"* Poin substantif 2\"
  ],
  \"decisions\": [
    \"* **[Kategori Keputusan / PIC]:** Ditargetkan untuk [Tindakan/Tugas Konkrit] yang wajib diselesaikan oleh [Nama PIC/Divisi] dengan tenggat waktu [Waktu/Deadline jika ada].\"
  ]
}

Jika rapat benar-benar tanpa keputusan, isi decisions dengan:
[\"* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.\"]

Jika seluruh transkrip tidak memiliki poin utama yang relevan, isi keyPoints dengan:
[\"* Tidak ada poin utama yang relevan untuk dirangkum.\"]

Transkrip Mentah:
\"\"\"
{$text}
\"\"\"";

        $candidateModels = array_values(array_unique([
            $preferredModel ?: 'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-1.5-flash'
        ]));

        foreach ($candidateModels as $model) {
            try {
                $response = Http::timeout(15)->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}", [
                    'contents' => [
                        ['parts' => [['text' => $prompt]]]
                    ],
                    'generationConfig' => [
                        'temperature' => 0.1,
                        'responseMimeType' => 'application/json'
                    ]
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    $rawText = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
                    if ($rawText) {
                        $clean = trim(preg_replace('/^```json\s*|\s*```$/i', '', $rawText));
                        $res = json_decode($clean, true);
                        if ($res && isset($res['topic'])) {
                            $topic = $this->cleanDuplicateWords(trim($res['topic']));

                            $summaryItems = [];
                            if (isset($res['summaryItems']) && is_array($res['summaryItems'])) {
                                $summaryItems = array_values(array_filter($res['summaryItems']));
                            }

                            $keyPoints = [];
                            if (isset($res['keyPoints']) && is_array($res['keyPoints'])) {
                                $keyPoints = array_values(array_filter($res['keyPoints']));
                            }

                            $decisions = [];
                            if (isset($res['decisions']) && is_array($res['decisions'])) {
                                $decisions = array_values(array_filter($res['decisions']));
                            }

                            if (empty($summaryItems)) {
                                $summaryItems = ['* Tidak ada poin utama yang relevan untuk dirangkum.'];
                            }
                            if (empty($keyPoints)) {
                                $keyPoints = ['* Tidak ada poin utama yang relevan untuk dirangkum.'];
                            }
                            if (empty($decisions)) {
                                $decisions = ['* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.'];
                            }

                            $rawMarkdown = $this->formatMeetingNotesMarkdown($topic, $summaryItems, $keyPoints, $decisions);

                            return [
                                'topic' => $topic,
                                'summary' => implode("\n", $summaryItems),
                                'summaryItems' => $summaryItems,
                                'keyPoints' => $keyPoints,
                                'decisions' => $decisions,
                                'rawMarkdown' => $rawMarkdown,
                                'modelUsed' => $model,
                                'method' => 'gemini_ai'
                            ];
                        }
                    }
                }
            } catch (\Throwable $e) {
                // lanjut ke model berikutnya
            }
        }

        return null;
    }
}
