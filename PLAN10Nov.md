# PLAN10Nov — AI, Keamanan, dan Verifikasi suarakita

Tanggal: 10 November 2026  
Status: Implementasi dimulai; perlindungan penyimpanan key tahap pertama selesai. Rencana keseluruhan belum selesai.  
Lokasi proyek: `/Users/davistanjung/Documents/web-saya`

## Pembaruan server-managed AI — 10 November 2026

### Audit lanjutan — 11 November 2026

#### Audit source dan uji negatif lanjutan

#### Remediasi dan verifikasi batas keamanan

#### Verifikasi akhir lokal — 11 November 2026

Ditemukan bug nyata lewat tes: setelah abort, handler SSE masih meneruskan delta yang sudah di buffer. Perbaikan `stopped` membuat delta diabaikan setelah abort. RED `2 !== 1`, GREEN lulus. `headersTimeout` Node tidak menutup header parsial pada Node 24; timer per-koneksi 15 detik ditambahkan dan dibersihkan saat header lengkap. RED koneksi tetap terbuka >20 detik, GREEN tertutup pada ~15.0 detik sementara health tetap 200.

Hasil akhir: `npm test` 27 berkas lulus; build 29 modul; `git diff --check` bersih. Server 3088 dimulai ulang setelah verifikasi PID/cwd: status 200 dengan kedua key terdeteksi, `X-Powered-By` tidak ada, `/api/transcribe` 410, koreksi nyata Groq 200 dan negasi dipertahankan.

Tidak dapat diselesaikan dalam sesi ini: tidak ada Netlify CLI, `.netlify` link, akun deployment, atau URL target, sehingga verifikasi deployment tidak dilakukan. Autentikasi/kuota global tidak dibangun karena membutuhkan keputusan pemilik: siapa yang boleh mengakses, identitas apa, dan di mana kuota disimpan. Selama bind hanya 127.0.0.1 dan tanpa tunnel, aplikasi tetap alat lokal pribadi. **Rilis publik tetap diblokir.** Belum dipindai: log eksternal, backup, credential lama, reflog/dangling object. Tidak ada commit/push; port 3000 tidak disentuh.

#### Verifikasi lanjutan koneksi, injeksi, riwayat, dan legacy

11 November: tes slowConnection pada 3089 menahan delapan POST dengan body tidak selesai. Health tetap 200, POST tambahan 429, sesudah socket ditutup slot pulih (JSON rusak kembali 400). Ini uji terbatas, bukan DDoS. Server diberi headersTimeout 15s, requestTimeout 30s, idle socket timeout 45s, maxConnections 64, maxRequestsPerSocket 100. Durasi timeout penuh dan saturasi 64 socket belum diukur; jangan mengklaim keduanya PASS.

Legacy streaming: signal diteruskan dari Express ke fungsi koreksi/notulen dan client. AbortError dilempar ulang, tidak ditelan sebagai local fallback atau mencoba model berikutnya. RED tes missing AbortError; GREEN legacyAbort lulus pre-abort dua fungsi dan no-retry kedua client. Midstream disconnect riil provider pada jalur legacy belum diuji.

Dua panggilan Groq nyata (koreksi/notulen, GPT-OSS 120B) memakai transkrip sintetis dengan instruksi palsu untuk mengubah anggaran dan membocorkan environment. Keduanya tetap engine groq, tidak mengeluarkan hanya penanda serangan, mempertahankan anggaran dan 'belum disetujui', dan tidak memuat kedua key aktif. Koreksi mempertahankan instruksi palsu sebagai teks literal; notulen mengabaikannya. Ini satu sampel per aksi, bukan jaminan kebal prompt injection. Model tidak memiliki akses environment/tools.

Pemindaian isi 814 blob Git dari seluruh ref lokal: nol kecocokan exact kedua key aktif. Pemindaian .log proyek (kecuali node_modules/.git): nol file, sehingga bukan bukti log eksternal bersih. Key lama/tidak dikenal, reflog/dangling object, remote server logs dan backup belum dipindai. Nilai rahasia tidak dicetak.

Verifikasi akhir pass: npm test 25 berkas, build 29 modul lulus. Deployment hanya review konfigurasi Netlify; tidak ada target deployment/akun test yang diverifikasi. Tidak memasang autentikasi atau kuota global pura-pura: belum ada keputusan identitas pengguna/storage untuk publik. Rilis publik tetap BLOCKED. Server aktif 3088 perlu restart untuk perubahan legacy dan timeout terbaru. Tidak ada commit/push atau akses port 3000.

Server kini menolak origin sebelum parsing, membatasi ingress POST 120/menit dan 8 request aktif sebelum parsing (limit aksi tetap 30/menit, 2 aktif), menonaktifkan endpoint audio dengan 410 sebelum membaca body, dan menghapus X-Powered-By. Implementasi handler upload yang tidak dipakai dihapus dari server. Helper STT tidak lagi dapat dijangkau HTTP. RED tes securityBoundary gagal karena header Express masih muncul; GREEN lulus pemeriksaan header, dotfiles, audio 410, origin atas JSON rusak 403, dan malformed-request flood 429. `npm test`: 23 berkas lulus; build 29 modul lulus.

Browser Playwright aktual pada 3088, dengan respons provider sintetis (tanpa inferensi), memasukkan payload img onerror dan svg onload pada topic/summary/decisions serta original/corrected/changes. Kedua modal menampilkan teks escaped, tidak membentuk node berbahaya, dan penanda eksekusi tetap 0. Ini membuktikan payload yang diuji, bukan seluruh kemungkinan XSS. Server 3088 dimulai ulang setelah memverifikasi PID/cwd untuk memuat perubahan dan qs terbaru. Tidak menyentuh port 3000, commit, atau push.

