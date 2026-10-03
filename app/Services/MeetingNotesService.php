<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class MeetingNotesService
{
    protected array $decisionKeywords = [
        'sepakat', 'setuju', 'putuskan', 'memutuskan', 'disepakati', 'keputusan', 
        'menetapkan', 'diputuskan', 'deal', 'fix', 'disetujui', 'ditetapkan', 'mufakat'
    ];

    protected array $debatePatterns = [
        '/\b(?:sempat\s+ada\s+perdebatan|ada\s+perdebatan|perdebatan\s+panjang)\b/i',
        '/\b(?:pro\s+dan\s+kontra|ada\s+yang\s+menolak|sempat\s+menolak)\b/i',
        '/\b(?:berpendapat\s+bahwa|menurut\s+saya|menurut\s+pandangan|argumen)\b/i',
        '/\b(?:awalnya\s+diusulkan|sebagian\s+mengusulkan|ada\s+keraguan)\b/i'
    ];

    public function generate(string $text, ?string $apiKey = null): array
    {
        // Bersihkan teks terlebih dahulu dengan TranscriptCorrectionService
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
        $sentences = preg_split('/(?<=[.?!])\s+|\n+/', trim($text), -1, PREG_SPLIT_NO_EMPTY);
        $sentences = array_values(array_filter($sentences, fn($s) => strlen(trim($s)) > 5));

        if (empty($sentences)) {
            return [
                'topic' => 'Tidak ada teks transkrip untuk dianalisis.',
                'summary' => 'Belum ada ringkasan hasil rapat yang dapat diproses.',
                'keyTakeaways' => [],
                'decisions' => [],
                'rawMarkdown' => '',
                'method' => 'nlp_builtin'
            ];
        }

        // 1. Topik Rapat Cerdas (Berbasis substansi pembicaraan nyata)
        $topic = $this->extractSmartTopic($sentences, $text);

        // 2. Keputusan yang Diambil (Bebas Perdebatan / Argumen)
        // Aturan: Jika tidak ada kesepakatan konkrit, kembalikan array kosong
        $decisions = [];
        foreach ($sentences as $s) {
            $hasDecision = false;
            foreach ($this->decisionKeywords as $kw) {
                if (preg_match("/\\b{$kw}\\b/i", $s)) {
                    $hasDecision = true;
                    break;
                }
            }

            if ($hasDecision) {
                $cleanDecision = $s;
                $cleanDecision = preg_replace('/^.*?(?:setelah\s+(?:perdebatan|diskusi\s+panjang|mempertimbangkan|pro\s+kontra)[^,]*,\s*)/i', '', $cleanDecision);
                $cleanDecision = preg_replace('/^.*?(?:meskipun\s+sempat[^,]*,\s*)/i', '', $cleanDecision);

                if (preg_match('/(?:disepakati|sepakat|setuju|diputuskan|memutuskan|menetapkan|ditetapkan|mufakat)\s+(?:bahwa\s+)?([^\n]+?)(?=[.?!](?:\s+|$)|$)/i', $cleanDecision, $matchAgreed)) {
                    $outcome = trim($matchAgreed[1]);
                    $outcome = preg_replace('/\s+karena\s+sebelumnya.*$/i', '', $outcome);
                    $formatted = 'Disepakati ' . $outcome;
                    $formatted = ucfirst($formatted);
                    if (!preg_match('/[.?!]$/', $formatted)) $formatted .= '.';
                    if (!in_array($formatted, $decisions)) {
                        $decisions[] = $formatted;
                    }
                } else {
                    $isDebate = false;
                    foreach ($this->debatePatterns as $dp) {
                        if (preg_match($dp, $cleanDecision)) {
                            $isDebate = true;
                            break;
                        }
                    }

                    if (!$isDebate) {
                        $formatted = ucfirst(preg_replace('/^(?:dan|lalu|kemudian|kita|kami)\s+/i', '', trim($cleanDecision)));
                        if (!preg_match('/[.?!]$/', $formatted)) $formatted .= '.';
                        if (!in_array($formatted, $decisions)) {
                            $decisions[] = $formatted;
                        }
                    }
                }
            }
        }

        // 3. Poin-Poin Utama (Key Takeaways)
        $keyTakeaways = [];
        foreach ($sentences as $s) {
            $isDebate = false;
            foreach ($this->debatePatterns as $dp) {
                if (preg_match($dp, $s)) {
                    $isDebate = true;
                    break;
                }
            }

            if (!preg_match('/^(?:selamat|halo|assalamualaikum|hai|pagi|siang|sore|malam)\b/i', $s) &&
                !str_starts_with(strtolower(trim($s)), 'agenda rapat') &&
                !str_starts_with(strtolower(trim($s)), 'topik hari ini') &&
                !$isDebate) {
                
                $hasDecision = false;
                foreach ($this->decisionKeywords as $kw) {
                    if (preg_match("/\\b{$kw}\\b/i", $s)) {
                        $hasDecision = true;
                        break;
                    }
                }

                if (!$hasDecision) {
                    $pt = ucfirst(trim(preg_replace('/^(?:dan|lalu|kemudian|selanjutnya)\s+/i', '', trim($s))));
                    if (!preg_match('/[.?!]$/', $pt)) $pt .= '.';
                    if (!in_array($pt, $keyTakeaways) && strlen($pt) > 10) {
                        $keyTakeaways[] = $pt;
                    }
                }
            }
        }

        // 4. Ringkasan Hasil Percakapan (Versi lebih padat & jelas dari fakta nyata, bukan template)
        $summary = '';
        $count = count($sentences);
        if ($count === 1) {
            $summary = rtrim($sentences[0], '.') . '.';
        } elseif ($count === 2) {
            $summary = rtrim($sentences[0], '.') . '. ' . rtrim($sentences[1], '.') . '.';
        } else {
            $s1 = preg_replace('/^(?:selamat\s+(?:pagi|siang|sore|malam)|halo|hai|assalamualaikum)\s*[,.?!]?\s*/i', '', $sentences[0]);
            $s1 = ucfirst(trim($s1));
            if (!preg_match('/[.?!]$/', $s1)) $s1 .= '.';

            $s2 = '';
            if (!empty($keyTakeaways) && $keyTakeaways[0] !== $s1) {
                $s2 = $keyTakeaways[0];
            } else {
                $s2 = $sentences[(int)floor($count / 2)];
            }
            if (!preg_match('/[.?!]$/', $s2)) $s2 .= '.';

            $s3 = '';
            if (!empty($decisions)) {
                $s3 = $decisions[0];
            } elseif ($count >= 3 && $sentences[$count - 1] !== $s2 && $sentences[$count - 1] !== $s1) {
                $s3 = $sentences[$count - 1];
            }
            if ($s3 && !preg_match('/[.?!]$/', $s3)) $s3 .= '.';

            $parts = array_filter([$s1, $s2, $s3]);
            $summary = implode(' ', $parts);
        }

        // 5. Raw Markdown Format Dinamis
        $rawMarkdown = $this->formatMeetingNotesMarkdown($topic, $summary, $keyTakeaways, $decisions);

        return [
            'topic' => $topic,
            'summary' => $summary,
            'keyTakeaways' => $keyTakeaways,
            'decisions' => $decisions,
            'rawMarkdown' => $rawMarkdown,
            'method' => 'nlp_builtin'
        ];
    }

    protected function extractSmartTopic(array $sentences, string $fullText): string
    {
        // 1. Deteksi penyebutan eksplisit topik atau agenda rapat
        foreach ($sentences as $s) {
            if (preg_match('/(?:agenda|topik|fokus|bahasan|membahas|pertemuan\s+hari\s+ini|meeting\s+hari\s+ini|rapat\s+hari\s+ini)\s+(?:tentang|mengenai|soal|adalah|yaitu)?\s*([^.?!,;]+)/i', $s, $m)) {
                $candidate = preg_replace('/^(?:rapat|meeting|diskusi|hari\s+ini|besok|pekan\s+ini)\s+/i', '', trim($m[1]));
                $candidate = $this->cleanTopicString($candidate);
                if (strlen($candidate) >= 4 && strlen($candidate) <= 60) {
                    return $candidate;
                }
            }
        }

        // 2. Ekstrak frasa inti dari kalimat pembuka yang bermakna
        foreach ($sentences as $s) {
            if (preg_match('/^(?:halo|selamat|hai|assalamu|pagi|siang|sore|malam|tes|cek)\b/i', $s)) continue;

            if (preg_match('/(?:terkait|soal|tentang|mengenai|rencana|masalah|kendala|evaluasi|proyek|fitur|jadwal|target|perbaikan|pengembangan|sistem|server|database|anggaran|biaya|rilis|deploy)\s+([^.?!,;]+)/i', $s, $m)) {
                $candidate = $this->cleanTopicString($m[0]);
                if (strlen($candidate) >= 6 && strlen($candidate) <= 60) {
                    return $candidate;
                }
            }

            $clauses = preg_split('/[,;]/', $s);
            $firstClause = trim($clauses[0] ?? '');
            if (strlen($firstClause) >= 8 && strlen($firstClause) <= 55) {
                $candidate = $this->cleanTopicString($firstClause);
                if (strlen($candidate) >= 6) {
                    return $candidate;
                }
            }
        }

        // 3. Fallback ekstraksi kata kunci awal
        $cleanWords = preg_replace('/^(?:halo|selamat\s+(?:pagi|siang|sore|malam)|assalamualaikum|hai)\s*[,.?!]?\s*/i', '', $fullText);
        $words = preg_split('/\s+/', trim($cleanWords));
        $slice = implode(' ', array_slice($words, 0, 7));
        $slice = preg_replace('/[.?!,]+$/', '', $slice);
        if (strlen($slice) >= 5) {
            return $this->cleanTopicString($slice);
        }

        return 'Catatan Percakapan';
    }

    protected function cleanTopicString(string $str): string
    {
        $s = trim(preg_replace('/\s+/', ' ', $str));
        $s = preg_replace('/^(?:dan|lalu|kemudian|bahwa|kita|kami|saya|jadi|untuk)\s+/i', '', $s);
        if ($s === '') return '';
        return ucfirst($s);
    }

    protected function formatMeetingNotesMarkdown(string $topic, string $summary, array $keyTakeaways, array $decisions): string
    {
        $md = "NOTULEN RAPAT (Minutes of Meeting)\n\n📌 Topik / Konteks Pembicaraan:\n{$topic}\n\n📝 Ringkasan Hasil Rapat:\n{$summary}\n";

        if (!empty($keyTakeaways)) {
            $markdownTakeaways = implode("\n", array_map(fn($k) => "* {$k}", $keyTakeaways));
            $md .= "\n💡 Poin-Poin Utama (Key Takeaways):\n{$markdownTakeaways}\n";
        }

        if (!empty($decisions)) {
            $markdownDecisions = implode("\n", array_map(fn($d) => "* {$d}", $decisions));
            $md .= "\n⚖️ Keputusan yang Diambil (Decisions Made):\n{$markdownDecisions}\n";
        }

        return trim($md);
    }

    protected function generateWithAI(string $text, string $apiKey): ?array
    {
        try {
            $prompt = "Anda adalah analis percakapan dan notulis eksekutif profesional.
Tugas Anda adalah membuat Notulen Rapat (Minutes of Meeting / MoM) cerdas, presisi, dan kontekstual dari transkrip percakapan berikut.

ATURAN KETAT WAJIB DIPATUHI:
1. TOPIK / KONTEKS PEMBICARAAN (topic):
   - Simpulkan topik spesifik apa yang BENAR-BENAR dibicarakan dari konten percakapan.
   - JANGAN PERNAH membuat topik template generik (seperti 'Evaluasi dan Koordinasi Tim', 'Pembahasan Proyek', 'Rapat Koordinasi') jika percakapan membahas hal spesifik (misal: 'Penanganan Downtime Database', 'Rencana Peluncuran Fitur Pembayaran', 'Jadwal Piket Kantor', atau 'Diskusi Santai Menu Makan Siang').
   - Judul topik harus singkat (3-8 kata), jelas, dan mencerminkan subjek pembicaraan.

2. RINGKASAN HASIL PERCAKAPAN (summary):
   - Buat ringkasan eksekutif tepat 2-3 kalimat yang merupakan VERSI LEBIH BERSIH, JELAS, DAN PADAT dari apa yang terekam.
   - JANGAN PERNAH menggunakan rumus kalimat template kaku (seperti 'Rapat ini difokuskan pada...', 'Dalam sesi pembahasan dilaporkan bahwa...', 'Sebagai tindak lanjut konkret...').
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
  \"topic\": \"Topik spesifik hasil analisis isi percakapan\",
  \"summary\": \"Ringkasan eksekutif 2-3 kalimat yang natural dan jelas\",
  \"keyTakeaways\": [\"Poin penting 1\", \"Poin penting 2\"],
  \"decisions\": [\"Keputusan konkrit 1\"]
}
Jika tidak ada keyTakeaways atau decisions, kembalikan array kosong [] pada field terkait.

HANYA berikan JSON yang valid tanpa Markdown code block (jangan gunakan ```json).

Transkrip Pembicaraan:
\"\"\"
{$text}
\"\"\"";

            $response = Http::timeout(12)->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={$apiKey}", [
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
                        $summary = trim($res['summary'] ?? '');
                        $keyTakeaways = is_array($res['keyTakeaways'] ?? null) ? array_values(array_filter($res['keyTakeaways'])) : [];
                        $decisions = is_array($res['decisions'] ?? null) ? array_values(array_filter($res['decisions'])) : [];

                        $rawMarkdown = $this->formatMeetingNotesMarkdown($topic, $summary, $keyTakeaways, $decisions);

                        return [
                            'topic' => $topic,
                            'summary' => $summary,
                            'keyTakeaways' => $keyTakeaways,
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
