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
        <label class="text-xs font-bold text-[var(--color-ink)]">Provider:</label>
        <select
          :value="provider"
          @change="changeProvider($event.target.value)"
          class="input-clean text-sm bg-white cursor-pointer"
        >
          <option v-for="p in providerList" :key="p.id" :value="p.id">{{ p.label }}</option>
        </select>
      </div>

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
          Model pertama pada daftar bukan satu-satunya yang dicoba — bila gagal, aplikasi mencoba model lain lalu beralih ke NLP Lokal.
        </span>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-bold text-[var(--color-ink)]">API Key:</label>
        <input
          :value="apiKey"
          @input="emit('update:apiKey', $event.target.value)"
          type="password"
          :placeholder="currentProvider.keyPlaceholder"
          class="input-clean font-mono text-sm"
        />
        <span class="text-xs text-[var(--color-muted)]">
          Tersimpan di browser Anda (localStorage).
          <a :href="currentProvider.keyUrl" target="_blank" rel="noopener" class="underline">Ambil key {{ currentProvider.label }}</a>.
        </span>
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
import { computed } from 'vue';
import PROVIDERS from '../../../lib/providers.json';

const props = defineProps({
  provider: { type: String, default: 'gemini' },
  apiKey: { type: String, default: '' },
  model: { type: String, default: '' },
});

const emit = defineEmits(['update:provider', 'update:apiKey', 'update:model', 'close', 'save', 'remove']);

const providerList = Object.values(PROVIDERS);
const currentProvider = computed(() => PROVIDERS[props.provider] || PROVIDERS.gemini);

function changeProvider(id) {
  emit('update:provider', id);
  // Ganti model ke default provider baru supaya tidak menyisakan model asing.
  emit('update:model', (PROVIDERS[id] || PROVIDERS.gemini).models[0].id);
}
</script>
