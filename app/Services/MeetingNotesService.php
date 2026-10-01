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

        // 1. Topik Rapat
        $topic = 'Evaluasi dan Koordinasi Rapat';
        foreach ($sentences as $s) {
            if (preg_match('/(?:membahas|evaluasi|progres|peluncuran|pertemuan|agenda|topik|koordinasi|fokus|tinjauan)\s+([^.?!]+)/i', $s, $m)) {
                $t = preg_replace('/^(?:tentang|mengenai|soal|pada|terkait)\s+/i', '', trim($m[1]));
                $t = preg_replace('/\b(?:hari\s+ini|besok|pekan\s+ini)\b/i', '', $t);
                $t = trim($t);
                if (strlen($t) > 3) {
                    $topic = ucfirst($t);
                    if (!str_starts_with(strtolower($topic), 'evaluasi') && !str_starts_with(strtolower($topic), 'pembahasan') && !str_starts_with(strtolower($topic), 'koordinasi')) {
                        $topic = 'Pembahasan ' . $topic;
                    }
                    break;
                }
            }
        }

        // 2. Keputusan yang Diambil (Bebas Perdebatan / Argumen)
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

                if (preg_match('/(?:disepakati|sepakat|setuju|diputuskan|memutuskan|menetapkan|ditetapkan|mufakat)\s+(?:bahwa\s+)?([^.?!]+)/i', $cleanDecision, $matchAgreed)) {
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

        if (empty($decisions)) {
            $decisions[] = 'Seluruh tim menyepakati untuk mengeksekusi rencana kerja sesuai target yang telah ditetapkan.';
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

        if (empty($keyTakeaways) && !empty($sentences)) {
            $keyTakeaways[] = ucfirst(trim($sentences[0]));
        }

        // 4. Ringkasan Eksekutif (2-3 Kalimat Padat)
        $firstPoint = !empty($keyTakeaways) ? strtolower(rtrim($keyTakeaways[0], '.')) : 'berbagai aspek operasional dan teknis telah ditinjau';
        $mainDecision = !empty($decisions) ? strtolower(rtrim(preg_replace('/^[A-Z][a-z]+\s+/i', '', $decisions[0]), '.')) : 'arah pelaksanaan tindak lanjut telah disepakati bersama';

        $sentence1 = "Rapat ini difokuskan pada " . strtolower($topic) . " guna menyelaraskan strategi dan operasional tim.";
        $sentence2 = "Dalam sesi pembahasan, dilaporkan bahwa {$firstPoint}.";
        $sentence3 = "Sebagai tindak lanjut konkret, disepakati bahwa {$mainDecision}.";
        $summary = "{$sentence1} {$sentence2} {$sentence3}";

        // 5. Raw Markdown Format Wajib
        $markdownTakeaways = implode("\n", array_map(fn($k) => "* {$k}", $keyTakeaways));
        $markdownDecisions = implode("\n", array_map(fn($d) => "* {$d}", $decisions));

        $rawMarkdown = "NOTULEN RAPAT (Minutes of Meeting)\n\n📌 Topik / Konteks Pembicaraan:\n{$topic}\n\n📝 Ringkasan Hasil Rapat:\n{$summary}\n\n💡 Poin-Poin Utama (Key Takeaways):\n{$markdownTakeaways}\n\n⚖️ Keputusan yang Diambil (Decisions Made):\n{$markdownDecisions}\n";

        return [
            'topic' => $topic,
            'summary' => $summary,
            'keyTakeaways' => $keyTakeaways,
            'decisions' => $decisions,
            'rawMarkdown' => $rawMarkdown,
            'method' => 'nlp_builtin'
        ];
    }

    protected function generateWithAI(string $text, string $apiKey): ?array
    {
        try {
            $prompt = "Anda adalah sekretaris eksekutif profesional.
Buat Notulen Rapat (Minutes of Meeting / MoM) resmi dari transkrip percakapan berikut dengan mematuhi ATURAN KETAT ini:

1. PERBAIKAN KATA (Contextual Correction):
   Perbaiki semua kesalahan dengar berbasis fonetis industri teknologi/bisnis secara otomatis:
   - 'range roaming' -> 'brainstorming'
   - 'convention Redmi' -> 'conversion rate'
   - 'downline total' -> 'downtime total'
   - 'bab/BAB' -> 'bug'
   - 'untuk 4 / di 4' -> 'untuk Kuartal 4 / Q4'
   - Bersihkan kata berulang dan interupsi pembicara.

2. KEPUTUSAN YANG DIAMBIL:
   Tuliskan HANYA poin hasil akhir yang disepakati secara ringkas. JANGAN PERNAH memasukkan draf perdebatan, argumen pro-kontra, komparasi, atau dialog panjang pembicara di bagian ini. Ekstrak HANYA inti keputusan konkritnya.

3. RINGKASAN:
   Buat ringkasan eksekutif dalam TEPAT 2-3 kalimat yang padat dan komprehensif.

4. FORMAT OUTPUT WAJIB:
   JSON murni:
   {
     \"topic\": \"Topik rapat dengan jelas\",
     \"summary\": \"Tepat 2-3 kalimat ringkasan eksekutif padat\",
     \"keyTakeaways\": [\"Poin penting 1 beserta data/angka\", \"Poin penting 2\"],
     \"decisions\": [\"Keputusan konkrit 1\", \"Keputusan konkrit 2\"]
   }

Transkrip:
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
                        $topic = $res['topic'];
                        $summary = $res['summary'] ?? '';
                        $keyTakeaways = $res['keyTakeaways'] ?? [];
                        $decisions = $res['decisions'] ?? [];

                        $markdownTakeaways = implode("\n", array_map(fn($k) => "* {$k}", $keyTakeaways));
                        $markdownDecisions = implode("\n", array_map(fn($d) => "* {$d}", $decisions));

                        $rawMarkdown = "NOTULEN RAPAT (Minutes of Meeting)\n\n📌 Topik / Konteks Pembicaraan:\n{$topic}\n\n📝 Ringkasan Hasil Rapat:\n{$summary}\n\n💡 Poin-Poin Utama (Key Takeaways):\n{$markdownTakeaways}\n\n⚖️ Keputusan yang Diambil (Decisions Made):\n{$markdownDecisions}\n";

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
