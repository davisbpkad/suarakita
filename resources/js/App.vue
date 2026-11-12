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
      @logout="logout"
      @login="showLogin = true"
      :authenticated="authenticated"
    />

    <!-- ====== MAIN CONTENT (Minimalist, Compact, Single-Viewport UX) ====== -->
    <main class="wrap flex-1 flex flex-col gap-4 pb-8 lg:pb-10">
      <!-- Header Title & Subtitle (Compact) -->
      <section class="text-center pt-1 sm:pt-3 flex flex-col items-center gap-1.5">
        <h1 class="display hero-title text-2xl sm:text-3xl lg:text-[2.25rem] text-[var(--color-ink)] max-w-2xl mx-auto">
          <span>Bicara bebas,</span>
          <span class="hero-highlight bg-[var(--color-yolk)] px-2 py-0.5 rounded-lg">jadi teks instan.</span>
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
        :show-mic-level="MicMonitor.supported"
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
      <details v-if="diagnosticsEnabled" open class="rounded-xl border border-[var(--color-muted)] p-3 text-xs">
        <summary class="font-semibold cursor-pointer">Diagnostik pengenalan suara</summary>
        <p>supported: {{ SpeechRecognizer.supported }} · secure: {{ secureContext }} · bahasa: {{ currentLanguage }}</p>
        <p class="break-words">{{ userAgent }}</p>
        <pre class="mt-2 max-h-56 overflow-auto whitespace-pre-wrap">{{ speechEvents.join('\n') || 'Tekan Rekam untuk memulai.' }}</pre>
      </details>
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
      :notice="jobNotice"
      :data="correctionData"
      @close="closeCorrection"
      @apply="applyCorrection"
    />

    <MeetingNotesModal
      v-if="showMomModal"
      :loading="loadingAction === 'mom'"
      :notice="jobNotice"
      :data="momData"
      @close="closeNotes"
      @download="downloadMomMarkdown"
    />

    <LoginModal
      v-if="showLogin"
      @close="showLogin = false"
      @success="onLoginSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import AppHeader from './components/AppHeader.vue';
