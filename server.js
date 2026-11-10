const { existsSync } = require('node:fs');
const { loadEnvFile } = require('node:process');
if (existsSync(require('node:path').join(__dirname, '.env'))) loadEnvFile(require('node:path').join(__dirname, '.env'));
const express = require('express');
const { serverAiOptions } = require('./lib/serverAi.js');
const path = require('path');
const { validateRequest } = require('./lib/requestValidation.js');
const { runAiAction } = require('./lib/aiActions.js');
const { validOrigin } = require('./lib/requestOrigin.js');
const { createRequestLimit } = require('./lib/requestLimit.js');
const { issueToken, verifyToken, verifyPassword, passwordUsable, TTL_MS } = require('./lib/auth.js');
const { correctTranscriptWithNLP, correctTranscriptWithAI, correctTranscriptStream } = require('./corrector.js');
const { generateMeetingNotesWithNLP, generateMeetingNotesWithAI, generateMeetingNotesStream } = require('./meetingNotes.js');

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3088;
const acquireRequest = createRequestLimit();
const acquireIngress = createRequestLimit({ maxRequests: 120, maxActive: 8 });
const acquireLogin = createRequestLimit({ maxRequests: 10, maxActive: 2 });

/** Password bersama + sesi cookie; tanpa APP_PASSWORD endpoint AI menolak (fail closed). */
const APP_PASSWORD = process.env.APP_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || APP_PASSWORD;
const SESSION_COOKIE = 'sk_sess';
const PROTECTED_PATHS = new Set(['/correct-transcript', '/meeting-notes', '/generate-meeting-notes']);

function readCookie(header, name) {
  if (typeof header !== 'string') return '';
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return '';
}

/** Batas panjang teks masuk, selaras dengan fungsi Netlify. */
const MAX_TEXT_LENGTH = 50000;

// Middleware
app.use((req, res, next) => {
  clearTimeout(req.socket.headerDeadline);
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
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!validOrigin(req.get('origin'), `${req.protocol}://${req.get('host')}`)) return res.status(403).json({ error: 'Origin tidak diizinkan.' });
  if (req.path === '/transcribe') return res.status(410).json({ error: 'Endpoint audio dinonaktifkan. Gunakan pengenalan suara browser.' });
  if (req.method === 'POST') {
    const release = acquireIngress();
    if (!release) return res.status(429).set('Retry-After', '60').json({ error: 'Batas request lokal tercapai. Coba lagi nanti.' });
    res.once('close', release);
    res.once('finish', release);
  }
  next();
});
app.use('/api', (req, res, next) => {
  if (!PROTECTED_PATHS.has(req.path)) return next();
  if (!passwordUsable(APP_PASSWORD)) return res.status(503).json({ error: 'APP_PASSWORD belum diatur di .env.' });
  if (!verifyToken(SESSION_SECRET, readCookie(req.headers.cookie, SESSION_COOKIE))) {
    return res.status(401).json({ error: 'Perlu masuk dengan password bersama.' });
  }
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!validOrigin(req.get('origin'), `${req.protocol}://${req.get('host')}`)) return res.status(403).json({ error: 'Origin tidak diizinkan.' });
  if (req.method === 'POST') {
    const invalid = PROTECTED_PATHS.has(req.path) ? validateRequest(req.body) : null;
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
app.post('/api/login', (req, res) => {
  const release = acquireLogin();
  if (!release) return res.status(429).set('Retry-After', '60').json({ error: 'Terlalu banyak percobaan masuk. Coba lagi nanti.' });
  res.once('close', release);
  res.once('finish', release);
  if (!passwordUsable(APP_PASSWORD)) return res.status(503).json({ error: 'APP_PASSWORD belum diatur di .env (minimal 12 karakter).' });
  if (!verifyPassword(APP_PASSWORD, req.body?.password)) return res.status(401).json({ error: 'Password salah.' });
  // ponytail: tambah `secure: true` saat disajikan lewat HTTPS.
  res.cookie(SESSION_COOKIE, issueToken(SESSION_SECRET), { httpOnly: true, sameSite: 'strict', path: '/', maxAge: TTL_MS });
  res.json({ ok: true });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    serverAi: { gemini: Boolean(process.env.GEMINI_API_KEY), groq: Boolean(process.env.GROQ_API_KEY) },
    authRequired: passwordUsable(APP_PASSWORD),
    app: 'SuaraKita - Voice to Text, Transcript Correction & Meeting Minutes',
    time: new Date().toISOString()
  });
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
      (onDelta) => correctTranscriptStream(text, { apiKey, model, provider, signal: req.aiSignal }, onDelta),
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
      (onDelta) => generateMeetingNotesStream(text, { apiKey, model, provider, signal: req.aiSignal }, onDelta),
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

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server SuaraKita aktif di http://localhost:${PORT}`);
});
server.headersTimeout = 15000;
server.requestTimeout = 30000;
server.setTimeout(45000, socket => socket.destroy());
server.maxConnections = 64;
server.maxRequestsPerSocket = 100;
// Node tidak menutup header parsial pada semua versi; timer absolut ini melengkapinya.
const HEADER_DEADLINE_MS = 15000;
server.on('connection', socket => {
  const timer = setTimeout(() => socket.destroy(), HEADER_DEADLINE_MS);
  timer.unref();
  socket.once('close', () => clearTimeout(timer));
  socket.headerDeadline = timer;
});
