<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class TranscriptCorrectionService
{
    protected array $contractions = [
        ['pattern' => '/\byg\b/i', 'replacement' => 'yang'],
        ['pattern' => '/\bdgn\b/i', 'replacement' => 'dengan'],
        ['pattern' => '/\butk\b/i', 'replacement' => 'untuk'],
        ['pattern' => '/\bkpd\b/i', 'replacement' => 'kepada'],
        ['pattern' => '/\bkrn\b/i', 'replacement' => 'karena'],
        ['pattern' => '/\btp\b/i', 'replacement' => 'tapi'],
        ['pattern' => '/\bsdh\b/i', 'replacement' => 'sudah'],
        ['pattern' => '/\bblm\b/i', 'replacement' => 'belum'],
        ['pattern' => '/\bsy\b/i', 'replacement' => 'saya'],
        ['pattern' => '/\bkm\b/i', 'replacement' => 'kamu'],
        ['pattern' => '/\btdk\b/i', 'replacement' => 'tidak'],
        ['pattern' => '/\bgak\b|\bnggak\b|\bga\b/i', 'replacement' => 'tidak'],
        ['pattern' => '/\bbgt\b/i', 'replacement' => 'sangat'],
        ['pattern' => '/\bbbrp\b/i', 'replacement' => 'beberapa'],
        ['pattern' => '/\bkordinasi\b|\bkordinir\b/i', 'replacement' => 'koordinasi'],
        ['pattern' => '/\bterimakasih\b/i', 'replacement' => 'terima kasih'],
        ['pattern' => '/\bberfikir\b/i', 'replacement' => 'berpikir'],
        ['pattern' => '/\bpraktek\b/i', 'replacement' => 'praktik'],
        ['pattern' => '/\bijin\b/i', 'replacement' => 'izin'],
        ['pattern' => '/\bresiko\b/i', 'replacement' => 'risiko']
    ];

    public function correct(string $rawText, ?string $apiKey = null): array
    {
        if ($apiKey && trim($apiKey) !== '') {
            $ai = $this->correctWithAI($rawText, $apiKey);
            if ($ai) return $ai;
        }

        return $this->correctWithNLP($rawText);
    }

    public function correctWithNLP(string $rawText): array
    {
        $text = trim($rawText);
        $changes = [];

        // 1. Bersihkan filler words
        $beforeFiller = $text;
        $text = preg_replace('/\b(?:eh+|anu|umm?|uhh?|hmmm?|eee+|aaa+|you know)\b\s*/i', ' ', $text);
        if ($text !== $beforeFiller) {
            $changes[] = 'Pembersihan kata jeda lisan (filler words: eh, anu, dll)';
        }

        // 2. Bersihkan kata gagap
        $beforeStutter = $text;
        $text = preg_replace('/\b([a-zA-ZÀ-ÿ]{2,})\s+\1\b/i', '$1', $text);
        if ($text !== $beforeStutter) {
            $changes[] = 'Penghapusan kata berulang akibat jeda atau keraguan bicara';
        }

        // 3. Normalisasi singkatan percakapan lisan
        $count = 0;
        foreach ($this->contractions as $item) {
            if (preg_match($item['pattern'], $text)) {
                $text = preg_replace($item['pattern'], $item['replacement'], $text);
                $count++;
            }
        }
        if ($count > 0) {
            $changes[] = "Normalisasi {$count} kata singkatan lisan ke bentuk baku";
        }

        // 4. Koreksi salah dengar fonetik: biaya vs bisa
        $beforeBiaya = $text;
        $text = preg_replace('/\b(apakah\s+(?:kita|kamu|anda|dia|mereka))\s+biaya\b/i', '$1 bisa', $text);
        $text = preg_replace('/\b(kita|saya|aku|kamu|mereka|pasti|harus|tidak|belum|sudah|[A-Z][a-z]+)\s+biaya\b/i', '$1 bisa', $text);
        $text = preg_replace('/\bbiaya\s+(hadir|datang|ikut|bantu|mengerjakan|selesai|cek|perbaiki|siapkan|menyiapkan|rilis)\b/i', 'bisa $1', $text);
        $text = preg_replace('/\b(berapa|total|rincian|estimasi|anggaran)\s+bisa\b/i', '$1 biaya', $text);
        $text = preg_replace('/\bbisa\s+(perbaikan|langganan|operasional|server|domain)\b/i', 'biaya $1', $text);
        if ($text !== $beforeBiaya) {
            $changes[] = "Koreksi salah dengar fonetik 'biaya' ↔ 'bisa' berdasarkan konteks";
        }

        // 5. Koreksi salah dengar: setting vs meeting
        $beforeSetting = $text;
        $text = preg_replace('/\b(ruang|jadwal|waktu|agenda|link|hasil|ikutan|hadir\s+di|adakan|selesai)\s+setting\b/i', '$1 meeting', $text);
        $text = preg_replace('/\b(kita|kami)\s+setting\b/i', '$1 meeting', $text);
        $text = preg_replace('/\bsetting\s+(evaluasi|mingguan|bulanan|proyek|tim|koordinasi|zoom|online|daring)\b/i', 'meeting $1', $text);
        $text = preg_replace('/\bzoom\s+setting\b/i', 'zoom meeting', $text);
        if ($text !== $beforeSetting) {
            $changes[] = "Koreksi istilah 'setting' -> 'meeting' pada konteks agenda rapat";
        }

        // 6. Normalisasi akronim
        $acronyms = [
            '/\bqa\b/i' => 'QA',
            '/\bui\b/i' => 'UI',
            '/\bux\b/i' => 'UX',
            '/\bapi\b/i' => 'API',
            '/\bit\b/i' => 'IT'
        ];
        foreach ($acronyms as $p => $r) {
            $text = preg_replace($p, $r, $text);
        }

        // 7. Normalisasi spasi
        $text = preg_replace('/\s+/', ' ', trim($text));

        // 8. Format kalimat
        $sentences = preg_split('/(?<=[.?!])\s+|(?<=[a-z0-9])\s+(?=(?:hari ini|kita sepakat|budi|davis|tim QA|desain antarmuka|apakah|bagaimana)\b)/i', $text, -1, PREG_SPLIT_NO_EMPTY);
        $formatted = array_map(function ($s) {
            $s = ucfirst(trim($s));
            if (!preg_match('/[.?!]$/', $s)) {
                $isQ = preg_match('/^(?:apakah|bagaimana|kapan|siapa|kenapa|mengapa|apa\b)/i', $s);
                $s .= $isQ ? '?' : '.';
            }
            return $s;
        }, $sentences);

        $correctedText = implode(' ', $formatted);
        if (empty($changes)) {
            $changes[] = 'Normalisasi ejaan, kapitalisasi kalimat, dan tanda baca akhir';
        }

        return [
            'originalText' => $rawText,
            'correctedText' => $correctedText,
            'changes' => $changes,
            'method' => 'nlp_builtin'
        ];
    }

    protected function correctWithAI(string $rawText, string $apiKey): ?array
    {
        try {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" . urlencode(trim($apiKey));
            $prompt = "Anda adalah asisten ahli koreksi transkrip suara bahasa Indonesia. Bersihkan transkrip mentah dari filler words dan perbaiki kata salah dengar Speech-to-Text (misal: biaya hadir -> bisa hadir, ruang setting -> ruang meeting). Perbaiki tata bahasa dan tanda baca. Output HANYA teks bersih.";

            $response = Http::timeout(10)->post($url, [
                'contents' => [
                    ['parts' => [['text' => "{$prompt}\n\nTranskrip: \"{$rawText}\""]]]
                ]
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $clean = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
                if ($clean) {
                    return [
                        'originalText' => $rawText,
                        'correctedText' => trim($clean),
                        'changes' => [
                            'Pembersihan semantik dan perbaikan ejaan mendalam oleh Gemini 2.0 Flash',
                            'Koreksi kata salah dengar kontekstual tingkat lanjut'
                        ],
                        'method' => 'gemini_ai'
                    ];
                }
            }
        } catch (\Throwable $e) {
            // fallback
        }

        return null;
    }
}
