<template>
  <div class="modal-overlay">
    <div class="modal-panel max-w-md flex flex-col gap-5">
      <div class="flex items-center justify-between pb-4 border-b border-[var(--color-line)]">
        <div class="flex items-center gap-3">
          <span class="w-9 h-9 rounded-2xl bg-[var(--color-cream)] flex items-center justify-center text-base">⚡</span>
          <span class="font-bold text-sm text-[var(--color-ink)]">Pengaturan Mesin AI (Opsional)</span>
        </div>
        <button @click="emit('close')" class="btn-icon w-8 h-8">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <p class="text-sm text-[var(--color-muted)] leading-relaxed">
        Secara default menggunakan <b class="text-[var(--color-ink)]">Mesin NLP Lokal</b> (offline, instan & gratis). Isi API key di bawah untuk analisis LLM lanjutan.
      </p>

      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-bold text-[var(--color-ink)]">Model:</label>
        <select
          :value="model"
          @change="emit('update:model', $event.target.value)"
          class="input-clean text-sm bg-white cursor-pointer"
        >
          <option v-for="m in currentProvider.models" :key="m.id" :value="m.id">{{ m.label }}</option>
        </select>
        <span class="text-xs text-[var(--color-muted)]">
          Gemini dicoba lebih dahulu, kemudian Groq jika diizinkan, lalu mesin lokal. Maksimal satu percobaan per provider.
        </span>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-bold text-[var(--color-ink)]">API Key Gemini (utama):</label>
        <input
          :value="apiKey"
          @input="emit('update:apiKey', $event.target.value)"
          type="password"
          :placeholder="currentProvider.keyPlaceholder"
          class="input-clean font-mono text-sm"
        />
        <span class="text-xs text-[var(--color-muted)]">
          Key hanya disimpan dalam memori halaman dan hilang saat refresh. Server meneruskan key dan transkrip ke provider yang dipilih.
          <a :href="currentProvider.keyUrl" target="_blank" rel="noopener" class="underline">Ambil key {{ currentProvider.label }}</a>.
        </span>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="groq-key" class="text-xs font-bold text-[var(--color-ink)]">API Key Groq (cadangan):</label>
        <input id="groq-key" :value="groqKey" @input="emit('update:groqKey', $event.target.value)" type="password" autocomplete="off" placeholder="gsk_..." class="input-clean font-mono text-sm" />
        <label for="groq-model" class="text-xs font-bold text-[var(--color-ink)]">Model Groq:</label>
        <select id="groq-model" :value="groqModel" @change="emit('update:groqModel', $event.target.value)" class="input-clean text-sm bg-white">
          <option v-for="m in PROVIDERS.groq.models" :key="m.id" :value="m.id">{{ m.label }}</option>
        </select>
        <label class="flex items-start gap-2 text-xs text-[var(--color-muted)]">
          <input type="checkbox" :checked="allowGroq" @change="emit('update:allowGroq', $event.target.checked)" />
          Izinkan transkrip dikirim ke Groq jika Gemini gagal atau tidak diisi.
        </label>
        <p class="text-xs text-[var(--color-muted)]">Kedua key hanya untuk sesi halaman ini. Tanpa key aktif, mesin lokal dipakai. Hasil menampilkan snapshot kuota Groq jika header tersedia; sisa kuota Gemini diperiksa di AI Studio.</p>
        <a :href="PROVIDERS.groq.keyUrl" target="_blank" rel="noopener noreferrer" class="text-xs underline">Ambil key Groq</a>
      </div>

      <div class="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-line)]">
        <p class="text-xs text-[var(--color-muted)]" role="status">Pemakaian sesi ini: Gemini {{ sessionCounts.gemini }} · Groq {{ sessionCounts.groq }} percobaan terlapor. Reset saat refresh; bukan kuota akun.</p>
        <button @click="emit('remove')" class="btn-outline btn-small text-red-500 border-red-300 hover:bg-red-500 hover:text-white hover:border-red-500">
          Hapus Kunci
        </button>
        <button @click="emit('save')" class="btn-primary btn-small">Gunakan untuk sesi ini</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import PROVIDERS from '../../../lib/providers.json';

const props = defineProps({
  provider: { type: String, default: 'gemini' },
  apiKey: { type: String, default: '' },
  model: { type: String, default: '' },
  groqKey: { type: String, default: '' },
  groqModel: { type: String, default: '' },
  allowGroq: { type: Boolean, default: false },
  sessionCounts: { type: Object, default: () => ({ gemini: 0, groq: 0 }) },
});

const emit = defineEmits(['update:provider', 'update:apiKey', 'update:model', 'update:groqKey', 'update:groqModel', 'update:allowGroq', 'close', 'save', 'remove']);

const currentProvider = PROVIDERS.gemini;
</script>
