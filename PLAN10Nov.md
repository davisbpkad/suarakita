# PLAN10Nov — AI, Keamanan, dan Verifikasi suarakita

Tanggal: 10 November 2026  
Status: Implementasi dimulai; perlindungan penyimpanan key tahap pertama selesai. Rencana keseluruhan belum selesai.  
Lokasi proyek: `/Users/davistanjung/Documents/web-saya`

## Pembaruan server-managed AI — 10 November 2026

### Tampilan kuota Groq sederhana

QuotaStatus bersama untuk koreksi dan notulen menampilkan persentase request/token tersisa, bukan rincian reset berulang. Persentase dihitung dari remaining/limit header Groq, dibulatkan ke bawah, maksimal 100%; tanpa limit tidak mengarang persentase. Label respons terakhir tetap ada karena bukan saldo real-time akun. Retry-After tetap tampil saat perlu menunggu. Parser allowlist dan metadata fallback kini meneruskan limitRequests/limitTokens. RED modul persentase belum tersedia; GREEN npm test 22 berkas lulus, build 29 modul lulus. Backend 3088 dimulai ulang setelah verifikasi PID/cwd. Visual browser dan header nyata setelah perubahan ini belum diuji. Tidak ada commit/push.

### Penggantian STT ke Groq Whisper Turbo

**Keputusan terbaru pengguna:** kembalikan pengetikan langsung seperti sebelumnya. App.vue kembali memakai SpeechRecognizer/Web Speech API saat merekam, tanpa menunggu Stop. Cabang MediaRecorder/unggah audio di UI dihapus. Koreksi dan notulen tetap memakai Groq GPT-OSS 120B dengan key server. Dialog informasi disesuaikan. Endpoint Whisper tetap tersedia di backend tetapi tidak dipanggil UI. Setelah perubahan, build lulus 28 modul dan npm test lulus 21 berkas; mikrofon fisik belum diuji. Refresh halaman 3088 untuk bundle baru. Tidak ada commit/push.

Pengguna menyetujui `whisper-large-v3-turbo` untuk STT. Endpoint lokal `/api/transcribe` sekarang memakai multipart Groq, key backend yang sama, batas audio 10 MB, timeout 120 detik dan disconnect signal. Bahasa UI diteruskan sebagai kode ISO (default id). Koreksi/notulen tetap GPT-OSS 120B. UI tidak lagi mensyaratkan key Gemini untuk mode server-managed dan menjelaskan audio dikirim ke Groq setelah Stop. Key Gemini tidak dihapus.

RED: tes transcribeAudio gagal TypeError karena fungsi belum tersedia. GREEN: `npm test` 21 berkas lulus, termasuk endpoint/model multipart, bahasa, upload dan error 429 yang tidak membocorkan isi respons. `npm run build` lulus 28 modul. Tes nyata WAV sintetis berbahasa Inggris: Whisper Turbo berhasil 1576 ms; melalui HTTP backend 3088 setelah restart berhasil 200 dalam 1659 ms. Audio kosong melalui HTTP ditolak 400. Teks menghasilkan Andy untuk nama Andi, sehingga tidak mengklaim akurasi nama sempurna. Ini bukan benchmark komparatif Gemini atau bukti kualitas bahasa Indonesia/mikrofon fisik. Browser recording E2E dan deployment Netlify belum diuji. Tidak ada commit/push.

Pengguna meminta memakai key dalam `.env`, tanpa commit/push kredensial. Server kini membaca `.env` menggunakan Node loadEnvFile. Key tidak dikirim ke frontend. Jalur lokal memakai Gemini 2.5 Flash untuk unggah audio setelah Stop (maksimum 10 MB), dan Groq `openai/gpt-oss-120b` untuk koreksi/notulen. UI menampilkan informasi provider, bukan form key ketika kedua key server tersedia. Ini bukan streaming langsung. Netlify belum mendapat integrasi audio/key bersama; jangan merilis perubahan sebagai dukungan deployment publik.

Bukti: tes baru RED karena modul serverAi belum tersedia; GREEN `npm test` menjalankan 21 berkas. Build lulus 28 modul, diff check bersih. Tes Express secara eksplisit mengosongkan key agar tidak memakai kredensial nyata. Pemeriksaan metadata Gemini/Groq keduanya HTTP 200. Koreksi dan notulen nyata memakai Groq, outcome success. Backend 3088 dimulai ulang setelah memverifikasi PID/cwd; request koreksi melalui HTTP 3088 memberi 200 engine groq. Tidak mengakses port 3000.

Blokir Gemini: audio sintetis WAV dibuat dengan macOS say lalu dikirim ke Gemini 2.5 Flash; HTTP 404. Request teks minimal juga 404 dengan pesan provider: model tidak tersedia untuk pengguna baru, menyarankan gemini-3.8-flash. Metadata 200 tidak membuktikan inference tersedia. Tidak mengganti model tanpa keputusan pengguna. Mikrofon fisik, E2E perekaman, coverage, dan kualitas lengkap belum diuji. Tidak ada commit atau push; `.env` tetap diabaikan Git.

## 1. Tujuan dan aturan konteks

Membuat Koreksi Teks dan Buat Notulen memahami transkrip mentah tanpa tanda baca, memakai Gemini sebagai AI utama, Groq sebagai cadangan, dan mesin lokal sebagai cadangan terakhir. Lindungi API key dan buktikan perilaku melalui pengujian aktual.

Dokumen ini merupakan konteks dan batas pekerjaan, bukan bukti implementasi atau keberhasilan tes. Membuat dokumen ini tidak berarti fitur sudah dibangun. Setiap pelaksana wajib membaca kode terbaru, memeriksa perubahan pengguna, dan memperbarui status berdasarkan bukti.

### Batas wajib

- Pertahankan palet hangat, layout, dan komposisi suarakita. Ubah hanya bagian yang diperlukan untuk rencana ini.
- Gunakan ikon SVG garis, konsisten dengan gaya `https://pdftogo.netlify.app/`.
- Jangan menjalankan, menghentikan, menguji, atau memakai port `3000`. Port tersebut milik SIPD AKLAP.
- Jalankan dan uji aplikasi ini pada `http://localhost:3088`; server pribadi bind ke `127.0.0.1` secara default.
- Koreksi dan notulen harus menerima transkrip dengan maupun tanpa tanda baca dan kapitalisasi.
- Format topik judul, ringkasan prosa, dan keputusan naratif berlaku untuk jalur AI. Notulen lokal tetap berupa poin.
- Setiap pengguna memakai API key sendiri. Jangan menyediakan key pemilik website untuk pemanggil anonim.
- Jangan menaruh key asli dalam kode, Git, fixture, URL, screenshot, trace, log, atau laporan.
- Jangan membuang atau menimpa perubahan pengguna. Tidak melakukan reset Git atau penghapusan di luar lingkup.
- Tes produksi, beban, panggilan berbayar, dan pengiriman data nyata memerlukan persetujuan terpisah.
- Terapkan perubahan terkecil yang menyelesaikan lingkup. Gunakan helper dan dependensi yang sudah ada; jangan menambah abstraksi atau dependensi tanpa kebutuhan nyata.

## 2. Konteks historis dan temuan awal

Informasi berikut berasal dari percakapan dan pembacaan kode sebelum dokumen dibuat. Verifikasi kembali sebelum mengubah kode.

- Dukungan provider sudah ada: Gemini, Groq, Cerebras, dan OpenRouter. UI saat ini menampung satu provider dan satu key.
- `resources/js/App.vue` membaca dan menyimpan key melalui `localStorage` dengan nama `gemini_api_key`.
- Klien frontend mengirim key melalui header `X-Api-Key`.
- `resources/js/lib/text/markdownInline.mjs` melakukan HTML escaping sebelum menambahkan markup terbatas. Pertahankan perlindungan ini.
- Endpoint Express memanggil `text.trim()` sebelum memastikan bahwa `text` bertipe string.
- Endpoint notulen non-streaming mengoreksi teks secara lokal sebelum AI. Ini dapat mengirim teks yang sudah salah dipotong.
- `server.js` memiliki default port `3000` dan `app.listen` tanpa host eksplisit. Default perlu diperbaiki tanpa menjalankan port tersebut.
- Netlify Functions dirancang memakai key dari pengguna, bukan key server untuk pengguna anonim. CORS bukan autentikasi.
- Kode lokal sudah memiliki `restorePunctuation` dan tes `tests/unpunctuated.test.mjs`.
- Tes historis contoh pendek pernah lulus, tetapi contoh panjang berikutnya masih salah memisahkan kalimat dan mengekstrak keputusan. Hasil historis tidak membuktikan build baru lulus.
- Perubahan UI historis: ikon garis, tombol Stop merah, banner mikrofon tanpa titik merah, footer logo dan `© 2026 suarakita`. Jangan mengembalikan perubahan ini.
- Server sebelumnya dijalankan di port `3088`; periksa kondisi aktual sebelum memakai atau memulai ulang.

