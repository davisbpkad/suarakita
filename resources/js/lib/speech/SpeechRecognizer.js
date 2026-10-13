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
  } = {}) {
    this.language = language;
    this.isMobile = isMobile;
    this.onInterim = onInterim;
    this.onFinal = onFinal;
    this.onError = onError;

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

  /**
   * Minta izin mikrofon dengan pembersih suara sebelum STT mulai.
   *
   * ponytail: best-effort. Chrome membuat stream sendiri untuk SpeechRecognition,
   * jadi constraint ini hanya dijamin memberi izin lebih awal + pesan error jelas,
   * bukan menjamin kualitas audio mesin STT. Ukur dulu kalau mau naikkan klaimnya.
   */
  async prepareMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    stream.getTracks().forEach((track) => track.stop());
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

  async start() {
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
    this.recognition.start();
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

    // Android/Samsung: continuous HARUS false. Engine SpeechRecognizer OS hanya
    // mendukung satu frasa per sesi; continuous=true memicu resultIndex=0 dan
    // duplikasi kata 5-7x. Desktop continuous=true lancar tanpa jeda restart.
    this.recognition.continuous = !this.isMobile;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = this.language;

    this.recognition.onresult = (event) => this._handleResult(event);
    this.recognition.onerror = (event) => this._handleError(event);
    this.recognition.onend = () => this._handleEnd();
    return true;
  }

  _handleResult(event) {
    const now = Date.now();
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
      this.onFinal(finalChunk, now - this.lastFinalTimestamp);
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
      // Audio subsystem belum selesai unbind; coba sekali lagi.
      if (attempt === 0) setTimeout(() => this._restart(1), 40);
    }
  }
}
