<template>
  <div v-if="visible" class="text-xs text-[var(--color-muted)] leading-relaxed" role="status">
    <template v-if="quota">
      <p class="font-semibold">Sisa penggunaan</p>
      <p v-if="requestPercent !== null || tokenPercent !== null">
        <span v-if="requestPercent !== null">Request {{ requestPercent }}%</span>
        <span v-if="requestPercent !== null && tokenPercent !== null"> · </span>
        <span v-if="tokenPercent !== null">Token {{ tokenPercent }}%</span>
      </p>
      <p v-else>Persentase belum tersedia.</p>
       <p v-if="requestReset !== null">Reset request: {{ requestReset === '00:00' ? 'Waktu reset telah lewat' : 'dalam ' + requestReset }}.</p>
       <p v-if="tokenReset !== null">Reset token: {{ tokenReset === '00:00' ? 'Waktu reset telah lewat' : 'dalam ' + tokenReset }}.</p>
       <p v-if="requestReset === null && tokenReset === null">Waktu reset belum tersedia.</p>
      <p v-if="remaining !== null && remaining !== '00:00'">Coba lagi dalam {{ remaining }}.</p>
    </template>
    <p v-else-if="data.engine === 'groq'">Sisa kuota Groq tidak tersedia dari respons ini.</p>
    <div v-if="gemini" class="mt-1">
      <p class="font-semibold">Pemakaian Gemini hari ini (perkiraan)</p>
      <div class="h-1.5 my-1 rounded-full bg-[var(--color-line)] overflow-hidden" role="progressbar" :aria-valuenow="gemini.percent" aria-valuemin="0" aria-valuemax="100" aria-label="Pemakaian kuota Gemini">
        <div class="h-full bg-[var(--color-yolk)]" :style="{ width: gemini.percent + '%' }"></div>
      </div>
      <p>{{ gemini.used }} / {{ gemini.limit }} permintaan ({{ gemini.percent }}%) · reset sekitar 15.00 WIB.</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onUnmounted } from 'vue';
import { retryDeadline, resetDeadline, countdown } from '../lib/quotaClock.mjs';
import { quotaPercent } from '../lib/quotaPercent.mjs';
const props = defineProps({ data: { type: Object, required: true } });
const quota = computed(() => {
  const value = props.data.quota || [...(props.data.attempts || [])].reverse().find(item => item.provider === 'groq' && item.quota)?.quota;
  return value && Object.keys(value).length ? value : null;
});
// Gemini tidak mengirim header kuota; server menghitung perkiraan sendiri.
const gemini = computed(() => {
  const value = props.data.geminiUsage;
  return value && Number.isFinite(value.used) && Number.isFinite(value.limit) && value.limit > 0 ? value : null;
});
const visible = computed(() => Boolean(quota.value) || props.data.engine === 'groq' || Boolean(gemini.value));
const now = ref(Date.now());
const deadline = ref(null);
const requestDeadline = ref(null);
const tokenDeadline = ref(null);
const requestPercent = computed(() => quotaPercent(quota.value?.remainingRequests, quota.value?.limitRequests));
const tokenPercent = computed(() => quotaPercent(quota.value?.remainingTokens, quota.value?.limitTokens));
let timer;
watch(quota, value => {
  clearInterval(timer);
  now.value = Date.now();
  const observedAt = Number.isSafeInteger(value?.observedAt) && value.observedAt > 0 ? value.observedAt : null;
  deadline.value = observedAt === null ? null : retryDeadline(value?.retryAfter, observedAt);
  requestDeadline.value = observedAt === null ? null : resetDeadline(value?.resetRequests, observedAt);
  tokenDeadline.value = observedAt === null ? null : resetDeadline(value?.resetTokens, observedAt);
  const latest = Math.max(deadline.value || 0, requestDeadline.value || 0, tokenDeadline.value || 0);
  if (latest > now.value) {
    timer = setInterval(() => {
      now.value = Date.now();
      if (now.value >= latest) clearInterval(timer);
    }, 1000);
  }
}, { immediate: true });
const remaining = computed(() => countdown(deadline.value, now.value));
const requestReset = computed(() => countdown(requestDeadline.value, now.value));
const tokenReset = computed(() => countdown(tokenDeadline.value, now.value));
onUnmounted(() => clearInterval(timer));
</script>
