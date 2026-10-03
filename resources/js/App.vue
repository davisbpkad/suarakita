<template>
  <div class="min-h-screen flex flex-col">

    <!-- ====== HEADER (yolkwork-style: clean, sticky, pill CTA) ====== -->
    <header class="wrap sticky top-0 z-30 flex items-center justify-between py-4 lg:py-5 bg-[var(--color-bg)]/95 backdrop-blur-sm">
      <!-- Brand -->
      <a href="/" class="group inline-flex items-center gap-2.5">
        <span class="w-[22px] h-[22px] rounded-full bg-[var(--color-yolk)] group-hover:scale-110 transition-transform duration-300"></span>
        <span class="font-extrabold text-xl tracking-[-0.04em] text-[var(--color-ink)]">suarakita</span>
      </a>

      <!-- Right Actions -->
      <div class="flex items-center gap-2">
        <!-- AI Config -->
        <div class="relative group">
          <button
            @click="showAiConfigModal = true"
            class="btn-icon"
            aria-label="Pengaturan AI"
          >
            <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
          </button>
          <!-- Status dot for API key -->
          <span
            v-if="hasApiKey"
            class="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--color-bg)] pointer-events-none"
          ></span>
          <!-- Tooltip label -->
          <div class="theme-tooltip" role="tooltip">
            <span class="w-1.5 h-1.5 rounded-full bg-[var(--color-yolk)] shrink-0"></span>
            <span>Pengaturan AI</span>
          </div>
        </div>

        <!-- Download -->
        <div class="relative group">
          <button
            @click="toggleDownloadMenu"
            class="btn-icon"
            aria-label="Download transkrip"
          >
            <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          </button>
          <!-- Tooltip label (hidden when dropdown menu is open) -->
          <div v-if="!showDownloadMenu" class="theme-tooltip" role="tooltip">
            <span class="w-1.5 h-1.5 rounded-full bg-[var(--color-yolk)] shrink-0"></span>
            <span>Download Transkrip</span>
          </div>
          <div
            v-if="showDownloadMenu"
            class="absolute right-0 mt-2 w-44 bg-white border border-[var(--color-line)] rounded-2xl py-2 z-40 shadow-xl"
          >
            <button
              @click="downloadTranscript('txt')"
              class="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-[var(--color-cream)] flex items-center justify-between"
            >
              <span>Teks (.txt)</span>
              <span class="tag bg-[var(--color-cream)] text-[var(--color-muted)] text-xs py-0.5 px-2">TXT</span>
            </button>
            <button
              @click="downloadTranscript('md')"
              class="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-[var(--color-cream)] flex items-center justify-between"
            >
              <span>Markdown (.md)</span>
              <span class="tag bg-[var(--color-cream)] text-[var(--color-muted)] text-xs py-0.5 px-2">MD</span>
            </button>
          </div>
        </div>

        <!-- Copy -->
        <div class="relative group">
          <button
            @click="copyTranscript"
            class="btn-icon"
            aria-label="Salin transkrip"
          >
            <svg v-if="!copySuccess" class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>
            <svg v-else class="w-[18px] h-[18px] text-green-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          </button>
          <!-- Tooltip label -->
          <div class="theme-tooltip" role="tooltip">
            <span class="w-1.5 h-1.5 rounded-full" :class="copySuccess ? 'bg-emerald-400' : 'bg-[var(--color-yolk)]'"></span>
            <span>{{ copySuccess ? 'Tersalin ke Clipboard!' : 'Salin Transkrip' }}</span>
          </div>
        </div>

        <!-- Clear -->
        <div class="relative group">
          <button
            @click="clearTranscript"
            class="btn-icon hover:text-red-600"
            aria-label="Hapus transkrip"
          >
            <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
          </button>
          <!-- Tooltip label (anchored right on mobile to avoid overflow) -->
          <div class="theme-tooltip theme-tooltip-right" role="tooltip">
            <span class="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>
            <span>Hapus Transkrip</span>
          </div>
        </div>
      </div>
    </header>

    <!-- ====== MAIN CONTENT (single-viewport, compact layout) ====== -->
    <main class="wrap flex-1 flex flex-col gap-6 pb-8 lg:pb-12">

      <!-- HERO SECTION: Voice Recorder (compact, centered, yolkwork-style) -->
      <section class="flex flex-col items-center text-center gap-5 pt-2 lg:pt-4">
        <!-- Status Pill -->
        <div
          class="tag border border-[var(--color-line)] bg-white text-sm"
          :class="isRecording ? 'border-red-300 bg-red-50' : ''"
        >
          <span v-if="isRecording" class="live-dot"></span>
          <span v-else class="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
          <span class="font-semibold" :class="isRecording ? 'text-red-600' : 'text-[var(--color-muted)]'">
            {{ isRecording ? 'Sedang mendengarkan...' : 'Siap merekam' }}
          </span>
          <span v-if="isRecording" class="font-mono text-[var(--color-muted)] text-xs ml-1">{{ formattedRecordingTime }}</span>
        </div>

        <!-- Headline (Rata tengah & menyambung satu baris) -->
        <h1 class="display text-[clamp(1.35rem,3.6vw,2.75rem)] text-center w-full max-w-4xl mx-auto sm:whitespace-nowrap">
          <span>Bicara bebas, </span>
          <span class="bg-[var(--color-yolk)] -mx-1 px-1.5 rounded-lg box-decoration-clone">jadi teks instan.</span>
        </h1>
        <p class="text-[var(--color-muted)] text-base lg:text-lg max-w-lg leading-relaxed">
          Rekam suara, koreksi transkrip, dan buat notulen rapat — semua dalam satu tempat.
        </p>

        <!-- Record Button + Language Selector (side by side) -->
        <div class="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button
            @click="toggleRecording"
            class="btn-primary gap-2.5 text-base px-8 py-4"
            :class="isRecording
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-[var(--color-yolk)] text-[var(--color-ink)]'"
          >
            <span class="text-xl">{{ isRecording ? '⏹' : '🎙️' }}</span>
            <span>{{ isRecording ? 'Stop Rekam' : 'Mulai Rekam' }}</span>
          </button>

          <!-- Language pills -->
          <div class="flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-white p-1">
            <button
              v-for="lang in availableLanguages"
              :key="lang.code"
              @click="currentLanguage = lang.code"
              class="px-3 py-1.5 text-sm font-semibold rounded-full transition-all duration-200"
              :class="currentLanguage === lang.code
                ? 'bg-[var(--color-yolk)] text-[var(--color-ink)]'
                : 'text-[var(--color-muted)] hover:bg-[var(--color-cream)]'"
            >
              {{ lang.label }}
            </button>
          </div>
        </div>

        <!-- Sound wave (only while recording) -->
        <div v-if="isRecording" class="flex items-end justify-center gap-1.5 h-8 px-6 py-1.5 bg-white border border-[var(--color-line)] rounded-full">
          <span class="w-1 rounded-full bg-red-400 animate-soundwave-1"></span>
          <span class="w-1 rounded-full bg-[var(--color-ink)] animate-soundwave-2"></span>
          <span class="w-1 rounded-full bg-red-400 animate-soundwave-3"></span>
          <span class="w-1 rounded-full bg-[var(--color-ink)] animate-soundwave-4"></span>
          <span class="w-1 rounded-full bg-red-400 animate-soundwave-5"></span>
        </div>

        <!-- Interim speech banner -->
        <div v-if="isRecording && interimSpeech" class="flex items-center gap-3 px-5 py-3 bg-white border border-[var(--color-line)] rounded-2xl max-w-xl w-full shadow-sm">
          <span class="live-dot"></span>
          <p class="text-sm text-[var(--color-muted)] italic truncate">"{{ interimSpeech }}"</p>
        </div>
      </section>

      <!-- TRANSCRIPT WORKSPACE (textarea + presets + stats) -->
      <section class="card p-5 sm:p-7 flex flex-col gap-4">
        <!-- Header bar -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="text-lg">📝</span>
            <h2 class="text-sm font-bold text-[var(--color-ink)]">Transkrip</h2>
          </div>
          <div class="flex items-center gap-2">
            <span class="tag bg-[var(--color-cream)] text-[var(--color-muted)] text-xs">{{ charCount }} karakter</span>
            <span class="tag bg-[var(--color-cream)] text-[var(--color-muted)] text-xs">{{ wordCount }} kata</span>
          </div>
        </div>

        <!-- Preset buttons -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-semibold text-[var(--color-muted)]">Contoh:</span>
          <button
            @click="loadPreset('mom')"
            class="tag bg-[var(--color-cream)] hover:bg-[var(--color-yolk)] text-[var(--color-ink)] text-xs cursor-pointer transition-colors duration-200"
          >
            📋 Rapat Tim
          </button>
          <button
            @click="loadPreset('correction')"
            class="tag bg-[var(--color-cream)] hover:bg-[var(--color-yolk)] text-[var(--color-ink)] text-xs cursor-pointer transition-colors duration-200"
          >
            🎯 Salah Dengar
          </button>
        </div>

        <!-- Textarea -->
        <textarea
          v-model="transcriptText"
          rows="6"
          placeholder="Mulai rekam suara atau ketik transkrip di sini..."
          class="input-clean resize-y leading-relaxed min-h-[120px]"
        ></textarea>
      </section>

      <!-- INTELLIGENCE DOCK: 2 Feature Cards (side by side, yolkwork card style) -->
      <section class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <!-- CARD 1: Koreksi Transkrip -->
        <div class="card p-7 flex flex-col justify-between gap-5 group/card hover:border-[var(--color-yolk)]">
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span class="text-2xl">🪄</span>
              <span class="tag bg-[var(--color-yolk)] text-[var(--color-ink)] text-xs font-bold">Pembersih Kata</span>
            </div>
            <h3 class="text-xl font-bold text-[var(--color-ink)]">Koreksi Transkrip</h3>
            <p class="text-sm text-[var(--color-muted)] leading-relaxed">
              Membersihkan kata jeda, kata berulang, memperbaiki salah dengar fonetik, serta merapikan tata bahasa dan tanda baca.
            </p>
          </div>
          <button
            @click="runCorrection"
            :disabled="loadingAction === 'correction'"
            class="btn-primary w-full"
          >
            <span v-if="loadingAction === 'correction'">Memproses...</span>
            <span v-else>Koreksi Teks →</span>
          </button>
        </div>

        <!-- CARD 2: Notulen Rapat -->
        <div class="card p-7 flex flex-col justify-between gap-5 group/card hover:border-[var(--color-yolk)]">
          <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span class="text-2xl">📋</span>
              <span class="tag bg-blue-100 text-blue-700 text-xs font-bold">Ringkasan Eksekutif</span>
            </div>
            <h3 class="text-xl font-bold text-[var(--color-ink)]">Notulen Rapat</h3>
            <p class="text-sm text-[var(--color-muted)] leading-relaxed">
              Meringkas pembicaraan menjadi notulen lengkap: topik, ringkasan, poin utama, keputusan, dan rencana tindakan.
            </p>
          </div>
          <button
            @click="runMeetingNotes"
            :disabled="loadingAction === 'mom'"
            class="btn-outline w-full"
          >
            <span v-if="loadingAction === 'mom'">Meringkas...</span>
            <span v-else>Buat Notulen →</span>
          </button>
        </div>
      </section>

    </main>

    <!-- ====== FOOTER ====== -->
    <footer class="wrap py-6 flex items-center justify-between text-sm text-[var(--color-muted)]">
      <a href="/" class="group inline-flex items-center gap-2">
        <span class="w-[14px] h-[14px] rounded-full bg-[var(--color-yolk)] group-hover:scale-110 transition-transform"></span>
        <span class="font-bold text-base tracking-tight text-[var(--color-ink)]">suarakita</span>
      </a>
      <p>© {{ new Date().getFullYear() }} suarakita</p>
    </footer>

    <!-- ======================================================== -->
    <!-- MODAL 1: KOREKSI TRANSKRIP -->
    <!-- ======================================================== -->
    <div v-if="showCorrectionModal" class="modal-overlay">
      <div class="modal-panel flex flex-col gap-5">
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-[var(--color-line)]">
          <div class="flex items-center gap-3">
            <span class="w-9 h-9 rounded-2xl bg-[var(--color-yolk)] flex items-center justify-center text-base">🪄</span>
            <div>
              <h3 class="text-base font-bold text-[var(--color-ink)]">Hasil Koreksi Transkrip</h3>
              <p class="text-xs text-[var(--color-muted)]">Pembersihan salah dengar, filler, dan tanda baca</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="tag bg-[var(--color-cream)] text-[var(--color-muted)] text-xs font-semibold">
              {{ correctionData.method === 'gemini_ai' ? ('✨ ' + (correctionData.modelUsed ? correctionData.modelUsed.replace('gemini-', 'Gemini ').toUpperCase() : 'Gemini AI')) : '⚡ NLP Lokal' }}
            </span>
            <button @click="showCorrectionModal = false" class="btn-icon w-8 h-8">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <!-- Side-by-Side Comparison -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-bold text-[var(--color-ink)]">Sebelum (Mentah)</span>
              <span class="tag bg-red-100 text-red-600 text-xs">Asli</span>
            </div>
            <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-line)] rounded-2xl min-h-[100px] text-sm whitespace-pre-wrap leading-relaxed text-[var(--color-muted)]">
              {{ correctionData.originalText }}
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-bold text-[var(--color-ink)]">Sesudah (Terkoreksi)</span>
              <span class="tag bg-green-100 text-green-700 text-xs">Bersih</span>
            </div>
            <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-line)] rounded-2xl min-h-[100px] text-sm whitespace-pre-wrap leading-relaxed font-semibold text-[var(--color-ink)]">
              {{ correctionData.correctedText }}
            </div>
          </div>
        </div>

        <!-- Changes Applied -->
        <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-line)] rounded-2xl">
          <h4 class="text-sm font-bold text-[var(--color-ink)] mb-2 flex items-center gap-1.5">
            <span>✓</span> Perbaikan yang Diterapkan:
          </h4>
          <ul class="flex flex-col gap-1.5 pl-5 list-disc text-sm text-[var(--color-muted)]">
            <li v-for="(change, idx) in correctionData.changes" :key="idx">{{ change }}</li>
          </ul>
        </div>

        <!-- Footer Actions -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--color-line)]">
          <button @click="copyText(correctionData.correctedText)" class="btn-outline btn-small">Salin Hasil</button>
          <div class="flex items-center gap-2">
            <button @click="showCorrectionModal = false" class="btn-outline btn-small">Batal</button>
            <button @click="applyCorrection" class="btn-primary btn-small">✓ Gunakan Hasil</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL 2: NOTULEN RAPAT -->
    <!-- ======================================================== -->
    <div v-if="showMomModal" class="modal-overlay">
      <div class="modal-panel flex flex-col gap-5">
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-[var(--color-line)]">
          <div class="flex items-center gap-3">
            <span class="w-9 h-9 rounded-2xl bg-blue-100 flex items-center justify-center text-base">📋</span>
            <div>
              <h3 class="text-base font-bold text-[var(--color-ink)]">Notulen Rapat (MoM)</h3>
              <p class="text-xs text-[var(--color-muted)]">Ringkasan, topik, keputusan & penugasan</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="tag bg-[var(--color-cream)] text-[var(--color-muted)] text-xs font-semibold">
              {{ momData.method === 'gemini_ai' ? ('✨ ' + (momData.modelUsed ? momData.modelUsed.replace('gemini-', 'Gemini ').toUpperCase() : 'Gemini AI')) : '⚡ NLP Lokal' }}
            </span>
            <button @click="showMomModal = false" class="btn-icon w-8 h-8">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <!-- Structured Sections -->
        <div class="flex flex-col gap-4">
          <!-- Topik -->
          <div class="p-5 bg-[var(--color-bg)] border border-[var(--color-line)] rounded-2xl">
            <div class="section-label text-xs mb-2">📌 Topik / Konteks Pembicaraan</div>
            <p class="text-base font-bold text-[var(--color-ink)] leading-snug">{{ momData.topic }}</p>
          </div>

          <!-- Ringkasan Hasil Rapat -->
          <div class="p-5 bg-[var(--color-yolk)]/20 border border-[var(--color-yolk)]/30 rounded-2xl">
            <div class="text-xs font-bold text-[var(--color-muted)] mb-3 flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-[var(--color-yolk)]"></span>
              📝 Ringkasan Hasil Rapat (Progress & Substansi)
            </div>
            <ul v-if="momData.summaryItems && momData.summaryItems.length" class="flex flex-col gap-2.5">
              <li v-for="(item, idx) in momData.summaryItems" :key="idx" class="flex items-start gap-2 text-sm text-[var(--color-ink)] leading-relaxed">
                <span class="text-amber-600 font-bold shrink-0 mt-0.5">•</span>
                <span v-html="formatMarkdownInline(item)"></span>
              </li>
            </ul>
            <p v-else class="text-sm text-[var(--color-ink)] leading-relaxed whitespace-pre-line">{{ momData.summary }}</p>
          </div>

          <!-- Poin-Poin Utama -->
          <div v-if="momData.keyPoints && momData.keyPoints.length" class="p-5 bg-blue-50/70 border border-blue-200 rounded-2xl">
            <div class="text-xs font-bold text-blue-700 mb-3 flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              ⚡ Poin-Poin Utama
            </div>
            <ul class="flex flex-col gap-2.5">
              <li v-for="(point, idx) in momData.keyPoints" :key="idx" class="flex items-start gap-2 text-sm text-[var(--color-ink)] leading-relaxed">
                <span class="text-blue-600 font-bold shrink-0 mt-0.5">•</span>
                <span v-html="formatMarkdownInline(point)"></span>
              </li>
            </ul>
          </div>

          <!-- Keputusan yang Diambil (Decisions Made) -->
          <div v-if="momData.decisions && momData.decisions.length" class="p-5 bg-green-50 border border-green-200 rounded-2xl">
            <div class="text-xs font-bold text-green-700 mb-3 flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-green-500"></span>
              🎯 Keputusan yang Diambil (Decisions Made)
            </div>
            <ul class="flex flex-col gap-2.5">
              <li v-for="(dec, idx) in momData.decisions" :key="idx" class="flex items-start gap-2 text-sm text-[var(--color-ink)] leading-relaxed">
                <span class="text-green-600 font-bold shrink-0 mt-0.5">•</span>
                <span v-html="formatMarkdownInline(dec)"></span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--color-line)]">
          <button @click="copyText(momData.rawMarkdown)" class="btn-outline btn-small">Salin Notulen</button>
          <div class="flex items-center gap-2">
            <button @click="showMomModal = false" class="btn-outline btn-small">Tutup</button>
            <button @click="downloadMomMarkdown" class="btn-primary btn-small">Download .md</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL 3: AI CONFIG -->
    <!-- ======================================================== -->
    <div v-if="showAiConfigModal" class="modal-overlay">
      <div class="modal-panel max-w-md flex flex-col gap-5">
        <div class="flex items-center justify-between pb-4 border-b border-[var(--color-line)]">
          <div class="flex items-center gap-3">
            <span class="w-9 h-9 rounded-2xl bg-[var(--color-cream)] flex items-center justify-center text-base">⚡</span>
            <span class="font-bold text-sm text-[var(--color-ink)]">Pengaturan Gemini API (Opsional)</span>
          </div>
          <button @click="showAiConfigModal = false" class="btn-icon w-8 h-8">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <p class="text-sm text-[var(--color-muted)] leading-relaxed">
          Secara default menggunakan <b class="text-[var(--color-ink)]">Mesin NLP Lokal</b> (offline, instan & gratis). Untuk analisis LLM tingkat lanjut, masukkan kunci Gemini API:
        </p>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold text-[var(--color-ink)]">Model Gemini AI:</label>
          <select v-model="selectedGeminiModel" class="input-clean text-sm bg-white cursor-pointer">
            <option value="gemini-2.5-flash">Gemini 2.5 Flash (Terbaru, Cerdas & Cepat — Gratis)</option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Generasi 2.0 Stabil — Gratis)</option>
            <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite (Ultra Cepat & Ringan — Gratis)</option>
          </select>
          <span class="text-xs text-[var(--color-muted)]">Tersedia kuota harian gratis resmi dari Google AI Studio (aistudio.google.com).</span>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold text-[var(--color-ink)]">Gemini API Key:</label>
          <input
            v-model="geminiApiKey"
            type="password"
            placeholder="AIzaSy..."
            class="input-clean font-mono text-sm"
          />
          <span class="text-xs text-[var(--color-muted)]">Tersimpan aman di browser Anda (localStorage).</span>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-line)]">
          <button @click="removeApiKey" class="btn-outline btn-small text-red-500 border-red-300 hover:bg-red-500 hover:text-white hover:border-red-500">
            Hapus Kunci
          </button>
          <button @click="saveApiKey" class="btn-primary btn-small">Simpan</button>
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
const transcriptText = ref('');

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

