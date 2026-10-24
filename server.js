const express = require('express');
const path = require('path');
const { correctTranscriptWithNLP, correctTranscriptWithAI, correctTranscriptStream } = require('./corrector.js');
const { generateMeetingNotesWithNLP, generateMeetingNotesWithAI, generateMeetingNotesStream } = require('./meetingNotes.js');

const app = express();
const PORT = process.env.PORT || 3000;

/** Batas panjang teks masuk, selaras dengan fungsi Netlify. */
const MAX_TEXT_LENGTH = 50000;

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Server-Sent Events -------------------------------------------------
function startSse(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
}

function sseSend(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/**
 * Jalankan `run(onDelta)` sambil mengalirkan potongan ke klien, lalu kirim hasil akhir.
 * Semua error diterjemahkan jadi event, bukan response 500, karena header SSE
 * sudah terkirim saat error bisa terjadi.
 */
async function streamResponse(res, run, errorMessage) {
  startSse(res);
  try {
    const result = await run((delta) => sseSend(res, { delta }));
    sseSend(res, { result });
  } catch (err) {
    console.error(errorMessage, err);
    sseSend(res, { error: errorMessage });
  }
  sseSend(res, { done: true });
  res.end();
}

// Health check / API status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    app: 'SuaraKita - Voice to Text, Transcript Correction & Meeting Minutes',
    time: new Date().toISOString()
  });
});

// Endpoint Koreksi Transkrip (Transcript Correction)
app.post('/api/correct-transcript', async (req, res) => {
  const { text, model, provider, stream } = req.body || {};
  const apiKey = req.headers['x-api-key'] || req.body?.apiKey || '';
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Teks transkrip tidak boleh kosong.' });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(413).json({ error: `Teks terlalu panjang (maks ${MAX_TEXT_LENGTH} karakter).` });
  }

  if (stream) {
    return streamResponse(
      res,
      (onDelta) => correctTranscriptStream(text, { apiKey, model, provider }, onDelta),
      'Gagal melakukan koreksi transkrip.'
    );
  }

  try {
    const effectiveApiKey = apiKey;
    res.json(await correctTranscriptWithAI(text, effectiveApiKey, model, provider));
  } catch (err) {
    console.error('Error correcting transcript:', err);
    res.status(500).json({ error: 'Gagal melakukan koreksi transkrip.' });
  }
});

// Endpoint Notulen Rapat (Minutes of Meeting / MoM)
app.post(['/api/meeting-notes', '/api/generate-meeting-notes'], async (req, res) => {
  const { text, model, provider, stream } = req.body || {};
  const apiKey = req.headers['x-api-key'] || req.body?.apiKey || '';
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Teks transkrip rapat tidak boleh kosong.' });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(413).json({ error: `Teks terlalu panjang (maks ${MAX_TEXT_LENGTH} karakter).` });
  }

  if (stream) {
    return streamResponse(
      res,
      (onDelta) => generateMeetingNotesStream(text, { apiKey, model, provider }, onDelta),
      'Gagal membuat notulen rapat.'
    );
  }

  try {
    // Bersihkan transkrip terlebih dahulu sebelum diekstraksi notulennya
    const cleanedText = correctTranscriptWithNLP(text).correctedText || text;
    const effectiveApiKey = apiKey;
    res.json(await generateMeetingNotesWithAI(cleanedText, effectiveApiKey, model, provider));
  } catch (err) {
    console.error('Error generating meeting notes:', err);
    res.status(500).json({ error: 'Gagal membuat notulen rapat.' });
  }
});

// Start Express server
app.listen(PORT, () => {
  console.log(`Server SuaraKita aktif di http://localhost:${PORT}`);
});
