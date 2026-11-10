/**
 * Netlify Serverless Function: Koreksi Transkrip Cerdas
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { jsonResponse, corsHeaders, allowedOrigin, readJson, requireUser, sessionOf, accounts } = require('./_auth.js');
const { validateRequest } = require('../../lib/requestValidation.js');
const { runAiAction } = require('../../lib/aiActions.js');
const { serverAiOptions } = require('../../lib/serverAi.js');

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
    const invalid = validateRequest(data);
    if (invalid) return jsonResponse({ error: invalid.error }, invalid.status, headers);
    const { text } = data;

    const quota = await accounts().consume(sessionOf(request).username);
    if (!quota.allowed) {
      const reason = quota.reason === 'global' ? 'Kuota harian bersama habis.' : 'Kuota harian Anda habis.';
      return jsonResponse({ error: `${reason} Coba lagi besok.` }, 429, { ...headers, 'Retry-After': '3600' });
    }

    // Key hanya dari environment Netlify; pemanggil tidak pernah mengirim key.
    const options = process.env.GROQ_API_KEY ? serverAiOptions() : {};
    const result = await runAiAction('correction', text, options);

    return jsonResponse({ ...result, quota: { used: quota.used, limit: quota.limit } }, 200, headers);
  } catch (err) {
    console.error('Netlify correct-transcript gagal.', err.message);
    return jsonResponse({ error: 'Gagal melakukan koreksi transkrip.' }, 500, headers);
  }
};