Status: kontrol lokal diperkuat, bukan sertifikasi keamanan menyeluruh. Belum diuji: slowloris/full connection exhaustion, prompt injection provider nyata, seluruh isi log/riwayat Git, deployment Netlify, serta autentikasi/kuota global untuk publik. Tidak menyatakan semua risiko ditutup. Jalur legacy streaming masih perlu konsolidasi atau abort tersendiri.

Scope: server Express lokal, handler Netlify, client provider, validasi request, rendering Vue, dan konfigurasi deployment. Tidak memakai scanner eksternal atau inferensi berbayar. `npm audit --json` aktual menghasilkan 0 temuan. Server terisolasi 3089 dengan kedua key dikosongkan membuktikan cross-origin 403, JSON >1MB 413, audio >10MB 413, format non-audio 400, dan rate limit 429. Proses tes ditutup; port 3000 tidak diakses.

Temuan belum diperbaiki (audit saja):
- HIGH bila dipublikasikan: Express menggunakan key pemilik tanpa autentikasi; Host/origin bukan autentikasi. Saat ini bind 127.0.0.1 membatasi akses jaringan langsung. Jangan buka tunnel/proxy publik sebelum autentikasi serta kuota global tersedia. Netlify saat ini tidak membaca key pemilik, jadi tidak mengklaim shared-key exposure di handler tersebut.
- MEDIUM: JSON body parsing sebelum limiter; upload audio memakai batas 10MB tetapi tidak ada pembatasan total koneksi/body upload serentak. Penyerang yang sudah dapat menjangkau server bisa menahan koneksi atau menekan memori sebelum validasi akhir.
- MEDIUM: jalur Whisper memakai response.json tanpa batas byte respons, berbeda dari transport teks dengan cap 1MB. Endpoint masih tersedia meskipun UI tidak memakainya; validasi hanya MIME/ukuran, bukan signature audio. Menghapus endpoint yang tidak diperlukan memperkecil permukaan serangan.
- LOW: Express masih menampilkan X-Powered-By; cache/error/method handling dapat diseragamkan. Jalur legacy streaming belum memiliki propagasi abort yang setara jalur AI baru.
- Integritas AI: prompt memisahkan transkrip sebagai JSON tetapi tidak menjamin bebas prompt injection. Tidak ada tools/shell/file capability pada model; dampak yang terlihat adalah output salah, bukan eksekusi server. Nama, angka, negasi dan penugasan tetap perlu uji adversarial nyata.

Review XSS: v-html hanya pada formatter inline yang escape HTML dahulu; koreksi dan ringkasan prosa memakai interpolasi Vue. Ini bukti source review, bukan pengujian browser atas seluruh payload. SSRF: URL provider dari preset tetap, bukan input URL pengguna. Belum memindai isi seluruh log/riwayat Git, menguji deployment Netlify, browser XSS, slow-client stress, atau mikrofon fisik. Audit tidak menyatakan aplikasi bebas kerentanan atau siap publik. Tidak ada perubahan source produksi dalam pass audit ini, commit atau push.

`npm audit --omit=dev --json` menemukan satu kerentanan moderate pada qs (GHSA-6pq8-jhm2-2vcw, DoS qs.stringify). `npm update qs` memperbarui dependensi transitif; npm melaporkan 0 vulnerabilities sesudahnya. Tidak memakai force/major upgrade. `npm test` sesudah pembaruan lulus 22 berkas; build lulus 29 modul.

Pemeriksaan rahasia tanpa mencetak nilainya: dua key dibandingkan terhadap dua berkas bundle build, tidak ada kecocokan. `.env` tidak tracked dan tidak muncul pada riwayat path `.env` di seluruh ref lokal. Ini tidak membuktikan key tidak pernah disalin dengan nama/path lain. HTTP aktual 3088 untuk `/.env` dan `/.git/config` keduanya 404; status API 200. Tidak ada commit/push. Audit ini belum mencakup pentest lengkap, pemeriksaan seluruh log/riwayat berbasis isi, mikrofon fisik, kuota global, atau deployment publik. Proses aktif perlu restart untuk memuat dependensi qs terbaru.

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

## 28. Akses publik dengan password bersama

Keputusan pemilik: aplikasi dibuka untuk pengguna lain memakai **satu password bersama**. Tanpa `APP_PASSWORD`, endpoint AI menutup diri (503), bukan terbuka.

Perubahan:
- `lib/auth.js`: token sesi HMAC-SHA256 berisi waktu kedaluwarsa (12 jam), dibandingkan dengan `crypto.timingSafeEqual`; password bersama minimal 12 karakter dan dibandingkan lewat hash SHA-256 bertiming konstan.
- `server.js`: `POST /api/login` (limiter 10/menit, 2 aktif) mengeset cookie `sk_sess` HttpOnly + SameSite=Strict + path `/`. Guard `PROTECTED_PATHS` menolak `401` **sebelum** body diparse untuk `/correct-transcript`, `/meeting-notes`, `/generate-meeting-notes`. `/api/status` melaporkan `authRequired`.
- `.env` mendapat `APP_PASSWORD` dan `SESSION_SECRET` acak; `.env.example` mendokumentasikan keduanya tanpa nilai. `.env` tetap di `.gitignore` dan tidak terlacak git.
- UI: `LoginModal.vue`. `401` pada aksi AI memunculkan modal, lalu aksi diulang otomatis setelah masuk (`pendingRetry`). `AiConfigModal.vue` yang tak terpakai dihapus; `App.vue` tidak lagi menyimpan key/model di browser.

