/**
 * Netlify Function: status pekerjaan AI panjang.
 *
 * GET /api/ai-job?id=<id> → { status, result } untuk pemilik pekerjaan.
 * Dibiarkan sinkron karena hanya membaca Blobs.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { jsonResponse, corsHeaders, allowedOrigin, requireUser, sessionOf } = require('./_auth.js');
const { jobStore } = require('./_jobs.js');

export default async (request) => {
  const headers = corsHeaders(request, 'GET, OPTIONS');
  if (!allowedOrigin(request)) return jsonResponse({ error: 'Origin tidak diizinkan.' }, 403, headers);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405, headers);

  const blocked = requireUser(request);
  if (blocked) return blocked;

  const id = new URL(request.url).searchParams.get('id') || '';
  const store = jobStore();
  const job = await store.get(id);
  if (!job) return jsonResponse({ error: 'Pekerjaan tidak ditemukan.' }, 404, headers);
  if (job.username !== sessionOf(request).username) return jsonResponse({ error: 'Pekerjaan bukan milikmu.' }, 403, headers);

  if (job.status === 'done') return jsonResponse({ status: 'done', result: job.result }, 200, headers);
  if (job.status === 'error') return jsonResponse({ status: 'error', error: job.error || 'Pekerjaan gagal.' }, 200, headers);
  return jsonResponse({ status: 'running' }, 200, headers);
};