## 3. Lingkup dan pengecualian

### Termasuk

- Dua key opsional, Gemini dan Groq, serta persetujuan cadangan Groq.
- Cadangan antar-provider dengan batas percobaan yang sama pada streaming dan non-streaming.
- Prompt dan penyajian hasil AI mengikuti target pengguna tanpa menambah fakta.
- Perbaikan lokal terbatas untuk batas kalimat dan nominal sebagai cadangan terakhir.
- Metadata mesin, alasan fallback, kuota yang tersedia, dan penghitung sesi yang diberi label jujur.
- Pengamanan key, input, output, tujuan provider, request, logging, deployment, dan pengujian.
- Kesetaraan perilaku Express dan Netlify untuk jalur yang didukung.

### Tidak termasuk

- Key bersama untuk publik, akun pengguna, pembayaran, dashboard administrator, atau pelatihan model sendiri.
- Janji hasil AI identik per karakter dengan tulisan manusia atau selalu benar.
- Penghitung kuota global palsu berbasis memori pada deployment multi-instance.
- Perubahan urutan provider yang dapat dikonfigurasi pengguna, mencoba seluruh model, dan retry tanpa batas.
- Penambahan fitur penyimpanan key permanen. Kebutuhan tersebut harus ditinjau terpisah.

## 4. Alur provider dan pemulihan

1. Pengguna memilih Koreksi Teks atau Buat Notulen.
2. Jika key Gemini tersedia, coba model Gemini yang telah diverifikasi valid.
3. Jika Gemini tidak tersedia atau gagal dengan alasan yang layak, coba Groq hanya jika key tersedia dan cadangan diizinkan.
4. Jika AI tidak tersedia, gunakan mesin lokal dengan label dan alasan yang benar.

Aturan:

- Maksimal satu percobaan Gemini dan satu percobaan Groq per tindakan; tanpa rantai semua model.
- `429`: catat informasi batas dan lanjutkan ke cadangan. Jangan menyebut kuota harian habis jika bukti hanya menunjukkan batas per menit.
- `401/403`: catat kegagalan kredensial/akses dan jangan ulangi key yang sama dalam tindakan tersebut.
- Timeout atau gangguan provider: lanjutkan setelah batas waktu. Tentukan timeout eksplisit sesuai batas hosting saat implementasi.
- Request pengguna yang tidak valid ditolak sebelum provider dipanggil. Jangan memboroskan kuota melalui fallback.
- Error model atau respons provider yang tidak valid harus diklasifikasikan; tidak boleh menyebabkan percobaan tak terbatas.
- Pembatalan menghentikan alur dan tidak memulai provider berikutnya. Propagasi pembatalan ke transport sejauh didukung.
- Buang hasil parsial provider sebelumnya saat berpindah. Hasil Gemini dan Groq tidak boleh tercampur.
- Berikan identitas request agar hasil lama tidak menimpa tindakan atau editor yang lebih baru.
- Jika hanya Groq yang tersedia dan diizinkan, gunakan Groq langsung. Jika tanpa key, tidak ada panggilan eksternal.
- Pilihan lokal harus benar-benar menghindari pengiriman transkrip ke AI.
- Jangan menyimpulkan nama/model dalam konfigurasi saat ini valid. Verifikasi dokumentasi provider sebelum build.

## 5. Kualitas koreksi dan notulen

### Koreksi AI

- Tentukan batas kalimat dan paragraf dari konteks pertanyaan, laporan, instruksi, dan penutup.
- Pertahankan nama, negasi, ketidakpastian, nominal, persentase, dan tenggat.
- Ubah nominal terbilang yang jelas menjadi format rupiah, misalnya `dua juta lima ratus ribu rupiah` menjadi `Rp2.500.000`.
- Jangan menambah fakta, mengubah penanggung jawab, atau menghilangkan kata yang mengubah makna.

### Notulen AI

- Topik berupa judul sintesis substantif, bukan salam atau kalimat pertama.
- Ringkasan berupa paragraf prosa, bukan daftar label pembicara.
- Keputusan berupa tugas, PIC, dan tenggat jika didukung transkrip.
- Contoh gaya: “Andi dari Tim Developer bertanggung jawab menyelesaikan masalah latensi server staging paling lambat besok sore.”
- Cantumkan tim/divisi hanya jika didukung transkrip. Jangan menebak divisi seseorang.
- Jangan membuat keputusan dari pertanyaan, rencana tentatif, atau tugas yang dibatalkan.
- Kalimat evaluatif seperti “proyek menunjukkan perkembangan positif” tidak diwajibkan jika hanya interpretasi.
- Kirim transkrip mentah dengan normalisasi spasi minimal ke AI, bukan hasil koreksi lokal yang dapat merusak batas kalimat.
- Validasi bentuk hasil, ukuran, dan kelengkapan yang diperlukan sebelum menampilkannya sebagai hasil akhir.

### Mesin lokal

- Tambahkan aturan terbatas untuk penanda `selanjutnya`, `kemudian`, `sementara`, `berdasarkan hasil pembahasan`, `diminta`, `bertanggung jawab`, dan `demikian`, dengan tes salah-potong.
- Normalisasi nominal terbilang hanya untuk bentuk yang dikenali pasti. Pertahankan bentuk ambigu.
- Tetap gunakan format poin untuk notulen lokal dan tampilkan batas kualitas.
- Aturan lokal tidak dijanjikan menyamai sintesis AI.

### Fixture utama dari pengguna

```text
selamat pagi semuanya terima kasih sudah hadir dalam meeting hari ini mari kita mulai dengan pembahasan perkembangan proyek terbaru Andi bagaimana perkembangan integrasi API payment gateway saat ini Andi menjelaskan bahwa proses integrasi sudah mencapai 80 persen namun masih terdapat kendala pada latensi server staging yang menyebabkan beberapa permintaan mengalami timeout selanjutnya bagaimana perkembangan dari tim desain Rina menyampaikan bahwa seluruh desain mockup untuk versi mobile sudah selesai 100 persen dan hasilnya telah diserahkan kepada tim developer untuk proses implementasi kemudian Dian dari tim pemasaran melaporkan bahwa draf kampanye media sosial telah disiapkan dengan alokasi anggaran sebesar dua juta lima ratus ribu rupiah berdasarkan hasil pembahasan hari ini Andi diminta memastikan seluruh masalah latensi server dapat diselesaikan paling lambat besok sore sementara Dian bertanggung jawab menyelesaikan draf konten promosi paling lambat tujuh hari sebelum peluncuran demikian pembahasan meeting hari ini terima kasih atas waktu dan kerja sama seluruh tim semoga semua pekerjaan dapat diselesaikan sesuai target yang telah ditentukan
```

Target judul: “Pembahasan Progres Pengembangan Proyek, Integrasi API Payment Gateway, Desain Mobile, dan Persiapan Kampanye Pemasaran.” Judul setara makna dapat diterima; tidak mensyaratkan string identik.

Checklist fakta wajib:

- Integrasi mencapai 80 persen, tetapi terkendala latensi staging yang menyebabkan timeout.
- Mockup mobile selesai 100 persen dan diserahkan ke developer untuk implementasi.
- Anggaran pemasaran Rp2.500.000.
- Andi menangani latensi paling lambat besok sore.
- Dian menyelesaikan draf promosi tujuh hari sebelum peluncuran; `H-7` adalah bentuk setara.
- Tugas tidak berpindah ke Rina; salam tidak menjadi topik; keputusan/divisi tidak dikarang.

## 6. Pengaturan, kuota, dan UI