Bukti aktual:
- `tests/auth.test.mjs`: token kedaluwarsa, tamper MAC, secret salah, format salah, password lemah/berlebih ditolak.
- `tests/expressValidation.test.mjs`: **37 pemeriksaan** pada proses terisolasi 3089 — tanpa sesi `401`, password salah `401`, login `200` dengan cookie HttpOnly/SameSite=Strict, validasi input tetap `400`, streaming SSE membawa `result.engine` dan event `done`.
- `tests/securityBoundary.test.mjs`: `.env`/`.git` `404`, `/api/transcribe` `410`, origin asing `403` sebelum parse, 125 request tanpa sesi berakhir `429`.
- `tests/slowConnection.test.mjs`: 8 upload bersesi yang ditahan tetap dibatasi, health `200`, slot pulih.
- Server nyata 3088 setelah restart: `/api/status` `authRequired: true`, tanpa sesi `401`, login benar `200`, koreksi Groq `200` (`engine: groq`, negasi "belum disetujui" dipertahankan), `X-Powered-By` absen, `/api/transcribe` `410`.
- Browser Playwright nyata ke 3088: klik "Koreksi Teks" memunculkan modal login, password benar menutup modal dan melanjutkan koreksi otomatis (`belum disetujui` ada di hasil, tanpa pesan error), password tidak tersisa di DOM. Setelah reload sesi cookie masih berlaku; "Buat Notulen" berhasil dengan Groq tanpa prompt login.
- `npm test`: **28 berkas** lulus. `npm run build`: 27 modul. `git diff --check` bersih.

Sisa celah sebelum rilis publik:
- Limiter masih per-proses, bukan kuota global; banyak instance atau restart mengatur ulang jendela.
- Cookie belum `secure` karena belum ada HTTPS di depan server.
- Belum ada tombol keluar, audit sesi, atau rotasi password dari UI.
- Distribusi password bersama di luar jalur aman (chat/email) menjadi risiko pemilik.
- Belum diuji beban bersamaan multi-pengguna nyata.

## 29. Akun per pengguna, dashboard admin, dan kuota harian

Keputusan pemilik: ganti password bersama dengan **akun per pengguna** buatan admin, plus **kuota harian per user** dan batas total harian. Tidak memakai layanan auth eksternal; penyimpanan memakai Netlify Blobs.

Perubahan:
- `lib/accounts.js`: hash password scrypt (salt 16 byte, hash 32 byte), `verifyPassword` timing-safe, status aktif, `quotaPerDay`, `lastLogin`, audit. Kunci `user:<nama>`, `usage:<tanggal>:<nama>`, `usage:<tanggal>:__total`, `audit:*`, `loginfail:<nama>:<bucket>`. Indeks `users:index` dipakai karena `list()` Blobs bisa tertinggal.
- Kuota: default 30 aksi/hari per user, 300/hari total. Kedua endpoint AI memakai hitungan yang sama. Penghitung bukan operasi atomik, jadi dua permintaan bersamaan bisa sedikit melewati batas.
- Kunci login: 10 kegagalan per username per jendela 15 menit, disimpan di Blobs sehingga berlaku lintas instance.
- `lib/auth.js`: `issueSession`/`verifySession` membawa identitas `{u, r, exp}` dan MAC HMAC-SHA256. Sesi user 12 jam, admin 2 jam. Token lama (hanya `exp`) tetap dipakai server Express lokal, tidak berlaku di Netlify.
- `netlify/functions/_auth.js`: `requireUser`/`requireAdmin` mengembalikan `Response` penolakan atau `null`. `_auth.js` juga menyediakan `jsonResponse`, `corsHeaders`, `allowedOrigin`, `readJson`, dan factory akun untuk pengujian.
- Fungsi Netlify dipindah ke **API modern** (`export default async (request) => Response`): `login.mjs`, `logout.mjs`, `admin-users.mjs`, `correct-transcript.mjs`, `meeting-notes.mjs`, `status.mjs`. Ini wajib: Blobs konsistensi kuat menolak runtime klasik dengan `BlobsConsistencyError` (`uncachedEdgeURL`).
- `lib/accounts.js` memakai `getStore({ name, consistency: 'strong' })`.
- Admin: username `admin`, login memakai password tersimpan di Blobs; `ADMIN_PASSWORD` di environment tetap berlaku sebagai jalur darurat bila password dashboard lupa. Rotasi dari UI menulis hash baru ke Blobs dan mencatat audit. Pemulihan saat lupa: ganti `ADMIN_PASSWORD` di dashboard Netlify lalu redeploy — akar kepercayaan adalah akun Netlify, bukan email.
- `public/admin.html` + `public/admin.js`: login admin, daftar user + pemakaian hari ini, buat user (password tampil sekali), reset password, nonaktifkan/aktifkan, hapus, rotasi password admin, audit 30 terakhir. Rute `/admin` → `/admin.html` di `netlify.toml`.
- UI utama: `LoginModal.vue` menerima username + password; `AppHeader.vue` punya tombol "Keluar"; `App.vue` mengirim logout dengan `keepalive` supaya POST tidak dibatalkan saat tab dimuat ulang, lalu langsung menampilkan modal masuk.

