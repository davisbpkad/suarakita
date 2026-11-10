<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader
      :languages="availableLanguages"
      :current-language="currentLanguage"
      :current-lang="currentLangObj"
      :transcript="transcriptText"
      @select-language="setLanguage"
      @clear="clearTranscript"
      @download="downloadTranscript"
    />

    <!-- ====== MAIN CONTENT (Minimalist, Compact, Single-Viewport UX) ====== -->
    <main class="wrap flex-1 flex flex-col gap-4 pb-8 lg:pb-10">
      <!-- Header Title & Subtitle (Compact) -->
      <section class="text-center pt-1 sm:pt-3 flex flex-col items-center gap-1.5">
        <h1 class="display text-2xl sm:text-3xl lg:text-[2.25rem] text-[var(--color-ink)] max-w-2xl mx-auto">
          <span>Bicara bebas, </span>
          <span class="bg-[var(--color-yolk)] px-2 py-0.5 rounded-lg box-decoration-clone">jadi teks instan.</span>
        </h1>
        <p class="text-[var(--color-muted)] text-xs sm:text-sm max-w-lg leading-relaxed">
          Rekam suara, koreksi transkrip otomatis, dan buat notulen rapat — semua dalam satu tempat.
        </p>
      </section>

      <TranscriptWorkspace
        v-model="transcriptText"
        :is-recording="isRecording"
        :interim-speech="interimSpeech"
        :mic-level="micLevel"
        :mic-quiet="micQuiet"
        :current-lang="currentLangObj"
        :loading-action="loadingAction"
        :formatted-recording-time="formattedRecordingTime"
        :char-count="charCount"
        :word-count="wordCount"
        :auto-scroll-tick="autoScrollTick"
        @toggle-recording="toggleRecording"
        @correct="runCorrection"
        @meeting-notes="runMeetingNotes"
        @preset="loadPreset"
      />
    </main>

    <!-- ====== FOOTER ====== -->
    <footer class="wrap py-6 flex items-center justify-center gap-2 text-sm text-[var(--color-muted)]">
      <a href="/" class="group inline-flex items-center gap-2">
        <img
          :src="'/favicon.png'"
          alt="suarakita logo"
          class="w-[16px] h-[16px] rounded-full group-hover:scale-110 transition-transform"
        />
      </a>
      <p>© 2026 suarakita</p>
    </footer>

    <CorrectionModal
      v-if="showCorrectionModal"
      :loading="loadingAction === 'correction'"
      :data="correctionData"
      @close="closeCorrection"
      @apply="applyCorrection"
    />

    <MeetingNotesModal
      v-if="showMomModal"
      :loading="loadingAction === 'mom'"
      :data="momData"
      @close="closeNotes"
      @download="downloadMomMarkdown"
    />

    <AiConfigModal
      v-if="showAiConfigModal && !serverManaged"
      v-model:provider="selectedProvider"
      v-model:api-key="geminiApiKey"
      v-model:model="selectedGeminiModel"
      v-model:groq-key="groqApiKey"
      v-model:groq-model="selectedGroqModel"
      v-model:allow-groq="allowGroq"
      :session-counts="sessionCounts"
      @close="showAiConfigModal = false"
      @save="saveApiKey"
      @remove="removeApiKey"
    />
    <div v-if="showAiConfigModal && serverManaged" class="modal-overlay" @click.self="showAiConfigModal = false" @keydown.esc="showAiConfigModal = false">
      <section role="dialog" aria-modal="true" aria-labelledby="server-ai-title" class="modal-panel flex flex-col gap-5 text-[var(--color-ink)]">
        <h2 id="server-ai-title" class="font-bold text-lg">Pengaturan AI</h2>
        <div class="rounded-2xl bg-[var(--color-cream)] p-4 text-sm leading-relaxed space-y-3">
          <p><strong>Pengetikan langsung:</strong> pengenalan suara browser. Teks muncul selama Anda berbicara.</p>
          <p><strong>Koreksi dan notulen:</strong> Groq GPT-OSS 120B. Key dikelola server, tidak perlu diisi di sini.</p>
        </div>
        <p class="text-sm leading-relaxed text-[var(--color-muted)]">Teks dikirim ke Groq saat koreksi atau notulen dipilih. Pengenalan suara browser dapat membutuhkan internet.</p>
        <button autofocus class="btn-primary self-end" @click="showAiConfigModal = false">Tutup</button>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import AppHeader from './components/AppHeader.vue';
