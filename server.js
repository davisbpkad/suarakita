const express = require('express');
const path = require('path');
const { validateRequest } = require('./lib/requestValidation.js');
const { runAiAction } = require('./lib/aiActions.js');
const { correctTranscriptWithNLP, correctTranscriptWithAI, correctTranscriptStream } = require('./corrector.js');
const { generateMeetingNotesWithNLP, generateMeetingNotesWithAI, generateMeetingNotesStream } = require('./meetingNotes.js');

const app = express();
const PORT = process.env.PORT || 3088;

/** Batas panjang teks masuk, selaras dengan fungsi Netlify. */
const MAX_TEXT_LENGTH = 50000;

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.method === 'POST') {
    const invalid = validateRequest(req.body);
    if (invalid) return res.status(invalid.status).json({ error: invalid.error });
  }
  next();
});

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
    console.error(errorMessage);
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
  if (req.body.ai !== undefined) {
    if (stream) return streamResponse(res, () => runAiAction('correction', text, req.body.ai), 'Gagal melakukan koreksi transkrip.');
    try { return res.json(await runAiAction('correction', text, req.body.ai)); }
    catch { return res.status(502).json({ error: 'Gagal melakukan koreksi transkrip.' }); }
  }
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
    console.error('Error correcting transcript.');
    res.status(500).json({ error: 'Gagal melakukan koreksi transkrip.' });
  }
});

// Endpoint Notulen Rapat (Minutes of Meeting / MoM)
app.post(['/api/meeting-notes', '/api/generate-meeting-notes'], async (req, res) => {
  const { text, model, provider, stream } = req.body || {};
  const apiKey = req.headers['x-api-key'] || req.body?.apiKey || '';
  if (req.body.ai !== undefined) {
    if (stream) return streamResponse(res, () => runAiAction('notes', text, req.body.ai), 'Gagal membuat notulen rapat.');
    try { return res.json(await runAiAction('notes', text, req.body.ai)); }
    catch { return res.status(502).json({ error: 'Gagal membuat notulen rapat.' }); }
  }
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
    const cleanedText = text;
    const effectiveApiKey = apiKey;
    res.json(await generateMeetingNotesWithAI(cleanedText, effectiveApiKey, model, provider));
  } catch (err) {
    console.error('Error generating meeting notes.');
    res.status(500).json({ error: 'Gagal membuat notulen rapat.' });
  }
});

// Start Express server
app.use((err, req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.status(err.type === 'entity.too.large' ? 413 : 400).json({ error: 'Request tidak valid.' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server SuaraKita aktif di http://localhost:${PORT}`);
});
