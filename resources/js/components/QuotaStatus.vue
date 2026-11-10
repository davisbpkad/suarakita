<template>
  <div v-if="data.engine" class="text-xs text-[var(--color-muted)] leading-relaxed" role="status">
    <template v-if="data.engine === 'gemini'">
      Sisa kuota Gemini tidak tersedia dari respons ini.
      <a href="https://aistudio.google.com/rate-limit" target="_blank" rel="noopener noreferrer" class="underline">Lihat AI Studio</a>.
    </template>
    <template v-if="quota">
      <p>Groq — snapshot respons terakhir, bukan sisa real-time seluruh akun.</p>
      <p v-if="quota.remainingRequests !== undefined">Sisa request (jendela request provider): {{ quota.remainingRequests }}<span v-if="quota.resetRequests"> · reset: {{ quota.resetRequests }}</span></p>
      <p v-if="quota.remainingTokens !== undefined">Sisa token (jendela token provider): {{ quota.remainingTokens }}<span v-if="quota.resetTokens"> · reset: {{ quota.resetTokens }}</span></p>
      <p v-if="quota.retryAfter">Retry-After dari provider: {{ quota.retryAfter }}</p>
      <p v-if="remaining !== null">Waktu tunggu: {{ remaining }}. Tidak mencoba ulang otomatis.</p>
    </template>
    <p v-else-if="data.engine === 'groq'">Sisa kuota Groq tidak tersedia dari respons ini.</p>
  </div>
</template>

<script setup>
import { computed, ref, watch, onUnmounted } from 'vue';
import { retryDeadline, countdown } from '../lib/quotaClock.mjs';
const props = defineProps({ data: { type: Object, required: true } });
const quota = computed(() => {
  const value = props.data.quota || [...(props.data.attempts || [])].reverse().find(item => item.provider === 'groq' && item.quota)?.quota;
  return value && Object.keys(value).length ? value : null;
});
const now = ref(Date.now());
const deadline = ref(null);
let timer;
watch(quota, value => {
  clearInterval(timer);
  now.value = Date.now();
  deadline.value = retryDeadline(value?.retryAfter, now.value);
  if (deadline.value !== null && deadline.value > now.value) {
    timer = setInterval(() => {
      now.value = Date.now();
      if (now.value >= deadline.value) clearInterval(timer);
    }, 1000);
  }
}, { immediate: true });
const remaining = computed(() => countdown(deadline.value, now.value));
onUnmounted(() => clearInterval(timer));
</script>
