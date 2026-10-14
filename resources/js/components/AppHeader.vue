<template>
  <header class="wrap sticky top-0 z-30 flex items-center justify-between py-4 lg:py-5 bg-[var(--color-bg)]/95 backdrop-blur-sm">
    <!-- Brand -->
    <a href="/" class="group inline-flex items-center gap-2.5">
      <img
        :src="'/favicon.png'"
        alt="suarakita logo"
        class="w-[24px] h-[24px] rounded-full group-hover:scale-110 transition-transform duration-300"
      />
      <span class="font-extrabold text-xl tracking-[-0.04em] text-[var(--color-ink)]">suarakita</span>
    </a>

    <!-- Right Actions -->
    <div class="flex items-center gap-2">
      <!-- PENGATURAN BAHASA (Hover / Click Dropdown, bersebelahan dengan Pengaturan AI) -->
      <div
        class="relative group"
        @mouseenter="showLangMenu = true"
        @mouseleave="showLangMenu = false"
      >
        <button
          @click="showLangMenu = !showLangMenu"
          class="h-11 px-3.5 rounded-full border border-[var(--color-line)] bg-white text-[var(--color-ink)] hover:bg-[var(--color-cream)] hover:border-[var(--color-ink)] transition-all flex items-center gap-1.5 text-xs sm:text-sm font-bold cursor-pointer"
          aria-label="Pilih Bahasa STT"
        >
          <span class="text-base">{{ currentLang.flag }}</span>
          <span class="font-bold">{{ currentLang.shortCode }}</span>
          <svg
            class="w-3.5 h-3.5 text-[var(--color-muted)] transition-transform duration-200 group-hover:rotate-180"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        <!-- Hover Tooltip -->
        <div
          v-if="!showLangMenu"
          class="theme-tooltip"
          role="tooltip"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-[var(--color-yolk)] shrink-0"></span>
          <span>Bahasa: {{ currentLang.name }}</span>
        </div>

        <!-- Dropdown Menu on Hover / Click -->
        <div
          class="absolute right-0 top-full pt-2 z-40 transition-all duration-200"
          :class="showLangMenu ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none translate-y-1 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0'"
        >
          <div class="w-48 bg-white border border-[var(--color-line)] rounded-2xl py-2 shadow-xl flex flex-col gap-0.5">
            <div class="px-3.5 py-1 text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider">
              Bahasa Suara (STT)
            </div>
            <button
              v-for="lang in languages"
              :key="lang.code"
              @click="selectLanguage(lang.code)"
              class="w-full text-left px-3.5 py-2 text-sm font-medium hover:bg-[var(--color-cream)] flex items-center justify-between transition-colors cursor-pointer"
              :class="currentLanguage === lang.code ? 'text-[var(--color-ink)] font-bold bg-[var(--color-yolk)]/20' : 'text-[var(--color-muted)]'"
            >
              <div class="flex items-center gap-2.5">
                <span class="text-base">{{ lang.flag }}</span>
                <span>{{ lang.name }}</span>
              </div>
              <span v-if="currentLanguage === lang.code" class="text-xs font-bold text-amber-700">✓</span>
              <span v-else class="text-[11px] font-mono text-[var(--color-muted)]">{{ lang.shortCode }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- AI Config -->
      <div class="relative group">
        <button
          @click="emit('open-ai-config')"
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
          @click="showDownloadMenu = !showDownloadMenu"
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
            @click="download('txt')"
            class="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-[var(--color-cream)] flex items-center justify-between"
          >
            <span>Teks (.txt)</span>
            <span class="tag bg-[var(--color-cream)] text-[var(--color-muted)] text-xs py-0.5 px-2">TXT</span>
          </button>
          <button
            @click="download('md')"
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
          @click="emit('clear')"
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
</template>

<script setup>
import { ref } from 'vue';
import { copyToClipboard } from '../lib/utils/clipboard.js';

const props = defineProps({
  languages: { type: Array, required: true },
  currentLanguage: { type: String, required: true },
  currentLang: { type: Object, required: true },
  hasApiKey: { type: Boolean, default: false },
  transcript: { type: String, default: '' },
});

const emit = defineEmits(['select-language', 'open-ai-config', 'clear', 'download']);

// Menu buka/tutup murni UI, jadi tinggal di sini.
const showLangMenu = ref(false);
const showDownloadMenu = ref(false);
const copySuccess = ref(false);

function selectLanguage(code) {
  showLangMenu.value = false;
  emit('select-language', code);
}

function download(type) {
  showDownloadMenu.value = false;
  emit('download', type);
}

async function copyTranscript() {
  const text = props.transcript.trim();
  if (!text) {
    alert('Teks transkrip masih kosong.');
    return;
  }
  if (await copyToClipboard(text)) {
    copySuccess.value = true;
    setTimeout(() => { copySuccess.value = false; }, 2000);
  }
}
</script>
