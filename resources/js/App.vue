<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader
      :languages="availableLanguages"
      :current-language="currentLanguage"
      :current-lang="currentLangObj"
      :has-api-key="hasApiKey"
      :transcript="transcriptText"
      @select-language="setLanguage"
      @open-ai-config="showAiConfigModal = true"
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
    <footer class="wrap py-6 flex items-center justify-between text-sm text-[var(--color-muted)]">
      <a href="/" class="group inline-flex items-center gap-2">
        <span class="w-[14px] h-[14px] rounded-full bg-[var(--color-yolk)] group-hover:scale-110 transition-transform"></span>
        <span class="font-bold text-base tracking-tight text-[var(--color-ink)]">suarakita</span>
      </a>
      <p>© {{ new Date().getFullYear() }} suarakita</p>
    </footer>

    <CorrectionModal
      v-if="showCorrectionModal"
      :data="correctionData"
      @close="showCorrectionModal = false"
      @apply="applyCorrection"
    />

    <MeetingNotesModal
      v-if="showMomModal"
      :data="momData"
      @close="showMomModal = false"
      @download="downloadMomMarkdown"
    />

    <AiConfigModal
      v-if="showAiConfigModal"
      v-model:api-key="geminiApiKey"
      v-model:model="selectedGeminiModel"
      @close="showAiConfigModal = false"
      @save="saveApiKey"
      @remove="removeApiKey"
    />
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
import { appendTranscriptCleanly } from './lib/text/transcript.mjs';
import { LANGUAGES, DEFAULT_LANGUAGE, findLanguage } from './lib/speech/languages.js';
import { ApiClient } from './lib/api/client.js';
import { triggerDownload, fileTimestamp } from './lib/utils/download.js';

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
const selectedGeminiModel = ref('gemini-2.5-flash');
const hasApiKey = computed(() => Boolean(geminiApiKey.value && geminiApiKey.value.trim()));
const loadingAction = ref(null);
const api = new ApiClient();

onMounted(() => {
  geminiApiKey.value = localStorage.getItem('gemini_api_key') || '';
  selectedGeminiModel.value = localStorage.getItem('gemini_model') || 'gemini-2.5-flash';
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
  recognizer.stop();
  micMonitor.stop();
});

function saveApiKey() {
  localStorage.setItem('gemini_api_key', geminiApiKey.value.trim());
  localStorage.setItem('gemini_model', selectedGeminiModel.value);
  showAiConfigModal.value = false;
}

function removeApiKey() {
  geminiApiKey.value = '';
  localStorage.removeItem('gemini_api_key');
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
  const text = transcriptText.value.trim();
  if (!text) {
    alert('Silakan masukkan atau rekam transkrip terlebih dahulu.');
    return;
  }

  loadingAction.value = 'correction';
  try {
    correctionData.value = await api.correctTranscript(
      text,
      geminiApiKey.value,
      selectedGeminiModel.value
    );
    showCorrectionModal.value = true;
  } catch (err) {
    alert('Terjadi kesalahan saat mengoreksi teks: ' + err.message);
  } finally {
    loadingAction.value = null;
  }
}

function applyCorrection() {
  if (correctionData.value.correctedText) {
    transcriptText.value = correctionData.value.correctedText;
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
  const text = transcriptText.value.trim();
  if (!text) {
    alert('Silakan masukkan atau rekam transkrip terlebih dahulu.');
    return;
  }

  loadingAction.value = 'mom';
  try {
    momData.value = await api.generateMeetingNotes(
      text,
      geminiApiKey.value,
      selectedGeminiModel.value
    );
    showMomModal.value = true;
  } catch (err) {
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