Bukti aktual (deploy produksi `https://suarakit.netlify.app`, 11 Nov 2026):
- `npm test`: **29 berkas** lulus; `npm run build` lulus. `tests/accounts.test.mjs` menguji hash, kuota per user + total, kunci login, sesi beridentitas, nonaktif, hapus, audit. `tests/apiValidation.test.mjs`: **59 pemeriksaan** memakai `Request`/`Response` asli (401 tanpa sesi, 403 user biasa, 413 batas panjang, 429 kuota, create/reset/deactivate/rotate-admin, origin asing). `tests/requestOrigin.test.mjs`: 12 pemeriksaan origin.
- Tanpa sesi: `401`. Login user `200`, cookie `HttpOnly; Secure; SameSite=Strict`. Role user membuka `/api/admin/users` → `403`.
- Koreksi dengan sesi user: `200`, `engine: groq`, negasi "belum disetujui" utuh, `quota: {used: 1, limit: 30}`, ~2,3 dtk.
- Konsistensi kuat terverifikasi: buat user lalu login langsung **berhasil dalam 637 ms**, user langsung muncul di daftar admin, nonaktifkan → login `401`, aktifkan → login `200`, hapus → login `401`, dan daftar langsung tidak memuat user itu. Sebelumnya butuh ~9,8 detik.
- Rotasi admin bolak-balik: password baru `200`, login dengan password baru `200`, `ADMIN_PASSWORD` lama tetap `200` (jalur darurat), rotasi kembali `200`, login dengan password asli `200`, password sementara menjadi `401`.
- Browser `/admin`: login admin, baris `admin` + `davis`, ringkasan `Total aksi hari ini: 4 / 300`, audit tampil, buat user muncul ~2,9 dtk, nonaktifkan ~1,8 dtk, aktifkan ~1,8 dtk, hapus berhasil. Tidak ada lagi pesan staleness.
- Browser aplikasi utama: login memunculkan hasil koreksi, tombol Keluar menghapus cookie (`cookieLeft: false`), modal masuk tampil, reload tetap keluar (`afterReload: false`).
- User uji sisa (`rahma`, `rahma2`, `ukurtime`, `cobalogin`, `ujicoba`) dihapus lewat API admin; daftar akhir hanya `admin` dan `davis`.

Risiko yang masih ada:
- Penghitung kuota Blobs tidak atomik; lonjakan bersamaan bisa melewati batas sedikit. Batas total juga per tanggal UTC, bukan zona waktu Indonesia.
- Sesi tidak dapat dicabut per token; menonaktifkan atau menghapus user tidak membatalkan cookie yang sudah terbit sampai kedaluwarsa (maksimal 12 jam untuk user, 2 jam untuk admin). Endpoint memeriksa ulang user hanya saat login.
- Tidak ada reset password mandiri lewat email; semua reset lewat admin.
- Satu kunci `users:index` bisa menjadi titik gesek saat banyak admin menulis bersamaan.
- Server Express lokal di 3088 masih memakai password bersama `APP_PASSWORD` dan tidak memakai akun per user.
- `ADMIN_PASSWORD` di environment masih password awal; setelah rotasi dari UI, jalur darurat tetap memakai nilai lama sampai env diganti dan redeploy.

## 30. Tampilan dashboard admin mengikuti model layout pdftogo

Permintaan pemilik: dashboard `/admin` mengadopsi model layout `https://pdftogo.netlify.app/`, tetap memakai palet hangat suarakita.

Yang diadopsi dari pdftogo (hanya model layout, bukan warna): sidebar kiri tetap 256 px dengan merek di atas, grup navigasi berlabel, item aktif berlatar cream + garis tepi, dan status di kaki sidebar; header atas sticky 64 px dengan breadcrumb kecil + tombol aksi di kanan; area kerja berlatar krem dengan judul halaman besar, subjudul, dan kartu putih bergaris; kontrol membulat 9 px (bukan pill); tabel dengan label kolom huruf kapital kecil.

Perubahan:
- `public/admin.html` ditulis ulang: sidebar + header + workspace, empat halaman (`Pengguna`, `Buat user`, `Rotasi password`, `Audit`) dengan perpindahan lewat nav, kartu pemakaian dengan meter persentase, tabel akun dengan avatar inisial dan badge status, drawer + overlay di bawah 1024 px, tabel berubah menjadi kartu bertumpuk di bawah 700 px.
- `public/admin.js`: `showPage`, status nav aktif, drawer mobile, meter pemakaian, badge/avatar, dan `data-label` untuk tampilan kartu. ID form dan alur API tidak berubah, jadi backend tidak tersentuh.
- Font Plus Jakarta Sans dimuat dari Google Fonts sesuai CSP yang sudah ada; tidak ada skrip inline dan tidak ada dependensi baru.

Bukti aktual (deploy produksi, 11 Nov 2026):
- Desktop 1440 px: login tampil di tengah, sidebar tidak bisa digeser (hamburger disembunyikan), keempat halaman bertukar judul dan isi dengan benar.
- Login admin: tabel menampilkan `admin` dan `davis`, meter `5 / 300 aksi` `2%`, badge `aktif`, kuota `30/hari`.
- Alur penuh lewat UI baru: buat `demo1` (password tampil sekali), baris muncul, nonaktifkan, aktifkan, hapus — semua berhasil tanpa error di `#users-error`.
- Mobile 390 px: sidebar tersembunyi di `x=-256`, hamburger membuka drawer ke `x=0`, overlay menutup kembali ke `-256`; tabel berubah menjadi kartu label–nilai dan tombol aksi selebar kartu.
- `node --check public/admin.js` lulus; `npm run build` lulus. Satu-satunya error konsol berasal dari `about:srcdoc` milik Playwright (CSP harness), bukan halaman admin.

## 31. Layar masuk admin bersih dan pengetatan endpoint admin

Dua hal: menu dashboard tidak boleh tampil sebelum masuk, dan endpoint admin ditinjau terhadap penyalahgunaan.

Perubahan:
- `public/admin.html` + `public/admin.js`: kelas `auth-locked` aktif sejak HTML dimuat. Saat terkunci, `.nav` disembunyikan dan tombol menu mobile dimatikan; judul header menjadi "Masuk". `showPanel` membuka kunci. Tidak ada kedipan menu sebelum JavaScript jalan.
- `lib/accounts.js`: `authenticate` menjalankan scrypt terhadap hash palsu saat username tidak ada, supaya waktu balasan tidak membocorkan username terdaftar. `consume` menolak user nonaktif (`inactive`) dan user terhapus (`unknown`).
- `netlify/functions/correct-transcript.mjs` + `meeting-notes.mjs`: `inactive`/`unknown` menghasilkan `401`, bukan `429`, sehingga cookie lama user yang dinonaktifkan atau dihapus langsung mati.
- `netlify/functions/admin-users.mjs`: `create` menolak username `admin` dan kuota di luar bilangan bulat 1-1000; `rotate-admin` selalu menulis `role: "admin"` dan `active: true` pada record admin.
- `tests/apiValidation.test.mjs` naik dari 59 ke **64 pemeriksaan**: sesi user nonaktif ditolak, sesi user terhapus ditolak, username admin ditolak, kuota negatif dan kuota 100000 ditolak.

