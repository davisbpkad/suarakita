/**
 * Netlify Function: Worker AI panjang (background function).
 *
 * Dijalankan lewat HTTP internal dari endpoint AI saat teks melebihi batas
 * jalur sinkron (fungsi sinkron di akun ini dibunuh tepat pada 30 detik).
 * Hasil disimpan ke Blobs; klien mem-poll `/api/ai-job?id=...`.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { jobStore, internalToken } = require('./_jobs.js');
const { runAiAction } = require('../../lib/aiActions.js');
const { serverAiOptions } = require('../../lib/serverAi.js');
const { accounts } = require('./_auth.js');

export const config = { background: true };

export default async (request) => {
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const token = request.headers.get('x-internal-token');
  if (!token || token !== internalToken()) return new Response('Forbidden', { status: 403 });

  const store = jobStore();
  const job = await store.get(String(body.jobId || ''));
  if (!job) return new Response('Job tidak ditemukan', { status: 404 });
  if (job.status === 'done') return new Response('Sudah selesai', { status: 200 });

  try {
    // Model diambil dari pekerjaan yang dibuat, bukan dari setelan terbaru.
    const options = { ...serverAiOptions(process.env, { provider: job.provider, model: job.model }), timeoutMs: 300000 };
    const result = await runAiAction(job.action, job.text, options);
    if (result.quota) await accounts().recordProviderQuota(result.quota, result.engine);
    await store.finish(job.id, job.usage ? { ...result, usage: job.usage } : result);
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Worker AI gagal.', error.message);
    await store.fail(job.id, error.message || 'Pekerjaan gagal.');
    return new Response('Gagal', { status: 500 });
  }
};
