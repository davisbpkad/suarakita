const { existsSync } = require('node:fs');
const { loadEnvFile } = require('node:process');
if (existsSync(require('node:path').join(__dirname, '.env'))) loadEnvFile(require('node:path').join(__dirname, '.env'));
const express = require('express');
const { serverAiOptions, audioParts, transcribeAudio } = require('./lib/serverAi.js');
const path = require('path');
const { validateRequest } = require('./lib/requestValidation.js');
const { runAiAction } = require('./lib/aiActions.js');
const { validOrigin } = require('./lib/requestOrigin.js');
const { createRequestLimit } = require('./lib/requestLimit.js');
const { correctTranscriptWithNLP, correctTranscriptWithAI, correctTranscriptStream } = require('./corrector.js');
const { generateMeetingNotesWithNLP, generateMeetingNotesWithAI, generateMeetingNotesStream } = require('./meetingNotes.js');

const app = express();
const PORT = process.env.PORT || 3088;
const acquireRequest = createRequestLimit();

/** Batas panjang teks masuk, selaras dengan fungsi Netlify. */
const MAX_TEXT_LENGTH = 50000;

// Middleware
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=(self)',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  });
  next();
});
app.use((req, res, next) => {
  const host = req.get('host');
  if (![`127.0.0.1:${PORT}`, `localhost:${PORT}`].includes(host)) {
    return res.status(403).set('Cache-Control', 'no-store').json({ error: 'Host tidak diizinkan.' });
  }
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!validOrigin(req.get('origin'), `${req.protocol}://${req.get('host')}`)) return res.status(403).json({ error: 'Origin tidak diizinkan.' });
  if (req.method === 'POST') {
    const invalid = req.path === '/transcribe' ? null : validateRequest(req.body);
    if (invalid) return res.status(invalid.status).json({ error: invalid.error });
    const release = acquireRequest();
    if (!release) return res.status(429).set('Retry-After', '60').json({ error: 'Batas request lokal tercapai. Coba lagi nanti.' });
    res.once('close', release);
    res.once('finish', release);
  }
  next();
});
app.use('/api', (req, res, next) => {
  const controller = new AbortController();
  req.aiSignal = controller.signal;
  res.on('close', () => { if (!res.writableEnded) controller.abort(); });
  next();
});

// --- Server-Sent Events -------------------------------------------------
function startSse(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store, no-transform',
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
    serverAi: { gemini: Boolean(process.env.GEMINI_API_KEY), groq: Boolean(process.env.GROQ_API_KEY) },
    app: 'SuaraKita - Voice to Text, Transcript Correction & Meeting Minutes',
    time: new Date().toISOString()
  });
});

app.post('/api/transcribe', express.raw({ type: 'audio/*', limit: '10mb' }), async (req, res) => {
  let parts;
  try { parts = audioParts(req.body, req.get('content-type')?.split(';')[0]); }
  catch { return res.status(400).json({ error: 'Audio kosong, terlalu besar, atau format tidak didukung.' }); }
  if (!process.env.GROQ_API_KEY) return res.status(503).json({ error: 'Key Groq belum dikonfigurasi di server.' });
  try {
    const language = req.get('x-audio-language') || 'id';
    if (!/^[a-z]{2,3}(-[A-Za-z]{2,8})?$/.test(language)) return res.status(400).json({ error: 'Bahasa audio tidak valid.' });
    res.json(await transcribeAudio(req.body, req.get('content-type').split(';')[0], { apiKey: process.env.GROQ_API_KEY, language, signal: req.aiSignal }));
  } catch (error) {
    res.status(error.status === 429 ? 429 : 502).json({ error: 'Transkripsi Groq gagal. Periksa koneksi, kuota, atau akses akun.', providerStatus: error.status || null });
  }
});

// Endpoint Koreksi Transkrip (Transcript Correction)
app.post('/api/correct-transcript', async (req, res) => {
  const { text, model, provider, stream } = req.body || {};
  const apiKey = req.headers['x-api-key'] || req.body?.apiKey || '';
  if (process.env.GROQ_API_KEY || req.body.ai !== undefined) {
    const options = { ...(process.env.GROQ_API_KEY ? serverAiOptions() : req.body.ai), signal: req.aiSignal };
    if (stream) return streamResponse(res, () => runAiAction('correction', text, options), 'Gagal melakukan koreksi transkrip.');
    try { return res.json(await runAiAction('correction', text, options)); }
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
  if (process.env.GROQ_API_KEY || req.body.ai !== undefined) {
    const options = { ...(process.env.GROQ_API_KEY ? serverAiOptions() : req.body.ai), signal: req.aiSignal };
    if (stream) return streamResponse(res, () => runAiAction('notes', text, options), 'Gagal membuat notulen rapat.');
    try { return res.json(await runAiAction('notes', text, options)); }
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