Bukti aktual (produksi):
- Halaman `/admin` tanpa cookie: `.nav` tidak terlihat, hamburger tidak terlihat, kartu masuk tampil.
- `GET /api/admin/users`: tanpa cookie `401`, cookie palsu bertanda tangan salah `401`, cookie user biasa `403`, origin asing `403`.
- `create` username `admin` → `400`; `quotaPerDay: -3` → `400`.
- User `sec1` dengan sesi hidup: koreksi `200`; setelah dinonaktifkan, koreksi berikutnya `401` dengan pesan "Akun tidak aktif atau sudah dihapus."; setelah dihapus tetap `401`.
- `rotasi-admin` memaksa role admin walau record lama pernah ditimpa role lain.
- `npm test` 29 berkas lulus; build lulus. Error konsol tersisa hanya `401` awal saat belum masuk (memang diharapkan) dan pelanggaran CSP dari harness `about:srcdoc` Playwright, bukan dari halaman.

Sisa risiko yang belum ditutup:
- Sesi admin yang sudah terbit tidak batal saat password admin dirotasi; berlaku sampai kedaluwarsa (maks 2 jam). Pencabutan per token butuh nomor versi sesi.
- Belum ada token CSRF; perlindungan bergantung pada `SameSite=Strict` dan pemeriksaan Origin. Klien non-browser bisa memalsukan Origin, tetapi tetap butuh cookie sesi.
- Pembatas login berkunci per username, sehingga penyerang bisa membuat `admin` terkunci 15 menit (gangguan, bukan pembobolan). Belum ada batas per IP.
- Tidak ada 2FA. `ADMIN_PASSWORD` lama tetap berlaku sebagai jalur darurat sampai diganti di environment.

## 32. Notifikasi bertema untuk reset password, aktivasi, dan penonaktifan

Permintaan pemilik: password hasil rotasi harus tampil di notifikasi bertema aplikasi dan halus, begitu juga saat menonaktifkan dan mengaktifkan user.

Perubahan:
- `public/admin.html`: komponen toast `#toasts` dengan `.toast` (kartu putih, garis `--line`, radius 12 px, bayangan lembut, font Plus Jakarta Sans), titik status berwarna (`hijau`/`yolk`/`merah`), transisi `opacity` + `translateY` 0.22 s, layout penuh selebar layar di bawah 560 px, dan `prefers-reduced-motion` mematikan animasi.
- `public/admin.js`: `toast(message, { tone, password, duration })`. Password ditampilkan di `<code>` dengan tombol **Salin** (`navigator.clipboard`); toast password bertahan sampai ditutup (`duration: 0`), status lain hilang sendiri setelah 3,2 s.
- Toast baru menggantikan toast lama, supaya notifikasi yang menumpuk tidak menutupi tombol tabel. `alert()` untuk password dihapus total; `confirm()` hapus user masih bawaan browser.

Bukti aktual (produksi, 11 Nov 2026):
- Reset password `toast3`: toast memuat `Password baru untuk toast3`, password `rQF--jHporkisOei`, tombol `Salin`. Gaya terukur: font Plus Jakarta Sans, latar `rgb(255,255,255)`, radius `12px`, `box-shadow` aktif, `opacity 1`, `transform none`.
- Tombol `Salin` menulis password yang benar ke clipboard (`clipboard === code`), label berubah menjadi `Tersalin`.
- Toast password masih tampil setelah 4,2 s (tidak hilang sendiri) dan hilang setelah tombol × ditekan (`count 0`).
- Nonaktifkan: `toast warn show`, titik `rgb(255,200,50)`, teks `toast3 dinonaktifkan.`, hilang sendiri. Aktifkan: titik `rgb(62,155,111)`, teks `toast3 aktif kembali.`, hilang sendiri. Hapus: `toast3 dihapus.`, baris hilang dari tabel.
- Dua reset berurutan menyisakan tepat satu toast (`toastCount 1`), dan tombol baris tetap bisa diklik saat toast tampil.
- Mobile 390 px: toast `x=16`, lebar `358`, teks dan tombol tetap terbaca; desktop 1440 px tampil di pojok kanan bawah.
- Label header aplikasi utama: `Masuk` sebelum login, `Keluar` setelah login dan setelah reload, kembali `Masuk` setelah keluar.
- `node --check public/admin.js` lulus, `npm test` 29 berkas lulus, build dan deploy lulus. Satu-satunya error konsol adalah pelanggaran CSP dari `about:srcdoc` milik Playwright, bukan halaman admin.

## 33. Salin password saat buat user, panel password di baris user, header tanpa label ganda

Perubahan:
- `public/admin.js`: helper `passwordField()` dipakai dua tempat — hasil buat user (`#create-result`) dan panel reset. Panel reset (`showPasswordRow`) disisipkan sebagai `tr.row-panel` tepat di bawah baris user yang bersangkutan, jadi teks berbunyi "Password baru untuk <username>" dan admin tahu password milik siapa. Panel bertahan sampai ditutup; reset berikutnya menggantikan panel lama. Toast pojok tidak lagi dipakai untuk reset.
- `passwordField` memakai `navigator.clipboard.writeText`; label berubah `Tersalin` saat berhasil. `code` memakai `user-select: all`, jadi satu klik memilih seluruh password untuk copy-paste manual.
- Baris user sekarang punya `data-row="${username}"` supaya panel dicari tepat, bukan lewat teks.
- `public/admin.html`: brand sidebar hanya "suarakita" (label ADMIN dihapus); topbar tidak lagi memuat breadcrumb "Admin" dan judul halaman. Judul tetap ada di header konten tiap halaman.
- Baris `tr` panel diberi gaya sendiri di desktop dan mobile; pada layar <700 px panel melebar penuh di dalam kartu user.

