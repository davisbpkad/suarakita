<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class MeetingNotesService
{
    protected array $decisionKeywords = [
        'sepakat', 'setuju', 'putuskan', 'memutuskan', 'disepakati', 'keputusan', 
        'menetapkan', 'diputuskan', 'deal', 'fix', 'disetujui', 'ditetapkan'
    ];

    public function generate(string $text, ?string $apiKey = null): array
    {
        if ($apiKey && trim($apiKey) !== '') {
            $ai = $this->generateWithAI($text, $apiKey);
            if ($ai) return $ai;
        }

        return $this->generateWithNLP($text);
    }

    public function generateWithNLP(string $text): array
    {
        $sentences = preg_split('/(?<=[.?!])\s+/', trim($text), -1, PREG_SPLIT_NO_EMPTY);
        $sentences = array_values(array_filter($sentences, fn($s) => strlen(trim($s)) > 5));

        // 1. Topik Rapat
        $topic = 'Koordinasi dan Evaluasi Progres Tim';
        foreach ($sentences as $s) {
            if (preg_match('/(?:membahas|evaluasi|progres|peluncuran|pertemuan|agenda|topik|koordinasi)\s+([^.?!]+)/i', $s, $m)) {
                $t = preg_replace('/^(?:tentang|mengenai)\s+/i', '', trim($m[1]));
                $topic = 'Evaluasi ' . ucfirst($t);
                break;
            }
        }

        // 2. Keputusan yang Diambil
        $decisions = [];
        foreach ($sentences as $s) {
            foreach ($this->decisionKeywords as $kw) {
                if (preg_match("/\\b{$kw}\\b/i", $s)) {
                    $cleaned = ucfirst(preg_replace('/^(?:dan|lalu|kemudian|kita|kami)\s+/i', '', trim($s)));
                    if (!preg_match('/[.?!]$/', $cleaned)) $cleaned .= '.';
                    if (!in_array($cleaned, $decisions)) {
                        $decisions[] = $cleaned;
                    }
                    break;
                }
            }
        }

        if (empty($decisions)) {
            $decisions[] = 'Seluruh tim menyepakati untuk melanjutkan implementasi sesuai target jadwal yang ditetapkan.';
        }

        // 3. Action Items
        $actionItems = [];
        foreach ($sentences as $s) {
            if (preg_match('/\b([A-Z][a-zA-Z\s]{1,15})\s+(?:akan|bisa|bertugas|perlu)\s+(.*?)(?:\s+(paling\s+lambat|sebelum|besok|lusa|minggu\s+depan)(.*?))?[.?!]?$/i', $s, $match)) {
                $pic = trim($match[1]);
                if (!preg_match('/^(?:kita|kami|semua|rapat|tim)$/i', $pic)) {
                    $task = ucfirst(trim($match[2]));
                    $deadline = trim(($match[3] ?? '') . ' ' . ($match[4] ?? '')) ?: 'Sesuai kesepakatan';
                    $actionItems[] = [
                        'pic' => $pic,
                        'task' => $task,
                        'deadline' => $deadline
                    ];
                }
            }
        }

        if (empty($actionItems)) {
            $actionItems[] = [
                'pic' => 'Tim Terkait',
                'task' => 'Melakukan koordinasi berkala dan eksekusi tindak lanjut',
                'deadline' => 'Besok sore'
            ];
        }

        // 4. Poin-Poin Utama
        $keyTakeaways = [];
        foreach ($sentences as $s) {
            if (!preg_match('/^(?:selamat|halo|assalamualaikum|hai|pagi|siang|sore|malam)\b/i', $s) &&
                !in_array(ucfirst(trim($s)) . (str_ends_with($s, '.') ? '' : '.'), $decisions) &&
                !str_starts_with(strtolower(trim($s)), 'hari ini kita')) {
                $pt = ucfirst(trim($s));
                if (!preg_match('/[.?!]$/', $pt)) $pt .= '.';
                $keyTakeaways[] = $pt;
            }
        }

        if (empty($keyTakeaways) && !empty($sentences)) {
            $keyTakeaways[] = ucfirst(trim($sentences[0]));
        }

        // 5. Ringkasan Hasil Rapat
        $firstTakeaway = !empty($keyTakeaways) ? strtolower(rtrim($keyTakeaways[0], '.')) : 'pembahasan berjalan efektif';
        $mainDecision = !empty($decisions) ? strtolower(rtrim($decisions[0], '.')) : 'kesepakatan telah dicapai';

        $summary = "Pertemuan ini berfokus pada pembahasan {$topic}. Berdasarkan diskusi, dilaporkan bahwa {$firstTakeaway}. Tim telah mencapai mufakat di mana {$mainDecision}. Rencana tindakan lanjut telah didelegasikan secara terukur kepada penanggung jawab terkait guna menjamin realisasi tepat waktu.";

        // Markdown Generation
        $rawMarkdown = "# NOTULEN RAPAT (Minutes of Meeting)\n\n" .
            "### 📌 Topik / Konteks Pembicaraan:\n{$topic}\n\n" .
            "### 📝 Ringkasan Hasil Rapat:\n{$summary}\n\n" .
            "### 💡 Poin-Poin Utama (Key Takeaways):\n" . implode("\n", array_map(fn($k) => "- {$k}", $keyTakeaways)) . "\n\n" .
            "### ⚖️ Keputusan yang Diambil (Decisions Made):\n" . implode("\n", array_map(fn($d) => "- **{$d}**", $decisions)) . "\n\n" .
            "### 🎯 Rencana Tindakan Lanjut (Action Items):\n" . implode("\n", array_map(fn($a) => "- [ ] **{$a['task']}** (Penanggung Jawab: {$a['pic']} | Tenggat: {$a['deadline']})", $actionItems));

        return [
            'topic' => $topic,
            'summary' => $summary,
            'keyTakeaways' => $keyTakeaways,
            'decisions' => $decisions,
            'actionItems' => $actionItems,
            'rawMarkdown' => $rawMarkdown,
            'method' => 'nlp_builtin'
        ];
    }

    protected function generateWithAI(string $text, string $apiKey): ?array
    {
        try {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" . urlencode(trim($apiKey));
            $prompt = "Buat Notulen Rapat resmi dalam JSON dengan kunci: topic, summary, keyTakeaways (array), decisions (array), actionItems (array of {pic, task, deadline}). Output HANYA JSON murni.";

            $response = Http::timeout(12)->post($url, [
                'contents' => [
                    ['parts' => [['text' => "{$prompt}\n\nTranskrip: \"{$text}\""]]]
                ],
                'generationConfig' => [
                    'responseMimeType' => 'application/json'
                ]
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $jsonStr = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
                if ($jsonStr) {
                    $clean = trim(preg_replace('/^```json\s*|```\s*$/i', '', $jsonStr));
                    $parsed = json_decode($clean, true);
                    if ($parsed && isset($parsed['topic'])) {
                        $parsed['method'] = 'gemini_ai';
                        $parsed['rawMarkdown'] = "# NOTULEN RAPAT (Minutes of Meeting)\n\n" .
                            "### 📌 Topik:\n{$parsed['topic']}\n\n" .
                            "### 📝 Ringkasan:\n" . ($parsed['summary'] ?? '') . "\n\n" .
                            "### 💡 Poin-Poin Utama:\n" . implode("\n", array_map(fn($k) => "- {$k}", $parsed['keyTakeaways'] ?? [])) . "\n\n" .
                            "### ⚖️ Keputusan:\n" . implode("\n", array_map(fn($d) => "- **{$d}**", $parsed['decisions'] ?? [])) . "\n\n" .
                            "### 🎯 Rencana Tindakan Lanjut:\n" . implode("\n", array_map(fn($a) => "- [ ] **{$a['task']}** (PIC: {$a['pic']} | Tenggat: {$a['deadline']})", $parsed['actionItems'] ?? []));
                        return $parsed;
                    }
                }
            }
        } catch (\Throwable $e) {
            // fallback
        }

        return null;
    }
}
