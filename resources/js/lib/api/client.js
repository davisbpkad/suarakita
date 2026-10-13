/**
 * ApiClient - satu pintu ke endpoint backend.
 * Menyembunyikan fetch + penanganan status HTTP dari komponen.
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

  correctTranscript(text, apiKey, model) {
    return this._post('/api/correct-transcript', { text, apiKey, model });
  }

  generateMeetingNotes(text, apiKey, model) {
    return this._post('/api/meeting-notes', { text, apiKey, model });
  }
}