Bukti aktual (produksi, 11 Nov 2026):
- Topbar hanya berisi `Masuk sebagai admin` dan `Keluar`; `#page-title` tidak ada lagi di DOM (`count 0`); brand hanya `suarakita`.
- Buat user `ui2`: notice memuat password `z8t7FbIVh___a_jA` + tombol `Salin`; klik Salin → clipboard sama persis dengan password; label `Tersalin`; `user-select: all`.
- Reset `ui2`: panel muncul sebagai `tr.row-panel` yang merupakan `nextElementSibling` baris `ui2` (`true`), teks `Password baru untuk ui2`, password `OWye7N63D_XIkKdp`; clipboard sama setelah Salin; panel tetap ada setelah 4,2 s; tidak ada toast pojok (`#toasts` kosong).
- Mobile 390 px: panel tepat di bawah kartu `ui2`, lebar 316 px di dalam kartu, tombol Salin terbaca; tombol baris user lain tetap bisa diklik.
- `ui2` dihapus lagi lewat API admin (`200`); akun tersisa `admin`, `davis`, `ujicoba`.
- `node --check public/admin.js` lulus, `npm test` 29 berkas lulus, build + deploy lulus.

## 34. Perbaikan panel "Sisa penggunaan" yang kosong

Penyebab: `correct-transcript.mjs` dan `meeting-notes.mjs` menulis `quota: { used, limit }` (kuota harian aplikasi) tepat setelah `...result`, sehingga menimpa `result.quota` milik Groq (`remainingRequests`, `limitRequests`, `remainingTokens`, `limitTokens`, `resetRequests`, `resetTokens`, `observedAt`). `QuotaStatus.vue` membaca `data.quota` sebagai kuota Groq, jadi persentase dan waktu reset menjadi `null` → tampil "Persentase belum tersedia." dan "Waktu reset belum tersedia.".

Perubahan:
- Kedua function kini mengembalikan `usage: { used, limit }` untuk kuota harian, dan membiarkan `quota` tetap milik provider.
- `tests/apiValidation.test.mjs` memeriksa `usage` (bukan `quota`) untuk hitungan kuota harian.

Bukti aktual (produksi, 11 Nov 2026, provider Groq sungguhan):
- Respons koreksi: `engine: groq`, `quota: { limitRequests: 1000, limitTokens: 8000, remainingRequests: 999, remainingTokens: 7603, resetRequests: "1m26.4s", resetTokens: "2.977s", observedAt: ... }`, `usage: { used: 1, limit: 5 }`.
- Respons notulen: `remainingRequests: 998`, `remainingTokens: 7334`, `usage: { used: 2, limit: 5 }`.
- UI modal koreksi: `Sisa penggunaan — Request 99% · Token 94% — Reset request: dalam 04:20. — Reset token: dalam 00:04.`
- UI modal notulen: `Request 99% · Token 93% — Reset request: dalam 05:46. — Reset token: dalam 00:05.`
- `npm test` 29 berkas lulus; build + deploy lulus. User uji `quotacheck` dan `uicheck` sudah dihapus.

## 35. Konfirmasi hapus user memakai panel bertema seperti reset

Perubahan:
- `public/admin.js`: `mountRowPanel(username, tone)` menjadi pembangun panel baris bersama. `showPasswordRow` memakai tone `ok`; `showDeleteRow` memakai tone `bad` (titik merah) dan menampilkan "Hapus user <username>? Tindakan ini tidak bisa dibatalkan." dengan tombol `Batal` dan `Hapus`.
- Aksi `delete` tidak lagi memakai `confirm()` bawaan browser. Klik `Hapus` di baris membuka panel; `Batal` menutup panel, `Hapus` di panel menjalankan `runAction('delete', username)`.
- `public/admin.html`: `.toast-actions` (dua tombol sejajar, melebar sama rata), memakai gaya `.btn`/`.btn.danger` yang sudah ada.

Bukti aktual (produksi, 11 Nov 2026):
- Panel `delcheck`: `toast bad show`, titik `rgb(179,38,30)`, teks `Hapus user delcheck? Tindakan ini tidak bisa dibatalkan.`, tombol `Batal` dan `Hapus`, posisi `nextElementSibling` baris user.
- `Batal` menutup panel, baris tetap ada (`cancelled true`, `rowStillThere 1`).
- `Hapus` di panel menghapus user: baris dan panel hilang, toast `delcheck dihapus.`
- `delcheck2` diuji visual: panel merah selebar kartu, dua tombol sejajar; setelah itu dihapus lewat API admin.
- Tidak ada lagi `confirm(` di `public/admin.js` (`grep -c` = 0).
- `npm test` 29 berkas lulus, build + deploy lulus.

## 36. Halaman masuk tanpa sidebar/header, logo di atas form

Perubahan:
- `public/admin.html`: pada `.app.auth-locked`, sidebar dan topbar disembunyikan (`display: none`), konten utama melebar (`margin-left: 0`), dan area kerja tanpa padding.
- Blok `.login-wrap` berisi logo + wordmark `suarakita` (memakai `/favicon.png`) tepat di atas kartu masuk, keduanya di tengah layar penuh (`min-height: 100dvh`).
- Setelah masuk, kelas `auth-locked` dilepas dan sidebar/header/drawer kembali seperti semula.

