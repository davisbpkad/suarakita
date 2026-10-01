# 🎙️ SuaraKita — Voice-to-Text & Notulen Rapat Cerdas

Aplikasi web modern berbasis **Neobrutalism** untuk merekam suara secara real-time, mengubah audio menjadi teks (Speech-to-Text), melakukan koreksi cerdas terhadap kesalahan fonetik / salah dengar, dan merangkum hasil diskusi menjadi **Notulen Rapat (Minutes of Meeting - MoM)** terstruktur.

![Style](https://img.shields.io/badge/Style-Neobrutalism-yellow?style=for-the-badge)
![Vue 3](https://img.shields.io/badge/Frontend-Vue%203%20%2B%20Vite%20%2B%20Tailwind-42b883?style=for-the-badge)
![Backend](https://img.shields.io/badge/Backend-Node.js%20Express%20%2F%20Laravel-339933?style=for-the-badge)

---

## ✨ Fitur Utama

1. **🎙️ Voice to Text Real-Time**:
   - Perekaman langsung melalui mikrofon peramban dengan visualisasi audio wave interaktif.
   - Dukungan unggah berkas audio (`.mp3`, `.wav`, `.m4a`, `.ogg`, `.webm`).
   - Ekspor transkrip mentah ke format `.txt` dan `.doc`.

2. **🪄 Koreksi Transkrip Cerdas (Transcript Correction)**:
   - Mendeteksi dan memperbaiki salah dengar akibat kemiripan fonetik lisan bahasa Indonesia (contoh: *"apakah kita biaya hadir"* $\rightarrow$ *"apakah kita bisa hadir"*).
   - Mengubah kata rancu menjadi istilah rapat yang tepat (contoh: *"ruang setting"* $\rightarrow$ *"ruang meeting"*).
   - Normalisasi kata singkatan non-baku lisan (`yg`, `dgn`, `utk`, `sdh`, `blm`, `sy`, dll.) menjadi kata baku.
   - Pembersihan otomatis kata jeda ucapan (*filler words*: `eh`, `anu`, `um`) dan pengulangan/gagap.
   - Kapitalisasi akronim teknologi/bisnis secara otomatis (`QA`, `UI`, `UX`, `API`, `SOP`, `KPI`, `CEO`).

3. **📋 Notulen Rapat Terstruktur (Minutes of Meeting / MoM)**:
   - **📌 Topik / Konteks Pembicaraan**: Menentukan tema sentral rapat.
   - **📝 Ringkasan Hasil Rapat**: Narasi eksekutif menyeluruh yang padat dan komprehensif.
   - **💡 Poin-Poin Utama (Key Takeaways)**: Poin penting dan kendala yang dibahas.
   - **⚖️ Keputusan yang Diambil (Decisions Made)**: Konsensus yang disetujui bersama.
   - **🎯 Rencana Tindakan Lanjut (Action Items)**: Rincian tugas yang dilengkapi dengan Penanggung Jawab (**PIC**) dan Tenggat Waktu (**Deadline**).
   - Ekspor notulen ke format Markdown (`.md`) atau teks dokumen.

4. **⚡ Performa Ringan & Arsitektur Fleksibel (Ponytail Principle)**:
   - Ditenagai engine NLP lokal bawaan sub-milidetik ($< 2\text{ ms}$) tanpa beban server dan tanpa ketergantungan model berat.
   - Dukungan opsional API Key Gemini AI untuk analisis yang lebih mendalam jika dibutuhkan.

5. **🎨 Desain Neobrutalism Asli**:
   - Terinspirasi oleh [neobrutalism.dev](https://www.neobrutalism.dev/): border hitam tebal, drop-shadow tajam tanpa blur (*hard shadow*), warna aksen kontras, dan efek klik taktil.

---

## 🚀 Cara Menjalankan di Localhost

### 1. Prasyarat
- **Node.js** (versi 18 ke atas) & **npm**
- Browser modern (Google Chrome / Edge direkomendasikan untuk dukungan penuh Web Speech API)

### 2. Instalasi & Menjalankan Aplikasi
```bash
# 1. Clone repositori
git clone https://github.com/davisbpkad/suarakita.git
cd suarakita

# 2. Install dependensi
npm install

# 3. Kompilasi frontend asset (Vite)
npm run build

# 4. Jalankan server aplikasi
npm start
# atau
node server.js
```

Aplikasi dapat langsung diakses di browser pada:
👉 **`http://localhost:3000`**

---

## 🌐 Deploy Gratis ke Netlify (1-Klik)

Aplikasi ini sudah dilengkapi konfigurasi **Netlify Serverless Functions** (`netlify.toml` dan `netlify/functions/`), sehingga seluruh fitur (Voice to Text, Koreksi Transkrip, & Notulen Rapat) berjalan 100% otomatis dan gratis selamanya di Netlify tanpa server sleep!

1. Buka [Netlify Dashboard](https://app.netlify.com/) dan login menggunakan akun GitHub Anda.
2. Klik tombol **Add new site** $\rightarrow$ **Import an existing project**.
3. Pilih penyedia **GitHub** dan pilih repository **`davisbpkad/suarakita`**.
4. Netlify akan otomatis membaca file `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `public`
   - **Functions directory**: `netlify/functions`
5. Klik **Deploy suarakita**. Dalam 1–2 menit, website Anda sudah aktif di internet dengan HTTPS gratis!

---

## 📁 Struktur Direktori

```text
├── app/                  # Controller & Service (Laravel)
│   ├── Http/Controllers/
│   └── Services/         # TranscriptCorrectionService & MeetingNotesService
├── corrector.js          # Engine pembersihan & koreksi fonetik cerdas
├── meetingNotes.js       # Engine ekstraksi notulen rapat terstruktur
├── public/               # Asset statis & file terkompilasi Vite (public/build)
├── resources/
│   ├── css/app.css       # Tailwind CSS & Neobrutalism utilities
│   └── js/App.vue        # Komponen utama antarmuka pengguna (Vue 3)
├── routes/               # Definisi API routes
├── server.js             # Express server untuk localhost deployment
└── vite.config.js        # Konfigurasi bundler Vite
```

---

## 📄 Lisensi
Didistribusikan di bawah lisensi MIT.