import TranscriptWorkspace from './components/TranscriptWorkspace.vue';
import CorrectionModal from './components/CorrectionModal.vue';
import MeetingNotesModal from './components/MeetingNotesModal.vue';
import LoginModal from './components/LoginModal.vue';
import { SpeechRecognizer } from './lib/speech/SpeechRecognizer.js';
import { MicMonitor } from './lib/audio/MicMonitor.js';
import { appendTranscriptCleanly, paragraphize } from './lib/text/transcript.mjs';
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
const diagnosticsEnabled = new URLSearchParams(window.location.search).get('diag') === '1';
const userAgent = navigator.userAgent;
const secureContext = window.isSecureContext;
const speechEvents = ref([]);
function logSpeechEvent(event) {
  if (!diagnosticsEnabled) return;
  // Jangan simpan audio atau isi transkrip dalam diagnostik.
  speechEvents.value = [...speechEvents.value.slice(-79), `${new Date().toISOString()} ${event.type}${event.error ? ': ' + event.error : ''}${event.count !== undefined ? ' results=' + event.count : ''}`];
}

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
  onEvent: logSpeechEvent,
  onInterim: (text) => {
    interimSpeech.value = text;
  },
  onFinal: (chunk, gapMs) => {
    transcriptText.value = appendTranscriptCleanly(transcriptText.value, chunk, gapMs);
    autoScrollTick.value++;
  },
  onError: (error) => {
    console.warn('Speech recognition error:', error);
    stopRecording();
    if (error === 'not-allowed') {
      alert('Izin akses mikrofon tidak diizinkan. Silakan aktifkan izin mikrofon pada browser Anda.');
    } else if (error === 'network') {
      alert('Layanan pengenalan suara tidak terhubung. Periksa jaringan lalu rekam lagi.');
    } else if (error === 'audio-capture' || error === 'restart-failed') {
      alert('Mikrofon tidak terbaca atau dipakai aplikasi lain. Tutup aplikasi lain lalu rekam lagi.');
    } else if (error === 'service-not-allowed') {
      alert('Layanan pengenalan suara diblokir. Periksa izin browser dan Siri & Dikte pada iPhone. Jika tetap gagal, coba Safari.');
    } else if (error === 'language-not-supported') {
      alert('Bahasa ini tidak didukung layanan pengenalan suara. Pilih bahasa lain lalu rekam lagi.');
    } else {
      alert('Pengenalan suara gagal: ' + error);
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

function startRecording() {
  if (loadingAction.value || isRecording.value) return;
  if (!SpeechRecognizer.supported) {
    logSpeechEvent({ type: 'error', error: 'unsupported' });
    alert('Browser ini tidak mendukung pengenalan suara. Pada iPhone, coba Safari. Pada Android atau komputer, coba Chrome terbaru.');
    return;
  }

  try {
    isRecording.value = true;
    recordingSeconds.value = 0;
    interimSpeech.value = '';
    logSpeechEvent({ type: 'start-request' });
    // Mulai langsung dari klik pengguna, tanpa menunggu izin getUserMedia.
    if (!recognizer.start()) {
      stopRecording();
      return;
    }
    if (!isRecording.value) return;

    if (MicMonitor.supported) {
      micMonitor.start().then(() => {
        if (!isRecording.value) micMonitor.stop();
      }).catch((err) => {
        micMonitor.stop();
        logSpeechEvent({ type: 'meter-error', error: err.name || 'unknown' });
      });
    }

    timerInterval = setInterval(() => {
      recordingSeconds.value++;
    }, 1000);
  } catch (err) {
    console.error('Error starting recognition:', err);
    stopRecording();
    alert('Tidak bisa memulai pengenalan suara: ' + err.message);
  }
}

function stopRecording() {
  logSpeechEvent({ type: 'stop-request' });
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
const loadingAction = ref(null);
const jobNotice = ref('');
const api = new ApiClient();
let actionController;
let pendingRetry = null;
const showLogin = ref(false);
// Sesi diketahui dari server supaya label header benar sebelum aksi pertama.
const session = ref(null);
const authenticated = computed(() => Boolean(session.value));

onMounted(async () => {
  try {
    const response = await fetch('/api/status', { credentials: 'same-origin' });
    const data = await response.json();
    session.value = data.session || null;
  } catch {
    // Status tidak terjangkau: anggap belum masuk.
  }
});

function closeCorrection() { actionController?.abort(); showCorrectionModal.value = false; }
function closeNotes() { actionController?.abort(); showMomModal.value = false; }

/** 401 berarti sesi belum ada/kedaluwarsa; aksi disimpan untuk diulang setelah masuk. */
function handleAuthError(err, retry) {
  if (err.status !== 401) return false;
  session.value = null;
  pendingRetry = retry;
  showLogin.value = true;
  return true;
}

function onLoginSuccess() {
  session.value = session.value || { username: '' };
  showLogin.value = false;
  const retry = pendingRetry;
  pendingRetry = null;
  retry?.();
}

function logout() {
  actionController?.abort();
  pendingRetry = null;
  session.value = null;
  showLogin.value = true;
  // keepalive: request tetap selesai walau pengguna langsung menutup/memuat ulang tab.
  fetch('/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', keepalive: true, credentials: 'same-origin' })
    .catch(() => {});
}

onUnmounted(() => {
  actionController?.abort();
  if (timerInterval) clearInterval(timerInterval);
  recognizer.stop();
  micMonitor.stop();
});

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
    correctionData.value = await api.runAiAction('correction', text, {}, actionController.signal, () => {
      jobNotice.value = 'Transkrip panjang diproses di latar. Bisa memakan waktu beberapa menit.';
    });
  } catch (err) {
    if (err.name === 'AbortError') return;
    showCorrectionModal.value = false;
    if (handleAuthError(err, runCorrection)) return;
    // Pesan batas panjang sudah final dari server; jangan dibungkus kalimat kesalahan umum.
    if (err.status === 413) return alert(err.message);
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
    momData.value = await api.runAiAction('notes', text, {}, actionController.signal, () => {
      jobNotice.value = 'Transkrip panjang diproses di latar. Bisa memakan waktu beberapa menit.';
    });
  } catch (err) {
    if (err.name === 'AbortError') return;
    showMomModal.value = false;
    if (handleAuthError(err, runMeetingNotes)) return;
    if (err.status === 413) return alert(err.message);
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