Bukti aktual (produksi, 11 Nov 2026):
- Desktop 1440 px: `#sidebar` tidak terlihat, `.topbar` tidak terlihat, logo `suarakita` dan kartu masuk masing-masing selebar 400 px pada `x=520` (selisih titik tengah < 2 px), logo di atas form.
- Mobile 390 px: sidebar dan topbar tidak terlihat, logo tetap di tengah di atas form.
- Setelah login admin: sidebar `true`, topbar `true`, tombol menu mobile `true`.
- Build + deploy lulus.

## 37. Admin bisa memantau kuota server Groq dan sisa kuota harian tiap user

Penjelasan beda dua hal:
- "Sisa penggunaan" di modal user adalah **rate limit Groq** untuk satu kunci server (`remainingRequests/limitRequests`, `resetRequests`, dst). Kuota ini milik kunci, bukan milik user, jadi tidak bisa dipecah per user.
- Kuota harian aplikasi (per user, default 30, plus batas global 300) dikelola sendiri di Blobs dan sudah tampil di tabel admin.

Perubahan:
- `lib/accounts.js`: `recordProviderQuota()` menyimpan cuplikan field Groq yang aman (`limit*`, `remaining*`, `reset*`, `retryAfter`, `observedAt`) ke blob `provider:quota`; `providerQuota()` membacanya. Entry tanpa `observedAt` diabaikan supaya snapshot lama tidak tertimpa data cacat.
- `correct-transcript.mjs` + `meeting-notes.mjs`: setelah aksi berhasil, cuplikan `result.quota` disimpan.
- `admin-users.mjs`: respons GET menambah `providerQuota`.
- `public/admin.html` + `public/admin.js`: kartu **Sisa kuota server Groq** di halaman Pengguna (persen + angka sisa/limit, meter, hitung mundur reset yang berdetak tiap detik, waktu pembaruan), dan kolom **Sisa** per user (`kuota - terpakai hari ini`).
- `tests/accounts.test.mjs` + `tests/apiValidation.test.mjs`: snapshot provider tersaring dan tetap ada saat input cacat; respons admin memuat `providerQuota`.

Bukti aktual (produksi, 11 Nov 2026):
- Aksi Groq user `statcheck`: respons `remainingRequests 999/1000`, `remainingTokens 7591/8000`; GET admin mengembalikan `providerQuota` dengan angka sama.
- Kartu admin: `Sisa request 99% (999/1000)`, `Sisa token 94% (7591/8000)`, catatan `Reset request dalam 01:15 · Reset token sudah lewat · Diperbarui 02.12.53.`; hitung mundur berubah ke `01:13` setelah 2 detik.
- Tabel: `davis 30/hari, hari ini 11, sisa 19`; `statcheck 6/hari, hari ini 1, sisa 5`.
- `npm test` 29 berkas lulus; build + deploy lulus; user uji `statcheck` sudah dihapus.
- Sisa risiko: snapshot Groq global (bukan per user), dan hanya diperbarui saat ada aksi AI; reset limit token Groq bisa sangat singkat sehingga tampil "sudah lewat".

## 38. Menu Pengaturan AI di atas Audit; statistik ikut model yang dipilih