- Modal memuat key Gemini, model utama, key Groq, model cadangan, dan pilihan mengizinkan cadangan Groq.
- Kedua key opsional; input bertipe password dan hanya disimpan dalam memori selama halaman terbuka.
- Hapus key legacy dari `localStorage` tanpa memuatnya kembali ke state. Beri tahu pengguna agar memasukkan ulang.
- Provider/model boleh disimpan; key tidak. Tangani storage yang tidak tersedia tanpa merusak aplikasi.
- Tombol hapus mengosongkan kedua key. Refresh menghapus key dari aplikasi.
- Jelaskan bahwa server aplikasi meneruskan key dan transkrip, serta Groq menerima transkrip saat cadangan aktif.
- Tampilkan mesin/model hasil akhir, alasan fallback, dan pengingat meninjau keputusan.
- Pertahankan palet dan layout; uji keyboard, fokus modal, loading, error, dan layar kecil.

### Kuota yang jujur

- Tangkap header rate-limit Groq yang benar-benar tersedia. Tampilkan jenis jendela request/token dan reset masing-masing.
- Header adalah snapshot respons terakhir, bukan kepastian sisa akun saat ini. Pemakaian di aplikasi lain dapat mengubahnya.
- Gunakan `retry-after` jika valid. Jangan menampilkan waktu reset dari asumsi tetap.
- Jika Gemini tidak memberikan sisa kuota, tampilkan “Sisa kuota tidak tersedia” dan tautan `https://aistudio.google.com/rate-limit`.
- Penghitung lokal berlabel “Pemakaian sesi ini”, bukan sisa kuota akun atau harian global.
- Angka batas gratis dari percakapan sebelumnya adalah informasi historis, bukan kontrak. Verifikasi per model/akun dan catat sumber serta tanggal jika ditampilkan.
- Jangan menjanjikan jumlah rapat per hari dari batas request saja: panjang input/output, token, dan fallback memengaruhi pemakaian.

## 7. Rencana kerentanan dan kontrol

| Risiko | Kontrol wajib | Risiko tersisa / bukti yang diperlukan |
| --- | --- | --- |
| Key di penyimpanan browser | Memori saja; bersihkan key legacy | XSS aktif/ekstensi masih dapat membaca memori; periksa storage |
| Key di Git/bundle/URL | Tidak memakai `VITE_*` untuk rahasia; periksa diff/build/request | Key bocor harus dicabut; jangan hanya menghapusnya |
| Key/transkrip di log | Jangan log header/body atau error mentah provider; redaksi dengan kode error aman | Periksa juga logging hosting, termasuk URL provider |
| XSS dari hasil/transkrip | Pertahankan escaping, hindari HTML mentah, CSP sesuai fitur aplikasi | Tes payload nyata dan seluruh jalur render |
| Eksfiltrasi/SSRF | Tujuan provider tetap; key tidak mengikuti URL/redirect tidak tepercaya | Tolak URL kustom dan periksa kebijakan redirect |
| Penyalahgunaan API | Validasi tipe/ukuran/model/provider; batas frekuensi, konkurensi, waktu, percobaan | Limit memori bukan limit global serverless |
| Request lintas situs | Validasi origin/host yang diizinkan; JSON dan header khusus | CORS bukan autentikasi dan tidak menghentikan non-browser |
| Klik berulang/request lama | Guard frontend dan server; pembatalan; identitas request | UI saja tidak cukup sebagai kontrol server |
| Prompt injection | Transkrip sebagai data, tanpa tools, validasi hasil | AI tetap bisa salah atau mengikuti instruksi teks |
| Server lokal terbuka | Default `127.0.0.1:3088`; host diizinkan secara eksplisit | Akses LAN harus disengaja, bukan default |
| Data keluar tanpa persetujuan | Pemberitahuan AI dan izin cadangan Groq | Kebijakan retensi/penggunaan data provider perlu diverifikasi |
| Cache sensitif | `Cache-Control: no-store` pada API, SSE, dan error | Verifikasi header deployment sebenarnya |

### Deployment publik

- Wajib HTTPS dan header keamanan yang diuji terhadap kebutuhan rekaman, streaming, dan UI.
- Server aplikasi tidak menyimpan key atau transkrip. Jangan mengklaim tidak ada logging hosting tanpa pemeriksaan konfigurasi.
- Netlify membutuhkan limit tingkat platform atau penyimpanan penghitung bersama untuk pembatasan lintas-instance. Verifikasi kemampuan paket sebelum menentukan mekanisme.
- Jika pembatasan global belum tersedia, tandai sebagai gap deployment publik; jangan mengklaim endpoint sudah terlindungi oleh limit lokal.
- Jangan memperluas deployment publik sebagai bagian tersembunyi dari pekerjaan ini.
- Jika kelak key pemilik server digunakan bersama: wajib autentikasi, otorisasi, kuota per akun, batas global, dan tinjauan baru sebelum rilis.

## 8. Urutan build dan file terkait

1. Inventaris semua tombol/event/endpoint/helper, perubahan pengguna, tes, dan konfigurasi deployment. Jalankan baseline.
2. Bangun perlindungan key, migrasi storage, validasi, redaksi error, tujuan provider, serta host/port aman.
3. Satukan aturan fallback dan pembatalan untuk kedua fitur dan kedua mode transport.
4. Perbarui prompt, validasi hasil, parsing, UI prosa, dan ekspor tanpa merusak lokal.
5. Tambahkan metadata pemakaian dan label UI yang tidak mengklaim data unavailable.
6. Perbaiki cadangan lokal secara terbatas dengan tes regresi.
7. Selaraskan Express/Netlify, jalankan suite, Playwright, tes perangkat/provider yang diizinkan, dan tinjau keamanan.

File yang diperkirakan tersentuh; daftar final harus berasal dari pemeriksaan pemanggil:

- `resources/js/App.vue`
- `resources/js/components/AiConfigModal.vue`
- `resources/js/components/TranscriptWorkspace.vue`
- `resources/js/components/CorrectionModal.vue`
- `resources/js/components/MeetingNotesModal.vue`
- `resources/js/lib/api/client.js`
- `resources/js/lib/text/markdownInline.mjs`
- `lib/llmClient.js`, `lib/providers.js`, `lib/providers.json`
- `lib/geminiClient.js`, `lib/openAiCompatibleClient.js`, `lib/httpSse.js`
- `lib/sentenceSplit.js`, `lib/taggedOutput.mjs`
- `corrector.js`, `meetingNotes.js`, `server.js`
- `netlify/functions/`, `netlify.toml`, tes dan skrip validasi yang diperlukan.

Periksa juga helper speech/audio/download, konfigurasi build, fixture, dan README jika kontrak/petunjuk berubah. Jangan mengubah file hanya karena tercantum di sini.

## 9. Standar bukti pengujian

Semua kasus dalam matriks di bawah berstatus **BELUM DIJALANKAN untuk build rencana ini**. Satu baris berisi beberapa variasi; setiap variasi wajib mendapat sub-ID dan hasil terpisah, misalnya `REC-01-N01`.

Setiap catatan tes wajib memuat:

| Kolom | Isi |
| --- | --- |
| ID dan versi | ID/sub-ID, commit atau identitas diff jika belum commit |
| Lingkungan | OS, browser, server/deployment, mode tiruan/asli |
| Input | Data sintetis, fixture, konfigurasi aman |
| Langkah | Tindakan aktual yang dapat direproduksi |
| Harapan | Ditentukan sebelum eksekusi |
| Aktual | Respons/state/error yang benar-benar diamati |
| Status | BELUM DIJALANKAN, LULUS, GAGAL, TERBLOKIR |
| Bukti | Assertion, keluaran perintah, screenshot, trace tersanitasi, berkas unduhan |

Aturan pembuktian:

- Jangan menebak hasil, menandai lulus dari inspeksi kode, atau mengubah harapan hanya agar tes hijau.
- Bedakan bukti provider tiruan, provider asli, mikrofon sintetis, dan mikrofon fisik.
- Screenshot tidak membuktikan jumlah request atau isi unduhan. Periksa artefak yang sesuai.
- Tes terblokir tanpa key/perangkat tetap TERBLOKIR, bukan lulus atau dihapus.
- Jangan merekam key asli dalam trace/network dump. Pakai key sintetis untuk tes kebocoran dan nonaktifkan capture sensitif pada tes asli.
- Tambahkan kasus untuk fungsi yang ditemukan saat inventaris tetapi belum ada pada matriks ini.
- Tes AI tidak harus identik per karakter: gunakan assertion fakta/struktur dan tinjauan manusia atas makna. Catat keluaran aktual.
- Tes keamanan membuktikan skenario yang dijalankan, bukan jaminan bebas semua kerentanan.

## 10. Matriks pengujian lengkap

### A. Rekaman, bahasa, dan mikrofon

