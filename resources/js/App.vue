<template>
  <div class="min-h-screen pb-16">
    <!-- TOP NAVIGATION BAR (AUTHENTIC NEOBRUTALISM) -->
    <header class="border-b-4 border-black bg-[#FFDE59] sticky top-0 z-30 shadow-[0_4px_0_0_#000]">
      <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <!-- Brand & Tagline -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000] flex items-center justify-center font-black text-xl">
            🎙️
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-black text-lg sm:text-xl tracking-tight text-black">SUARAKITA</span>
              <span class="neo-badge bg-[#FF6B6B] text-white text-[10px] py-0.5 px-2">V2 NEOBRUTAL</span>
            </div>
            <p class="text-[11px] font-bold text-black/80 hidden sm:block">Voice to Text, Koreksi Transkrip & Notulen Rapat</p>
          </div>
        </div>

        <!-- Top Right Actions -->
        <div class="flex items-center gap-2">
          <!-- Gemini AI Key Modal Button -->
          <button
            @click="showAiConfigModal = true"
            class="neo-btn bg-white px-3 py-1.5 text-xs font-bold gap-1.5"
            title="Pengaturan Kunci API Gemini (Opsional)"
          >
            <span>⚡ API AI</span>
            <span
              class="w-2.5 h-2.5 rounded-full border border-black inline-block"
              :class="hasApiKey ? 'bg-[#A3E635]' : 'bg-slate-300'"
            ></span>
          </button>

          <!-- Download Dropdown -->
          <div class="relative">
            <button
              @click="toggleDownloadMenu"
              class="neo-btn bg-[#38BDF8] text-black px-3 py-1.5 text-xs font-bold gap-1"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              <span>Download</span>
              <span class="text-[10px]">▼</span>
            </button>
            <div
              v-if="showDownloadMenu"
              class="absolute right-0 mt-2 w-44 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] rounded-xl py-1 z-40"
            >
              <button
                @click="downloadTranscript('txt')"
                class="w-full text-left px-3 py-2 text-xs font-bold hover:bg-[#FEF08A] flex items-center justify-between border-b border-black/10"
              >
                <span>Teks (.txt)</span>
                <span class="text-[10px] bg-black text-white px-1.5 py-0.5 rounded font-mono">TXT</span>
              </button>
              <button
                @click="downloadTranscript('md')"
                class="w-full text-left px-3 py-2 text-xs font-bold hover:bg-[#FEF08A] flex items-center justify-between"
              >
                <span>Markdown (.md)</span>
                <span class="text-[10px] bg-black text-white px-1.5 py-0.5 rounded font-mono">MD</span>
              </button>
            </div>
          </div>

          <!-- Salin Button -->
          <button
            @click="copyTranscript"
            class="neo-btn bg-white text-black px-3 py-1.5 text-xs font-bold gap-1"
            title="Salin transkrip ke clipboard"
          >
            <span>{{ copySuccess ? 'Tersalin! ✓' : 'Salin' }}</span>
          </button>

          <!-- Reset Button -->
          <button
            @click="clearTranscript"
            class="neo-btn bg-[#FF6B6B] text-white px-2.5 py-1.5 text-xs font-bold"
            title="Kosongkan transkrip"
          >
            Hapus
          </button>
        </div>
      </div>
    </header>

    <!-- MAIN CONTAINER -->
    <main class="max-w-6xl mx-auto px-4 pt-6 flex flex-col gap-6">

      <!-- HERO SECTION: THE VOICE TO TEXT RECORDING STATION (PRIMARY UX FOCUS) -->
      <section class="neo-box-yellow p-5 sm:p-7 relative overflow-hidden">
        <div class="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          
          <!-- Left Info & Language Select -->
          <div class="flex flex-col gap-3 text-center md:text-left">
            <div class="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span class="neo-badge bg-black text-white">FOKUS UTAMA: VOICE TO TEXT</span>
              <span
                class="neo-badge"
                :class="isRecording ? 'bg-[#FF6B6B] text-white animate-pulse' : 'bg-white text-black'"
              >
                {{ isRecording ? '● SEDANG MENDENGARKAN' : 'SIAP MEREKAM' }}
              </span>
            </div>
            
            <h1 class="text-2xl sm:text-3xl md:text-4xl font-black text-black leading-tight">
              Bicara Bebas, Kami Ubah Suara Jadi Teks Seketika.
            </h1>
            <p class="text-sm font-semibold text-black/80 max-w-xl">
              Gunakan mikrofon Anda untuk mendikte pembicaraan, rapat, atau catatan suara secara instan tanpa perlu mengetik manual.
            </p>

            <!-- Language Switcher Bar -->
            <div class="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
              <span class="text-xs font-black uppercase text-black">Bahasa Dikte:</span>
              <div class="inline-flex border-2 border-black rounded-xl bg-white shadow-[2px_2px_0px_0px_#000] p-1 gap-1">
                <button
                  v-for="lang in availableLanguages"
                  :key="lang.code"
                  @click="currentLanguage = lang.code"
                  class="px-2.5 py-1 text-xs font-extrabold rounded-lg transition-all"
                  :class="currentLanguage === lang.code ? 'bg-[#FFDE59] border border-black shadow-[1px_1px_0px_0px_#000]' : 'hover:bg-slate-100 text-black/70'"
                >
                  {{ lang.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- Right: Giant Tactile Record Button & Equalizer -->
          <div class="flex flex-col items-center gap-3 shrink-0">
            <!-- Recording Timer -->
            <div class="neo-badge bg-white text-black text-sm px-3 py-1 font-mono tracking-widest">
              ⏱️ {{ formattedRecordingTime }}
            </div>

            <!-- Big Pushable Record Button -->
            <button
              @click="toggleRecording"
              class="w-48 h-20 sm:w-56 sm:h-24 neo-btn flex flex-col items-center justify-center gap-1 transition-transform"
              :class="isRecording ? 'bg-[#FF6B6B] text-white animate-bounce' : 'bg-white hover:bg-[#FEF08A] text-black'"
            >
              <div class="flex items-center gap-2">
                <span class="text-2xl sm:text-3xl">{{ isRecording ? '⏹️' : '🎙️' }}</span>
                <span class="text-base sm:text-lg font-black uppercase tracking-tight">
                  {{ isRecording ? 'STOP REKAMAN' : 'MULAI REKAM' }}
                </span>
              </div>
              <span class="text-[10px] font-bold opacity-80">
                {{ isRecording ? 'Klik untuk menyelesaikan' : 'Tekan & mulai berbicara' }}
              </span>
            </button>

            <!-- Audio Wave Frequency Simulation -->
            <div v-if="isRecording" class="flex items-end justify-center gap-1.5 h-8 px-4 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000]">
              <span class="w-1.5 bg-[#FF6B6B] border border-black rounded-full animate-soundwave-1"></span>
              <span class="w-1.5 bg-black border border-black rounded-full animate-soundwave-2"></span>
              <span class="w-1.5 bg-[#FF6B6B] border border-black rounded-full animate-soundwave-3"></span>
              <span class="w-1.5 bg-black border border-black rounded-full animate-soundwave-4"></span>
              <span class="w-1.5 bg-[#FF6B6B] border border-black rounded-full animate-soundwave-5"></span>
            </div>
          </div>

        </div>

        <!-- Live Interim Speech Streamer Banner -->
        <div v-if="isRecording && interimSpeech" class="mt-4 p-3 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000] flex items-center gap-3">
          <span class="w-3 h-3 rounded-full bg-[#FF6B6B] animate-ping shrink-0"></span>
          <p class="text-xs font-bold text-black italic truncate">
            "{{ interimSpeech }}"
          </p>
        </div>
      </section>

      <!-- PRESET BUTTONS (FAST 1-CLICK TESTING) -->
      <section class="flex flex-wrap items-center gap-2">
        <span class="text-xs font-black uppercase text-black flex items-center gap-1">
          <span>⚡ Contoh Transkrip:</span>
        </span>
        <button
          @click="loadPreset('mom')"
          class="neo-btn bg-[#BAE6FD] hover:bg-[#7DD3FC] text-black text-xs px-3 py-1.5 font-bold"
        >
          📋 Rapat Tim (Uji Notulen)
        </button>
        <button
          @click="loadPreset('correction')"
          class="neo-btn bg-[#FEF08A] hover:bg-[#FDE047] text-black text-xs px-3 py-1.5 font-bold"
        >
          🎯 Salah Dengar (biaya/setting/kordinasi)
        </button>
      </section>

      <!-- TRANSCRIPT WORKSPACE (NEOBRUTALISM LEGAL PAD / TEXTAREA) -->
      <section class="neo-box p-5 flex flex-col gap-3">
        <div class="flex items-center justify-between border-b-2 border-black pb-2">
          <div class="flex items-center gap-2">
            <span class="text-base">📝</span>
            <h2 class="text-sm font-black uppercase tracking-wide text-black">Lembar Hasil Transkripsi</h2>
          </div>
          <div class="flex items-center gap-2">
            <span class="neo-badge bg-[#FAF5EF] text-black text-[11px]">{{ charCount }} Karakter</span>
            <span class="neo-badge bg-[#FAF5EF] text-black text-[11px]">{{ wordCount }} Kata</span>
          </div>
        </div>

        <textarea
          v-model="transcriptText"
          rows="8"
          placeholder="Mulai rekam suara atau ketik transkrip Anda di sini..."
          class="w-full bg-[#FFFDF9] border-2 border-black rounded-xl p-4 text-base font-semibold text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black shadow-[3px_3px_0px_0px_#000] resize-y leading-relaxed font-sans"
        ></textarea>
      </section>

      <!-- INTELLIGENCE ACTION DOCK: 2 POWER TOOLS -->
      <section class="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        <!-- CARD 1: KOREKSI TRANSKRIP -->
        <div class="neo-box p-6 flex flex-col justify-between gap-5 bg-[#FEF08A]">
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <span class="text-3xl">🪄</span>
              <span class="neo-badge bg-black text-white text-[10px]">PEMBERSIH KATA</span>
            </div>
            <h3 class="text-xl font-black text-black">Perbaiki Transkrip Suara</h3>
            <p class="text-xs font-semibold text-black/80 leading-relaxed">
              Secara cerdas membersihkan kata jeda (*eh, anu*), kata berulang/gagap, memperbaiki kata yang salah tangkap akibat salah dengar fonetik (*biaya/bisa, setting/meeting, kordinasi*), serta merapikan tata bahasa dan tanda baca.
            </p>
          </div>
          <button
            @click="runCorrection"
            :disabled="loadingAction === 'correction'"
            class="neo-btn bg-white hover:bg-black hover:text-white text-black text-sm font-black py-3 px-4 w-full gap-2 shadow-[4px_4px_0px_0px_#000]"
          >
            <span v-if="loadingAction === 'correction'">Memproses Perbaikan...</span>
            <span v-else>Koreksi & Rapikan Teks Sekarang →</span>
          </button>
        </div>

        <!-- CARD 2: NOTULEN RAPAT (MOM) -->
        <div class="neo-box p-6 flex flex-col justify-between gap-5 bg-[#BAE6FD]">
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <span class="text-3xl">📋</span>
              <span class="neo-badge bg-black text-white text-[10px]">RINGKASAN EKSEKUTIF</span>
            </div>
            <h3 class="text-xl font-black text-black">Notulen Rapat (MoM)</h3>
            <p class="text-xs font-semibold text-black/80 leading-relaxed">
              Meringkas hasil pembicaraan menjadi notulen eksekutif lengkap: Topik Utama Rapat, Ringkasan Hasil Rapat menyeluruh, Poin-Poin Utama, Keputusan Resmi, serta Rencana Tindakan Lanjut dengan penanggung jawab (PIC) & tenggat.
            </p>
          </div>
          <button
            @click="runMeetingNotes"
            :disabled="loadingAction === 'mom'"
            class="neo-btn bg-white hover:bg-black hover:text-white text-black text-sm font-black py-3 px-4 w-full gap-2 shadow-[4px_4px_0px_0px_#000]"
          >
            <span v-if="loadingAction === 'mom'">Meringkas Rapat...</span>
            <span v-else>Buat Notulen Rapat Lengkap →</span>
          </button>
        </div>

      </section>

    </main>

    <!-- ======================================================== -->
    <!-- MODAL 1: KOREKSI TRANSKRIP (TRANSCRIPT CORRECTION) -->
    <!-- ======================================================== -->
    <div
      v-if="showCorrectionModal"
      class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div class="neo-box bg-[#FAF5EF] max-w-3xl w-full p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between border-b-2 border-black pb-3">
          <div class="flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-lg bg-[#FEF08A] border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center text-sm font-black">
              🪄
            </span>
            <div>
              <h3 class="text-base font-black text-black">Hasil Koreksi Transkrip</h3>
              <p class="text-xs font-semibold text-black/70">Pembersihan salah dengar, filler words, dan tanda baca</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="neo-badge bg-white text-black text-[10px]">
              {{ correctionData.method === 'gemini_ai' ? '✨ Gemini AI' : '⚡ NLP Lokal' }}
            </span>
            <button @click="showCorrectionModal = false" class="neo-btn bg-white px-2.5 py-1 text-xs">✕</button>
          </div>
        </div>

        <!-- Side-by-Side Comparison -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
          <!-- Raw Text -->
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <span class="font-black text-black">Sebelum (Mentah):</span>
              <span class="neo-badge bg-[#FF6B6B] text-white text-[10px]">Asli</span>
            </div>
            <div class="p-3 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000] min-h-[120px] whitespace-pre-wrap leading-relaxed">
              {{ correctionData.originalText }}
            </div>
          </div>

          <!-- Corrected Text -->
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <span class="font-black text-black">Sesudah (Terkoreksi):</span>
              <span class="neo-badge bg-[#A3E635] text-black text-[10px]">Bersih</span>
            </div>
            <div class="p-3 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000] min-h-[120px] whitespace-pre-wrap font-bold text-black leading-relaxed">
              {{ correctionData.correctedText }}
            </div>
          </div>
        </div>

        <!-- Changes Applied List -->
        <div class="p-3 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000] text-xs">
          <h4 class="font-black text-black mb-2 flex items-center gap-1.5">
            <span>✓</span> Perbaikan yang Diterapkan:
          </h4>
          <ul class="flex flex-col gap-1.5 pl-4 list-disc text-black/90 font-bold">
            <li v-for="(change, idx) in correctionData.changes" :key="idx">{{ change }}</li>
          </ul>
        </div>

        <!-- Footer Actions -->
        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t-2 border-black">
          <button @click="copyText(correctionData.correctedText)" class="neo-btn bg-white text-black text-xs px-3 py-2 font-bold">
            Salin Hasil
          </button>
          <div class="flex items-center gap-2">
            <button @click="showCorrectionModal = false" class="neo-btn bg-white text-black text-xs px-3 py-2">
              Batal
            </button>
            <button @click="applyCorrection" class="neo-btn bg-[#A3E635] text-black text-xs px-4 py-2 font-black">
              ✓ Gunakan Hasil Koreksi
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL 2: NOTULEN RAPAT (MINUTES OF MEETING / MOM) -->
    <!-- ======================================================== -->
    <div
      v-if="showMomModal"
      class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div class="neo-box bg-[#FAF5EF] max-w-3xl w-full p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between border-b-2 border-black pb-3">
          <div class="flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-lg bg-[#BAE6FD] border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center text-sm font-black">
              📋
            </span>
            <div>
              <h3 class="text-base font-black text-black">Notulen Rapat (Minutes of Meeting)</h3>
              <p class="text-xs font-semibold text-black/70">Ringkasan hasil, topik, keputusan & penugasan</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="neo-badge bg-white text-black text-[10px]">
              {{ momData.method === 'gemini_ai' ? '✨ Gemini AI' : '⚡ NLP Lokal' }}
            </span>
            <button @click="showMomModal = false" class="neo-btn bg-white px-2.5 py-1 text-xs">✕</button>
          </div>
        </div>

        <!-- 5 Structured Sections -->
        <div class="flex flex-col gap-4 text-xs">
          <!-- Section 1: Topik -->
          <div class="p-4 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000] flex flex-col gap-1.5">
            <div class="font-black text-black uppercase tracking-wider flex items-center gap-1.5">
              <span>📌</span> Topik / Konteks Pembicaraan:
            </div>
            <p class="text-sm font-black text-black">{{ momData.topic }}</p>
          </div>

          <!-- Section 2: Ringkasan Hasil Rapat (Executive Summary) -->
          <div class="p-4 bg-[#FEF08A] border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000] flex flex-col gap-1.5">
            <div class="font-black text-black uppercase tracking-wider flex items-center gap-1.5">
              <span>📝</span> Ringkasan Hasil Rapat:
            </div>
            <p class="text-xs font-bold text-black leading-relaxed">{{ momData.summary }}</p>
          </div>

          <!-- Section 3: Poin Kunci -->
          <div class="p-4 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000] flex flex-col gap-2">
            <div class="font-black text-black uppercase tracking-wider flex items-center gap-1.5">
              <span>💡</span> Poin-Poin Utama (Key Takeaways):
            </div>
            <ul class="flex flex-col gap-1.5 pl-4 list-disc font-bold text-black">
              <li v-for="(point, idx) in momData.keyTakeaways" :key="idx">{{ point }}</li>
            </ul>
          </div>

          <!-- Section 4: Keputusan -->
          <div class="p-4 bg-[#BBF7D0] border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000] flex flex-col gap-2">
            <div class="font-black text-black uppercase tracking-wider flex items-center gap-1.5">
              <span>⚖️</span> Keputusan yang Diambil (Decisions Made):
            </div>
            <ul class="flex flex-col gap-1.5 pl-4 list-disc font-black text-black">
              <li v-for="(dec, idx) in momData.decisions" :key="idx">{{ dec }}</li>
            </ul>
          </div>

          <!-- Section 5: Action Items (Jika Ada) -->
          <div v-if="momData.actionItems && momData.actionItems.length" class="p-4 bg-[#DDD6FE] border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#000] flex flex-col gap-2">
            <div class="font-black text-black uppercase tracking-wider flex items-center gap-1.5">
              <span>🎯</span> Rencana Tindakan Lanjut (Action Items):
            </div>
            <div class="flex flex-col gap-2">
              <div
                v-for="(act, idx) in momData.actionItems"
                :key="idx"
                class="p-2.5 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000] flex flex-wrap items-center justify-between gap-2"
              >
                <div class="flex items-center gap-2">
                  <span class="font-black">✓</span>
                  <span class="font-bold text-black">{{ act.task }}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="neo-badge bg-[#BAE6FD] text-black text-[10px]">PIC: {{ act.pic }}</span>
                  <span class="neo-badge bg-[#FEF08A] text-black text-[10px]">Tenggat: {{ act.deadline }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t-2 border-black">
          <button @click="copyText(momData.rawMarkdown)" class="neo-btn bg-white text-black text-xs px-3 py-2 font-bold">
            Salin Notulen
          </button>
          <div class="flex items-center gap-2">
            <button @click="showMomModal = false" class="neo-btn bg-white text-black text-xs px-3 py-2">
              Tutup
            </button>
            <button @click="downloadMomMarkdown" class="neo-btn bg-[#BAE6FD] text-black text-xs px-4 py-2 font-black">
              Download Notulen (.md)
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL 3: PENGATURAN API KEY GEMINI (OPSIONAL) -->
    <!-- ======================================================== -->
    <div
      v-if="showAiConfigModal"
      class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
    >
      <div class="neo-box bg-[#FAF5EF] max-w-md w-full p-6 flex flex-col gap-4">
        <div class="flex items-center justify-between border-b-2 border-black pb-2">
          <div class="flex items-center gap-2 font-black text-sm">
            <span>⚡</span> Pengaturan Gemini API Key (Opsional)
          </div>
          <button @click="showAiConfigModal = false" class="neo-btn bg-white px-2 py-0.5 text-xs">✕</button>
        </div>

        <p class="text-xs font-semibold text-black/80 leading-relaxed">
          Secara default, aplikasi menggunakan <b>Mesin NLP Cerdas Lokal</b> (100% offline, instan & bebas biaya). Jika Anda ingin analisis semantik LLM tingkat lanjut, masukkan kunci API Gemini di bawah:
        </p>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-black uppercase text-black">Gemini API Key:</label>
          <input
            v-model="geminiApiKey"
            type="password"
            placeholder="AIzaSy..."
            class="neo-input font-mono text-xs"
          />
          <span class="text-[10px] font-bold text-black/60">Tersimpan aman di browser Anda (localStorage).</span>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t-2 border-black">
          <button @click="removeApiKey" class="neo-btn bg-[#FF6B6B] text-white text-xs px-3 py-1.5 font-bold">
            Hapus Kunci
          </button>
          <button @click="saveApiKey" class="neo-btn bg-[#FFDE59] text-black text-xs px-4 py-1.5 font-black">
            Simpan
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

// -------------------------------------------------------------
// STATE: TRANSCRIPT WORKSPACE
// -------------------------------------------------------------
const transcriptText = ref(
  'Selamat pagi rekan-rekan semua. Hari ini kita meeting evaluasi peluncuran web kita. Desain antarmuka sudah selesai diuji dan responnya sangat positif. Kita sepakat untuk rilis jumat besok. Budi bisa siapkan server dan konfigurasi domain paling lambat besok sore. Davis akan menyelesaikan perbaikan bug sebelum jam lima sore. Tim QA diputuskan untuk pengujian akhir lusa pagi.'
);

const copySuccess = ref(false);
const showDownloadMenu = ref(false);

const wordCount = computed(() => {
  const t = transcriptText.value.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
});

const charCount = computed(() => transcriptText.value.length);

// -------------------------------------------------------------
// STATE: VOICE TO TEXT (STT) - HERO FOCUS
// -------------------------------------------------------------
const isRecording = ref(false);
const interimSpeech = ref('');
const recordingSeconds = ref(0);
let timerInterval = null;
let recognition = null;

const availableLanguages = [
  { code: 'id-ID', label: '🇮🇩 ID' },
  { code: 'en-US', label: '🇺🇸 EN' },
  { code: 'ja-JP', label: '🇯🇵 JA' },
  { code: 'ar-SA', label: '🇸🇦 AR' }
];
const currentLanguage = ref('id-ID');

const formattedRecordingTime = computed(() => {
  const mins = Math.floor(recordingSeconds.value / 60);
  const secs = recordingSeconds.value % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(mins)}:${pad(secs)}`;
});

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('SpeechRecognition API not available in this browser.');
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = currentLanguage.value;

  recognition.onresult = (event) => {
    let interim = '';
    let finalTranscripts = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscripts += transcript + ' ';
      } else {
        interim += transcript;
      }
    }

    interimSpeech.value = interim;

    if (finalTranscripts) {
      if (transcriptText.value && !transcriptText.value.endsWith(' ')) {
        transcriptText.value += ' ';
      }
      transcriptText.value += finalTranscripts;
    }
  };

  recognition.onerror = (event) => {
    console.warn('Speech recognition error:', event.error);
    if (event.error !== 'no-speech') {
      stopRecording();
    }
  };

  recognition.onend = () => {
    if (isRecording.value) {
      try {
        recognition.lang = currentLanguage.value;
        recognition.start();
      } catch (e) {
        stopRecording();
      }
    }
  };
}

function toggleRecording() {
  if (isRecording.value) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Browser Anda belum mendukung Web Speech Recognition API. Silakan gunakan Google Chrome, Edge, atau browser Chromium modern.');
    return;
  }

  try {
    if (!recognition) initSpeechRecognition();
    recognition.lang = currentLanguage.value;
    recognition.start();
    isRecording.value = true;
    recordingSeconds.value = 0;
    interimSpeech.value = '';

    timerInterval = setInterval(() => {
      recordingSeconds.value++;
    }, 1000);
  } catch (err) {
    console.error('Error starting recognition:', err);
    isRecording.value = false;
  }
}

function stopRecording() {
  isRecording.value = false;
  interimSpeech.value = '';
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (recognition) {
    try {
      recognition.stop();
    } catch (e) {}
  }
}

// -------------------------------------------------------------
// STATE: API KEY & ACTION STATE
// -------------------------------------------------------------
const showAiConfigModal = ref(false);
const geminiApiKey = ref('');
const hasApiKey = computed(() => Boolean(geminiApiKey.value && geminiApiKey.value.trim()));
const loadingAction = ref(null);

onMounted(() => {
  geminiApiKey.value = localStorage.getItem('gemini_api_key') || '';
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
  if (recognition) {
    try { recognition.stop(); } catch (e) {}
  }
});

function saveApiKey() {
  localStorage.setItem('gemini_api_key', geminiApiKey.value.trim());
  showAiConfigModal.value = false;
}

function removeApiKey() {
  geminiApiKey.value = '';
  localStorage.removeItem('gemini_api_key');
  showAiConfigModal.value = false;
}

// -------------------------------------------------------------
// PRESETS
// -------------------------------------------------------------
function loadPreset(type) {
  if (type === 'mom') {
    transcriptText.value =
      'Selamat pagi rekan-rekan semua. Hari ini kita meeting evaluasi peluncuran web kita. Desain antarmuka sudah selesai diuji dan responnya sangat positif. Kita sepakat untuk rilis jumat besok. Budi bisa siapkan server dan konfigurasi domain paling lambat besok sore. Davis akan menyelesaikan perbaikan bug sebelum jam lima sore. Tim QA diputuskan untuk pengujian akhir lusa pagi.';
  } else if (type === 'correction') {
    transcriptText.value =
      'eh anu apakah kita biaya hadir di ruang setting besok pagi jam sembilan saya saya mau bahas hasil kordinasi dgn tim';
  }
}

// -------------------------------------------------------------
// INTELLIGENCE 1: KOREKSI TRANSKRIP
// -------------------------------------------------------------
const showCorrectionModal = ref(false);
const correctionData = ref({
  originalText: '',
  correctedText: '',
  changes: [],
  method: 'nlp_builtin'
});

async function runCorrection() {
  const text = transcriptText.value.trim();
  if (!text) {
    alert('Silakan masukkan atau rekam transkrip terlebih dahulu.');
    return;
  }

  loadingAction.value = 'correction';
  try {
    const res = await fetch('/api/correct-transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, apiKey: geminiApiKey.value })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    correctionData.value = data;
    showCorrectionModal.value = true;
  } catch (err) {
    alert('Terjadi kesalahan saat mengoreksi teks: ' + err.message);
  } finally {
    loadingAction.value = null;
  }
}

function applyCorrection() {
  if (correctionData.value.correctedText) {
    transcriptText.value = correctionData.value.correctedText;
  }
  showCorrectionModal.value = false;
}

// -------------------------------------------------------------
// INTELLIGENCE 2: NOTULEN RAPAT (MOM)
// -------------------------------------------------------------
const showMomModal = ref(false);
const momData = ref({
  topic: '',
  summary: '',
  keyTakeaways: [],
  decisions: [],
  actionItems: [],
  rawMarkdown: '',
  method: 'nlp_builtin'
});

async function runMeetingNotes() {
  const text = transcriptText.value.trim();
  if (!text) {
    alert('Silakan masukkan atau rekam transkrip terlebih dahulu.');
    return;
  }

  loadingAction.value = 'mom';
  try {
    const res = await fetch('/api/meeting-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, apiKey: geminiApiKey.value })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    momData.value = data;
    showMomModal.value = true;
  } catch (err) {
    alert('Terjadi kesalahan saat memproses Notulen Rapat: ' + err.message);
  } finally {
    loadingAction.value = null;
  }
}

function downloadMomMarkdown() {
  if (!momData.value.rawMarkdown) return;
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const filename = `notulen_rapat_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.md`;
  triggerDownload(momData.value.rawMarkdown, filename, 'text/markdown;charset=utf-8');
}

// -------------------------------------------------------------
// UTILITY: COPY, DOWNLOAD & CLEAR
// -------------------------------------------------------------
function toggleDownloadMenu() {
  showDownloadMenu.value = !showDownloadMenu.value;
}

function clearTranscript() {
  transcriptText.value = '';
}

async function copyText(str) {
  try {
    await navigator.clipboard.writeText(str);
    alert('Teks berhasil disalin ke clipboard!');
  } catch (e) {
    console.warn('Copy failed:', e);
  }
}

async function copyTranscript() {
  const text = transcriptText.value.trim();
  if (!text) {
    alert('Teks transkrip masih kosong.');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    copySuccess.value = true;
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
  } catch (e) {
    console.warn('Copy failed:', e);
  }
}

function downloadTranscript(type) {
  showDownloadMenu.value = false;
  const text = transcriptText.value.trim();
  if (!text) {
    alert('Teks transkrip masih kosong.');
    return;
  }
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;

  if (type === 'txt') {
    triggerDownload(text, `transkrip_${timestamp}.txt`, 'text/plain;charset=utf-8');
  } else {
    const md = `# Transkrip Suara\n\n- **Tanggal:** ${now.toLocaleString('id-ID')}\n- **Jumlah Kata:** ${wordCount.value}\n\n---\n\n${text}\n`;
    triggerDownload(md, `transkrip_${timestamp}.md`, 'text/markdown;charset=utf-8');
  }
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>