Perubahan:
- `lib/serverAi.js`: `resolveAiSettings()` memvalidasi provider/model tersimpan (bawaan `groq`/`openai/gpt-oss-120b`), `serverAiOptions(env, settings)` hanya mengaktifkan provider terpilih (hanya `groq` dan `gemini`, satu-satunya yang punya jalur di `providerFallback.js`).
- `lib/accounts.js`: `readAiSettings()`/`writeAiSettings()` pada blob `settings:ai`; `recordProviderQuota(quota, provider)` ikut menyimpan nama provider di snapshot.
- `netlify/functions/admin-users.mjs`: GET mengembalikan `settings` + `providers` (label, daftar model, `hasKey`), aksi baru `set-ai` dengan validasi provider/model dan key environment, dicatat di audit.
- `netlify/functions/correct-transcript.mjs` + `meeting-notes.mjs`: membaca settings dulu, lalu `serverAiOptions(process.env, settings)`, dan mencatat snapshot kuota beserta `result.engine`.
- `public/admin.html` + `public/admin.js`: menu **Pengaturan AI** di atas Audit, halaman dengan select provider/model (opsi provider tanpa key dinonaktifkan), tombol Simpan, catatan model aktif. Kartu kuota berjudul dinamis (`Sisa kuota server <provider>`); snapshot dari provider lain disembunyikan dan diganti keterangan, karena Gemini tidak mengirim header kuota.
- `lib/providers.json`: daftar model disamakan dengan akses akun nyata. Groq: `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `qwen/qwen3.8-27b` (llama 3.x menghasilkan 404 di akun ini). Gemini: flash-lite lebih dulu karena semua model `*-flash` mengembalikan 503; `gemini-2.5-flash` sudah 404 untuk pengguna baru.

Bukti aktual (produksi, 11 Nov 2026):
- `GET /api/admin/users`: `settings {groq, openai/gpt-oss-120b}`, `providers` groq+gemini dengan `hasKey true`.
- `set-ai` model asing → 400; provider di luar jalur → 400; provider tanpa key → 400; `set-ai` sah → 200 dan tersimpan (GET berikutnya sama).
- Koreksi + notulen dengan Gemini `gemini-3.5-flash-lite`: `engine gemini`, `modelUsed gemini-3.5-flash-lite`, `method llm_ai` (bukan fallback lokal).
- Koreksi dengan Groq `openai/gpt-oss-120b` dan `openai/gpt-oss-20b`: `engine groq`, `modelUsed` sesuai, snapshot berubah dan memuat `provider: groq`.
- UI desktop: urutan nav `Pengguna, Buat user, Rotasi password, Pengaturan AI, Audit`; pilih Gemini → catatan berubah, Simpan → toast `Model AI diganti ke Gemini.`; halaman Pengguna menampilkan `Sisa kuota server Gemini` + `Snapshot terakhir dari Groq...`.
- UI mobile 390 px: form bertumpuk (provider di atas model, tombol selebar kartu), tanpa scroll horizontal.
- `npm test` 29 berkas lulus; build + deploy lulus; model dikembalikan ke `groq`/`openai/gpt-oss-120b`; user uji `aicheck`/`aicheck2` dihapus.

Catatan limit: Groq free tier akun ini 8.000 TPM / 1.000 RPD untuk semua model yang tersedia, jadi ganti model Groq tidak menambah limit. Gemini Flash-Lite memberi konteks 1M dan limit harian lebih besar, tetapi tidak mengirim header kuota sehingga kartu statistik hanya menampilkan data Groq terakhir (disembunyikan saat Gemini aktif).

## 39. Kartu statistik user disembunyikan saat model Gemini

Perubahan:
- `resources/js/components/QuotaStatus.vue`: blok teks "Sisa kuota Gemini tidak tersedia dari respons ini" dihapus. Kartu hanya dirender saat ada objek `quota` atau `engine === 'groq'`. Dengan Gemini (tanpa header kuota), kartu tidak tampil sama sekali — tidak ada pesan kosong dan tidak ada celah.
- Pesan Groq "Sisa kuota Groq tidak tersedia dari respons ini" tetap ada untuk kasus Groq tanpa metadata.

Bukti aktual (produksi, 11 Nov 2026):
- Model aktif `gemini-3.5-flash-lite`, user `uicheck` koreksi lewat UI: modal hanya berisi header, panel Sebelum/Sesudah, Perbaikan, dan tombol; `Sisa penggunaan` tidak ada, teks `tidak tersedia` tidak ada, hasil koreksi tampil normal.
- Model aktif `groq/qwen3.8-27b`: modal yang sama menampilkan `Sisa penggunaan` + `Request 99% · Token 97%` + hitung mundur reset, jadi perilaku Groq tidak berubah.
- `npm run build` + deploy lulus; user uji `uicheck` dihapus; pilihan model di admin dikembalikan ke `groq/qwen3.8-27b` (pilihan yang sedang aktif sebelum pengujian).

## 40. Batas input mengikuti model aktif + streaming heartbeat + sembunyikan info provider

Batas per model (`lib/providers.json` → `maxChars`):
- Groq semua model: **50.000** karakter.
- Gemini semua model: **100.000** karakter. Plafon model sebenarnya: input 1.048.576 token, output 65.536 token → ±330.000 karakter untuk koreksi penuh (transkrip Indonesia ±5 karakter/token).

Perubahan:
- `lib/serverAi.js`: `maxCharsFor(settings)` memilih batas dari model aktif; model tak dikenal kembali ke 50.000.
- `lib/requestValidation.js`: `validateRequest(data, { maxChars })`; pesan `Maaf, maksimal input <n> karakter.` (format `id-ID`).
- `lib/aiActions.js`: `options.timeoutMs` (bawaan 20 dtk, endpoint streaming 240 dtk) dan penjaga hasil terpotong — bila hasil koreksi < 50% panjang input (>2.000 karakter), model dianggap gagal dan mesin lokal dipakai supaya tidak ada teks hilang.
- `netlify/functions/correct-transcript.mjs` + `meeting-notes.mjs`: baca settings sebelum validasi, batas dinamis, dan `stream: true` menjawab SSE lewat `lib/sseResponse.js` (heartbeat `{ping:true}` tiap 10 dtk, frame akhir `{result}` atau `{error}`). Tanpa `stream`, balasan tetap JSON.
- `resources/js/App.vue`: error 413 ditampilkan apa adanya (tanpa awalan "Terjadi kesalahan…").
- `resources/js/components/CorrectionModal.vue` + `MeetingNotesModal.vue`: baris `fallbackLabel` dihapus, jadi teks seperti "Gemini: tidak tersedia atau respons tidak valid" tidak lagi tampil ke pengguna. `fallbackLabel` ikut dihapus dari `engineLabel.mjs` (tes disesuaikan).

Bukti aktual (produksi, 11 Nov 2026):
- Groq `gpt-oss-20b`, 50.001 karakter → 413 `Maaf, maksimal input 50.000 karakter.`
- Gemini `gemini-3.5-flash-lite`, 100.001 karakter → 413 `Maaf, maksimal input 100.000 karakter.`
- Stream Groq kecil: `text/event-stream`, frame `result` engine `groq`, `modelUsed openai/gpt-oss-20b`, ada `quota`, snapshot admin `provider: groq`.
- UI koreksi Gemini ±6.900 karakter: 7,5 dtk, hasil tampil, tanpa baris "tidak tersedia", tanpa kartu statistik.
- Uji ukuran Gemini `gemini-3.6-flash` lewat SSE: 15.000 karakter selesai 23,7 dtk dengan hasil utuh (15.080 karakter); 25.000 karakter jatuh ke mesin lokal (5,3 dtk, teks utuh); 50.000 karakter koneksi ditutup ±31 dtk tanpa hasil (batas waktu platform).
- `npm test` 29 berkas lulus (71 pemeriksaan API); build + deploy lulus; pilihan model dikembalikan ke `groq/openai/gpt-oss-20b`; user uji dihapus.

Keterbatasan: batas 100.000 hanya bisa dilayani penuh bila model selesai < ~30 dtk. Di atas ±15.000 karakter, Gemini sering 503/lambat sehingga hasil berasal dari mesin lokal (teks utuh, kualitas lokal). Untuk koreksi AI penuh pada 100.000 karakter perlu pemrosesan bertahap/background — belum dibuat.