| ID | Positif | Negatif / batas | Bukti |
| --- | --- | --- | --- |
| REC-01 | Mulai setelah izin diberikan | Izin ditolak; perangkat hilang/sedang dipakai | UI, event, resource |
| REC-02 | Stop menghentikan rekam | Stop berulang; stop saat start tertunda | Track, recognizer, timer |
| REC-03 | Timer berjalan dan berhenti | Rekam ulang; lewat 59 detik; gagal start | Waktu terkontrol, UI |
| REC-04 | Interim berubah menjadi final | Interim kosong/revisi; final berulang | Event dan isi editor |
| REC-05 | Pilihan bahasa diterapkan | Ganti saat rekam; kode asing; bahasa unsupported | Argumen recognizer, UI |
| REC-06 | Sesi baru setelah sesi selesai | Network error; no-speech; restart setelah stop | Urutan event, instance |
| REC-07 | Browser mendukung dapat merekam | Web Speech API tidak ada | Pesan dan nol sesi bocor |
| MIC-01 | Meter merespons audio | Diam; amplitudo rendah; nilai batas | Sinyal sintetis, assertion |
| MIC-02 | Peringatan pelan muncul lalu pulih | Diam singkat/lama; stop saat peringatan | Waktu terkontrol, UI |
| MIC-03 | Resource dibersihkan | Start recognizer gagal setelah mic aktif; unmount saat rekam | Track, AudioContext, timer |
| MIC-04 | Ucapan Indonesia pada perangkat nyata | Suara pelan; bising ringan | Catatan manual, hasil aktual |

Event sintetis tidak membuktikan akurasi ucapan atau mikrofon fisik.

### B. Editor, preset, dan ekspor

| ID | Positif | Negatif / batas | Bukti |
| --- | --- | --- | --- |
| TXT-01 | Ketik/tempel/edit | Kosong; whitespace; Unicode; emoji; newline | Editor, penghitung |
| TXT-02 | Hitung kata/karakter | Spasi berulang; tab; Indonesia/Inggris | Nilai harapan eksplisit |
| TXT-03 | Gabung final tanpa duplikasi | Overlap; pengulangan bermakna; tanda baca | Pasangan input-output helper |
| TXT-04 | Paragraf mengikuti aturan | Pendek; panjang; paragraf existing | Isi lengkap |
| TXT-05 | Auto-scroll pada final STT | Edit manual tidak memaksa scroll | Posisi scroll, Playwright |
| TXT-06 | Preset Rapat Tim | Editor sudah terisi | Isi dan perilaku penggantian |
| TXT-07 | Preset Salah Dengar | Jenis tidak dikenal | Isi dan state tidak rusak |
| TXT-08 | Hapus editor | Sudah kosong; request aktif | State akhir, hasil lama |
| EXP-01 | Unduh TXT | Kosong; Unicode; newline | Nama, MIME, isi file |
| EXP-02 | Unduh transkrip Markdown | HTML/Markdown; tanggal batas | Isi dan metadata file |
| EXP-03 | Unduh notulen Markdown | Hasil kosong; AI; lokal | Isi sesuai tampilan |

### C. Koreksi teks

| ID | Positif | Negatif / batas | Bukti |
| --- | --- | --- | --- |
| COR-01 | Salah dengar dan singkatan lokal | Istilah mirip bermakna berbeda | Regresi input-output |
| COR-02 | Tanda baca contoh pendek | Lowercase; sudah bertanda baca | Fakta, batas kalimat |
| COR-03 | Contoh panjang pengguna | Pergantian pembicara tanpa tanda baca | Hasil, fakta, tinjauan manusia |
| COR-04 | Angka/tenggat dipertahankan | Desimal; 80%; 100%; rupiah; H-7 | Nilai sebelum/sesudah |
| COR-05 | Nominal terbilang jelas | Ambigu; bukan uang; nominal bervariasi | Tes parser |
| COR-06 | Negasi/ketidakpastian utuh | Belum selesai; tidak disetujui; mungkin besok | Assertion, tinjauan makna |
| COR-07 | Pratinjau asli dan koreksi | Respons kosong; format rusak | UI, respons tiruan |
| COR-08 | Terapkan mengganti editor | Tutup tanpa terapkan; hasil belum lengkap | Editor sebelum/sesudah |
| COR-09 | Streaming bertahap | Chunk terbelah; putus; fallback | Trace, hasil akhir |
| COR-10 | Satu tindakan koreksi | Klik cepat; kosong; proses aktif | Jumlah request, tombol |

### D. Notulen

| ID | Positif | Negatif / batas | Bukti |
| --- | --- | --- | --- |
| MOM-01 | Topik judul substantif | Salam panjang; pembuka pertanyaan | Struktur, tinjauan judul |
| MOM-02 | Ringkasan AI prosa | Laporan terpecah; urutan berubah | UI, ekspor, isi |
| MOM-03 | PIC/tugas/tenggat | PIC/tenggat tidak disebut | Tidak mengarang data |
| MOM-04 | Progres berbeda dari tugas | Rina melapor sebelum tugas Andi | Atribusi tiap orang |
| MOM-05 | Semua fakta contoh panjang | Mentah; lowercase; versi tanda baca | Checklist fakta |
| MOM-06 | Tidak ada keputusan | Pertanyaan; rencana tentatif; pembatalan | Tidak membuat tugas baru |
| MOM-07 | Divisi jika didukung | Divisi tidak disebut | Tidak ada divisi rekaan |
| MOM-08 | Tenggat setara makna | Besok sore; tujuh hari sebelum; tanggal eksplisit | Assertion makna |
| MOM-09 | Tutup/buka modal | Tutup saat stream; request selesai terbalik | Tidak ada state lama |
| MOM-10 | Lokal sebagai cadangan | Tanpa key; semua provider gagal | Label dan format poin |
| MOM-11 | AI menerima mentah | Koreksi lokal salah memotong | Payload provider tiruan |
| MOM-12 | UI dan ekspor setara | Multiparagraf; keputusan kosong | Bandingkan hasil/file |

### E. Pengaturan, provider, cadangan, dan kuota

| ID | Positif | Negatif / batas | Bukti |
| --- | --- | --- | --- |
| CFG-01 | Input dua key/model dan izin Groq | Key kosong/whitespace; tutup modal; model berganti | State dan request |
| CFG-02 | Hapus key dan refresh | Storage diblokir; key legacy tersedia | Memori, storage, pemberitahuan |
| AI-01 | Gemini berhasil | Groq tidak ikut dipanggil | Jumlah panggilan |
| AI-02 | Gemini 429, Groq berhasil | Tanpa reset header | Urutan, alasan |
| AI-03 | Timeout/5xx, Groq berhasil | Waktu terlampaui | Timer, percobaan |
| AI-04 | Gemini 401/403, Groq berhasil | Tidak mengulang key | Pesan aman, panggilan |
| AI-05 | Semua AI gagal, lokal | Kombinasi 429/auth/timeout | Hasil, alasan sebenarnya |
| AI-06 | Satu key tersedia | Gemini saja; Groq saja; tanpa key | Tujuan request |
| AI-07 | Cadangan Groq aktif | Cadangan dimatikan | Nol pengiriman tanpa izin |
| AI-08 | Batal menghentikan alur | Batal sebelum/saat fallback | Nol panggilan lanjutan |
| AI-09 | Maksimal dua percobaan | Klik ulang; error berantai; model gagal | Penghitung server |
| AI-10 | Parsial lama dibuang | Gemini parsial lalu gagal | Tidak ada hasil campuran |
| QUO-01 | Header Groq sesuai jenis batas | Hilang; rusak; parsial | Header versus UI |
| QUO-02 | Retry-after valid | Detik; tanggal; invalid | Parsing, status tunggu |
| QUO-03 | Gemini tanpa sisa kuota | Penghitung sesi tersedia | Tidak mengklaim sisa akun |
| QUO-04 | Model sesuai provider | Model asing/tidak dikenal | Tolak sebelum provider |

### F. API, transport, dan deployment

