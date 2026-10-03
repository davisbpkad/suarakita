<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class MeetingNotesService
{
    protected array $casualPatterns = [
        '/\b(?:nonton|main|pertandingan)\s+bola\b/i',
        '/\b(?:seru\s+banget|asik\s+banget|rame\s+banget|parah\s+sih)\b/i',
        '/\b(?:halo\s+bro|halo\s+guys|eh\s+bro|hai\s+gaes|halo\s+kawan)\b/i',
        '/\b(?:tes\s+tes|cek\s+suara|cek\s+audio|mic\s+saya)\b/i',
        '/\b(?:mager|wkwk|haha|canda|jokes)\b/i'
    ];

    protected array $consensusKeywords = [
        'sepakat', 'setuju', 'diputuskan', 'memutuskan', 'menetapkan', 
        'disepakati', 'ditetapkan', 'deal', 'fix', 'disetujui', 'mufakat'
    ];

    protected array $pendingPatterns = [
        '/(?:ga\s+tau\s+deh|belum\s+tau|belum\s+pasti|mager|belum\s+dikonfirmasi|belum\s+konfirmasi|belum\s+ada\s+kabar|menggantung|ditunda|pending|ragu)/i'
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
        $sentences = array_values(array_filter($sentences, fn($s) => strlen(trim($s)) > 3));

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

    protected function extractTopicSentence(array $sentences, string $fullText): string
    {
        $casualHits = 0;
        foreach ($this->casualPatterns as $p) {
            if (preg_match($p, $fullText)) $casualHits++;
        }

        $isDominantCasual = ($casualHits >= 1 && (
            preg_match('/nonton\s+bola/i', $fullText) ||
            preg_match('/mager/i', $fullText) ||
            preg_match('/halo\s+bro/i', $fullText) ||
            count($sentences) <= 3
        ));

        $hasStructuredWork = false;
        foreach ($sentences as $s) {
            if (preg_match('/(?:peluncuran|jadwal\s+rilis|evaluasi|anggaran|biaya\s+sebesar|fitur|perbaikan\s+bug|konfigurasi|uji\s+coba\s+final)\b/i', $s)) {
                $hasStructuredWork = true;
                break;
            }
        }

        if ($isDominantCasual && !$hasStructuredWork) {
            return 'Topik pembicaraan tidak spesifik / Obrolan kasual';
        }

        foreach ($sentences as $s) {
            if (preg_match('/(?:agenda|topik|fokus|membahas|pertemuan\s+hari\s+ini|meeting\s+hari\s+ini|rapat\s+hari\s+ini)\s+(?:tentang|mengenai|soal|adalah|yaitu)?\s*([^\n]+?)(?=[.?!](?:\s+|$)|$)/i', $s, $m)) {
                $t = preg_replace('/^(?:rapat|meeting|diskusi|hari\s+ini|besok|pekan\s+ini)\s+/i', '', trim($m[1]));
                if (strlen($t) >= 4) {
                    return 'Pembahasan mengenai ' . strtolower($t) . ' guna menyelaraskan rencana kerja tim.';
                }
            }
        }

        foreach ($sentences as $s) {
            if (preg_match('/^(?:halo|selamat|hai|assalamu|pagi|siang|sore|malam)\b/i', $s)) continue;

            if (preg_match('/(?:terkait|soal|tentang|mengenai|rencana|evaluasi|proyek|fitur|perbaikan|pengembangan|sistem|server|rilis|deploy|anggaran)\s+([^\n]+?)(?=[.?!](?:\s+|$)|$)/i', $s, $m)) {
                $subject = trim($m[0]);
                return 'Koordinasi dan peninjauan progres ' . strtolower($subject) . '.';
            }
        }

        if ($hasStructuredWork) {
            return 'Koordinasi operasional dan sinkronisasi tugas tim kerja.';
        }

        return 'Topik pembicaraan tidak spesifik / Obrolan kasual';
    }

    protected function extractSummaryItems(array $sentences): array
    {
        $items = [];
        $processedKeys = [];

        foreach ($sentences as $s) {
            $isCasual = false;
            foreach ($this->casualPatterns as $cp) {
                if (preg_match($cp, $s)) {
                    $isCasual = true;
                    break;
                }
            }
            if ($isCasual) continue;

            if (preg_match('/^(?:halo|selamat|hai|assalamu|pagi|siang|sore|malam|oke|baiklah)\b/i', $s) && count(preg_split('/\s+/', trim($s))) <= 4) {
                continue;
            }

            // PIC eksplisit
            if (preg_match('/\b(?:si\s+)?([A-Z][a-z]+)\s+(?:akan|bisa|tolong|mau|tugasnya|bertanggung\s+jawab|mengerjakan|siapkan|menyiapkan|handling|menyelesaikan|ditugaskan|bilang\s+mau)\s+([^\n]+?)(?=[.?!](?:\s+|$)|$)/i', $s, $m)) {
                $commonWords = ['hari', 'kami', 'kita', 'saya', 'anda', 'mereka', 'semua', 'tim', 'kemarin', 'besok', 'selamat', 'rapat', 'tadi'];
                if (!in_array(strtolower($m[1]), $commonWords)) {
                    $picName = ucfirst(strtolower($m[1]));
                    $taskDesc = trim($m[2]);

                    if (preg_match_all('/(?:rp\s*[\d.,]+|\d+(?:\s*(?:orang|server|bug|persen|%|jam|hari|minggu))?)/i', $s, $numMatches)) {
                        $nums = $numMatches[0];
                        if (!empty($nums) && !str_contains($taskDesc, $nums[0])) {
                            $taskDesc .= ' (' . implode(', ', $nums) . ')';
                        }
                    }

                    $taskDesc = preg_replace('/^(?:untuk|bisa|mau)\s+/i', '', $taskDesc);
                    $synthesized = "Bertanggung jawab untuk {$taskDesc}.";
                    $itemKey = 'pic_' . strtolower($picName);

                    if (!isset($processedKeys[$itemKey])) {
                        $items[] = "* **[{$picName}]:** {$synthesized}";
                        $processedKeys[$itemKey] = true;
                        continue;
                    }
                }
            }

            // Kategori Bidang
            $domain = null;
            if (preg_match('/(?:server|database|backend|frontend|api|bug|deploy|rilis|sistem|coding|staging)/i', $s)) {
                $domain = 'Teknis';
            } elseif (preg_match('/(?:qa|testing|uji\s+coba|pengujian|pengetesan)/i', $s)) {
                $domain = 'Pengujian QA';
            } elseif (preg_match('/(?:ui|ux|desain|antarmuka|mockup|tampilan)/i', $s)) {
                $domain = 'Desain UI/UX';
            } elseif (preg_match('/(?:gedung|tempat|ruangan|booking|sewa|armada|transportasi|logistik)/i', $s)) {
                $domain = 'Logistik';
            } elseif (preg_match('/(?:konsumsi|makanan|snack|makan\s+siang|katering|minuman)/i', $s)) {
                $domain = 'Konsumsi';
            } elseif (preg_match('/(?:anggaran|biaya|dana|nominal|rupiah|uang|invoice|pembayaran|budget)/i', $s)) {
                $domain = 'Keuangan';
            } elseif (preg_match('/(?:jadwal|koordinasi|rapat|meeting|piket|target|operasional)/i', $s)) {
                $domain = 'Operasional';
            }

            if ($domain) {
                $itemKey = 'domain_' . $domain;
                if (!isset($processedKeys[$itemKey])) {
                    $cleanText = preg_replace('/^(?:kemarin|hari\s+ini|besok|lalu|kemudian|dan)\s+/i', '', trim($s));
                    $cleanText = ucfirst($cleanText);
                    if (!preg_match('/[.?!]$/', $cleanText)) $cleanText .= '.';

                    $items[] = "* **[{$domain}]:** Pembahasan mengenai " . strtolower($cleanText);
                    $processedKeys[$itemKey] = true;
                }
            }
        }

        if (empty($items)) {
            return ['* Tidak ada poin utama yang relevan untuk dirangkum.'];
        }

        return $items;
    }

    protected function extractDecisions(array $sentences, string $rawText): array
    {
        $decisions = [];
        $processedCategories = [];

        foreach ($sentences as $s) {
            $hasConsensus = false;
            foreach ($this->consensusKeywords as $kw) {
                if (preg_match("/\\b{$kw}\\b/i", $s)) {
                    $hasConsensus = true;
                    break;
                }
            }

            if ($hasConsensus) {
                $category = 'Pelaksanaan Tugas';
                if (preg_match('/(?:rilis|peluncuran|launching|jadwal|tanggal|jumat|senin|besok)/i', $s)) $category = 'Jadwal Rilis';
                elseif (preg_match('/(?:server|deploy|teknis|sistem|bug|database)/i', $s)) $category = 'Teknis & Sistem';
                elseif (preg_match('/(?:gedung|tempat|sewa|ruangan)/i', $s)) $category = 'Fasilitas & Gedung';
                elseif (preg_match('/(?:biaya|anggaran|harga|dana|uang)/i', $s)) $category = 'Anggaran';

                if (preg_match('/(?:sepakat|setuju|diputuskan|memutuskan|menetapkan|ditetapkan|mufakat)\s+(?:untuk\s+|bahwa\s+)?([^\n]+?)(?=[.?!](?:\s+|$)|$)/i', $s, $m)) {
                    $action = trim($m[1]);
                } else {
                    $action = trim($s);
                }

                $action = preg_replace('/^(?:untuk|bahwa)\s+/i', '', $action);
                $action = ucfirst($action);
                if (!preg_match('/[.?!]$/', $action)) $action .= '.';

                $item = "* **[{$category}]:** Disepakati untuk " . strtolower($action);
                if (!isset($processedCategories[$category])) {
                    $decisions[] = $item;
                    $processedCategories[$category] = true;
                }
                continue;
            }

            $isPending = false;
            foreach ($this->pendingPatterns as $p) {
                if (preg_match($p, $s)) {
                    $isPending = true;
                    break;
                }
            }

            if ($isPending) {
                $pendingCategory = 'Pembahasan Terkait';
                $actor = 'pihak terkait';

                if (preg_match('/\bsi\s+([A-Za-z]+)\b/i', $s, $siM)) {
                    $actor = ucfirst(strtolower($siM[1]));
                } elseif (preg_match('/\b(Budi|Davis|Andi|Rini|Siti|Agus|Dewi|Joko|Rian|Doni|Eko|Fajar|Hendra|Putri|Reza|Tono)\b/i', $s, $nM)) {
                    $actor = $nM[1];
                }

                if (preg_match('/(?:gedung|tempat|ruangan|booking)/i', $s)) $pendingCategory = 'Booking Gedung';
                elseif (preg_match('/(?:anggaran|biaya|dana)/i', $s)) $pendingCategory = 'Persetujuan Anggaran';
                elseif (preg_match('/(?:jadwal|tanggal)/i', $s)) $pendingCategory = 'Penetapan Jadwal';
                elseif (preg_match('/(?:fitur|desain|rilis)/i', $s)) $pendingCategory = 'Fitur Produk';

                if (!isset($processedCategories[$pendingCategory])) {
                    $decisions[] = "* [{$pendingCategory}]: Tidak ada keputusan yang diambil / Status belum dikonfirmasi oleh {$actor}.";
                    $processedCategories[$pendingCategory] = true;
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
Sistem bertindak sebagai Notulis Rapat Otomatis tingkat tinggi. Tugas utama Anda adalah mengekstraksi, mensintesis, dan merangkum transkrip suara mentah menjadi dokumen Notulen Rapat (Minutes of Meeting) yang bersih, profesional, dan siap pakai.

<instruction>
Proses teks transkrip yang diberikan pada variabel {{transkrip_mentah}} dengan mematuhi secara mutlak aturan ketat di bawah ini.
</instruction>

<rules>
1. DILARANG KERAS menyalin ulang kalimat utuh secara verbatim dari transkrip ke dalam hasil notulen.
2. ELIMINASI semua elemen non-substansial: salam, sapaan pembuka/penutup, celetukan, humor, obrolan kosong, gossip, dan pembicaraan yang keluar dari konteks profesional (ngalor-ngidul).
3. EKSTRAK NAMA PIC SECARA OBJEKTIF: Cantumkan nama pembicara/PIC yang bertanggung jawab atas suatu tugas hanya jika disebutkan eksplisit. Jika tugas dibahas tanpa penunjukan nama, gunakan label deskriptif seperti [Logistik], [Konsumsi], [Operasional], [Teknis], [Produk], [Keuangan], atau bidang terkait. DILARANG mengarang nama orang.
4. PERATURAN ANTI-HALUSINASI POIN UTAMA: Jika suatu bagian percakapan tidak menghasilkan kesimpulan kerja atau hanya berisi obrolan kosong, jangan buatkan poin rangkuman. Jika seluruh transkrip tidak memiliki poin utama sama sekali, tuliskan: \"* Tidak ada poin utama yang relevan untuk dirangkum.\"
5. PERATURAN ANTI-HALUSINASI KEPUTUSAN: Keputusan hanya dicatat jika ada konsensus (persetujuan bersama) yang jelas dalam teks. Jika pembahasan berakhir menggantung, ditunda, atau tidak ada kesepakatan, tuliskan secara eksplisit: \"* [Kategori Pembahasan]: Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.\"
6. AKURASI DATA NUMERIK: Pindahkan semua data angka (biaya/nominal uang, kapasitas orang, persentase, tenggat waktu) secara presisi 100% sesuai teks asli. DILARANG melakukan pembulatan, estimasi, atau perhitungan mandiri yang tidak tertulis di transkrip.
7. ETIKA OUTPUT: Jangan berikan teks pengantar (\"Berikut adalah hasil notulen...\", \"Baik, ini tugas saya...\") di awal maupun di akhir jawaban. Hasilkan HANYA format notulen resmi.
</rules>

# CONTOH PENANGANAN (FEW-SHOT EXAMPLE)
Jika Transkrip: \"Halo bro, eh besok jadi rapat kah? Ah tau lah, kemarin si Budi bilang mau booking gedung tapi ga tau deh dia mager apa kagak. Eh kemarin lu nonton bola ga? Seru banget.\"
Maka Output Keputusan: 
* [Booking Gedung]: Tidak ada keputusan yang diambil / Status belum dikonfirmasi oleh Budi.

# FORMAT OUTPUT JSON:
Hasilkan HANYA JSON murni yang valid tanpa Markdown code block (```json) dengan skema:
{
  \"topic\": \"1 kalimat padat mengenai esensi/tujuan utama rapat. Jika percakapan 100% tidak terstruktur, tulis: Topik pembicaraan tidak spesifik / Obrolan kasual\",
  \"summaryItems\": [
    \"* **[Nama PIC atau Nama Bidang]:** Rangkuman progres/bahasan dalam maksimal 2 kalimat pendek yang padat isi\"
  ],
  \"decisions\": [
    \"* **[Kategori Keputusan]:** Detail tindakan final yang disepakati untuk dieksekusi\",
    \"* [Kategori Pembahasan]: Tidak ada keputusan yang diambil / Pembahasan ditangguhkan.\"
  ]
}

Jika seluruh transkrip tidak memiliki poin utama yang relevan, isi summaryItems dengan:
[\"* Tidak ada poin utama yang relevan untuk dirangkum.\"]

Jika tidak ada keputusan yang disepakati ataupun pembahasan menggantung, isi decisions dengan:
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