// Deteksi peramban mobile (Android / Samsung Internet / Chrome Mobile)
const isMobileDevice = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Pelacak status kalimat final terakhir untuk mencegah ghost replay pada Android
let lastFinalPhrase = '';
let lastFinalTimestamp = 0;
let restartTimer = null;
const processedFinalMap = new Map();

/**
 * Pangkas pengulangan kata yang tidak wajar akibat echo/stutter mic (misal: "halo halo halo halo..." -> "halo halo")
 */
function collapseExcessiveRepetitions(text) {
  if (!text) return '';
  // Kata yang berulang 3 kali atau lebih berturut-turut dipangkas menjadi maksimal 2 kali
  return text.replace(/\b([a-zA-ZÀ-ÿ0-9]{2,})(?:\s+\1){2,}\b/gi, '$1 $1');
}

/**
 * Menggabungkan teks transkrip baru secara mulus tanpa menduplikasi kata yang tumpang tindih di batas sambungan.
 * Sangat penting untuk peramban Android (Chrome / Samsung Internet) yang sering mengirim buffer suara berulang.
 */
function appendTranscriptCleanly(currentText, newAddition) {
  let trimmedAddition = (newAddition || '').trim();
  if (!trimmedAddition) return currentText || '';

  // Bersihkan pengulangan internal berlebih jika ada
  trimmedAddition = collapseExcessiveRepetitions(trimmedAddition);

  if (!currentText || !currentText.trim()) return trimmedAddition;

  const curTrimmed = currentText.trim();
  const curWords = curTrimmed.split(/\s+/);
  const newWords = trimmedAddition.split(/\s+/);

  // Periksa overlap kata maksimal di ujung teks sebelumnya dengan awal teks baru
  let maxOverlap = 0;
  const maxCheck = Math.min(curWords.length, newWords.length, 6);
  for (let len = maxCheck; len >= 1; len--) {
    const endSlice = curWords.slice(-len).join(' ').toLowerCase();
    const startSlice = newWords.slice(0, len).join(' ').toLowerCase();
    if (endSlice === startSlice) {
      maxOverlap = len;
      break;
    }
  }

  const remainingWords = newWords.slice(maxOverlap);
  if (remainingWords.length === 0) {
    return curTrimmed;
  }

  return curTrimmed + ' ' + remainingWords.join(' ');
}

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('SpeechRecognition API not available in this browser.');
    return;
  }

  recognition = new SpeechRecognition();

  // KRUSIAL UNTUK ANDROID / SAMSUNG GALAXY S23:
  // Pada Android / mobile, continuous HARUS false karena engine SpeechRecognizer bawaan OS
  // hanya mendukung satu frasa per sesi. Jika continuous = true di Android, Chromium akan
  // mencoba me-loop internal yang memicu bug resultIndex = 0 dan duplikasi kata 5-7x lipat.
  // Pada desktop (PC/Mac), continuous = true berjalan lancar tanpa bug.
  recognition.continuous = !isMobileDevice;
  recognition.interimResults = true;
  recognition.lang = currentLanguage.value;

  recognition.onresult = (event) => {
    let interim = '';
    let finalChunk = '';
    const now = Date.now();

    for (let i = 0; i < event.results.length; i++) {
      const res = event.results[i];
      const rawText = res[0] ? res[0].transcript.trim() : '';
      if (!rawText) continue;

      if (res.isFinal) {
        // Cek anti-ghost replay: jika kalimat yang sama persis diterima dalam rentang waktu < 2.5 detik
        const isExactRecentDuplicate = (
          rawText.toLowerCase() === lastFinalPhrase.toLowerCase() &&
          (now - lastFinalTimestamp) < 2500
        );

        if (isExactRecentDuplicate) {
          continue; // Abaikan replay buffer audio Android
        }

        const prevText = processedFinalMap.get(i) || '';
        if (rawText !== prevText) {
          // Tangani kasus akumulasi teks Android (misal: "halo" -> "halo bandung" pada indeks yang sama)
          if (prevText && rawText.toLowerCase().startsWith(prevText.toLowerCase())) {
            const diff = rawText.slice(prevText.length).trim();
            if (diff) {
              finalChunk = appendTranscriptCleanly(finalChunk, diff);
            }
          } else if (!prevText) {
            // Indeks baru yang pertama kali ditandai final
            finalChunk = appendTranscriptCleanly(finalChunk, rawText);
          }
          processedFinalMap.set(i, rawText);
          lastFinalPhrase = rawText;
          lastFinalTimestamp = now;
        }
      } else {
        // Teks sementara (interim)
        interim = rawText;
      }
    }

    interimSpeech.value = interim;

    if (finalChunk) {
      transcriptText.value = appendTranscriptCleanly(transcriptText.value, finalChunk);
    }
  };

  recognition.onerror = (event) => {
    console.warn('Speech recognition error:', event.error);
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      stopRecording();
    }
  };

  recognition.onend = () => {
    processedFinalMap.clear();

    if (isRecording.value) {
      clearTimeout(restartTimer);
      // Berikan jeda 250ms pada mobile agar mic audio daemon Samsung melepaskan sesi sebelum mulai lagi
      restartTimer = setTimeout(() => {
        if (isRecording.value && recognition) {
          try {
            recognition.lang = currentLanguage.value;
            recognition.start();
          } catch (e) {
            console.warn('SpeechRecognition restart error:', e);
          }
        }
      }, isMobileDevice ? 250 : 50);
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
    clearTimeout(restartTimer);
    if (!recognition) initSpeechRecognition();
    processedFinalMap.clear();
    lastFinalPhrase = '';
    lastFinalTimestamp = 0;
    recognition.continuous = !isMobileDevice;
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
  clearTimeout(restartTimer);
  processedFinalMap.clear();
  lastFinalPhrase = '';
  lastFinalTimestamp = 0;
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
const selectedGeminiModel = ref('gemini-2.5-flash');
const hasApiKey = computed(() => Boolean(geminiApiKey.value && geminiApiKey.value.trim()));
const loadingAction = ref(null);

onMounted(() => {
  geminiApiKey.value = localStorage.getItem('gemini_api_key') || '';
  selectedGeminiModel.value = localStorage.getItem('gemini_model') || 'gemini-2.5-flash';
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
  if (recognition) {
    try { recognition.stop(); } catch (e) {}
  }
});

function saveApiKey() {
  localStorage.setItem('gemini_api_key', geminiApiKey.value.trim());
  localStorage.setItem('gemini_model', selectedGeminiModel.value);
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
      'Selamat pagi rekan-rekan semua, mari kita mulai meeting hari ini. Bagaimana progresnya Andi? Andi melaporkan integrasi API payment gateway sudah mencapai 80%. Lalu ada kendala apa di tim developer? Andi menyampaikan ada kendala latensi server staging yang sempat time out. Bagaimana dengan Rina dari tim Desain? Rina menyampaikan desain mockup versi mobile sudah selesai 100% dan sudah diserahkan ke developer. Dian dari Pemasaran melaporkan draf kampanye media sosial sudah disiapkan dengan anggaran Rp 2.500.000. Untuk keputusan akhir, Andi tolong pastikan perbaikan bug latensi server selesai besok sore. Lalu Dian siapkan draf konten promosi paling lambat H-7 sebelum peluncuran. Sekian dari saya, terima kasih atas kerjasamanya.';
  } else if (type === 'correction') {
    transcriptText.value =
      'eh anu apakah kita biaya hadir di ruang setting besok pagi jam sembilan saya saya mau bahas hasil kordinasi dgn tim';
  }
}

// Helper untuk merender Markdown inline list MoM (badge [PIC/Domain] dan bold)
function formatMarkdownInline(str) {
  if (!str) return '';
  let clean = String(str).replace(/^\s*[\*\-]\s+/, '');
  clean = clean.replace(/\[(.*?)\]/g, '<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--color-yolk)]/30 font-bold text-[var(--color-ink)] text-xs mr-1.5">[$1]</span>');
  clean = clean.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-[var(--color-ink)]">$1</strong>');
  return clean;
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
      body: JSON.stringify({
        text,
        apiKey: geminiApiKey.value,
        model: selectedGeminiModel.value
      })
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
  summaryItems: [],
  keyPoints: [],
  decisions: [],
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
      body: JSON.stringify({
        text,
        apiKey: geminiApiKey.value,
        model: selectedGeminiModel.value
      })
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