| ID | Positif | Negatif / batas | Bukti |
| --- | --- | --- | --- |
| API-01 | JSON valid | Text hilang/null/angka/array/objek/whitespace | HTTP dan body |
| API-02 | Ukuran batas diterima | Lebih satu karakter; body terlalu besar | HTTP, nol provider |
| API-03 | Endpoint/alias konsisten | Method salah; JSON rusak | Integrasi |
| API-04 | SSE final lengkap | Frame terbelah/gabungan; selesai tanpa final | Parser dan event |
| API-05 | Error setelah header SSE | Timeout; error event; putus | Event, pemulihan UI |
| API-06 | Express/Netlify satu kontrak | Validasi/fallback/metadata berbeda | Suite kontrak |
| API-07 | Request sesuai limit | Melebihi frekuensi/konkurensi | Penolakan, penghitung |
| API-08 | Disconnect membatalkan kerja | Provider masih aktif | Pembatalan transport |
| DEP-01 | Bind 127.0.0.1:3088 | Default salah; host asing | Listener, akses |
| DEP-02 | HTTPS/header publik | Origin salah; preflight; CSP | HTTP, browser |

### G. Keamanan

| ID | Perlindungan yang diuji | Variasi negatif / serangan | Bukti |
| --- | --- | --- | --- |
| SEC-01 | Key hanya memori | Refresh; tutup/buka modal | Storage, state |
| SEC-02 | Key legacy dibersihkan | Legacy ada; storage diblokir | Migrasi, error aman |
| SEC-03 | Hapus kredensial | Request aktif; hasil lama | Request berikut tanpa key |
| SEC-04 | Tidak bocor di respons/log | Error provider memantulkan key | Penanda sintetis di output |
| SEC-05 | Tidak masuk bundle/URL | Build; request gagal; unduhan | Artefak, URL request |
| SEC-06 | HTML tidak aktif | Script; onerror; SVG; markup bersarang | DOM, nol eksekusi |
| SEC-07 | Tujuan tetap | URL kustom; localhost; metadata cloud; redirect asing | Penolakan, nol koneksi |
| SEC-08 | Origin/host diverifikasi | Origin asing/null; header invalid | Respons, nol provider |
| SEC-09 | Prompt injection terbatas | Abaikan instruksi; buka URL; bocorkan key | Payload, output, nol tools |
| SEC-10 | CSP sesuai fungsi | Inline script; resource asing | Console/pelanggaran |
| SEC-11 | No-store sensitif | API; SSE; error | Header aktual |
| SEC-12 | Tidak ada key bersama anonim | Pemanggil tanpa key | Tidak memakai key server |
| SEC-13 | Izin provider dihormati | Groq tidak disetujui; lokal dipilih | UI, request tersanitasi |

### H. Tampilan dan aksesibilitas

| ID | Positif | Negatif / batas | Bukti |
| --- | --- | --- | --- |
| UI-01 | Desktop dan ponsel | Teks panjang; layar sempit; zoom | Screenshot, layout |
| UI-02 | Keyboard dan modal | Tab; Shift+Tab; Escape; fokus kembali | Playwright, manual |
| UI-03 | Status dapat dipahami | Fallback; lokal; kuota unknown | Teks aksesibel, screenshot |
| UI-04 | Desain dipertahankan | Stop merah; SVG; footer; banner | Perbandingan screenshot |
| UI-05 | Tidak ada error tak tertangani | Network gagal; respons rusak; aksi berulang | Console, pageerror |

## 11. Pelaksanaan tes dan gerbang rilis

1. Jalankan baseline tes yang tersedia. Pisahkan kegagalan lama dari regresi baru.
2. Tulis tes gagal untuk perilaku baru, buktikan kegagalannya, lalu bangun perubahan minimum.
3. Jalankan unit dan kontrak memakai waktu, audio, provider, dan key sintetis.
4. Jalankan integrasi API Express dan jalur Netlify tanpa key asli.
5. Jalankan Playwright di `http://localhost:3088`, bukan port 3000.
6. Jalankan uji mikrofon fisik dan AI asli hanya dengan akses serta persetujuan. Gunakan transkrip sintetis.
7. Jalankan `npm test` dan `npm run build`; tinjau diff, logging, artefak, serta keamanan.
8. Catat setiap hasil dan tautan bukti tersanitasi. Jangan merilis berdasarkan jumlah tes hijau saja.

Rilis ditahan jika ada kebocoran key, XSS, pengiriman ke provider tanpa izin, fallback tanpa batas, kerusakan alur utama, atau kontrol deployment wajib yang belum terpenuhi.

Kasus wajib yang gagal/terblokir tidak boleh dihapus diam-diam. Jika perlu mengubah kriteria karena batas teknis, catat alasan, risiko, dan persetujuan sebelum menurunkan perlindungan.

### Laporan akhir wajib

- Identitas build dan lingkungan yang diuji.
- Jumlah kasus/variasi direncanakan, dijalankan, lulus, gagal, terblokir, dan belum dijalankan.
- Hasil aktual serta bukti per kasus, bukan daftar klaim.
- Pemisahan provider tiruan/asli dan audio sintetis/perangkat fisik.
- Bug dengan langkah reproduksi dan status perbaikan/retest.
- Risiko tersisa, gap deployment, serta kebutuhan tindakan pengguna.

## 12. Status awal dan keputusan lanjutan

- [x] Rencana, konteks, batas keamanan, dan matriks tes disimpan dalam dokumen ini.
- [ ] Audit inventaris menyeluruh (baseline `npm test` sudah dijalankan dan lulus).
- [ ] Implementasi perlindungan key dan API.
- [ ] Implementasi fallback, format AI, kuota, dan lokal.
- [ ] Eksekusi serta bukti seluruh variasi tes yang berlaku.
- [ ] Pengujian AI asli dan mikrofon fisik dengan izin.
- [ ] Tinjauan akhir dan keputusan rilis.

Saat implementasi, verifikasi model aktif, batas provider, mekanisme limit hosting, kebijakan data, serta cara logging deployment. Jangan mengarang hasil atau angka jika akses tidak tersedia.

Risiko yang tidak dapat dihapus sepenuhnya: AI dapat salah; provider memproses transkrip sesuai kebijakannya; perangkat atau ekstensi berbahaya dapat mencuri key. Dokumen ini bukan sertifikasi keamanan.

## 13. Bukti eksekusi tahap pertama

Lingkungan: macOS, Node.js v24.22.0, direktori proyek di atas. Perubahan belum di-commit; perubahan pengguna sebelumnya tetap dipertahankan. Tidak ada akses port 3000 atau panggilan AI asli pada tahap ini.

| Kasus / langkah | Perintah aktual | Hasil aktual | Batas bukti |
| --- | --- | --- | --- |
| Baseline | `npm test` sebelum perubahan | Enam skrip tes lama lulus | Tidak membuktikan seluruh matriks |
| SEC-01 RED | `node tests/keyStorage.test.mjs` sebelum perubahan | Exit 1, `SEC-01: key lama tidak boleh dimuat` | Kegagalan sesuai reproduksi penyimpanan legacy |
| SEC-01 GREEN terbatas | `npm test` setelah perubahan | Tujuh skrip lulus, termasuk pemeriksaan tidak membaca/menulis key melalui pola storage lama | Pemeriksaan source dan helper, bukan E2E browser |
| SEC-02 GREEN terbatas | Tes helper dalam perintah yang sama | Penghapusan `gemini_api_key`, storage null, dan storage yang melempar error lulus | Belum menguji migrasi melalui browser |
| Build | `npm run build` | Exit 0; Vite mentransformasi 26 modul | Build sukses bukan bukti keamanan atau kualitas AI |

Perubahan: key aktif hanya di memori; key legacy dihapus tanpa dibaca kembali; akses preferensi storage ditangani ketika diblokir; UI menjelaskan masa hidup key dan penerusan ke provider. Tombol menyebut “Gunakan untuk sesi ini”.

Belum dikerjakan: dua key, fallback antar-provider, metadata kuota, pembatalan, pengamanan API/deployment, prompt/prosa baru, perbaikan lokal lanjutan, Playwright, provider asli, mikrofon fisik, dan matriks lengkap. SEC-01/SEC-02 belum dianggap selesai penuh sebelum bukti browser tersedia. Tidak ada klaim coverage 80%.

## 14. Bukti eksekusi tahap kedua — validasi API

Perubahan: validator bersama menolak body non-objek, text bukan string/kosong, text di atas 50.000 karakter, provider/model tidak dikenal, dan stream bukan boolean. Express dan Netlify memakai validator ini. JSON rusak memberi 400. API diberi `Cache-Control: no-store`. Logging error mentah di handler diganti pesan tetap (logging internal client belum diaudit penuh). Notulen non-streaming menerima teks mentah. Default server diubah menjadi port 3088 dan bind 127.0.0.1.

