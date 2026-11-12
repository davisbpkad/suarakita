<template>
  <div class="modal-overlay">
    <div class="modal-panel flex flex-col gap-5">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--color-line)]">
        <div class="flex items-center gap-3 min-w-0">
          <span class="w-9 h-9 shrink-0 rounded-2xl bg-[var(--color-yolk)] text-[var(--color-ink)] flex items-center justify-center">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2m0 7h8m-8 4h8m-8 4h5" /></svg>
          </span>
          <div>
            <h3 class="text-base font-bold text-[var(--color-ink)]">Notulen Rapat (MoM)</h3>
            <p class="text-xs text-[var(--color-muted)]">Ringkasan, topik, keputusan & penugasan</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="tag bg-[var(--color-cream)] text-[var(--color-muted)] text-xs font-semibold">
            <span role="status">{{ loading ? 'Loading…' : 'Selesai' }}</span>
          </span>
          <button @click="emit('close')" class="btn-icon w-8 h-8" aria-label="Tutup notulen rapat">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <p v-if="notice" class="text-xs text-[var(--color-muted)]" role="status">{{ notice }}</p>

      <!-- Structured Sections -->
      <div class="flex flex-col gap-4">
          <QuotaStatus :data="data" />
        <!-- Topik -->
        <div class="p-5 bg-[var(--color-bg)] border border-[var(--color-line)] rounded-2xl">
          <div class="text-xs font-bold text-[var(--color-muted)] mb-2 flex items-center gap-2"><svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6l-1 6 4 4v2H6v-2l4-4-1-6Zm3 12v6" /></svg>Topik / Konteks Pembicaraan</div>
          <p class="text-base font-bold text-[var(--color-ink)] leading-snug">{{ data.topic }}</p>
        </div>

        <!-- Ringkasan Hasil Rapat -->
        <div class="p-5 bg-[var(--color-yolk)]/20 border border-[var(--color-yolk)]/30 rounded-2xl">
          <div class="text-xs font-bold text-[var(--color-muted)] mb-3 flex items-center gap-2">
            <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M8 13h8m-8 4h6" /></svg>
            Ringkasan Hasil Rapat (Progress & Substansi)
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
            <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>
            Keputusan yang Diambil (Decisions Made)
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
import { copyToClipboard } from '../lib/utils/clipboard.js';
import { formatMarkdownInline } from '../lib/text/markdownInline.mjs';
import QuotaStatus from './QuotaStatus.vue';

const props = defineProps({
  data: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  notice: { type: String, default: '' },
});

const emit = defineEmits(['close', 'download']);


async function copyNotes() {
  if (await copyToClipboard(props.data.rawMarkdown)) {
    alert('Teks berhasil disalin ke clipboard!');
  }
}
</script>
