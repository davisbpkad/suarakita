<template>
  <div class="modal-overlay">
    <div class="modal-panel max-w-md flex flex-col gap-5">
      <div class="flex items-center justify-between pb-4 border-b border-[var(--color-line)]">
        <div class="flex items-center gap-3">
          <span class="w-9 h-9 rounded-2xl bg-[var(--color-cream)] flex items-center justify-center text-base">⚡</span>
          <span class="font-bold text-sm text-[var(--color-ink)]">Pengaturan Gemini API (Opsional)</span>
        </div>
        <button @click="emit('close')" class="btn-icon w-8 h-8">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <p class="text-sm text-[var(--color-muted)] leading-relaxed">
        Secara default menggunakan <b class="text-[var(--color-ink)]">Mesin NLP Lokal</b> (offline, instan & gratis). Untuk analisis LLM tingkat lanjut, masukkan kunci Gemini API:
      </p>

      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-bold text-[var(--color-ink)]">Model Gemini AI:</label>
        <select
          :value="model"
          @change="emit('update:model', $event.target.value)"
          class="input-clean text-sm bg-white cursor-pointer"
        >
          <option value="gemini-2.5-flash">Gemini 2.5 Flash (Terbaru, Cerdas & Cepat — Gratis)</option>
          <option value="gemini-2.0-flash">Gemini 2.0 Flash (Generasi 2.0 Stabil — Gratis)</option>
          <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite (Ultra Cepat & Ringan — Gratis)</option>
        </select>
        <span class="text-xs text-[var(--color-muted)]">Tersedia kuota harian gratis resmi dari Google AI Studio (aistudio.google.com).</span>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-bold text-[var(--color-ink)]">Gemini API Key:</label>
        <input
          :value="apiKey"
          @input="emit('update:apiKey', $event.target.value)"
          type="password"
          placeholder="AIzaSy..."
          class="input-clean font-mono text-sm"
        />
        <span class="text-xs text-[var(--color-muted)]">Tersimpan aman di browser Anda (localStorage).</span>
      </div>

      <div class="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-line)]">
        <button @click="emit('remove')" class="btn-outline btn-small text-red-500 border-red-300 hover:bg-red-500 hover:text-white hover:border-red-500">
          Hapus Kunci
        </button>
        <button @click="emit('save')" class="btn-primary btn-small">Simpan</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  apiKey: { type: String, default: '' },
  model: { type: String, default: 'gemini-2.5-flash' },
});

const emit = defineEmits(['update:apiKey', 'update:model', 'close', 'save', 'remove']);
</script>