| Bukti | Perintah aktual | Hasil |
| --- | --- | --- |
| RED validasi Netlify | `node tests/apiValidation.test.mjs` sebelum perbaikan | Gagal pada jalur handler correct-transcript; input non-string sebelumnya memicu error alih-alih 400 |
| GREEN Netlify | `node tests/apiValidation.test.mjs` | 32 pemeriksaan lulus untuk dua handler, tanpa key dan tanpa provider eksternal |
| Integrasi Express aktual | `node tests/expressValidation.test.mjs` | 22 pemeriksaan lulus pada proses terisolasi 127.0.0.1:3089, lalu proses dihentikan |
| Regresi | `npm test` | Delapan skrip lulus, termasuk 32 pemeriksaan Netlify |
| Build | `npm run build` | Exit 0, 26 modul |

Port 3089 hanya dipakai proses tes terisolasi agar server pengguna pada 3088 tidak diganggu. Port 3000 tidak disentuh. Tes Express terpisah belum masuk skrip `npm test`; jalankan perintahnya secara eksplisit.

Batas: belum membuktikan CSP, rate limit, validasi origin/host, kebocoran dari client provider, fallback, UI browser, provider asli, atau keseluruhan matriks. Tidak ada klaim bahwa aplikasi sudah aman untuk rilis publik. Penghapusan legacy validation duplikat di Express masih dapat dirapikan tanpa mengubah kontrak.

## 15. Bukti eksekusi tahap ketiga — batas model dan dasar orkestrasi

- `modelChainFor` sekarang mengembalikan tepat satu model valid, bukan seluruh daftar. Provider/model asing ditolak. UI tidak lagi mengklaim mencoba semua model.
- `lib/providerFallback.js` menyediakan urutan Gemini → Groq dengan izin eksplisit → lokal. Maksimal satu percobaan per provider, metadata alasan dibatasi, dan pembatalan diperiksa sebelum/sesudah percobaan. Error input 400/413 tidak diteruskan ke cadangan.
- Orkestrator ini **belum dihubungkan ke endpoint, UI dua key, atau streaming**. Tesnya membuktikan fungsi orkestrasi dengan callback tiruan saja, bukan fallback aplikasi yang sudah aktif.

| Tahap | Perintah aktual | Hasil aktual |
| --- | --- | --- |
| RED pemilihan model | `node tests/providerSelection.test.mjs` | Assertion gagal: Gemini mengembalikan lima model, bukan satu |
| GREEN pemilihan model | Perintah yang sama setelah perubahan | 22 pemeriksaan lulus |
| RED orkestrasi | `node tests/providerFallback.test.mjs` | Module providerFallback belum tersedia; kontrak baru belum diimplementasikan |
| GREEN orkestrasi | Perintah yang sama setelah implementasi | Delapan skenario tiruan lulus: sukses utama, fallback 429, semua gagal, izin Groq mati, tanpa key, Groq saja, pembatalan, dan input 400 |
| Regresi | `npm test` | Sepuluh skrip lulus |
| Build | `npm run build` | Exit 0, 26 modul |

Batas penting: nama model aktif belum diverifikasi terhadap provider asli. Transport belum meneruskan status terstruktur/AbortSignal ke orkestrator. Pemeriksaan hasil di orkestrator hanya memastikan objek; validasi bidang fitur tetap harus ditambahkan saat integrasi. Tidak ada key asli atau panggilan eksternal pada tes ini. Seluruh status AI pada matriks tetap parsial, bukan selesai E2E.

## 16. Bukti eksekusi tahap keempat — kredensial dan error transport

Perubahan: Gemini tidak lagi menaruh key pada URL generate/stream; autentikasi memakai header `x-goog-api-key`. Model di path di-encode. Error HTTP Gemini/OpenAI-compatible/SSE memakai pesan tetap, status numerik, dan `retryAfter` terbatas; body error provider tidak dimasukkan ke pesan. Error parsing JSON non-streaming juga memakai pesan tetap agar potongan respons tidak bocor lewat SyntaxError.

| Tahap | Perintah aktual | Hasil aktual |
| --- | --- | --- |
| RED transport | `node tests/providerTransport.test.mjs` sebelum perubahan | Gagal karena status error terstruktur belum tersedia; assertion URL pada mock juga menolak URL Gemini yang memuat key |
| GREEN transport | Tes diperluas lalu `npm test` | 20 kombinasi tiruan lulus: Gemini/Groq, HTTP/SSE, status 200/401/403/429/500 |
| Regresi | `npm test` | Sebelas skrip lulus |
| Build | `npm run build` | Exit 0, 26 modul |

Tes memeriksa header autentikasi, URL tanpa key, status dan retry-after error, pesan tanpa key/transkrip sintetis, dan teks sukses. Tidak ada panggilan provider asli. Bukti ini tidak membuktikan semua error jaringan aman, pembatasan ukuran respons, abort transport, maupun integrasi fallback. Wrapper fallback lama masih menelan error; integrasi baru harus memanggil transport satu model secara langsung agar status tidak hilang. UI dua key, endpoint orkestrasi, kuota dan format prosa masih belum selesai.

## 17. Bukti eksekusi tahap kelima — endpoint dua-provider

- `lib/aiActions.js` menghubungkan koreksi dan notulen ke orkestrator melalui satu `generateContent` langsung per provider, sehingga error status tidak ditelan wrapper lama.
- Endpoint Express dan Netlify menerima konfigurasi `ai` opsional (key/model Gemini dan Groq serta allowGroq). Kontrak single-provider lama tetap tersedia untuk UI lama.
- Validasi menolak konfigurasi null/non-object, key bukan string/terlalu panjang/CRLF, model asing, dan izin bukan boolean.
- Hasil koreksi wajib memiliki TEXT; notulen wajib memiliki TOPIC/SUMMARY/DECISIONS. Respons format rusak beralih ke cadangan. Notulen jalur baru memakai summary prosa dan summaryItems kosong; renderer yang ada mendukung teks ini melalui interpolasi aman.
- Untuk request SSE jalur baru, hasil dikirim sebagai event final setelah generate selesai, bukan token bertahap. Ini keterbatasan sementara, bukan streaming token yang sudah selesai diimplementasikan.

| Bukti aktual | Hasil |
| --- | --- |
| `node tests/aiActions.test.mjs` sebelum implementasi | Gagal karena modul aksi baru belum tersedia |
| Perintah sama setelah implementasi | Enam skenario tiruan lulus: fallback 429, keluaran invalid ke lokal, tanpa key, masing-masing untuk dua fitur |
| `node tests/apiValidation.test.mjs` sebelum validasi ai | Gagal: konfigurasi invalid memberi 200, bukan 400 |
| Perintah sama setelah perubahan | 42 pemeriksaan Netlify lulus, termasuk jalur ai kosong ke lokal |
| `node tests/expressValidation.test.mjs` | 28 pemeriksaan aktual pada 127.0.0.1:3089 lulus, termasuk ai kosong mode JSON/SSE dan alias notulen |

Batas: UI dua key belum dihubungkan; transport AbortSignal, metadata kuota, label fallback UI, limit/origin/CSP, dan model asli belum selesai. Tes fallback provider pada tingkat aksi memakai clientFactory tiruan; tes endpoint memakai tanpa key saja. Respons panjang baru dibatasi setelah diterima; batas byte transport masih gap. Jalankan `npm run test:ai-actions` secara eksplisit karena belum digabung ke rantai `npm test`.

## 18. Tahap keenam — sambungan UI dua key

UI kini memiliki input key/model Gemini dan Groq serta checkbox izin pengiriman Groq (default mati). Kedua tindakan memakai konfigurasi `ai` melalui `ApiClient.runAiAction`. Key Groq tidak dikirim ke server jika izin mati. Kedua key hanya di memori dan tombol hapus mengosongkannya serta izin. Pilihan provider lama di modal dihapus karena urutan kini tetap Gemini/Groq/lokal; provider backend lama tetap tersedia untuk kompatibilitas API. Guard mencegah aksi koreksi/notulen bersamaan. Ringkasan prosa memakai jalur interpolasi yang sudah ada.

RED: `node tests/dualAiClient.test.mjs` gagal dengan `api.runAiAction is not a function`. GREEN setelah perubahan: dua request fetch tiruan lulus; memeriksa body dua key, izin, tidak memakai header key tunggal, dan tidak menaruh key pada URL. `npm run build` lulus (25 modul). Ini bukti unit klien dan kompilasi, bukan bukti E2E modal atau provider nyata. Perintah khusus: `npm run test:dual-client`.

