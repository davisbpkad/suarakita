<template>
  <div class="modal-overlay">
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
            {{ methodLabel }}
          </span>
          <button @click="emit('close')" class="btn-icon w-8 h-8">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <!-- Structured Sections -->
      <div class="flex flex-col gap-4">
        <!-- Topik -->
        <div class="p-5 bg-[var(--color-bg)] border border-[var(--color-line)] rounded-2xl">
          <div class="section-label text-xs mb-2">📌 Topik / Konteks Pembicaraan</div>
          <p class="text-base font-bold text-[var(--color-ink)] leading-snug">{{ data.topic }}</p>
        </div>

        <!-- Ringkasan Hasil Rapat -->
        <div class="p-5 bg-[var(--color-yolk)]/20 border border-[var(--color-yolk)]/30 rounded-2xl">
          <div class="text-xs font-bold text-[var(--color-muted)] mb-3 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-[var(--color-yolk)]"></span>
            📝 Ringkasan Hasil Rapat (Progress & Substansi)
          </div>
          <ul v-if="data.summaryItems && data.summaryItems.length" class="flex flex-col gap-2.5">
            <li v-for="(item, idx) in data.summaryItems" :key="idx" class="flex items-start gap-2 text-sm text-[var(--color-ink)] leading-relaxed">
              <span class="text-amber-600 font-bold shrink-0 mt-0.5">•</span>
              <span v-html="formatMarkdownInline(item)"></span>
            </li>
          </ul>
          <p v-else class="text-sm text-[var(--color-ink)] leading-relaxed whitespace-pre-line">{{ data.summary }}</p>
        </div>

        <!-- Keputusan yang Diambil (Decisions Made) -->
        <div v-if="data.decisions && data.decisions.length" class="p-5 bg-green-50 border border-green-200 rounded-2xl">
          <div class="text-xs font-bold text-green-700 mb-3 flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            🎯 Keputusan yang Diambil (Decisions Made)
          </div>
          <ul class="flex flex-col gap-2.5">
            <li v-for="(dec, idx) in data.decisions" :key="idx" class="flex items-start gap-2 text-sm text-[var(--color-ink)] leading-relaxed">
              <span class="text-green-600 font-bold shrink-0 mt-0.5">•</span>
              <span v-html="formatMarkdownInline(dec)"></span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--color-line)]">
        <button @click="copyNotes" class="btn-outline btn-small">Salin Notulen</button>
        <div class="flex items-center gap-2">
          <button @click="emit('close')" class="btn-outline btn-small">Tutup</button>
          <button @click="emit('download')" class="btn-primary btn-small">Download .md</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { copyToClipboard } from '../lib/utils/clipboard.js';

const props = defineProps({
  data: { type: Object, required: true },
});

const emit = defineEmits(['close', 'download']);

const methodLabel = computed(() => {
  if (props.data.method !== 'gemini_ai') return '⚡ NLP Lokal';
  const model = props.data.modelUsed;
  return '✨ ' + (model ? model.replace('gemini-', 'Gemini ').toUpperCase() : 'Gemini AI');
});

// Render badge [PIC/Domain] dan **bold** yang dipakai skema notulen.
function formatMarkdownInline(str) {
  if (!str) return '';
  let clean = String(str).replace(/^\s*[\*\-]\s+/, '');
  clean = clean.replace(/\[(.*?)\]/g, '<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--color-yolk)]/30 font-bold text-[var(--color-ink)] text-xs mr-1.5">[$1]</span>');
  clean = clean.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-[var(--color-ink)]">$1</strong>');
  return clean;
}

async function copyNotes() {
  if (await copyToClipboard(props.data.rawMarkdown)) {
    alert('Teks berhasil disalin ke clipboard!');
  }
}
</script>
