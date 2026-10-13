import { rmsLevel, isQuiet } from './level.mjs';

/** Sinyal harus lemah selama ini sebelum peringatan muncul (hindari kedip saat jeda napas). */
const QUIET_HOLD_MS = 2500;

/** Ambang perubahan level yang layak dirender ulang (rAF ~60x/detik). */
const LEVEL_EPSILON = 0.005;

/**
 * MicMonitor - pemilik tunggal stream mikrofon.
 *
 * Mengukur level sinyal masuk lewat AnalyserNode dan melaporkannya ke UI, supaya
 * pengguna tahu saat suara terlalu pelan (engine Web Speech API tidak punya tuas
 * sensitivitas sendiri; levelnya ditentukan input OS).
 *
 * Catatan: stream ini TIDAK memberi makan SpeechRecognition (Chrome membuka
 * capture sendiri). Fungsinya mengukur, bukan menguatkan.
 */
export class MicMonitor {
  constructor({ onLevel = () => {}, onQuietChange = () => {} } = {}) {
    this.onLevel = onLevel;
    this.onQuietChange = onQuietChange;
    this.stream = null;
    this.ctx = null;
    this.raf = null;
    this.quietSince = 0;
    this.quiet = false;
    this.lastReported = -1;
  }

  /** Buka mikrofon dengan pembersih suara. Melempar error kalau izin ditolak. */
  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const source = this.ctx.createMediaStreamSource(this.stream);
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);

    this.quietSince = 0;
    this.quiet = false;
    this.lastReported = -1;
    this._tick(analyser, new Uint8Array(analyser.fftSize));
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.quietSince = 0;
    if (this.quiet) {
      this.quiet = false;
      this.onQuietChange(false);
    }
    if (this.stream) this.stream.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }

  _tick(analyser, buffer) {
    analyser.getByteTimeDomainData(buffer);
    const level = rmsLevel(buffer);

    if (Math.abs(level - this.lastReported) > LEVEL_EPSILON) {
      this.lastReported = level;
      this.onLevel(level);
    }

    const now = Date.now();
    if (isQuiet(level)) {
      if (!this.quietSince) this.quietSince = now;
      if (!this.quiet && now - this.quietSince >= QUIET_HOLD_MS) {
        this.quiet = true;
        this.onQuietChange(true);
      }
    } else {
      this.quietSince = 0;
      if (this.quiet) {
        this.quiet = false;
        this.onQuietChange(false);
      }
    }

    this.raf = requestAnimationFrame(() => this._tick(analyser, buffer));
  }
}