Belum dibuktikan: UI browser, state setelah refresh/hapus melalui browser, label mesin/fallback, kuota, pembatalan, model aktif, seluruh matriks dan keamanan publik. Server 3088 belum dimulai ulang pada tahap ini; proses lama mungkin masih menjalankan backend versi sebelumnya. Frontend jalur baru menunggu hasil akhir SSE, bukan token bertahap.

## 19. Tahap ketujuh — label hasil dan smoke browser

Label modal sekarang berdasarkan engine hasil akhir, bukan hanya method gemini_ai. Label pending tidak mengklaim lokal. Alasan fallback tampil sebagai teks aman dengan alasan yang diizinkan. `node tests/engineLabel.test.mjs` awalnya gagal karena helper belum ada, lalu tujuh assertion lulus.

Server lama port 3088 diverifikasi PID/cwd sebagai node server.js proyek ini, dihentikan, lalu dimulai kembali memakai bind baru 127.0.0.1. Port 3000 tidak disentuh. `npm run build` lulus sebelum browser dibuka.

Playwright aktual pada http://127.0.0.1:3088 membuktikan: modal pengaturan terbuka, dua input password tersedia, izin Groq default mati, tombol Hapus menutup modal, preset Rapat Tim mengisi editor, koreksi tanpa key selesai melalui endpoint baru, label Mesin lokal muncul, dan storage key legacy kosong. Snapshot awal: `.playwright-mcp/page-2026-11-10T15-17-04-642Z.yml`; assertion browser dan excerpt hasil tercatat dalam sesi tool. Tidak memasukkan key asli maupun sintetis ke provider.

Browser menemukan bug nyata: salam preset menghasilkan koma ganda. Ditambahkan assertion pada tests/unpunctuated.test.mjs; RED gagal dengan pesan “Salam bertanda koma tidak boleh mendapat koma ganda”. Aturan bersama restorePunctuation diperbaiki agar tidak menambahkan koma kedua. `npm test` setelah perbaikan lulus (11 skrip). Perbaikan koma belum diretest pada proses browser karena backend perlu restart lagi; hasil GREEN hanya untuk tes Node. Console browser memiliki dua entri yang belum ditinjau, sehingga UI-05 tidak dinyatakan lulus.

Masih terbuka: label provider asli/fallback E2E, kuota, abort transport, CSP/rate-limit/origin, tes mikrofon, cakupan matriks lengkap, verifikasi model. Jalankan `npm run test:engine-label` untuk tes helper khusus. Tidak ada klaim siap rilis.

## 20. Tahap kedelapan — metadata kuota terbatas

Parser allowlist `lib/providerQuota.js` menerima remaining request/token nonnegatif safe integer, reset/retry-after pendek, dan mengabaikan header lain. Client OpenAI-compatible menangkap snapshot pada respons non-streaming. Error HTTP/SSE membawa metadata terfilter; orkestrator menyimpan metadata error Groq dengan validasi ulang. Aksi AI meneruskan snapshot Groq sukses ke hasil. Komponen QuotaStatus menampilkan snapshot/jendela provider dan disclaimer real-time, atau keterangan kuota tidak tersedia. Gemini menautkan AI Studio, bukan angka sisa rekaan.

RED: `node tests/providerQuota.test.mjs` gagal karena parser belum ada. GREEN: perintah sama lulus 11 pemeriksaan input valid/hilang/invalid/negatif/desimal/panjang. `npm run test:ai-actions` lulus enam skenario dengan assertion snapshot Groq diteruskan. `npm test` lulus sebelas skrip; transport tiruan 20 kombinasi kini juga memeriksa metadata error dan snapshot HTTP Groq sukses. `npm run build` lulus (27 modul), sebelum perubahan teks penjelas modal terakhir.

Batas: tampilan kuota belum dibuktikan melalui browser; header aktual akun/provider belum diuji. Penamaan jendela sengaja tidak mengklaim harian/menit sebelum verifikasi dokumentasi. Retry-after ditampilkan sebagai nilai provider, belum countdown/penjadwalan retry. Penghitung sesi belum dibuat. Transport sukses SSE lama belum menangkap snapshot (jalur orkestrasi baru memakai HTTP generate). Backend 3088 perlu dimulai ulang untuk metadata baru. Tidak ada klaim seluruh QUO-01/02/03 selesai.

## 21. Countdown, penghitung sesi, dan bukti browser

Permintaan pengguna: uji tampilan kuota melalui browser dan header provider asli, serta buat countdown/penghitung sesi.

- Countdown menggunakan Retry-After berupa detik atau tanggal HTTP, bukan asumsi reset kuota. Tidak melakukan retry otomatis. Timer dibersihkan ketika modal dilepas dan berhenti saat nol.
- Penghitung dalam memori menghitung percobaan Gemini/Groq yang dilaporkan pada hasil selesai. Ditampilkan sebagai “Pemakaian sesi ini ... percobaan terlapor”, bukan kuota akun. Request putus sebelum hasil diterima belum dapat dihitung; ini batas yang sengaja ditampilkan lewat istilah terlapor.
- Penghitung reset saat refresh; menghapus key tidak menghapus riwayat penghitung sesi.
- RED: `node tests/quotaClock.test.mjs` gagal karena helper belum tersedia. GREEN: 11 assertion lulus, mencakup detik/tanggal, invalid, nol, expired, dan penghitung dua provider.
- `npm run build` lulus (28 modul).
- Playwright pada 127.0.0.1:3088 memakai respons fetch tiruan lokal, tanpa mengirim key ke provider. Assertion membuktikan label Groq, request 940/token 1200, disclaimer snapshot, dan counter Gemini 1/Groq 1 setelah fallback terlapor.
- Percobaan countdown pertama sudah mencapai nol saat diperiksa, sehingga tidak membuktikan pergerakan. Tes diulang dengan Retry-After 60 detik: nilai aktual turun dari 01:00 ke 00:59 setelah 1,5 detik. Ini bukti pergerakan timer browser, bukan header asli.
- Refresh menghapus mock fetch dan membuktikan counter kembali Gemini 0/Groq 0. Snapshot setelah refresh `.playwright-mcp/page-2026-11-10T15-25-47-337Z.yml`; snapshot awal `.playwright-mcp/page-2026-11-10T15-25-09-936Z.yml`.
- Header provider asli: **TERBLOKIR**, tidak ada key aktif pada modal (diperiksa sebagai boolean saja, tidak dibaca/dicatat nilainya). Jangan mengklaim tes provider asli lulus. Pengguna harus memasukkan key lewat modal, bukan chat; gunakan transkrip sintetis untuk percobaan nyata yang diizinkan.

Batas lanjutan: countdown ini khusus Retry-After, bukan countdown format durasi reset Groq. Belum ada enforcement cooldown server. Dua entri console browser masih perlu ditinjau. Backend yang aktif masih perlu restart untuk perubahan metadata server dari tahap sebelumnya; tes UI di sini sengaja memakai respons tiruan. Keamanan publik, transport abort, model provider aktif, dan matriks lengkap belum selesai.

## 22. Countdown reset request/token

Ditambahkan parser durasi eksplisit berurutan h/m/s/ms, termasuk pecahan, untuk countdown reset request dan token secara terpisah. Format tidak dikenal tetap tidak mendapat countdown. UI memberi label “perkiraan dari snapshot”, bukan jaminan kuota pulih. Timer berhenti setelah seluruh deadline lewat, tanpa retry otomatis.

RED `node tests/quotaClock.test.mjs`: export resetDeadline belum ada. GREEN sesudah perubahan: 22 assertion lulus, termasuk format gabungan, milidetik, nol, duplikasi unit, angka tanpa unit, negatif, dan teks invalid. `npm run build` lulus (28 modul).

Playwright respons tiruan pada 127.0.0.1:3088 membuktikan reset request turun 01:30 → 01:29 dan token 00:30 → 00:29. Snapshot navigasi `.playwright-mcp/page-2026-11-10T15-30-21-777Z.yml`. Console warning/error pada navigasi pengujian ini: nol pesan. Setelah tes halaman dimuat ulang untuk menghapus mock fetch; snapshot `.playwright-mcp/page-2026-11-10T15-30-48-267Z.yml`.

