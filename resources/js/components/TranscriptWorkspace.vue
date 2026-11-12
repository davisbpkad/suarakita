<template>
  <section class="card p-4 sm:p-6 flex flex-col gap-3.5 shadow-sm border border-[var(--color-line)]">
    <!-- Top Bar: Status Pill, Presets & Stats -->
    <div class="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-[var(--color-line)]/60">
      <!-- Left: Status & Presets -->
      <div class="flex flex-wrap items-center gap-2 min-w-0">
        <!-- Recording Status Pill -->
        <div
          class="tag text-xs font-semibold py-1 px-3"
          :class="isRecording ? 'border border-red-300 bg-red-50 text-red-600' : 'bg-[var(--color-cream)] text-[var(--color-muted)]'"
        >
          <span v-if="isRecording" class="live-dot mr-1"></span>
          <span v-else class="w-2 h-2 rounded-full bg-emerald-500 mr-1 shrink-0"></span>
          <span>{{ isRecording ? 'Sedang merekam...' : 'Siap merekam' }}</span>
          <span v-if="isRecording" class="font-mono text-xs font-bold text-red-600 ml-1.5">{{ formattedRecordingTime }}</span>
        </div>

        <!-- Preset Buttons -->
        <div class="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
          <span class="hidden sm:inline font-medium text-[11px]">Contoh:</span>
          <button
            @click="emit('preset', 'mom')"
            class="tag bg-white hover:bg-[var(--color-yolk)] text-[var(--color-ink)] border border-[var(--color-line)] text-xs cursor-pointer transition-colors py-1 px-2.5"
          >
            <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            Rapat Tim
          </button>
          <button
            @click="emit('preset', 'correction')"
            class="tag bg-white hover:bg-[var(--color-yolk)] text-[var(--color-ink)] border border-[var(--color-line)] text-xs cursor-pointer transition-colors py-1 px-2.5"
          >
            <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 8.5a6.5 6.5 0 0 1 13 0c0 3-2 4-4 5.5s-1 3-2.5 4.5A4 4 0 0 1 6 16m4-7.5a2.5 2.5 0 0 1 5 0c0 1.5-1 2-2 3M3 3l18 18" />
            </svg>
            Salah Dengar
          </button>
        </div>
      </div>

      <!-- Right: Stats -->
      <div class="flex items-center gap-1.5 text-[var(--color-muted)] text-xs sm:ml-auto">
        <span>{{ charCount }} karakter</span>
        <span aria-hidden="true">·</span>
        <span>{{ wordCount }} kata</span>
      </div>
    </div>

    <!-- Live Interim Speech & Soundwave Banner (Only when recording) -->
    <div
      v-if="isRecording"
      class="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-gradient-to-r from-red-50 via-rose-50/60 to-amber-50/40 border border-red-200/90 rounded-xl shadow-xs transition-all"
    >
      <div class="flex items-start gap-2.5 min-w-0 flex-1">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 text-[11px] font-bold text-red-600 uppercase tracking-wider mb-0.5">
            <span>{{ interimSpeech ? 'Sedang Berbicara' : 'Mikrofon Aktif' }}</span>
            <span class="text-red-400 font-normal">({{ currentLang.name }})</span>
          </div>
          <p class="text-xs sm:text-sm text-red-950 font-medium leading-relaxed break-words">
            <span v-if="interimSpeech" class="italic font-semibold text-red-900 bg-red-100/70 px-1.5 py-0.5 rounded">
              "{{ interimSpeech }}"
            </span>
            <span v-else class="text-red-500/80 italic">
              Mendengarkan suara secara real-time... Silakan bicara dengan santai atau jelas.
            </span>
          </p>

          <!-- Level mic: pengguna bisa lihat sendiri kalau suaranya terlalu pelan -->
          <div v-if="showMicLevel" class="mt-1.5 flex items-center gap-2">
            <span class="text-[10px] font-bold uppercase tracking-wider shrink-0" :class="micQuiet ? 'text-red-600' : 'text-emerald-600'">
              Level mic
            </span>
            <div class="h-1.5 w-full max-w-[180px] bg-red-100 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-[width] duration-75"
                :class="micQuiet ? 'bg-red-500' : 'bg-emerald-500'"
                :style="{ width: Math.min(100, Math.round(micLevel * 400)) + '%' }"
              ></div>
            </div>
          </div>
          <p v-if="showMicLevel && micQuiet" class="text-[11px] font-semibold text-red-600 mt-1 leading-snug">
            Suara terlalu pelan. Naikkan volume input mikrofon di pengaturan sistem, atau dekatkan mic.
          </p>
        </div>
      </div>
      <!-- Mini Soundwave -->
      <div class="flex items-end gap-1 h-6 shrink-0 px-1.5 self-center">
        <span class="w-1 rounded-full bg-red-400 animate-soundwave-1"></span>
        <span class="w-1 rounded-full bg-red-600 animate-soundwave-2"></span>
        <span class="w-1 rounded-full bg-red-400 animate-soundwave-3"></span>
        <span class="w-1 rounded-full bg-red-600 animate-soundwave-4"></span>
        <span class="w-1 rounded-full bg-red-400 animate-soundwave-5"></span>
      </div>
    </div>

    <!-- Textarea Workspace -->
    <div class="relative">
      <textarea
        ref="textareaRef"
        :value="modelValue"
        @input="emit('update:modelValue', $event.target.value)"
        rows="8"
        :placeholder="isRecording ? 'Mendengarkan suara Anda... Hasil transkrip akan otomatis masuk ke sini.' : 'Tekan \'Mulai Rekam\' untuk bicara atau ketik/tempel transkrip di sini...'"
        class="input-clean resize-y leading-relaxed min-h-[160px] text-base"
      ></textarea>
    </div>

    <!-- Bottom Action Toolbar inside the Card -->
    <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--color-line)]/60">
      <!-- Left: Main Record Button -->
      <div class="flex w-full sm:w-auto items-center gap-2.5">
        <button
          @click="emit('toggle-recording')"
          class="btn-primary w-full sm:w-auto text-sm sm:text-base font-bold px-5 sm:px-6 py-2.5 sm:py-3 transition-all flex items-center gap-2"
          :class="isRecording
            ? 'bg-red-500! text-white! hover:bg-red-600! ring-4 ring-red-100 shadow-md'
            : 'bg-[var(--color-yolk)] text-[var(--color-ink)] hover:bg-amber-400'"
        >
          <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect v-if="isRecording" x="6" y="6" width="12" height="12" rx="2" />
            <g v-else>
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8" />
            </g>
          </svg>
          <span>{{ isRecording ? 'Stop Rekam' : 'Mulai Rekam' }}</span>
          <span v-if="isRecording" class="font-mono text-xs ml-1 bg-white/20 px-2 py-0.5 rounded-full font-bold">
            {{ formattedRecordingTime }}
          </span>
        </button>

        <span v-if="!isRecording" class="hidden md:inline text-xs text-[var(--color-muted)]">
          Bahasa: <b>{{ currentLang.name }}</b>
        </span>
      </div>

      <!-- Right: Koreksi Teks & Buat Notulen Buttons -->
      <div class="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto justify-end min-w-0">
        <!-- Koreksi Teks -->
        <button
          @click="emit('correct')"
          :disabled="loadingAction === 'correction' || isRecording || !modelValue.trim()"
          class="btn-outline btn-small flex items-center gap-1.5 flex-1 sm:flex-initial justify-center"
          :title="!modelValue.trim() ? 'Isi transkrip terlebih dahulu' : 'Koreksi kata salah dengar & tanda baca'"
        >
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m15 5 4 4M4 20l4-1L20 7a2.83 2.83 0 0 0-4-4L4 15l-1 6Z" />
          </svg>
          <span v-if="loadingAction === 'correction'">Mengkoreksi...</span>
          <span v-else>Koreksi Teks</span>
        </button>

        <!-- Buat Notulen -->
        <button
          @click="emit('meeting-notes')"
          :disabled="loadingAction === 'mom' || isRecording || !modelValue.trim()"
          class="btn-primary btn-small bg-[var(--color-ink)] text-white hover:bg-black hover:text-white flex items-center gap-1.5 flex-1 sm:flex-initial justify-center transition-colors"
          :title="!modelValue.trim() ? 'Isi transkrip terlebih dahulu' : 'Ringkas pembicaraan menjadi notulen rapat'"
        >
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="8" y="2" width="8" height="4" rx="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2m0 7h8m-8 4h8m-8 4h5" />
          </svg>
          <span v-if="loadingAction === 'mom'">Meringkas...</span>
          <span v-else>Buat Notulen</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  isRecording: { type: Boolean, default: false },
  interimSpeech: { type: String, default: '' },
  micLevel: { type: Number, default: 0 },
  showMicLevel: { type: Boolean, default: true },
  micQuiet: { type: Boolean, default: false },
  currentLang: { type: Object, required: true },
  loadingAction: { type: String, default: null },
  formattedRecordingTime: { type: String, default: '00:00' },
  charCount: { type: Number, default: 0 },
  wordCount: { type: Number, default: 0 },
  // Bumped oleh induk tiap frasa final STT tiba; hanya itu yang memicu auto-scroll.
  autoScrollTick: { type: Number, default: 0 },
});

const emit = defineEmits(['update:modelValue', 'toggle-recording', 'correct', 'meeting-notes', 'preset']);

const textareaRef = ref(null);

watch(() => props.autoScrollTick, () => {
  const el = textareaRef.value;
  if (el) el.scrollTop = el.scrollHeight;
});
</script>
