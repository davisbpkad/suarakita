// Text-to-Speech, Voice-to-Text, Koreksi Transkrip & Notulen Rapat Client Logic

document.addEventListener('DOMContentLoaded', () => {
  const synth = window.speechSynthesis;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  // DOM Elements - Text Input & Counters
  const textInput = document.getElementById('textInput');
  const clearBtn = document.getElementById('clearBtn');
  const copyBtn = document.getElementById('copyBtn');
  const copyBtnText = document.getElementById('copyBtnText');
  const charCount = document.getElementById('charCount');
  const wordCount = document.getElementById('wordCount');
  const presetBtns = document.querySelectorAll('.preset-btn');

  // DOM Elements - Voice to Text (STT)
  const micBtn = document.getElementById('micBtn');
  const micBtnText = document.getElementById('micBtnText');
  const sttLangSelect = document.getElementById('sttLangSelect');
  const sttLiveBanner = document.getElementById('sttLiveBanner');
  const sttInterimText = document.getElementById('sttInterimText');
  const sttStopBannerBtn = document.getElementById('sttStopBannerBtn');

  // DOM Elements - Koreksi Transkrip (Transcript Correction)
  const correctBtn = document.getElementById('correctBtn');
  const correctBtnText = document.getElementById('correctBtnText');
  const correctionModal = document.getElementById('correctionModal');
  const closeCorrectionModalBtn = document.getElementById('closeCorrectionModalBtn');
  const correctionMethodBadge = document.getElementById('correctionMethodBadge');
  const modalOriginalText = document.getElementById('modalOriginalText');
  const modalCorrectedText = document.getElementById('modalCorrectedText');
  const modalChangesList = document.getElementById('modalChangesList');
  const modalApplyBtn = document.getElementById('modalApplyBtn');
  const modalListenBtn = document.getElementById('modalListenBtn');
  const modalCopyBtn = document.getElementById('modalCopyBtn');
  const modalCopyBtnText = document.getElementById('modalCopyBtnText');
  const modalCancelBtn = document.getElementById('modalCancelBtn');

  // DOM Elements - Notulen Rapat (Minutes of Meeting / MoM)
  const momBtn = document.getElementById('momBtn');
  const momBtnText = document.getElementById('momBtnText');
  const momModal = document.getElementById('momModal');
  const closeMomModalBtn = document.getElementById('closeMomModalBtn');
  const momMethodBadge = document.getElementById('momMethodBadge');
  const momTopic = document.getElementById('momTopic');
  const momKeyTakeaways = document.getElementById('momKeyTakeaways');
  const momDecisions = document.getElementById('momDecisions');
  const momActionItems = document.getElementById('momActionItems');
  const momListenBtn = document.getElementById('momListenBtn');
  const momCopyBtn = document.getElementById('momCopyBtn');
  const momCopyBtnText = document.getElementById('momCopyBtnText');
  const momDownloadMdBtn = document.getElementById('momDownloadMdBtn');

  // DOM Elements - Rekonstruksi Percakapan Multi-Pembicara
  const multiSpeakerBtn = document.getElementById('multiSpeakerBtn');
  const multiSpeakerBtnText = document.getElementById('multiSpeakerBtnText');
  const speakerModal = document.getElementById('speakerModal');
  const closeSpeakerModalBtn = document.getElementById('closeSpeakerModalBtn');
  const speakerMethodBadge = document.getElementById('speakerMethodBadge');
  const speaker1NameInput = document.getElementById('speaker1NameInput');
  const speaker2NameInput = document.getElementById('speaker2NameInput');
  const swapAllSpeakersBtn = document.getElementById('swapAllSpeakersBtn');
  const speakerTurnCount = document.getElementById('speakerTurnCount');
  const speakerDialogueContainer = document.getElementById('speakerDialogueContainer');
  const speakerListenBtn = document.getElementById('speakerListenBtn');
  const speakerCopyBtn = document.getElementById('speakerCopyBtn');
  const speakerCopyBtnText = document.getElementById('speakerCopyBtnText');
  const speakerDownloadMdBtn = document.getElementById('speakerDownloadMdBtn');
  const speakerCancelBtn = document.getElementById('speakerCancelBtn');
  const speakerApplyBtn = document.getElementById('speakerApplyBtn');

  // DOM Elements - AI Config Modal
  const aiConfigBtn = document.getElementById('aiConfigBtn');
  const aiConfigModal = document.getElementById('aiConfigModal');
  const closeAiConfigModalBtn = document.getElementById('closeAiConfigModalBtn');
  const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
  const saveAiKeyBtn = document.getElementById('saveAiKeyBtn');
  const removeAiKeyBtn = document.getElementById('removeAiKeyBtn');
  const aiKeyStatusDot = document.getElementById('aiKeyStatusDot');

  // DOM Elements - Download Transcript
  const downloadMenuBtn = document.getElementById('downloadMenuBtn');
  const downloadDropdown = document.getElementById('downloadDropdown');
  const downloadTxtBtn = document.getElementById('downloadTxtBtn');
  const downloadMdBtn = document.getElementById('downloadMdBtn');

  // DOM Elements - TTS Voice & Settings
  const voiceSelect = document.getElementById('voiceSelect');
  const voiceCount = document.getElementById('voiceCount');
  const rateSlider = document.getElementById('rateSlider');
  const rateValue = document.getElementById('rateValue');
  const pitchSlider = document.getElementById('pitchSlider');
  const pitchValue = document.getElementById('pitchValue');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeValue = document.getElementById('volumeValue');
  const resetRateBtn = document.getElementById('resetRateBtn');
  const resetPitchBtn = document.getElementById('resetPitchBtn');

  // DOM Elements - Playback & Visualization
  const speakBtn = document.getElementById('speakBtn');
  const speakBtnText = document.getElementById('speakBtnText');
  const pauseBtn = document.getElementById('pauseBtn');
  const pauseBtnText = document.getElementById('pauseBtnText');
  const stopBtn = document.getElementById('stopBtn');
  const statusBadge = document.getElementById('statusBadge');
  const waveVisualizer = document.getElementById('waveVisualizer');

  // DOM Elements - Highlighting & History
  const highlightContainer = document.getElementById('highlightContainer');
  const highlightContent = document.getElementById('highlightContent');
  const historyList = document.getElementById('historyList');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');

  let voices = [];
  let currentUtterance = null;
  let wordsArray = [];
  let latestCorrectionData = null;
  let latestMomData = null;
  let latestSpeakerData = null;

  // ==========================================
  // 1. POPULATE TTS VOICES
  // ==========================================
  function populateVoices() {
    if (!('speechSynthesis' in window)) return;
    voices = synth.getVoices();
    if (voices.length === 0) return;

    voiceSelect.innerHTML = '';
    voiceCount.textContent = `${voices.length} Suara`;

    const sortedVoices = [...voices].sort((a, b) => {
      const aIsId = a.lang.toLowerCase().startsWith('id');
      const bIsId = b.lang.toLowerCase().startsWith('id');
      if (aIsId && !bIsId) return -1;
      if (!aIsId && bIsId) return 1;

      const aIsEn = a.lang.toLowerCase().startsWith('en');
      const bIsEn = b.lang.toLowerCase().startsWith('en');
      if (aIsEn && !bIsEn) return -1;
      if (!aIsEn && bIsEn) return 1;

      return a.name.localeCompare(b.name);
    });

    let defaultSelectedIndex = 0;

    sortedVoices.forEach((voice, index) => {
      const option = document.createElement('option');
      option.value = voice.name;
      const isIndonesian = voice.lang.toLowerCase().startsWith('id');
      const tag = isIndonesian ? '🇮🇩 [Indonesia] ' : `[${voice.lang}] `;
      option.textContent = `${tag}${voice.name}`;

      if (isIndonesian && defaultSelectedIndex === 0) {
        defaultSelectedIndex = index;
      }
      voiceSelect.appendChild(option);
    });

    voiceSelect.selectedIndex = defaultSelectedIndex;
  }

  populateVoices();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoices;
  }

  // ==========================================
  // 2. COUNTERS, PRESETS & SLIDERS
  // ==========================================
  function updateStats() {
    const text = textInput.value;
    charCount.textContent = `${text.length} Karakter`;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    wordCount.textContent = `${words} Kata`;
  }
  textInput.addEventListener('input', updateStats);
  updateStats();

  clearBtn.addEventListener('click', () => {
    textInput.value = '';
    updateStats();
    stopSpeech();
    textInput.focus();
  });

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      textInput.value = btn.dataset.text;
      updateStats();
      stopSpeech();
      textInput.focus();
    });
  });

  rateSlider.addEventListener('input', () => {
    rateValue.textContent = `${parseFloat(rateSlider.value).toFixed(1)}x`;
  });
  resetRateBtn.addEventListener('click', () => {
    rateSlider.value = 1;
    rateValue.textContent = '1.0x';
  });

  pitchSlider.addEventListener('input', () => {
    pitchValue.textContent = parseFloat(pitchSlider.value).toFixed(1);
  });
  resetPitchBtn.addEventListener('click', () => {
    pitchSlider.value = 1;
    pitchValue.textContent = '1.0';
  });

  volumeSlider.addEventListener('input', () => {
    volumeValue.textContent = `${Math.round(volumeSlider.value * 100)}%`;
  });

  // ==========================================
  // 3. VOICE-TO-TEXT (SPEECH RECOGNITION / STT)
  // ==========================================
  let recognition = null;
  let isRecording = false;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      isRecording = true;
      micBtn.classList.add('recording-active');
      micBtn.classList.remove('bg-rose-600/80');
      micBtn.classList.add('bg-rose-600');
      micBtnText.textContent = 'Berhenti';
      sttLiveBanner.classList.remove('hidden');
      sttInterimText.textContent = 'Mendengarkan... Bicaralah sekarang.';
      stopSpeech();
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart + ' ';
        } else {
          interimTranscript += transcriptPart;
        }
      }

      if (finalTranscript) {
        const currentText = textInput.value;
        if (currentText.length > 0 && !currentText.endsWith(' ') && !currentText.endsWith('\n')) {
          textInput.value += ' ' + finalTranscript;
        } else {
          textInput.value += finalTranscript;
        }
        updateStats();
        textInput.scrollTop = textInput.scrollHeight;
      }

      if (interimTranscript) {
        sttInterimText.textContent = `"${interimTranscript.trim()}"`;
      } else {
        sttInterimText.textContent = 'Mendengarkan... Bicaralah sekarang.';
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('Akses mikrofon ditolak. Izinkan izin mikrofon di browser Anda untuk menggunakan fitur Voice to Text.');
      }
      stopRecording();
    };

    recognition.onend = () => {
      stopRecording();
    };
  } else {
    micBtn.title = 'Web Speech Recognition API tidak didukung di browser ini. Gunakan Google Chrome atau Edge.';
    micBtn.addEventListener('click', () => {
      alert('Browser Anda belum mendukung Speech Recognition native. Gunakan Google Chrome atau Microsoft Edge untuk fitur Voice-to-Text.');
    });
  }

  function startRecording() {
    if (!recognition) return;
    try {
      recognition.lang = sttLangSelect.value;
      recognition.start();
    } catch (err) {
      console.warn('Failed to start recognition:', err);
    }
  }

  function stopRecording() {
    isRecording = false;
    if (recognition) {
      try {
        recognition.stop();
      } catch (err) {}
    }
    micBtn.classList.remove('recording-active');
    micBtn.classList.remove('bg-rose-600');
    micBtn.classList.add('bg-rose-600/80');
    micBtnText.textContent = 'Mulai Dikte';
    sttLiveBanner.classList.add('hidden');
  }

  function toggleRecording() {
    if (!SpeechRecognition) {
      alert('Fitur Voice to Text membutuhkan browser modern seperti Google Chrome atau Edge.');
      return;
    }
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  micBtn.addEventListener('click', toggleRecording);
  sttStopBannerBtn.addEventListener('click', stopRecording);

  sttLangSelect.addEventListener('change', () => {
    if (isRecording) {
      stopRecording();
      setTimeout(startRecording, 300);
    }
  });

  // ==========================================
  // 4. KOREKSI TRANSKRIP (TRANSCRIPT CORRECTION)
  // ==========================================
  async function performTranscriptCorrection() {
    const rawText = textInput.value.trim();
    if (!rawText) {
      alert('Silakan tulis atau rekam teks transkrip terlebih dahulu sebelum melakukan koreksi.');
      textInput.focus();
      return;
    }

    correctBtn.disabled = true;
    const originalBtnHtml = correctBtn.innerHTML;
    correctBtn.innerHTML = `
      <svg class="w-3.5 h-3.5 animate-spin fill-current" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Menganalisis...</span>
    `;

    try {
      const apiKey = localStorage.getItem('gemini_api_key') || '';
      const response = await fetch('/api/correct-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText, apiKey })
      });

      if (!response.ok) {
        throw new Error('Gagal menghubungi server untuk koreksi transkrip.');
      }

      const data = await response.json();
      latestCorrectionData = data;

      modalOriginalText.textContent = data.originalText;
      modalCorrectedText.textContent = data.correctedText;

      if (data.method === 'gemini_ai') {
        correctionMethodBadge.textContent = '✨ Mode: AI Gemini 2.0 Flash';
        correctionMethodBadge.className = 'text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold';
      } else {
        correctionMethodBadge.textContent = '⚡ Mode: Mesin NLP Cerdas Lokal';
        correctionMethodBadge.className = 'text-[10px] px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold';
      }

      modalChangesList.innerHTML = '';
      if (data.changes && data.changes.length > 0) {
        data.changes.forEach(change => {
          const div = document.createElement('div');
          div.className = 'p-2 rounded-lg bg-white/5 border border-white/5 flex items-start gap-2 text-xs';
          div.innerHTML = `
            <span class="text-amber-400 font-bold shrink-0 mt-0.5">✓</span>
            <div>
              <span class="font-semibold text-slate-200">${change.title}</span>: 
              <span class="text-slate-400">${change.description}</span>
            </div>
          `;
          modalChangesList.appendChild(div);
        });
      } else {
        modalChangesList.innerHTML = `
          <div class="p-2 rounded-lg bg-white/5 text-slate-400 italic text-xs">
            Teks sudah bersih dan tidak ditemukan kesalahan ejaan atau kata jeda yang signifikan.
          </div>
        `;
      }

      correctionModal.classList.remove('hidden');

    } catch (err) {
      console.error('Error in correction:', err);
      alert('Terjadi kesalahan saat memproses koreksi transkrip: ' + err.message);
    } finally {
      correctBtn.disabled = false;
      correctBtn.innerHTML = originalBtnHtml;
    }
  }

  correctBtn.addEventListener('click', performTranscriptCorrection);

  function closeCorrectionModal() {
    correctionModal.classList.add('hidden');
  }

  closeCorrectionModalBtn.addEventListener('click', closeCorrectionModal);
  modalCancelBtn.addEventListener('click', closeCorrectionModal);

  modalApplyBtn.addEventListener('click', () => {
    if (latestCorrectionData && latestCorrectionData.correctedText) {
      textInput.value = latestCorrectionData.correctedText;
      updateStats();
      closeCorrectionModal();
      textInput.classList.add('ring-2', 'ring-emerald-500');
      setTimeout(() => {
        textInput.classList.remove('ring-2', 'ring-emerald-500');
      }, 1500);
    }
  });

  modalListenBtn.addEventListener('click', () => {
    if (latestCorrectionData && latestCorrectionData.correctedText) {
      textInput.value = latestCorrectionData.correctedText;
      updateStats();
      closeCorrectionModal();
      speak();
    }
  });

  modalCopyBtn.addEventListener('click', async () => {
    if (latestCorrectionData && latestCorrectionData.correctedText) {
      try {
        await navigator.clipboard.writeText(latestCorrectionData.correctedText);
        modalCopyBtnText.textContent = 'Tersalin! ✓';
        setTimeout(() => {
          modalCopyBtnText.textContent = 'Salin Hasil';
        }, 2000);
      } catch (err) {
        console.warn('Copy failed:', err);
      }
    }
  });

  // ==========================================
  // 5. NOTULEN RAPAT (MINUTES OF MEETING / MOM)
  // ==========================================
  async function performMeetingNotesGeneration() {
    const rawText = textInput.value.trim();
    if (!rawText) {
      alert('Silakan tulis atau rekam transkrip rapat terlebih dahulu sebelum membuat notulen.');
      textInput.focus();
      return;
    }

    momBtn.disabled = true;
    const originalBtnHtml = momBtn.innerHTML;
    momBtn.innerHTML = `
      <svg class="w-3.5 h-3.5 animate-spin fill-current" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Menganalisis...</span>
    `;

    try {
      const apiKey = localStorage.getItem('gemini_api_key') || '';
      const response = await fetch('/api/generate-meeting-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText, apiKey })
      });

      if (!response.ok) {
        throw new Error('Gagal menghubungi server untuk pembuatan notulen rapat.');
      }

      const data = await response.json();
      latestMomData = data;

      // Method badge
      if (data.method === 'gemini_ai') {
        momMethodBadge.textContent = '✨ Mode: AI Gemini 2.0 Flash';
        momMethodBadge.className = 'text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold';
      } else {
        momMethodBadge.textContent = '⚡ Mode: Mesin NLP Cerdas Lokal';
        momMethodBadge.className = 'text-[10px] px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold';
      }

      // Render 1: Topik / Konteks Pembicaraan
      momTopic.textContent = data.topic || 'Pembahasan koordinasi rapat kerja.';

      // Render 2: Poin-Poin Utama (Key Takeaways)
      momKeyTakeaways.innerHTML = '';
      if (data.keyTakeaways && data.keyTakeaways.length > 0) {
        data.keyTakeaways.forEach(item => {
          const li = document.createElement('li');
          li.className = 'flex items-start gap-2';
          li.innerHTML = `<span class="text-amber-400 font-bold shrink-0 mt-0.5">•</span><span>${item}</span>`;
          momKeyTakeaways.appendChild(li);
        });
      } else {
        // Jika dari AI, ekstrak atau tampilkan notulen
        momKeyTakeaways.innerHTML = `<li class="flex items-start gap-2"><span class="text-amber-400 font-bold shrink-0 mt-0.5">•</span><span>Informasi penting telah dirangkum dalam laporan notulen.</span></li>`;
      }

      // Render 3: Keputusan yang Diambil (Decisions Made)
      momDecisions.innerHTML = '';
      if (data.decisions && data.decisions.length > 0) {
        data.decisions.forEach(item => {
          const li = document.createElement('li');
          li.className = 'flex items-start gap-2';
          li.innerHTML = `<span class="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span><span>${item}</span>`;
          momDecisions.appendChild(li);
        });
      } else {
        momDecisions.innerHTML = `<li class="flex items-start gap-2"><span class="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span><span>Disepakati untuk melanjutkan implementasi sesuai hasil diskusi.</span></li>`;
      }

      // Render 4: Rencana Tindakan Lanjut (Action Items)
      momActionItems.innerHTML = '';
      if (data.actionItems && data.actionItems.length > 0) {
        data.actionItems.forEach(item => {
          const div = document.createElement('div');
          div.className = 'p-2.5 rounded-lg bg-white/5 border border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs';
          div.innerHTML = `
            <div class="flex items-start gap-2">
              <span class="text-purple-400 font-bold mt-0.5">📋</span>
              <span class="font-medium text-slate-100">${item.task}</span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">PIC: ${item.pic}</span>
              <span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">Tenggat: ${item.deadline}</span>
            </div>
          `;
          momActionItems.appendChild(div);
        });
      } else {
        momActionItems.innerHTML = `<p class="italic text-slate-400">Tidak ada penugasan atau tenggat waktu khusus yang tercatat.</p>`;
      }

      // Buka modal
      momModal.classList.remove('hidden');

    } catch (err) {
      console.error('Error generating MoM:', err);
      alert('Terjadi kesalahan saat memproses Notulen Rapat: ' + err.message);
    } finally {
      momBtn.disabled = false;
      momBtn.innerHTML = originalBtnHtml;
    }
  }

  momBtn.addEventListener('click', performMeetingNotesGeneration);

  function closeMomModal() {
    momModal.classList.add('hidden');
  }

  closeMomModalBtn.addEventListener('click', closeMomModal);

  // Copy MoM
  momCopyBtn.addEventListener('click', async () => {
    if (!latestMomData || !latestMomData.rawMarkdown) return;
    try {
      await navigator.clipboard.writeText(latestMomData.rawMarkdown);
      momCopyBtnText.textContent = 'Tersalin! ✓';
      setTimeout(() => {
        momCopyBtnText.textContent = 'Salin Notulen';
      }, 2000);
    } catch (err) {
      console.warn('Copy MoM failed:', err);
    }
  });

  // Download MoM (.md)
  momDownloadMdBtn.addEventListener('click', () => {
    if (!latestMomData || !latestMomData.rawMarkdown) return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const filename = `notulen_rapat_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}.md`;
    triggerDownload(latestMomData.rawMarkdown, filename, 'text/markdown;charset=utf-8');
  });

  // Listen to MoM via TTS
  momListenBtn.addEventListener('click', () => {
    if (!latestMomData) return;
    let spokenSummary = `Notulen Rapat. Topik: ${latestMomData.topic}. `;
    if (latestMomData.keyTakeaways && latestMomData.keyTakeaways.length > 0) {
      spokenSummary += `Poin-poin utama: ${latestMomData.keyTakeaways.join('. ')}. `;
    }
    if (latestMomData.decisions && latestMomData.decisions.length > 0) {
      spokenSummary += `Keputusan yang diambil: ${latestMomData.decisions.join('. ')}. `;
    }
    if (latestMomData.actionItems && latestMomData.actionItems.length > 0) {
      spokenSummary += `Rencana tindakan lanjut: ${latestMomData.actionItems.map(a => `${a.task}, penanggung jawab ${a.pic}, tenggat waktu ${a.deadline}`).join('. ')}.`;
    }

    closeMomModal();
    textInput.value = spokenSummary;
    updateStats();
    speak();
  });

  // ==========================================
  // 5.5 REKONSTRUKSI PERCAKAPAN MULTI-PEMBICARA
  // ==========================================
  async function performMultiSpeakerReconstruction() {
    const rawText = textInput.value.trim();
    if (!rawText) {
      alert('Silakan masukkan atau rekam percakapan terlebih dahulu.');
      textInput.focus();
      return;
    }

    const originalBtnHtml = multiSpeakerBtn.innerHTML;
    multiSpeakerBtn.disabled = true;
    multiSpeakerBtn.innerHTML = `
      <svg class="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Menganalisis Suara...</span>
    `;

    try {
      const apiKey = localStorage.getItem('gemini_api_key') || '';
      const response = await fetch('/api/reconstruct-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText, apiKey })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      latestSpeakerData = data;

      // Method badge
      if (data.method === 'gemini_ai') {
        speakerMethodBadge.textContent = '✨ Model AI Gemini';
        speakerMethodBadge.className = 'text-[10px] px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold';
      } else {
        speakerMethodBadge.textContent = '⚡ Mesin NLP Lokal';
        speakerMethodBadge.className = 'text-[10px] px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold';
      }

      // Ekstrak nama terdeteksi untuk mengisi input nama
      let s1InitialName = '';
      let s2InitialName = '';
      (data.speakers || []).forEach(spk => {
        const m1 = spk.match(/Suara\s*1\s*\(([^)]+)\)/i);
        if (m1) s1InitialName = m1[1];
        const m2 = spk.match(/Suara\s*2\s*\(([^)]+)\)/i);
        if (m2) s2InitialName = m2[1];
      });

      speaker1NameInput.value = s1InitialName;
      speaker2NameInput.value = s2InitialName;

      // Render timeline secara terstruktur dan interaktif
      renderSpeakerTimeline();

      speakerModal.classList.remove('hidden');

    } catch (err) {
      console.error('Error reconstructing conversation:', err);
      alert('Terjadi kesalahan saat merekonstruksi percakapan: ' + err.message);
    } finally {
      multiSpeakerBtn.disabled = false;
      multiSpeakerBtn.innerHTML = originalBtnHtml;
    }
  }

  // Render timeline giliran pembicara beserta fitur interaktif toggle & ganti nama
  function renderSpeakerTimeline() {
    if (!latestSpeakerData || !latestSpeakerData.dialogue) return;

    const s1CustomName = speaker1NameInput.value.trim();
    const s2CustomName = speaker2NameInput.value.trim();

    const turns = latestSpeakerData.dialogue;
    speakerTurnCount.textContent = `${turns.length} Giliran`;

    // Perbarui label pembicara pada setiap giliran
    turns.forEach(turn => {
      if (turn.speakerId === 1) {
        turn.speakerLabel = s1CustomName ? `Suara 1 (${s1CustomName})` : 'Suara 1';
      } else {
        turn.speakerLabel = s2CustomName ? `Suara 2 (${s2CustomName})` : 'Suara 2';
      }
    });

    // Perbarui formattedText
    latestSpeakerData.formattedText = turns
      .map(d => `**${d.speakerLabel}:** ${d.text}`)
      .join('\n\n');

    // Kosongkan dan buat elemen kartu percakapan
    speakerDialogueContainer.innerHTML = '';
    turns.forEach((turn, idx) => {
      const isSpeaker1 = turn.speakerId === 1;

      const turnCard = document.createElement('div');
      turnCard.className = `p-3.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
        isSpeaker1
          ? 'bg-cyan-950/20 border-cyan-500/30 shadow-sm shadow-cyan-500/5'
          : 'bg-emerald-950/20 border-emerald-500/30 shadow-sm shadow-emerald-500/5'
      }`;

      const badgeClass = isSpeaker1
        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30';

      turnCard.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="switch-turn-speaker-btn px-2.5 py-0.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 ${badgeClass}"
              data-turn-idx="${idx}"
              title="Klik untuk menukar giliran ini ke pembicara lain"
            >
              <span class="w-1.5 h-1.5 rounded-full ${isSpeaker1 ? 'bg-cyan-400' : 'bg-emerald-400'}"></span>
              <span>${turn.speakerLabel}</span>
              <span class="text-[10px] opacity-60 ml-0.5">⇄ Tukar</span>
            </button>
            <span class="text-[10px] text-slate-500 font-mono">#${idx + 1}</span>
          </div>
          <span class="text-[10px] text-slate-500">Klik label untuk memindahkan suara</span>
        </div>
        <p class="text-xs text-slate-100 leading-relaxed font-normal">${turn.text}</p>
      `;

      // Event listener klik tombol tukar per giliran
      const switchBtn = turnCard.querySelector('.switch-turn-speaker-btn');
      switchBtn.addEventListener('click', () => {
        turn.speakerId = turn.speakerId === 1 ? 2 : 1;
        renderSpeakerTimeline();
      });

      speakerDialogueContainer.appendChild(turnCard);
    });
  }

  // Event listener tombol tukar seluruh pembicara (Swap Suara 1 & 2 secara global)
  swapAllSpeakersBtn.addEventListener('click', () => {
    if (!latestSpeakerData || !latestSpeakerData.dialogue) return;

    // Tukar nilai input nama
    const tempName = speaker1NameInput.value;
    speaker1NameInput.value = speaker2NameInput.value;
    speaker2NameInput.value = tempName;

    // Tukar ID pembicara pada setiap giliran
    latestSpeakerData.dialogue.forEach(turn => {
      turn.speakerId = turn.speakerId === 1 ? 2 : 1;
    });

    renderSpeakerTimeline();
  });

  // Event listener live input saat pengguna mengetik nama pembicara
  speaker1NameInput.addEventListener('input', renderSpeakerTimeline);
  speaker2NameInput.addEventListener('input', renderSpeakerTimeline);

  multiSpeakerBtn.addEventListener('click', performMultiSpeakerReconstruction);

  function closeSpeakerModal() {
    speakerModal.classList.add('hidden');
  }

  closeSpeakerModalBtn.addEventListener('click', closeSpeakerModal);
  speakerCancelBtn.addEventListener('click', closeSpeakerModal);

  // Copy Dialogue
  speakerCopyBtn.addEventListener('click', async () => {
    if (!latestSpeakerData || !latestSpeakerData.formattedText) return;
    try {
      await navigator.clipboard.writeText(latestSpeakerData.formattedText);
      speakerCopyBtnText.textContent = 'Tersalin! ✓';
      setTimeout(() => {
        speakerCopyBtnText.textContent = 'Salin Dialog';
      }, 2000);
    } catch (err) {
      console.warn('Copy dialogue failed:', err);
    }
  });

  // Download Dialogue (.md)
  speakerDownloadMdBtn.addEventListener('click', () => {
    if (!latestSpeakerData || !latestSpeakerData.formattedText) return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const filename = `percakapan_multi_pembicara_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}.md`;
    
    const mdContent = `# Rekonstruksi Percakapan Multi-Pembicara

- **Waktu Pembuatan:** ${now.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
- **Daftar Pembicara:** ${(latestSpeakerData.speakers || []).join(', ')}
- **Jumlah Giliran:** ${(latestSpeakerData.dialogue || []).length}

---

${latestSpeakerData.formattedText}

---
*Dibuat menggunakan SuaraKita · Localhost Multi-Speaker Conversation Reconstruction*
`;

    triggerDownload(mdContent, filename, 'text/markdown;charset=utf-8');
  });

  // Apply Reconstructed Dialogue to Text Input
  speakerApplyBtn.addEventListener('click', () => {
    if (!latestSpeakerData || !latestSpeakerData.formattedText) return;
    textInput.value = latestSpeakerData.formattedText;
    updateStats();
    closeSpeakerModal();
    textInput.focus();
  });

  // Listen to Reconstructed Dialogue via TTS
  speakerListenBtn.addEventListener('click', () => {
    if (!latestSpeakerData || !latestSpeakerData.formattedText) return;
    closeSpeakerModal();
    textInput.value = latestSpeakerData.formattedText;
    updateStats();
    speak();
  });

  // ==========================================
  // 6. PENGATURAN KUNCI API AI (OPSIONAL)
  // ==========================================
  function updateApiKeyStatus() {
    const key = localStorage.getItem('gemini_api_key');
    if (key && key.trim()) {
      aiKeyStatusDot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400';
      aiConfigBtn.title = 'Kunci API AI Aktif (Gemini 2.0 Flash)';
    } else {
      aiKeyStatusDot.className = 'w-1.5 h-1.5 rounded-full bg-slate-500';
      aiConfigBtn.title = 'Pengaturan Kunci API AI (Opsional untuk LLM Gemini)';
    }
  }

  aiConfigBtn.addEventListener('click', () => {
    geminiApiKeyInput.value = localStorage.getItem('gemini_api_key') || '';
    aiConfigModal.classList.remove('hidden');
  });

  closeAiConfigModalBtn.addEventListener('click', () => {
    aiConfigModal.classList.add('hidden');
  });

  saveAiKeyBtn.addEventListener('click', () => {
    const val = geminiApiKeyInput.value.trim();
    if (val) {
      localStorage.setItem('gemini_api_key', val);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
    updateApiKeyStatus();
    aiConfigModal.classList.add('hidden');
  });

  removeAiKeyBtn.addEventListener('click', () => {
    localStorage.removeItem('gemini_api_key');
    geminiApiKeyInput.value = '';
    updateApiKeyStatus();
    aiConfigModal.classList.add('hidden');
  });

  updateApiKeyStatus();

  // ==========================================
  // 7. DOWNLOAD TRANSCRIPT & COPY
  // ==========================================
  downloadMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    downloadDropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    downloadDropdown.classList.add('hidden');
  });

  function getFormattedTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
  }

  function triggerDownload(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    downloadDropdown.classList.add('hidden');
  }

  downloadTxtBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (!text) {
      alert('Teks transkrip masih kosong.');
      return;
    }
    const filename = `transkrip_${getFormattedTimestamp()}.txt`;
    triggerDownload(text, filename, 'text/plain;charset=utf-8');
  });

  downloadMdBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (!text) {
      alert('Teks transkrip masih kosong.');
      return;
    }
    const words = text.split(/\s+/).length;
    const dateStr = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });

    const mdContent = `# Transkrip Suara

- **Tanggal & Waktu:** ${dateStr}
- **Jumlah Kata:** ${words} kata
- **Jumlah Karakter:** ${text.length} karakter

---

## Isi Transkrip

${text}

---
*Dibuat menggunakan SuaraKita · Localhost Text-to-Speech & Voice-to-Text*
`;

    const filename = `transkrip_${getFormattedTimestamp()}.md`;
    triggerDownload(mdContent, filename, 'text/markdown;charset=utf-8');
  });

  copyBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    if (!text) {
      alert('Teks transkrip masih kosong.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      copyBtnText.textContent = 'Tersalin! ✓';
      copyBtn.classList.add('text-emerald-400', 'border-emerald-500/30');
      setTimeout(() => {
        copyBtnText.textContent = 'Salin';
        copyBtn.classList.remove('text-emerald-400', 'border-emerald-500/30');
      }, 2000);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  });

  // ==========================================
  // 8. LIVE WORD HIGHLIGHTING & TTS PLAYBACK
  // ==========================================
  function prepareHighlightWords(text) {
    highlightContent.innerHTML = '';
    const tokens = text.split(/(\s+)/);
    let charOffset = 0;
    wordsArray = [];

    tokens.forEach(token => {
      const span = document.createElement('span');
      span.textContent = token;
      span.dataset.start = charOffset;
      span.dataset.end = charOffset + token.length;

      if (token.trim().length > 0) {
        wordsArray.push({
          start: charOffset,
          end: charOffset + token.length,
          element: span
        });
      }
      highlightContent.appendChild(span);
      charOffset += token.length;
    });

    highlightContainer.classList.remove('hidden');
  }

  function highlightWordAt(charIndex) {
    wordsArray.forEach(item => {
      if (charIndex >= item.start && charIndex < item.end) {
        item.element.classList.add('speaking-word');
      } else {
        item.element.classList.remove('speaking-word');
      }
    });
  }

  function clearHighlights() {
    wordsArray.forEach(item => {
      item.element.classList.remove('speaking-word');
    });
    highlightContainer.classList.add('hidden');
  }

  function setStatus(state) {
    if (state === 'speaking') {
      statusBadge.textContent = 'Sedang Berbicara...';
      statusBadge.className = 'text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30';
      waveVisualizer.classList.add('speaking');
      speakBtn.classList.add('from-emerald-600', 'to-teal-600');
      speakBtn.classList.remove('from-blue-600', 'to-indigo-600');
      speakBtnText.textContent = 'Ulangi';
      pauseBtn.disabled = false;
      stopBtn.disabled = false;
      pauseBtnText.textContent = 'Jeda';
    } else if (state === 'paused') {
      statusBadge.textContent = 'Dijeda';
      statusBadge.className = 'text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30';
      waveVisualizer.classList.remove('speaking');
      pauseBtnText.textContent = 'Lanjutkan';
    } else {
      statusBadge.textContent = 'Siap';
      statusBadge.className = 'text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-white/5';
      waveVisualizer.classList.remove('speaking');
      speakBtn.classList.remove('from-emerald-600', 'to-teal-600');
      speakBtn.classList.add('from-blue-600', 'to-indigo-600');
      speakBtnText.textContent = 'Bicara';
      pauseBtn.disabled = true;
      stopBtn.disabled = true;
      pauseBtnText.textContent = 'Jeda';
      clearHighlights();
    }
  }

  function speak() {
    const text = textInput.value.trim();
    if (!text) {
      alert('Silakan masukkan teks terlebih dahulu!');
      return;
    }

    if (isRecording) {
      stopRecording();
    }

    if (synth.paused) {
      synth.resume();
      setStatus('speaking');
      return;
    }

    if (synth.speaking) {
      synth.cancel();
    }

    prepareHighlightWords(text);

    currentUtterance = new SpeechSynthesisUtterance(text);
    const selectedVoiceName = voiceSelect.value;
    const selectedVoice = voices.find(v => v.name === selectedVoiceName);
    if (selectedVoice) {
      currentUtterance.voice = selectedVoice;
    }

    currentUtterance.rate = parseFloat(rateSlider.value);
    currentUtterance.pitch = parseFloat(pitchSlider.value);
    currentUtterance.volume = parseFloat(volumeSlider.value);

    currentUtterance.onstart = () => {
      setStatus('speaking');
      saveToHistory(text);
    };

    currentUtterance.onboundary = (event) => {
      if (event.name === 'word') {
        highlightWordAt(event.charIndex);
      }
    };

    currentUtterance.onend = () => {
      setStatus('ready');
    };

    currentUtterance.onerror = (e) => {
      console.warn('Speech error:', e);
      setStatus('ready');
    };

    synth.speak(currentUtterance);
  }

  function pauseSpeech() {
    if (synth.speaking && !synth.paused) {
      synth.pause();
      setStatus('paused');
    } else if (synth.paused) {
      synth.resume();
      setStatus('speaking');
    }
  }

  function stopSpeech() {
    if (synth.speaking || synth.paused) {
      synth.cancel();
    }
    setStatus('ready');
  }

  speakBtn.addEventListener('click', speak);
  pauseBtn.addEventListener('click', pauseSpeech);
  stopBtn.addEventListener('click', stopSpeech);

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      speak();
    }
    if (e.key === 'Escape') {
      stopSpeech();
      if (isRecording) stopRecording();
      closeCorrectionModal();
      closeMomModal();
      aiConfigModal.classList.add('hidden');
    }
  });

  // ==========================================
  // 9. HISTORY MANAGEMENT
  // ==========================================
  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem('tts_history')) || [];
    } catch {
      return [];
    }
  }

  function saveToHistory(text) {
    let history = getHistory();
    history = history.filter(item => item !== text);
    history.unshift(text);
    if (history.length > 5) history.pop();
    localStorage.setItem('tts_history', JSON.stringify(history));
    renderHistory();
  }

  function renderHistory() {
    const history = getHistory();
    if (history.length === 0) {
      historyList.innerHTML = '<p class="text-xs text-slate-500 italic">Belum ada riwayat bicara.</p>';
      return;
    }

    historyList.innerHTML = '';
    history.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'group flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-xs cursor-pointer';
      
      const snippet = item.length > 35 ? item.substring(0, 35) + '...' : item;
      div.innerHTML = `
        <span class="truncate text-slate-300 group-hover:text-blue-300">${snippet}</span>
        <button class="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-300 font-medium ml-2 shrink-0">
          ▶ Putar
        </button>
      `;

      div.addEventListener('click', () => {
        textInput.value = item;
        updateStats();
        speak();
      });

      historyList.appendChild(div);
    });
  }

  clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem('tts_history');
    renderHistory();
  });

  renderHistory();
});