import TranscriptWorkspace from './components/TranscriptWorkspace.vue';
import CorrectionModal from './components/CorrectionModal.vue';
import MeetingNotesModal from './components/MeetingNotesModal.vue';
import AiConfigModal from './components/AiConfigModal.vue';
import { SpeechRecognizer } from './lib/speech/SpeechRecognizer.js';
import { MicMonitor } from './lib/audio/MicMonitor.js';
import { appendTranscriptCleanly, paragraphize } from './lib/text/transcript.mjs';
import { LANGUAGES, DEFAULT_LANGUAGE, findLanguage } from './lib/speech/languages.js';
import { ApiClient } from './lib/api/client.js';
import { triggerDownload, fileTimestamp } from './lib/utils/download.js';
import PROVIDERS from '../../lib/providers.json';
import { removeLegacyKey } from './lib/keyStorage.mjs';
import { countAttempts } from './lib/quotaClock.mjs';

const DEFAULT_PROVIDER = 'gemini';

// -------------------------------------------------------------
// STATE: TRANSCRIPT WORKSPACE
// -------------------------------------------------------------
const transcriptText = ref('');
// Dinaikkan tiap frasa final STT tiba; hanya itu yang memicu auto-scroll.
const autoScrollTick = ref(0);

const wordCount = computed(() => {
  const t = transcriptText.value.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
});

const charCount = computed(() => transcriptText.value.length);

// -------------------------------------------------------------
// STATE: VOICE TO TEXT (STT) - HERO FOCUS
// -------------------------------------------------------------
const isRecording = ref(false);
const interimSpeech = ref('');
const recordingSeconds = ref(0);
const micLevel = ref(0);
const micQuiet = ref(false);
let timerInterval = null;
const serverManaged = ref(false);

const availableLanguages = LANGUAGES;
const currentLanguage = ref(DEFAULT_LANGUAGE);
const currentLangObj = computed(() => findLanguage(currentLanguage.value));

