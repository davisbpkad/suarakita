# 🎙️ SuaraKita — Voice-to-Text & Notulen Rapat Cerdas

Aplikasi web modern untuk merekam suara secara real-time, mengubah audio menjadi teks (*Speech-to-Text*), melakukan koreksi cerdas terhadap kesalahan fonetik / salah dengar, dan merangkum hasil diskusi menjadi **Notulen Rapat (Minutes of Meeting - MoM)** terstruktur secara otomatis.

🌐 **Live Demo:** [https://suarakit.netlify.app](https://suarakit.netlify.app)

---

## ✨ Fitur Utama

1. **🎙️ Voice to Text Real-Time (Fokus Utama)**:
   - Perekaman suara langsung melalui mikrofon peramban dengan animasi *equalizer wave* responsif.
   - Pilihan bahasa dikte lisan: Bahasa Indonesia (`id-ID`), Bahasa Inggris (`en-US`), Bahasa Jepang (`ja-JP`), dan Bahasa Arab (`ar-SA`).
   - Tampilan *interim transcript streamer* langsung saat berbicara.
   - Lembar kerja transkrip yang bersih (dimulai dari teks kosong) dengan penghitung karakter dan kata otomatis.
   - **Paragraf Otomatis tiap 400 Kata**: transkrip dipecah menjadi blok agar mudah dipilah saat memeriksa salah input.
   - **Meter Level Mikrofon**: indikator level sinyal secara langsung, plus peringatan bila suara terlalu pelan untuk dikenali.
   - Tombol pengujian cepat (*presets*): **Rapat Tim** dan **Salah Dengar**.
   - Ekspor transkrip ke format teks biasa (`.txt`) dan Markdown (`.md`).

2. **🪄 Koreksi Transkrip Kontekstual Cerdas**:
   - **Perbaikan Fonetik Industri Teknologi & Bisnis**: Mengoreksi salah dengar fonetis umum secara otomatis (contoh: *"range roaming"* $\rightarrow$ *"brainstorming"*, *"convention Redmi"* $\rightarrow$ *"conversion rate"*, *"downline total"* $\rightarrow$ *"downtime total"*, *"bab/BAB"* $\rightarrow$ *"bug"*, *"untuk 4"* $\rightarrow$ *"Kuartal 4 (Q4)"*).
   - **Konteks Ruang Rapat & Operasional**: Mengoreksi *"biaya"* $\leftrightarrow$ *"bisa"*, *"ruang setting"* $\rightarrow$ *"ruang meeting"*, *"kordinasi"* $\rightarrow$ *"koordinasi"*, dsb.
   - **Pembersihan Interupsi & Uji Audio**: Menghapus kalimat uji mic (*"tes satu dua"*, *"cek mic"*, *"suara saya masuk gak?"*, *"sorry kepotong"*).
   - **Pembersihan Kata Jeda Lisan (*Filler Words*)**: Membersihkan jeda lisan (*eh*, *anu*, *um*, *hmm*) dan pengulangan/gagap bicara.
   - **Normalisasi Singkatan Non-Baku**: Mengubah singkatan lisan (*yg*, *dgn*, *utk*, *sdh*, *blm*, *sy*, dll.) menjadi kata baku.
   - **Pembersihan Kata di Luar Konteks** *(butuh Gemini AI)*: Membuang atau memperbaiki kata yang jelas tidak nyambung dengan topik percakapan — sisa salah dengar, noise, atau potongan suara lain. Aturan *ragu = pertahankan* mencegah kata sah ikut terhapus.
   - **Kapitalisasi Istilah Teknis**: Memastikan akronim standar tertulis rapi (*QA*, *UI/UX*, *REST API*, *SOP*, *KPI*, *CEO*, dll.).

3. **📋 Notulen Rapat Terstruktur (Minutes of Meeting / MoM)**:
   - **📌 Topik / Konteks Pembicaraan**: Ekstraksi topik sentral rapat secara akurat.
   - **📝 Ringkasan Hasil Rapat**: Ringkasan eksekutif padat dalam 2–3 kalimat.
   - **⚖️ Keputusan yang Diambil (Decisions Made)**: Poin keputusan murni yang disepakati bersama, secara otomatis memfilter perdebatan, argumen, dan dialog panjang.
   - Setiap butir ringkasan dan keputusan dilengkapi penanggung jawab (**PIC**) dan tenggat waktu bila disebutkan dalam rapat.
   - Ekspor notulen rapat langsung ke format Markdown (`.md`).

4. **⚡ Mesin Ganda: NLP Lokal Super Cepat & LLM Opsional**:
   - **Mesin NLP Lokal Bawaan**: Berjalan sub-milidetik ($< 2\text{ ms}$), 100% offline, gratis tanpa batas, dan menjaga privasi penuh. Dipakai otomatis saat API key kosong atau seluruh model gagal.
   - **Provider LLM Pilihan (Opsional)**: **Google Gemini**, **Groq**, **Cerebras**, dan **OpenRouter**. Ganti provider dan model dari menu Pengaturan AI, tanpa mengubah kode.
   - **Streaming (SSE)**: hasil koreksi dan notulen muncul bertahap selagi diproses — tidak lagi menunggu jawaban lengkap.
   - **Fallback berjenjang**: model dicoba berurutan sesuai daftar provider; bila semuanya gagal, aplikasi beralih ke NLP Lokal. Tidak pernah berhenti dengan layar kosong.

5. **🎨 Desain Modern, Hangat & Ringkas**:
   - Palet warna lembut dan elegan: warna dasar krem hangat (`#FBF7EF`), teks tinta gelap (`#1A1712`), dan aksen kuning telur (`#FFC832`).
   - Tombol berbentuk kapsul (*pill-shaped*), kartu dengan sudut membulat lebar (*rounded-2xl* / *rounded-[28px]*), serta elevasi hover yang halus.
   - Tooltip interaktif bertema senada pada setiap tombol aksi header (*Pengaturan AI, Download Transkrip, Salin Transkrip, Hapus Transkrip*).
   - Desain tata letak ringkas (*compact single-viewport*) yang nyaman digunakan di perangkat mobile maupun desktop tanpa perlu menggulir jauh ke bawah.

---

## 🚀 Cara Menjalankan di Localhost

### 1. Prasyarat
- **Node.js** (versi 18 atau yang lebih baru) & **npm**
- Peramban modern (Google Chrome, Microsoft Edge, atau browser Chromium lainnya untuk dukungan penuh Web Speech Recognition API)

### 2. Langkah Instalasi & Menjalankan

```bash
# 1. Clone repositori
git clone https://github.com/davisbpkad/suarakita.git
cd suarakita

# 2. Install dependensi
npm install

# 3. Kompilasi aset frontend
npm run build

# 4. Jalankan server lokal
npm start
# atau
node server.js
```

Aplikasi dapat langsung dibuka di peramban pada:
👉 **`http://localhost:3000`**

---

## 🌐 Deployment di Netlify

Aplikasi ini telah dikonfigurasi penuh untuk berjalan di **Netlify Serverless**:
- Konfigurasi build melalui `netlify.toml`.
- Backend endpoints diarahkan ke **Netlify Functions** (`netlify/functions/`):
  - `/api/status` $\rightarrow$ Fungsi pemantauan status
  - `/api/correct-transcript` $\rightarrow$ Fungsi koreksi transkrip
  - `/api/meeting-notes` $\rightarrow$ Fungsi pembuatan notulen rapat
- Aset frontend dikompilasi secara deterministik (`/build/assets/app.css` & `/build/assets/app.js`) dengan header MIME type yang tepat.

Langkah deploy mandiri:
1. Hubungkan repository GitHub ini ke akun Netlify Anda.
2. Netlify akan mendeteksi `netlify.toml` secara otomatis:
   - **Build command**: `npm run build`
   - **Publish directory**: `public`
   - **Functions directory**: `netlify/functions`
3. Klik **Deploy Site** — aplikasi akan langsung live dengan HTTPS aktif.

---

## 📁 Struktur Direktori

```text
├── lib/
│   ├── providers.json         # Katalog provider & model (dipakai server + frontend)
│   ├── providers.js           # Helper katalog provider (Node)
│   ├── llmClient.js           # Factory: provider -> client
│   ├── geminiClient.js        # Client Gemini (generateContent + streaming)
│   ├── openAiCompatibleClient.js  # Client Groq / Cerebras / OpenRouter
│   ├── httpSse.js             # Pembaca balasan SSE untuk Node
│   └── taggedOutput.mjs       # Parser keluaran bertanda (dipakai server + browser)
├── corrector.js           # Engine pembersihan & koreksi fonetik kontekstual
├── meetingNotes.js        # Engine penyusunan notulen rapat terstruktur
├── netlify.toml           # Konfigurasi deployment & serverless Netlify
├── netlify/
│   └── functions/         # Serverless functions (status, correct-transcript, meeting-notes)
│       └── _cors.js       # CORS terbatas origin sendiri (file berawalan _ tidak jadi fungsi)
├── public/                # Direktori publik & hasil build aset statis
│   ├── build/assets/      # Bundle app.css & app.js hasil kompilasi
│   └── index.html         # Entry point halaman web
├── resources/
│   ├── css/app.css        # Tailwind CSS & utilitas desain antarmuka
│   └── js/
│       ├── app.js         # Bootstrapping Vue 3
│       ├── App.vue        # Shell: state + orkestrasi komponen
│       ├── components/    # Komponen UI (AppHeader, TranscriptWorkspace, 3 modal)
│       └── lib/           # Logika non-UI (OOP)
│           ├── api/client.js                 # ApiClient: pemanggil endpoint backend
│           ├── audio/MicMonitor.js           # MicMonitor: level mic + deteksi suara pelan
│           ├── audio/level.mjs               # Matematika RMS level audio
│           ├── speech/SpeechRecognizer.js    # SpeechRecognizer: state sesi STT
│           ├── speech/languages.js           # Daftar bahasa STT
│           ├── text/transcript.mjs           # Penggabungan & pembersihan transkrip
│           ├── text/markdownInline.mjs       # Render badge/bold notulen (anti-XSS)
│           ├── utils/clipboard.js            # Helper salin ke clipboard
│           └── utils/download.js             # Helper unduh file
├── server.js              # Express server untuk eksekusi di lingkungan localhost
├── tests/                 # Self-check tanpa dependensi (node tests/transcript.test.mjs)
└── vite.config.mjs        # Konfigurasi bundler Vite
```

---

## 📄 Lisensi
Didistribusikan di bawah lisensi MIT.
