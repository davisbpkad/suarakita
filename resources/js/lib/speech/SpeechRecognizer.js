import { appendTranscriptCleanly } from '../text/transcript.mjs';

const Ctor = () => (typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null);

const MOBILE_UA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

/**
 * Pembungkus Web Speech API.
 *
 * Semua state sesi (restart, anti-ghost, penggabungan frasa) hidup di sini supaya
 * komponen UI cukup menerima callback. Engine STT tetap native browser, jadi
 * pembungkusan OOP ini tidak menyentuh jalur audio dan tidak menambah latensi.
 */
export class SpeechRecognizer {
  constructor({
    language,
    isMobile = MOBILE_UA.test(navigator.userAgent),
    onInterim = () => {},
    onFinal = () => {},
    onError = () => {},
    onEvent = () => {},
  } = {}) {
    this.language = language;
    this.isMobile = isMobile;
    this.onInterim = onInterim;
    this.onFinal = onFinal;
    this.onError = onError;
    this.onEvent = onEvent;

    this.active = false;
    this.recognition = null;
    this.restartTimer = null;
    this.lastFinalPhrase = '';
    this.lastFinalTimestamp = 0;
    this.sessionStartTime = 0;
  }

  static get supported() {
    return Boolean(Ctor());
  }

  setLanguage(code) {
    this.language = code;
    if (this.active && this.recognition) {
      try {
        this.recognition.lang = code;
        // Abort supaya engine restart dengan model akustik bahasa baru.
        this.recognition.abort();
      } catch (e) {
        // engine sudah berhenti; onend akan menyalakan ulang
      }
    }
  }

  start() {
    if (this.active) return true;
    if (!this._init()) return false;
    clearTimeout(this.restartTimer);
    this.lastFinalPhrase = '';
    this.lastFinalTimestamp = 0;
    this.sessionStartTime = Date.now();
    this.active = true;

    this.recognition.continuous = !this.isMobile;
    this.recognition.maxAlternatives = 1;
    this.recognition.interimResults = true;
    this.recognition.lang = this.language;
    try {
      this.recognition.start();
    } catch (error) {
      this.active = false;
      this.onEvent({ type: 'error', error: error.name || 'start-failed' });
      throw error;
    }
    return true;
  }

  stop() {
    this.active = false;
    clearTimeout(this.restartTimer);
    this.lastFinalPhrase = '';
    this.lastFinalTimestamp = 0;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // sudah berhenti
      }
    }
  }

  _init() {
    const SpeechRecognition = Ctor();
    if (!SpeechRecognition) return false;

    this.recognition = new SpeechRecognition();

    // Sesi pendek pada mobile; onend menyalakan ulang engine.
    this.recognition.continuous = !this.isMobile;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = this.language;

    const recognition = this.recognition;
    const current = () => this.active && this.recognition === recognition;
    for (const type of ['start', 'audiostart', 'speechstart', 'speechend', 'audioend']) {
      recognition['on' + type] = () => {
        if (current()) this.onEvent({ type });
      };
    }
    recognition.onresult = (event) => {
      if (!current()) return;
      this.onEvent({ type: 'result', count: event.results.length });
      this._handleResult(event);
    };
    recognition.onerror = (event) => {
      if (!current()) return;
      this.onEvent({ type: 'error', error: event.error });
      this._handleError(event);
    };
    recognition.onend = () => {
      if (!current()) return;
      this.onEvent({ type: 'end' });
      this._handleEnd();
    };
    return true;
  }

  _handleResult(event) {
    const now = Date.now();
    const previousFinalTimestamp = this.lastFinalTimestamp;
    let interim = '';
    let finalChunk = '';

    // Mulai dari event.resultIndex supaya hasil final lama tidak diproses ulang.
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const raw = result[0] ? result[0].transcript.trim() : '';
      if (!raw) continue;

      if (result.isFinal) {
        // Sisa buffer audio Android yang tiba persis setelah restart sesi.
        const isGhostReplay = this.isMobile
          && now - this.sessionStartTime < 400
          && this.lastFinalPhrase
          && raw.toLowerCase() === this.lastFinalPhrase.toLowerCase();
        if (isGhostReplay) continue;

        finalChunk = appendTranscriptCleanly(finalChunk, raw);
        this.lastFinalPhrase = raw;
        this.lastFinalTimestamp = now;
      } else {
        interim += (interim ? ' ' : '') + raw;
      }
    }

    this.onInterim(interim);
    if (finalChunk) {
      this.onFinal(finalChunk, previousFinalTimestamp ? now - previousFinalTimestamp : 0);
    }
  }

  _handleError(event) {
    if (event.error === 'no-speech' || event.error === 'aborted') return;
    this.onError(event.error);
  }

  _handleEnd() {
    if (!this.active || !this.recognition) return;
    clearTimeout(this.restartTimer);
    // Restart cepat agar mic tetap 'panas' dan tidak memotong kata pertama.
    this.restartTimer = setTimeout(() => this._restart(0), this.isMobile ? 15 : 10);
  }

  _restart(attempt) {
    if (!this.active || !this.recognition) return;
    try {
      this.sessionStartTime = Date.now();
      this.recognition.lang = this.language;
      this.recognition.start();
    } catch (e) {
      // Android sering butuh >40 ms melepas engine. Dulu hanya 2 percobaan,
      // lalu sesi mati diam-diam. Sekarang coba terus (maks 2 detik) selama aktif.
      if (attempt < 8) this.restartTimer = setTimeout(() => this._restart(attempt + 1), 40 * (attempt + 1));
      else {
        this.active = false;
        this.onEvent({ type: 'error', error: 'restart-failed' });
        this.onError('restart-failed');
      }
    }
  }
}
