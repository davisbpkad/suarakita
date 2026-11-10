<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <form class="modal-panel max-w-sm flex flex-col gap-4" @submit.prevent="submit">
      <h2 class="font-bold text-lg text-[var(--color-ink)]">Masuk</h2>
      <p class="text-sm text-[var(--color-muted)]">Aplikasi ini memakai password bersama. Password dikirim hanya ke server ini.</p>
      <label class="flex flex-col gap-1.5 text-xs font-bold text-[var(--color-ink)]">
        Password
        <input ref="input" v-model="password" type="password" autocomplete="current-password" required class="input-clean text-sm" />
      </label>
      <p v-if="error" class="text-xs text-red-600" role="alert">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-outline btn-small" @click="emit('close')">Batal</button>
        <button type="submit" class="btn-primary btn-small" :disabled="busy || !password">{{ busy ? 'Memeriksa…' : 'Masuk' }}</button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
const emit = defineEmits(['close', 'success']);
const password = ref('');
const error = ref('');
const busy = ref(false);
const input = ref(null);
onMounted(() => input.value?.focus());
async function submit() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      error.value = response.status === 429 ? 'Terlalu banyak percobaan. Tunggu sebentar.' : data.error || 'Password salah.';
      return;
    }
    password.value = '';
    emit('success');
  } catch {
    error.value = 'Tidak bisa menghubungi server.';
  } finally {
    busy.value = false;
  }
}
</script>