Header provider asli tetap TERBLOKIR: pemeriksaan awal modal menunjukkan tidak ada key aktif. Tidak mencari key dari filesystem, environment, atau sumber lain. Pengguna perlu memasukkan key melalui modal untuk tes asli. Countdown masih berjangkar saat komponen menerima snapshot; belum mempertahankan waktu observasi server saat modal dipasang ulang. Ini gap akurasi yang perlu ditangani sebelum menyebut waktu reset akurat lintas buka/tutup modal.

## 23. Waktu observasi snapshot dipertahankan

Parser kuota kini menambahkan observedAt saat header dibaca. Metadata error Groq mempertahankan timestamp tersebut setelah revalidasi. Countdown memakai timestamp snapshot, bukan waktu modal dipasang. Snapshot tanpa timestamp tidak diberi countdown, daripada mengarang waktu acuan. Perbedaan jam server/browser masih dapat memengaruhi perkiraan; label perkiraan tetap berlaku.

RED: `node tests/providerQuota.test.mjs` gagal pada assertion “snapshot punya waktu observasi”. GREEN: perintah sama lulus setelah perubahan; assertion parser lama tetap berjalan. `npm test` lulus 11 skrip. `npm run build` lulus 28 modul.

Playwright dengan respons tiruan: header reset 1m dan observedAt 30 detik sebelumnya menghasilkan UI “Reset jendela request: 00:30”, bukan 01:00. Ini membuktikan umur snapshot dihormati saat mount; belum merupakan tes buka-tutup ulang komponen yang sama. Snapshot navigasi `.playwright-mcp/page-2026-11-10T15-36-42-556Z.yml`. Halaman dimuat ulang sesudah tes untuk menghapus mock, snapshot `.playwright-mcp/page-2026-11-10T15-36-57-508Z.yml`.

Header asli tetap belum diuji karena key belum disediakan. Backend aktif perlu restart agar menyertakan observedAt terbaru. Jangan menyatakan tes provider asli, deployment publik, atau keseluruhan rencana telah selesai.

## 24. Runner seluruh tes dan regresi backend/browser aktual

`npm test` sekarang menemukan seluruh `tests/*.test.mjs` secara otomatis lewat tests/run.mjs, menjalankan berkas berurutan pada proses terpisah, gagal pada exit nonzero/timeout, dan menolak suite kosong. Ini mencegah tes tambahan terlewat dari skrip utama. Eksekusi aktual: 17 berkas lulus, termasuk tes Express 28 pemeriksaan pada 3089, aksi AI, klien dua-key, label, parser kuota dan countdown. Tidak mengklaim 17 berkas sama dengan seluruh variasi matriks selesai.

Server 3088 lama diverifikasi cwd proyek, dihentikan, lalu dimulai ulang pada 127.0.0.1 dengan kode terbaru. Playwright tanpa mock fetch membuktikan preset → koreksi lokal → label Mesin lokal → Gunakan Hasil mengubah editor tanpa koma ganda → Buat Notulen lokal. Hasil notulen aktual menampilkan progres 80%/100%, nominal Rp 2.500.000, dan tenggat besok sore/H-7. Snapshot navigasi `.playwright-mcp/page-2026-11-10T15-41-59-077Z.yml`; excerpt/assertion tercatat dalam sesi tool.

Ini menutup retest browser bug koma ganda dan memakai backend terbaru, tetapi hanya contoh preset pendek. Contoh panjang, AI asli, header asli, download, mikrofon fisik dan seluruh variasi negatif masih belum dibuktikan. Key asli belum disediakan. Tidak ada panggilan provider nyata atau akses port 3000.

## 25. Penolakan origin lintas situs

Express dan kedua handler Netlify kini menolak Origin yang tidak sama sebelum memanggil aksi/provider. Origin null, malformed, memiliki path, dan beda protokol ditolak. Netlify mengharuskan HTTPS sesuai deployment publik dan tidak mempercayai forwarded-proto. Header lookup Netlify kini case-insensitive. Klien tanpa Origin tetap didukung dengan key sendiri; pemeriksaan ini bukan autentikasi dan tidak mencegah non-browser memalsukan header. Validasi Host allowlist masih pekerjaan terpisah.

RED `node tests/requestOrigin.test.mjs`: origin evil menghasilkan 200 bukan 403. GREEN: 12 pemeriksaan Netlify lulus untuk dua handler. Tes Express diperluas dengan empat origin ditolak dan satu same-origin diterima; total 33 pemeriksaan integrasi aktual lulus pada server tes 3089. `npm test` menjalankan 18 berkas dan seluruhnya lulus. Tidak ada provider asli dipanggil. Belum menguji deployment Netlify asli atau konfigurasi reverse proxy; server 3088 perlu restart untuk middleware baru. Mode dev lintas origin Vite harus ditinjau sebelum dipakai, bukan dibuka wildcard.

## 26. Host lokal dan cache SSE

Express kini mengizinkan Host tepat localhost:PORT atau 127.0.0.1:PORT pada seluruh rute sebelum static/body parsing. Host asing ditolak 403 untuk memperkecil risiko DNS rebinding. Ini konfigurasi server lokal, bukan konfigurasi reverse proxy publik; domain custom perlu rancangan allowlist eksplisit, tidak wildcard. Netlify tetap menggunakan hosting platform; validasi Host platform belum diuji langsung.

SSE sebelumnya menimpa no-store dengan no-cache. Header kini no-store, no-transform; tes JSON/SSE memeriksanya. Awal reproduksi Host memakai fetch memberi 200 bahkan setelah fix karena permintaan tidak membuktikan override Host yang dimaksud. Tes diganti node:http agar mengirim header Host eksplisit. Dengan transport ini hasil aktual 403. Jangan menganggap kegagalan fetch tersebut bukti kontrol server masih gagal.

`node tests/expressValidation.test.mjs` akhir lulus 34 pemeriksaan aktual. `npm test` lulus 18 berkas. Tidak ada provider asli dipanggil. Server 3088 belum dimulai ulang untuk middleware Host/origin terbaru; tes memakai proses terisolasi 3089. Rate limit, CSP, abort dan seluruh matriks masih belum selesai.

## 27. Pembatalan transport, batas respons, dan guard lokal

Pengguna mengizinkan melanjutkan sampai tahap akhir tanpa konfirmasi per tahap. Ini tidak mengizinkan mengarang hasil atau memakai key yang tidak diberikan.

Perubahan:
- AbortSignal diteruskan dari modal close/unmount ke fetch, lalu disconnect Express ke orkestrator dan client provider. Transport HTTP/SSE menghancurkan request saat abort. Netlify v1 belum memiliki propagasi disconnect yang dibuktikan.
- Transport membatasi respons provider pada 1.000.000 byte, menangani response aborted/error, dan menyamarkan error jaringan. Batas hasil fitur tetap 200.000 karakter.
- Server lokal memberi CSP dan header keamanan, serta guard proses 30 request valid/menit dan maksimal dua request aktif. Release idempoten pada close/finish. Limit ini bukan kuota global Netlify; deployment publik tetap diblokir sampai kontrol platform tersedia.
- Tutup modal membatalkan request aktif; guard loading tetap mencegah tindakan bersamaan. Streaming token tetap belum dibangun; SSE baru mengirim hasil final.

Bukti aktual:
- RED transport abort: tes awal keluar 13 (unsettled top-level await), menunjukkan signal belum ditangani.
- GREEN transport: dua client tiruan membuktikan reject AbortError dan destroy socket. Assertion tambahan respons >1MB membuktikan destroy dan penolakan.
- Tes limiter membuktikan konkurensi, frekuensi, release ganda dan reset jendela; tes limiter dibuat bersamaan implementasi, tidak mengklaim RED yang tidak dijalankan.
- `npm test`: 20 berkas lulus (sebelum assertion ukuran tambahan); tes transport setelah assertion tambahan juga lulus.
- `npm run build`: lulus 28 modul. `git diff --check`: exit 0.

Status akhir sementara: **BELUM SIAP RILIS PUBLIK**. Belum selesai/belum terbukti: model aktif dari dokumentasi resmi, AI/header asli (key tidak tersedia), seluruh matriks termasuk contoh panjang dan audio fisik, E2E pembatalan/CSP/limit, aksesibilitas lengkap, kuota global Netlify, streaming token, dan review coverage. Server 3088 belum restart untuk guard terbaru. Tidak ada klaim seluruh plan selesai atau coverage 80%. Tidak ada commit otomatis karena working tree berisi perubahan pengguna.
