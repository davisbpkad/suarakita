/**
 * ApiClient - satu pintu ke endpoint backend.
 * Menyembunyikan fetch, penanganan status HTTP, dan pembacaan SSE dari komponen.
 */
export class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async _post(path, body, apiKey) {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-Api-Key'] = apiKey;
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw Object.assign(new Error(`HTTP error ${res.status}`), { status: res.status });
    return res.json();
  }

  /**
   * Kirim permintaan streaming dan panggil `onRaw(rawText)` tiap potongan tiba.
   * Mengembalikan hasil akhir terstruktur dari server.
   *
   * Kalau server tidak mendukung SSE (mis. Netlify Functions v1), balasan JSON
   * biasa diterima apa adanya sehingga fitur tetap jalan tanpa streaming.
   */
  async _stream(path, body, apiKey, onRaw, signal) {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-Api-Key'] = apiKey;
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(data.error || `HTTP error ${res.status}`), { status: res.status });
      return data;
    }
    if (!res.body) throw new Error('Streaming tidak didukung peramban ini.');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let raw = '';
    let result = null;
    let streamError = null;

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let index;
      while ((index = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);

        const line = frame.split('\n').find((l) => l.startsWith('data:'));
        if (!line) continue;

        let payload;
        try {
          payload = JSON.parse(line.slice(5).trim());
        } catch (e) {
          continue;
        }

        if (payload.delta) {
          raw += payload.delta;
          onRaw(raw);
        } else if (payload.result) {
          result = payload.result;
        } else if (payload.error) {
          streamError = payload.error;
        }
      }
    }

    if (streamError) throw new Error(streamError);
    if (!result) throw new Error('Respons streaming tidak lengkap.');
    return result;
  }

  async correctTranscript(text, apiKey, model, provider) {
    return this._post('/api/correct-transcript', { text, model, provider }, apiKey);
  }

  /**
   * Teks panjang dialihkan ke background function (balasan 202 + jobId).
   * Klien lalu mem-poll status sampai selesai.
   */
  async _awaitJob(jobId, signal) {
    for (let attempt = 0; attempt < 450; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (signal?.aborted) throw Object.assign(new Error('Dibatalkan.'), { name: 'AbortError' });
      const res = await fetch(`${this.baseUrl}/api/ai-job?id=${encodeURIComponent(jobId)}`, { signal });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status });
      if (data.status === 'done') return data.result;
      if (data.status === 'error') throw new Error(data.error || 'Pekerjaan gagal.');
    }
    throw new Error('Pekerjaan terlalu lama. Coba lagi dengan teks lebih pendek.');
  }

  async runAiAction(action, text, ai, signal, onJob) {
    if (!['correction', 'notes'].includes(action)) throw new Error('Aksi tidak dikenal.');
    const path = action === 'correction' ? '/api/correct-transcript' : '/api/meeting-notes';
    const result = await this._stream(path, { text, ai, stream: true }, '', () => {}, signal);
    if (result && result.jobId) {
      if (typeof onJob === 'function') onJob(result.jobId);
      return this._awaitJob(result.jobId, signal);
    }
    return result;
  }

  async generateMeetingNotes(text, apiKey, model, provider) {
    return this._post('/api/meeting-notes', { text, model, provider }, apiKey);
  }

  async correctTranscriptStream(text, apiKey, model, provider, onRaw) {
    return this._stream('/api/correct-transcript', { text, model, provider, stream: true }, apiKey, onRaw);
  }

  async generateMeetingNotesStream(text, apiKey, model, provider, onRaw) {
    return this._stream('/api/meeting-notes', { text, model, provider, stream: true }, apiKey, onRaw);
  }
}
