/**
 * ApiClient - satu pintu ke endpoint backend.
 * Menyembunyikan fetch, penanganan status HTTP, dan pembacaan SSE dari komponen.
 */
export class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async _post(path, body) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  }

  /**
   * Kirim permintaan streaming dan panggil `onRaw(rawText)` tiap potongan tiba.
   * Mengembalikan hasil akhir terstruktur dari server.
   *
   * Kalau server tidak mendukung SSE (mis. Netlify Functions v1), balasan JSON
   * biasa diterima apa adanya sehingga fitur tetap jalan tanpa streaming.
   */
  async _stream(path, body, onRaw) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP error ${res.status}`);
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
    return this._post('/api/correct-transcript', { text, apiKey, model, provider });
  }

  async generateMeetingNotes(text, apiKey, model, provider) {
    return this._post('/api/meeting-notes', { text, apiKey, model, provider });
  }

  async correctTranscriptStream(text, apiKey, model, provider, onRaw) {
    return this._stream('/api/correct-transcript', { text, apiKey, model, provider, stream: true }, onRaw);
  }

  async generateMeetingNotesStream(text, apiKey, model, provider, onRaw) {
    return this._stream('/api/meeting-notes', { text, apiKey, model, provider, stream: true }, onRaw);
  }
}