const formattedRecordingTime = computed(() => {
  const mins = Math.floor(recordingSeconds.value / 60);
  const secs = recordingSeconds.value % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(mins)}:${pad(secs)}`;
});

// Engine STT: seluruh state sesi hidup di SpeechRecognizer. Komponen hanya
// menerima callback, jadi mengganti engine nanti tidak menyentuh template.
const recognizer = new SpeechRecognizer({
  language: DEFAULT_LANGUAGE,
  onInterim: (text) => {
    interimSpeech.value = text;
  },
  onFinal: (chunk, gapMs) => {
    transcriptText.value = appendTranscriptCleanly(transcriptText.value, chunk, gapMs);
    autoScrollTick.value++;
  },
  onError: (error) => {
    console.warn('Speech recognition error:', error);
    if (error === 'not-allowed') {
      alert('Izin akses mikrofon tidak diizinkan. Silakan aktifkan izin mikrofon pada browser Anda.');
      stopRecording();
    }
  },
});

// Pengukur level mic. Ini yang memberi tahu pengguna kalau suaranya terlalu pelan;
// engine STT sendiri tidak punya tuas sensitivitas.
const micMonitor = new MicMonitor({
  onLevel: (level) => { micLevel.value = level; },
  onQuietChange: (quiet) => { micQuiet.value = quiet; },
});

function setLanguage(code) {
  currentLanguage.value = code;
  if (isRecording.value) recognizer.setLanguage(code);
}

function toggleRecording() {
  if (isRecording.value) {
    stopRecording();
  } else {
    startRecording();
  }
}

async function startRecording() {
  if (loadingAction.value) return;
  if (!SpeechRecognizer.supported) {
    alert('Browser Anda belum mendukung Web Speech Recognition API. Silakan gunakan Google Chrome, Edge, atau browser Chromium modern.');
    return;
  }

  // Panggilan ini yang meminta izin mic dan menyalakan meter level.
  try {
    await micMonitor.start();
  } catch (err) {
    alert('Tidak bisa mengakses mikrofon: ' + err.message);
    return;
  }

  try {
    await recognizer.start();
    isRecording.value = true;
    recordingSeconds.value = 0;
    interimSpeech.value = '';

    timerInterval = setInterval(() => {
      recordingSeconds.value++;
    }, 1000);
  } catch (err) {
    console.error('Error starting recognition:', err);
    isRecording.value = false;
  }
}

function stopRecording() {
  isRecording.value = false;
  interimSpeech.value = '';
  micLevel.value = 0;
  micQuiet.value = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  recognizer.stop();
  micMonitor.stop();
}

// -------------------------------------------------------------
// STATE: API KEY & ACTION STATE
// -------------------------------------------------------------
const showAiConfigModal = ref(false);
const geminiApiKey = ref('');
const groqApiKey = ref('');
const allowGroq = ref(false);
const sessionCounts = ref({ gemini: 0, groq: 0 });
const selectedGroqModel = ref(PROVIDERS.groq.models[0].id);
const selectedProvider = ref(DEFAULT_PROVIDER);
const selectedGeminiModel = ref(PROVIDERS[DEFAULT_PROVIDER].models[0].id);
const hasApiKey = computed(() => serverManaged.value || Boolean(geminiApiKey.value.trim() || (allowGroq.value && groqApiKey.value.trim())));
const loadingAction = ref(null);
const api = new ApiClient();
let actionController;
function closeCorrection() { actionController?.abort(); showCorrectionModal.value = false; }
function closeNotes() { actionController?.abort(); showMomModal.value = false; }

function aiOptions() {
  if (serverManaged.value) return {};
  return {
    geminiKey: geminiApiKey.value,
    geminiModel: selectedGeminiModel.value,
    groqKey: allowGroq.value ? groqApiKey.value : '',
    groqModel: selectedGroqModel.value,
    allowGroq: allowGroq.value,
  };
}

onMounted(() => {
  fetch('/api/status').then(response => response.json()).then(status => {
    serverManaged.value = Boolean(status.serverAi?.groq);
  }).catch(() => {});
  try {
  removeLegacyKey(localStorage);
  selectedProvider.value = DEFAULT_PROVIDER;
  const storedModel = localStorage.getItem('gemini_model');
  const provider = PROVIDERS[selectedProvider.value] || PROVIDERS[DEFAULT_PROVIDER];
  // Buang model tersimpan yang tidak dikenal provider aktif (mis. sisa provider lama).
  selectedGeminiModel.value = provider.models.some((m) => m.id === storedModel)
    ? storedModel
    : provider.models[0].id;
  } catch {
    // Browser storage is optional; keys are never persisted.
  }
});

onUnmounted(() => {
  actionController?.abort();
  if (timerInterval) clearInterval(timerInterval);
  recognizer.stop();
  micMonitor.stop();
});

function saveApiKey() {
  geminiApiKey.value = geminiApiKey.value.trim();
  groqApiKey.value = groqApiKey.value.trim();
  try {
  localStorage.setItem('gemini_model', selectedGeminiModel.value);
  localStorage.setItem('llm_provider', selectedProvider.value);
  removeLegacyKey(localStorage);
  } catch {
    // Settings remain usable when browser storage is disabled.
  }
  showAiConfigModal.value = false;
}

function removeApiKey() {
  geminiApiKey.value = '';
  groqApiKey.value = '';
  allowGroq.value = false;
  try { removeLegacyKey(localStorage); } catch { /* Storage may be unavailable. */ }
  showAiConfigModal.value = false;
}

// -------------------------------------------------------------
// PRESETS
// -------------------------------------------------------------
function loadPreset(type) {
  if (type === 'mom') {
    transcriptText.value =
      'Selamat pagi rekan-rekan semua, mari kita mulai meeting hari ini. Bagaimana progresnya Andi? Andi melaporkan integrasi API payment gateway sudah mencapai 80%. Lalu ada kendala apa di tim developer? Andi menyampaikan ada kendala latensi server staging yang sempat time out. Bagaimana dengan Rina dari tim Desain? Rina menyampaikan desain mockup versi mobile sudah selesai 100% dan sudah diserahkan ke developer. Dian dari Pemasaran melaporkan draf kampanye media sosial sudah disiapkan dengan anggaran Rp 2.500.000. Untuk keputusan akhir, Andi tolong pastikan perbaikan bug latensi server selesai besok sore. Lalu Dian siapkan draf konten promosi paling lambat H-7 sebelum peluncuran. Sekian dari saya, terima kasih atas kerjasamanya.';
  } else if (type === 'correction') {
    transcriptText.value =
      'eh anu apakah kita biaya hadir di ruang setting besok pagi jam sembilan saya saya mau bahas hasil kordinasi dgn tim';
  }
}

// -------------------------------------------------------------
// INTELLIGENCE 1: KOREKSI TRANSKRIP
// -------------------------------------------------------------
const showCorrectionModal = ref(false);
const correctionData = ref({
  originalText: '',
  correctedText: '',
  changes: [],
  method: 'nlp_builtin'
});

async function runCorrection() {
  if (loadingAction.value) return;
  const text = transcriptText.value.trim();
  if (!text) {
    alert('Silakan masukkan atau rekam transkrip terlebih dahulu.');
    return;
  }

  // Modal dibuka lebih dulu supaya teks koreksi bisa muncul bertahap saat streaming.
  correctionData.value = { originalText: text, correctedText: '', changes: [], method: 'nlp_builtin' };
  showCorrectionModal.value = true;
  loadingAction.value = 'correction';
  actionController = new AbortController();

  try {
    correctionData.value = await api.runAiAction('correction', text, aiOptions(), actionController.signal);
    sessionCounts.value = countAttempts(sessionCounts.value, correctionData.value.attempts);
  } catch (err) {
    if (err.name === 'AbortError') return;
    showCorrectionModal.value = false;
    alert('Terjadi kesalahan saat mengoreksi teks: ' + err.message);
  } finally {
    loadingAction.value = null;
  }
}

function applyCorrection() {
  if (correctionData.value.correctedText) {
    // Paragraf 400 kata dipertahankan supaya hasil koreksi tetap mudah dipilah.
    transcriptText.value = paragraphize(correctionData.value.correctedText);
  }
  showCorrectionModal.value = false;
}

// -------------------------------------------------------------
// INTELLIGENCE 2: NOTULEN RAPAT (MOM)
// -------------------------------------------------------------
const showMomModal = ref(false);
const momData = ref({
  topic: '',
  summary: '',
  summaryItems: [],
  decisions: [],
  rawMarkdown: '',
  method: 'nlp_builtin'
});

async function runMeetingNotes() {
  if (loadingAction.value) return;
  const text = transcriptText.value.trim();
  if (!text) {
    alert('Silakan masukkan atau rekam transkrip terlebih dahulu.');
    return;
  }

  // Modal dibuka lebih dulu supaya notulen bisa muncul bertahap saat streaming.
  momData.value = { topic: '', summary: '', summaryItems: [], decisions: [], rawMarkdown: '', method: 'nlp_builtin' };
  showMomModal.value = true;
  loadingAction.value = 'mom';
  actionController = new AbortController();

  try {
    momData.value = await api.runAiAction('notes', text, aiOptions(), actionController.signal);
    sessionCounts.value = countAttempts(sessionCounts.value, momData.value.attempts);
  } catch (err) {
    if (err.name === 'AbortError') return;
    showMomModal.value = false;
    alert('Terjadi kesalahan saat memproses Notulen Rapat: ' + err.message);
  } finally {
    loadingAction.value = null;
  }
}

function downloadMomMarkdown() {
  if (!momData.value.rawMarkdown) return;
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const filename = `notulen_rapat_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.md`;
  triggerDownload(momData.value.rawMarkdown, filename, 'text/markdown;charset=utf-8');
}

// -------------------------------------------------------------
// UTILITY: DOWNLOAD & CLEAR
// -------------------------------------------------------------
function clearTranscript() {
  transcriptText.value = '';
}

function downloadTranscript(type) {
  const text = transcriptText.value.trim();
  if (!text) {
    alert('Teks transkrip masih kosong.');
    return;
  }
  const now = new Date();
  const timestamp = fileTimestamp(now);

  if (type === 'txt') {
    triggerDownload(text, `transkrip_${timestamp}.txt`, 'text/plain;charset=utf-8');
  } else {
    const md = `# Transkrip Suara\n\n- **Tanggal:** ${now.toLocaleString('id-ID')}\n- **Jumlah Kata:** ${wordCount.value}\n\n---\n\n${text}\n`;
    triggerDownload(md, `transkrip_${timestamp}.md`, 'text/markdown;charset=utf-8');
  }
}
</script>
