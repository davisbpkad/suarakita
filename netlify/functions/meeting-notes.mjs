/**
 * Netlify Serverless Function: Notulen Rapat (Minutes of Meeting)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { jsonResponse, corsHeaders, allowedOrigin, readJson, requireUser, sessionOf, accounts } = require('./_auth.js');
const { validateRequest } = require('../../lib/requestValidation.js');
const { runAiAction } = require('../../lib/aiActions.js');
const { serverAiOptions, maxCharsFor } = require('../../lib/serverAi.js');
const { sseResponse } = require('../../lib/sseResponse.js');

export default async (request) => {
  const headers = corsHeaders(request, 'POST, OPTIONS');
  if (!allowedOrigin(request)) return jsonResponse({ error: 'Origin tidak diizinkan.' }, 403, headers);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, 405, headers);

  const blocked = requireUser(request);
  if (blocked) return blocked;

  try {
    const data = await readJson(request);
    if (!data) return jsonResponse({ error: 'JSON tidak valid.' }, 400, headers);

    const store = accounts();
    const settings = await store.readAiSettings();
    const invalid = validateRequest(data, { maxChars: maxCharsFor(settings) });
    if (invalid) return jsonResponse({ error: invalid.error }, invalid.status, headers);
    const { text } = data;

    const quota = await store.consume(sessionOf(request).username);
    if (!quota.allowed) {
      if (quota.reason === 'unknown' || quota.reason === 'inactive') {
        return jsonResponse({ error: 'Akun tidak aktif atau sudah dihapus. Masuk lagi.' }, 401, headers);
      }
      const reason = quota.reason === 'global' ? 'Kuota harian bersama habis.' : 'Kuota harian Anda habis.';
      return jsonResponse({ error: `${reason} Coba lagi besok.` }, 429, { ...headers, 'Retry-After': '3600' });
    }

    const options = { ...serverAiOptions(process.env, settings), timeoutMs: 240000 };
    const perform = async () => {
      const result = await runAiAction('notes', text, options);
      // `quota` milik provider (Groq) dipakai panel Sisa penggunaan; kuota harian aplikasi terpisah.
      if (result.quota) await store.recordProviderQuota(result.quota, result.engine);
      return { ...result, usage: { used: quota.used, limit: quota.limit } };
    };

    if (data.stream === true) return sseResponse(headers, perform, 'Gagal membuat notulen rapat.');
    return jsonResponse(await perform(), 200, headers);
  } catch (err) {
    console.error('Netlify meeting-notes gagal.', err.message);
    return jsonResponse({ error: 'Gagal membuat notulen rapat.' }, 500, headers);
  }
};
