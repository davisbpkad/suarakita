<template>
  <div class="modal-overlay">
    <div class="modal-panel flex flex-col gap-5">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--color-line)]">
        <div class="flex items-center gap-3 min-w-0">
          <span class="w-9 h-9 shrink-0 rounded-2xl bg-[var(--color-yolk)] text-[var(--color-ink)] flex items-center justify-center">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1L20 7a2.83 2.83 0 0 0-4-4L4 15l-1 6Z" /></svg>
          </span>
          <div>
            <h3 class="text-base font-bold text-[var(--color-ink)]">Hasil Koreksi Transkrip</h3>
            <p class="text-xs text-[var(--color-muted)]">Pembersihan salah dengar, filler, dan tanda baca</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="tag bg-[var(--color-cream)] text-[var(--color-muted)] text-xs font-semibold">
            <span role="status">{{ loading ? 'Loading…' : 'Selesai' }}</span>
          </span>
          <button @click="emit('close')" class="btn-icon w-8 h-8" aria-label="Tutup koreksi transkrip">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <p v-if="notice" class="text-xs text-[var(--color-muted)]" role="status">{{ notice }}</p>

      <!-- Side-by-Side Comparison -->
      <QuotaStatus :data="data" />
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-bold text-[var(--color-ink)]">Sebelum (Mentah)</span>
            <span class="tag bg-red-100 text-red-600 text-xs">Asli</span>
          </div>
          <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-line)] rounded-2xl min-h-[100px] text-sm whitespace-pre-wrap leading-relaxed text-[var(--color-muted)]">
            {{ data.originalText }}
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-bold text-[var(--color-ink)]">Sesudah (Terkoreksi)</span>
            <span class="tag bg-green-100 text-green-700 text-xs">Bersih</span>
          </div>
          <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-line)] rounded-2xl min-h-[100px] text-sm whitespace-pre-wrap leading-relaxed font-semibold text-[var(--color-ink)]">
            {{ data.correctedText }}
          </div>
        </div>
      </div>

      <!-- Changes Applied -->
      <div class="p-4 bg-[var(--color-bg)] border border-[var(--color-line)] rounded-2xl">
        <h4 class="text-sm font-bold text-[var(--color-ink)] mb-2 flex items-center gap-1.5">
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg> Perbaikan yang Diterapkan:
        </h4>
        <ul class="flex flex-col gap-1.5 pl-5 list-disc text-sm text-[var(--color-muted)]">
          <li v-for="(change, idx) in data.changes" :key="idx">{{ change }}</li>
        </ul>
      </div>

      <!-- Footer Actions -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--color-line)]">
        <button @click="copyResult" class="btn-outline btn-small">Salin Hasil</button>
        <div class="flex items-center gap-2">
          <button @click="emit('close')" class="btn-outline btn-small">Batal</button>
          <button @click="emit('apply')" class="btn-primary btn-small"><svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>Gunakan Hasil</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { copyToClipboard } from '../lib/utils/clipboard.js';
import QuotaStatus from './QuotaStatus.vue';

const props = defineProps({
  data: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  notice: { type: String, default: '' },
});

const emit = defineEmits(['close', 'apply']);


async function copyResult() {
  if (await copyToClipboard(props.data.correctedText)) {
    alert('Teks berhasil disalin ke clipboard!');
  }
}
</script>
