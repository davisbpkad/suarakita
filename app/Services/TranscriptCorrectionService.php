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
        ['pattern' => '/\bresiko\b/i', 'replacement' => 'risiko'],
        ['pattern' => '/\banalisa\b/i', 'replacement' => 'analisis'],
        ['pattern' => '/\bjadual\b/i', 'replacement' => 'jadwal'],
        ['pattern' => '/\befektip\b/i', 'replacement' => 'efektif'],
        ['pattern' => '/\bkwalitas\b/i', 'replacement' => 'kualitas']
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

        // 1. Pembersihan Interupsi Pembicara & Audio Test
        $beforeInterruption = $text;
        $text = preg_replace('/\b(?:tes|test)\s+(?:tes|test)?\s*(?:1\s*2\s*3|audio|suara|mic)?\b[.?!,]?\s*/i', '', $text);
        $text = preg_replace('/\b(?:suara\s+saya\s+(?:kedengaran|jelas|masuk)\s*(?:gak|tidak|ya)?|kedengaran\s+gak\s+suara\s+saya|mic\s+saya\s+(?:jelas|kedengaran)\s*(?:gak|tidak|ya)?)\b[.?!,]?\s*/i', '', $text);
        $text = preg_replace('/\b(?:tunggu\s+(?:bentar|sebentar)|bentar\s+bentar|sebentar\s+sebentar|tunggu\s+dulu|tunggu\s+sebentar\s+ya)\b[.?!,]?\s*/i', '', $text);
        $text = preg_replace('/\b(?:eh\s+sori\s+kepotong|sorry\s+kepotong|maaf\s+kepotong|bisa\s+diulang\s+gak|tadi\s+putus[\s-]putus|sorry\s+sorry)\b[.?!,]?\s*/i', '', $text);
        $text = preg_replace('/\b(?:oke\s+lanjut\s+lanjut|oke\s+lanjut|silakan\s+lanjut)\b[.?!,]?\s*/i', '', $text);
        if ($text !== $beforeInterruption) {
            $changes[] = 'Pembersihan interupsi pembicara dan pengujian audio';
        }

        // 2. Pembersihan filler words
        $beforeFiller = $text;
        $text = preg_replace('/\b(?:eh+|anu|umm?|uhh?|hmmm?|eee+|aaa+|you\s+know)\b\s*/i', ' ', $text);
        if ($text !== $beforeFiller) {
            $changes[] = 'Pembersihan kata jeda lisan (filler words: eh, anu, dll)';
        }

        // 3. Bersihkan kata gagap / kata berulang
        $beforeStutter = $text;
        $text = preg_replace_callback('/\b([a-zA-ZÀ-ÿ0-9]{2,})(?:[,\s]+\1)+\b/i', function($matches) {
            $word = $matches[1];
            $lower = strtolower($word);
            $legitimateDoubles = ['sama', 'hati', 'tiba', 'jalan', 'halo', 'pelan', 'kira', 'pura', 'moga', 'mudah'];
            if (in_array($lower, $legitimateDoubles)) {
                return "{$word} {$word}";
            }
            return $word;
        }, $text);
        $text = preg_replace('/\b(kita harus|saya mau|akan ada|bisa kita|sudah kita|untuk itu)(?:[,\s]+\1)+\b/i', '$1', $text);
        if ($text !== $beforeStutter) {
            $changes[] = 'Penghapusan kata berulang / gagap lisan';
        }

        // 4. Koreksi Kesalahan Dengar Fonetis Industri Teknologi & Bisnis
        $beforePhonetic = $text;

        // A. range roaming -> brainstorming
        $text = preg_replace('/\b(?:range\s+roaming|renge\s+roming|renj\s+roming|bren\s+storming|brain\s+stroming|brain\s+storming)\b/i', 'brainstorming', $text);

        // B. convention redmi -> conversion rate
        $text = preg_replace('/\b(?:convention\s+redmi|konvensi\s+redmi|konvesi\s+redmi|conversion\s+redmi|convention\s+rate)\b/i', 'conversion rate', $text);

        // C. downline total -> downtime total
        $text = preg_replace('/\b(?:downline\s+total|down\s+line\s+total)\b/i', 'downtime total', $text);
        $text = preg_replace('/\bdownline\b(?=\s+(?:server|sistem|aplikasi|database|website|jaringan|infrastruktur))/i', 'downtime', $text);
        $text = preg_replace('/\b(?:server|sistem|aplikasi|database|website)\s+downline\b/i', '$1 downtime', $text);

        // D. bab / BAB -> bug (kecuali Bab 1, Bab 2)
        $text = preg_replace('/\b(ada|laporan|temukan|menemukan|banyak|fix|fixing|perbaiki|perbaikan|penanganan|analisis|cek|daftar|list|tumpukan)\s+(?:bab|bak)\b/i', '$1 bug', $text);
        $text = preg_replace('/\b(?:bab|bak)\s+(kritis|blocker|major|minor|aplikasi|sistem|tampilan|alur|payment|transaksi|login|database|crash)\b/i', 'bug $1', $text);
        $text = preg_replace('/\bBAB\b(?=\s+(?:kritis|blocker|aplikasi|sistem|di|pada|payment|login|baru|lama))/', 'bug', $text);
        $text = preg_replace('/\b(?:laporan|banyak|fix|ada)\s+BAB\b/', '$1 bug', $text);

        // E. untuk 4 -> untuk Kuartal 4 (Q4)
        $text = preg_replace('/\b(untuk|target|pada|di|rencana|jadwal)\s+4\b(?=\s+(?:nanti|mendatang|tahun\s+ini|depan|ini|[.,?!]|$))/i', '$1 Kuartal 4 (Q4)', $text);
        $text = preg_replace('/\b(kuarter|kuartir|kiu|q)\s*4\b/i', 'Kuartal 4 (Q4)', $text);
        $text = preg_replace('/\b(kuarter|kuartir|kiu|q)\s*1\b/i', 'Kuartal 1 (Q1)', $text);
        $text = preg_replace('/\b(kuarter|kuartir|kiu|q)\s*2\b/i', 'Kuartal 2 (Q2)', $text);
        $text = preg_replace('/\b(kuarter|kuartir|kiu|q)\s*3\b/i', 'Kuartal 3 (Q3)', $text);

        // F. setting vs meeting
        $text = preg_replace('/\b(ruang|jadwal|waktu|agenda|link|hasil|ikutan|hadir\s+di|adakan|selesai|undangan)\s+setting\b/i', '$1 meeting', $text);
        $text = preg_replace('/\b(kita|kami)\s+setting\b/i', '$1 meeting', $text);
        $text = preg_replace('/\bsetting\s+(evaluasi|mingguan|bulanan|proyek|tim|koordinasi|zoom|online|daring)\b/i', 'meeting $1', $text);
        $text = preg_replace('/\bzoom\s+setting\b/i', 'zoom meeting', $text);

        // G. biaya vs bisa
        $text = preg_replace('/\b(apakah\s+(?:kita|kamu|anda|dia|mereka))\s+biaya\b/i', '$1 bisa', $text);
        $text = preg_replace('/\b(kita|saya|aku|kamu|mereka|pasti|harus|tidak|belum|sudah)\s+biaya\b/i', '$1 bisa', $text);
        $text = preg_replace('/\bbiaya\s+(hadir|datang|ikut|bantu|mengerjakan|selesai|cek|perbaiki|siapkan|menyiapkan|rilis|deploy|merge)\b/i', 'bisa $1', $text);
        $text = preg_replace('/\b(berapa|total|rincian|estimasi|anggaran)\s+bisa\b/i', '$1 biaya', $text);
        $text = preg_replace('/\bbisa\s+(perbaikan|langganan|operasional|server|domain|cloud)\b/i', 'biaya $1', $text);

        // H. Istilah Tech & Bisnis lainnya
        $text = preg_replace('/\bloncing\b|\blouncing\b/i', 'launching', $text);
        $text = preg_replace('/\bdiploy\b|\bdi\s+ploy\b|\bdeploi\b/i', 'deploy', $text);
        $text = preg_replace('/\brelese\b|\breles\b/i', 'rilis', $text);
        $text = preg_replace('/\bback\s+end\b|\bbeken\b|\bbeck\s+end\b/i', 'backend', $text);
        $text = preg_replace('/\bfront\s+end\b|\bfronte\b|\bfronen\b/i', 'frontend', $text);
        $text = preg_replace('/\bpull\s+rekues\b|\bpol\s+request\b|\bpul\s+rekues\b/i', 'pull request', $text);
        $text = preg_replace('/\bdedline\b|\bdetlen\b|\bdateline\b/i', 'deadline', $text);
        $text = preg_replace('/\bstan\s+ap\b|\bsten\s+ap\b/i', 'standup', $text);
        $text = preg_replace('/\bdata\s+bes\b|\bdatabes\b/i', 'database', $text);
        $text = preg_replace('/\bres\s+api\b|\brest\s+api\b/i', 'REST API', $text);
        $text = preg_replace('/\bprodaksen\b/i', 'production', $text);
        $text = preg_replace('/\bstejing\b|\bstageing\b/i', 'staging', $text);
        $text = preg_replace('/\bcek\s+out\b|\bcekot\b/i', 'checkout', $text);
        $text = preg_replace('/\btrefik\b|\btrafik\b/i', 'traffic', $text);

        if ($text !== $beforePhonetic) {
            $changes[] = 'Koreksi salah dengar fonetis industri teknologi & bisnis (brainstorming, conversion rate, downtime, bug, Q4, dll)';
        }

        // 5. Normalisasi singkatan
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

        // 6. Normalisasi akronim
        $acronyms = [
            '/\bqa\b/i' => 'QA',
            '/\bui\b/i' => 'UI',
            '/\bux\b/i' => 'UX',
            '/\bapi\b/i' => 'API',
            '/\bit\b/i' => 'IT',
            '/\bid\b/i' => 'ID',
            '/\bpdf\b/i' => 'PDF',
            '/\bmd\b/i' => 'MD',
            '/\bmom\b/i' => 'MoM',
            '/\bpr\b/i' => 'PR',
            '/\bpic\b/i' => 'PIC',
            '/\bkpi\b/i' => 'KPI',
            '/\bokr\b/i' => 'OKR',
            '/\broas\b/i' => 'ROAS',
            '/\bceo\b/i' => 'CEO',
            '/\bcto\b/i' => 'CTO',
            '/\bsop\b/i' => 'SOP'
        ];
        foreach ($acronyms as $pattern => $replacement) {
            $text = preg_replace($pattern, $replacement, $text);
        }

        $text = preg_replace('/\s{2,}/', ' ', trim($text));

        if (!empty($text)) {
            $text = ucfirst($text);
            if (!preg_match('/[.?!]$/', $text)) {
                $text .= (preg_match('/^(?:apakah|bagaimana|kapan|kenapa|mengapa|siapa|berapa)\b/i', $text)) ? '?' : '.';
            }
        }

        return [
            'originalText' => $rawText,
            'correctedText' => $text,
            'changes' => $changes,
            'method' => 'nlp_builtin'
        ];
    }

    protected function correctWithAI(string $rawText, string $apiKey): ?array
    {
        try {
            $prompt = "Anda adalah editor transkrip percakapan bahasa Indonesia profesional khusus industri teknologi dan bisnis.
Tugas Anda adalah membersihkan dan mengoreksi draf transkrip mentah berikut.
Aturan Ketat:
1. Perbaiki kesalahan dengar berbasis fonetis (misal: 'range roaming' -> 'brainstorming', 'convention Redmi' -> 'conversion rate', 'downline total' -> 'downtime total', 'bab/BAB' -> 'bug', 'untuk 4' -> 'untuk Kuartal 4 / Q4', 'ruang setting' -> 'ruang meeting', 'biaya hadir' -> 'bisa hadir').
2. Bersihkan interupsi pembicara (tes audio, cek mic, selaan).
3. Hapus kata berulang dan kata jeda (filler words).
4. Ubah kata singkatan tidak baku menjadi kata baku.
Format output WAJIB JSON murni:
{\"correctedText\": \"Teks bersih\", \"changes\": [\"daftar ringkas perbaikan\"]}
Transkrip:
\"\"\"
{$rawText}
\"\"\"";

            $response = Http::timeout(10)->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={$apiKey}", [
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
                $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
                if ($text) {
                    $clean = trim(preg_replace('/^```json\s*|\s*```$/i', '', $text));
                    $res = json_decode($clean, true);
                    if ($res && isset($res['correctedText'])) {
                        return [
                            'originalText' => $rawText,
                            'correctedText' => $res['correctedText'],
                            'changes' => $res['changes'] ?? ['Koreksi kontekstual via Gemini AI'],
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
