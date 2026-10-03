<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class MeetingNotesService
{
    protected array $disallowedLabels = [
        'pertama', 'kedua', 'ketiga', 'keempat', 'kelima', 'terakhir',
        'lanjut', 'selanjutnya', 'kemudian', 'lalu', 'setelahnya',
        'baik', 'bagus', 'cepat', 'penting', 'umum', 'tanya', 'pertanyaan',
        'bagaimana', 'gimana', 'kapan', 'siapa', 'kenapa', 'mengapa', 'apakah',
        'kita', 'kami', 'saya', 'anda', 'mereka', 'semua', 'tim', 'rekan',
        'hari', 'kemarin', 'besok', 'tadi', 'nanti', 'halo', 'selamat'
    ];

    protected array $casualPatterns = [
        '/\b(?:nonton|main|pertandingan)\s+bola\b/i',
        '/\b(?:seru\s+banget|asik\s+banget|rame\s+banget|parah\s+sih)\b/i',
        '/\b(?:halo\s+bro|halo\s+guys|eh\s+bro|hai\s+gaes|halo\s+kawan)\b/i',
        '/\b(?:tes\s+tes|cek\s+suara|cek\s+audio|mic\s+saya)\b/i',
        '/\b(?:mager|wkwk|haha|canda|jokes)\b/i'
    ];

    public function generate(string $text, ?string $apiKey = null): array
    {
        $corrector = new TranscriptCorrectionService();
        $corrected = $corrector->correctWithNLP($text);
        $cleanText = $corrected['correctedText'] ?? $text;

        if ($apiKey && trim($apiKey) !== '') {
            $ai = $this->generateWithAI($cleanText, $apiKey);
            if ($ai) return $ai;
        }

        return $this->generateWithNLP($cleanText);
    }

    public function generateWithNLP(string $text): array
    {
        if (trim($text) === '') {
            $topic = 'Topik pembicaraan tidak spesifik / Obrolan kasual';
            $summaryItems = ['* Tidak ada poin utama yang relevan untuk dirangkum.'];
            $decisions = ['* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.'];
            return [
                'topic' => $topic,
                'summary' => implode("\n", $summaryItems),
                'summaryItems' => $summaryItems,
                'decisions' => $decisions,
                'rawMarkdown' => $this->formatMeetingNotesMarkdown($topic, $summaryItems, $decisions),
                'method' => 'nlp_builtin'
            ];
        }

        $sentences = preg_split('/(?<=[.?!])\s+|\n+/', trim($text), -1, PREG_SPLIT_NO_EMPTY);
        $sentences = array_values(array_filter($sentences, fn($s) => strlen(trim($s)) > 4));

        $topic = $this->extractTopicSentence($sentences, $text);
        $summaryItems = $this->extractSummaryItems($sentences);
        $decisions = $this->extractDecisions($sentences, $text);
        $rawMarkdown = $this->formatMeetingNotesMarkdown($topic, $summaryItems, $decisions);

        return [
            'topic' => $topic,
            'summary' => implode("\n", $summaryItems),
            'summaryItems' => $summaryItems,
            'decisions' => $decisions,
            'rawMarkdown' => $rawMarkdown,
            'method' => 'nlp_builtin'
        ];
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
            if (preg_match('/(?:progres|peluncuran|rilis|deploy|evaluasi|anggaran|biaya|fitur|perbaikan|bug|konfigurasi|draf\s+konten|pemasaran|desain|tenggat|deadline)\b/i', $s)) {
                $hasStructuredWork = true;
                break;
            }
        }

        if ($casualHits >= 1 && !$hasStructuredWork) {
            return 'Topik pembicaraan tidak spesifik / Obrolan kasual';
        }

        foreach ($sentences as $s) {
            if (preg_match('/(?:agenda|topik|fokus|membahas|pertemuan\s+hari\s+ini|meeting\s+hari\s+ini|rapat\s+hari\s+ini)\s+(?:tentang|mengenai|soal|adalah|yaitu)?\s*([^\n]+?)(?=[.?!](?:\s+|$)|$)/i', $s, $m)) {
                $t = preg_replace('/^(?:rapat|meeting|diskusi|hari\s+ini|besok|pekan\s+ini)\s+/i', '', trim($m[1]));
                if (strlen($t) >= 4) {
                    return 'Penyelarasan dan peninjauan progres ' . strtolower($t) . '.';
                }
            }
        }

        foreach ($sentences as $s) {
            if ($this->isDisallowedFromSummary($s)) continue;

            if (preg_match('/(?:terkait|soal|tentang|mengenai|rencana|evaluasi|proyek|fitur|perbaikan|pengembangan|sistem|server|rilis|deploy|anggaran|kampanye)\s+([^\n]+?)(?=[.?!](?:\s+|$)|$)/i', $s, $m)) {
                $subject = trim($m[0]);
                return 'Koordinasi progres kerja dan evaluasi kendala ' . strtolower($subject) . '.';
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

            $updateText = preg_replace('/^(?:dan|lalu|kemudian|untuk|dari)?\s*(?:si\s+)?' . preg_quote($label, '/') . '\s*(?:sudah|sedang|akan|melaporkan|menyampaikan|bilang)?\s*/i', '', $updateText);
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

    protected function extractDecisions(array $sentences, string $rawText): array
    {
        $decisions = [];
        $processedDecisions = [];

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

                $detail = preg_replace('/^(?:dan|lalu|kemudian|selain\s+itu|terakhir|untuk\s+itu|untuk\s+keputusan\s+akhir[,.]?)\s*/i', '', trim($s));
                if ($category && preg_match('/^' . preg_quote($category, '/') . '\s*(?:tolong)?\s*/i', $detail)) {
                    $detail = preg_replace('/^' . preg_quote($category, '/') . '\s*(?:tolong)?\s*/i', '', $detail);
                }
                $detail = ucfirst($detail);
                if (!preg_match('/[.?!]$/', $detail)) $detail .= '.';

                $item = "* **[{$category}]:** {$detail}";
                if (!isset($processedDecisions[$category])) {
                    $decisions[] = $item;
                    $processedDecisions[$category] = true;
                }
            }
        }

        if (empty($decisions)) {
            foreach ($sentences as $s) {
                if (preg_match('/(?:ga\s+tau\s+deh|belum\s+tau|belum\s+pasti|mager|belum\s+dikonfirmasi|belum\s+konfirmasi|ditunda|pending)/i', $s)) {
                    $actor = 'pihak terkait';
                    if (preg_match('/\bsi\s+([A-Za-z]+)\b/i', $s, $siM)) {
                        $actor = ucfirst(strtolower($siM[1]));
                    }
                    $topic = 'Pembahasan Terkait';
                    if (preg_match('/(?:gedung|tempat|ruangan|booking)/i', $s)) $topic = 'Booking Gedung';
                    elseif (preg_match('/(?:anggaran|biaya|dana)/i', $s)) $topic = 'Persetujuan Anggaran';

                    $decisions[] = "* [{$topic}]: Tidak ada keputusan yang diambil / Status belum dikonfirmasi oleh {$actor}.";
                }
            }
        }

        if (empty($decisions)) {
            return ['* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.'];
        }

        return $decisions;
    }

    protected function formatMeetingNotesMarkdown(string $topic, array $summaryItems, array $decisions): string
    {
        $md = "📌 **Topik / Konteks Pembicaraan:**\n" . trim($topic) . "\n\n📝 **Ringkasan Hasil Rapat:**\n";

        if (!empty($summaryItems)) {
            $md .= implode("\n", $summaryItems);
        } else {
            $md .= "* Tidak ada poin utama yang relevan untuk dirangkum.";
        }

        $md .= "\n\n⚖️ **Keputusan yang Diambil (Decisions Made):**\n";

        if (!empty($decisions)) {
            $md .= implode("\n", $decisions);
        } else {
            $md .= "* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.";
        }

        return trim($md);
    }

    protected function generateWithAI(string $text, string $apiKey): ?array
    {
        try {
            $prompt = "# ROLE & GOAL
Fitur Notulen Rapat Otomatis (Automated Meeting Minutes Feature) berbasis kecerdasan buatan. Tugas utama fitur ini adalah mengolah komponen teks mentah hasil Voice-to-Text (STT), melakukan pembersihan data, serta mentransformasikannya menjadi dokumen Notulen Rapat (Minutes of Meeting) eksekutif yang ringkas, berstruktur tinggi, akurat, dan siap pakai oleh organisasi.

<instruction>
Proses teks transkrip yang diberikan pada variabel {{transkrip_mentah}} dengan mematuhi secara mutlak aturan ketat di bawah ini.
</instruction>

<rules>
1. DILARANG KERAS menyalin kalimat tanya, instruksi pembuka, atau basa-basi penutup ke dalam hasil ringkasan. Ringkasan HANYA berisi update progres atau informasi substantif yang valid.
2. ATURAN PENAMAAN PIC/BIDANG: Gunakan label di dalam kurung siku '* **[Nama PIC / Bidang]:**' HANYA untuk nama orang asli yang berbicara (seperti Andi, Rina, Dian) ATAU nama divisi kerja yang valid (seperti Developer, Desain, Pemasaran). DILARANG menggunakan kata sifat, kata keterangan, bilangan urut (seperti Pertama, Kedua), atau teks pertanyaan acak dari transkrip sebagai nama label.
3. LOGIKA EKSTRAKSI RINGKASAN: Gabungkan update progres yang terpecah menjadi satu kesatuan utuh per PIC/Bidang. Jangan memecah satu subjek orang menjadi banyak poin terpisah yang berulang. Sintesis lengkap mengenai update progres dan kendala dalam maksimal 2 kalimat pendek.
4. LOGIKA EVALUASI KEPUTUSAN: Poin keputusan (Decisions Made) wajib diekstraksi jika terdapat instruksi kerja final, target tenggat waktu (deadline seperti H-7, besok sore), atau arahan penegasan di akhir rapat (misalnya kalimat: 'pastikan selesai besok', 'jaga cadangan', 'siapkan draf konten'). Pindahkan instruksi final tersebut menjadi poin keputusan yang konkrit. Format: '* **[Kategori Keputusan / PIC]:** [Detail tindakan final atau instruksi kerja yang wajib dieksekusi pasca-rapat beserta deadline jika ada]'. Jika rapat benar-benar tanpa keputusan, tulis: '* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.'
5. AKURASI NUMERIK: Salin data persentase, angka biaya, kapasitas, dan deadline waktu (seperti H-7, besok sore) secara presisi 100% sesuai teks asli tanpa modifikasi, pembulatan, atau kalkulasi mandiri.
6. Hasilkan HANYA output dengan format di bawah ini, tanpa teks pengantar atau penutup dari AI.
</rules>

# FORMAT OUTPUT NOTULEN RAPAT

📌 **Topik / Konteks Pembicaraan:**
[Tulis 1 kalimat ringkas mengenai tujuan utama rapat]

📝 **Ringkasan Hasil Rapat:**
* **[Nama PIC / Divisi]:** [Sintesis lengkap mengenai update progres dan kendala. Maksimal 2 kalimat pendek]

⚖️ **Keputusan yang Diambil (Decisions Made):**
* **[Kategori Keputusan / PIC]:** [Detail tindakan final atau instruksi kerja yang wajib dieksekusi pasca-rapat beserta deadline jika ada]

# FORMAT OUTPUT JSON:
Hasilkan HANYA JSON murni yang valid tanpa Markdown code block (```json) dengan skema:
{
  \"topic\": \"1 kalimat ringkas mengenai tujuan utama rapat\",
  \"summaryItems\": [
    \"* **[Nama PIC / Divisi]:** Sintesis lengkap mengenai update progres dan kendala (maksimal 2 kalimat pendek)\"
  ],
  \"decisions\": [
    \"* **[Kategori Keputusan / PIC]:** Detail tindakan final atau instruksi kerja yang wajib dieksekusi pasca-rapat beserta deadline jika ada\"
  ]
}

Jika rapat benar-benar tanpa keputusan, isi decisions dengan:
[\"* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.\"]

Transkrip Mentah:
\"\"\"
{$text}
\"\"\"";

            $response = Http::timeout(15)->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={$apiKey}", [
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
                        $topic = trim($res['topic']);

                        $summaryItems = [];
                        if (isset($res['summaryItems']) && is_array($res['summaryItems'])) {
                            $summaryItems = array_values(array_filter($res['summaryItems']));
                        } elseif (isset($res['summary']) && is_string($res['summary'])) {
                            $summaryItems = array_values(array_filter(explode("\n", $res['summary'])));
                        }

                        $decisions = [];
                        if (isset($res['decisions']) && is_array($res['decisions'])) {
                            $decisions = array_values(array_filter($res['decisions']));
                        }

                        if (empty($summaryItems)) {
                            $summaryItems = ['* Tidak ada poin utama yang relevan untuk dirangkum.'];
                        }
                        if (empty($decisions)) {
                            $decisions = ['* Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.'];
                        }

                        $rawMarkdown = $this->formatMeetingNotesMarkdown($topic, $summaryItems, $decisions);

                        return [
                            'topic' => $topic,
                            'summary' => implode("\n", $summaryItems),
                            'summaryItems' => $summaryItems,
                            'decisions' => $decisions,
                            'rawMarkdown' => $rawMarkdown,
                            'method' => 'gemini_ai'
                        ];
                    }
                }
            }
        } catch (\Throwable $e) {
            // fallback
        }

        return null;
    }
}
