/**
 * Helper pekerjaan AI panjang (background function) untuk Netlify Functions.
 *
 * Kenapa: fungsi sinkron di akun ini dibunuh tepat pada 30 detik (terukur:
 * `Duration: 30377 ms` lalu 504 Inactivity Timeout, bahkan dengan heartbeat
 * SSE tiap 1 detik). Teks 100.000 karakter butuh ±28 detik di mesin lokal,
 * jadi tidak muat dijamin di gateway. Background function punya batas 15
 * menit; klien membuat pekerjaan lalu mem-poll hasilnya.
 */
const crypto = require('node:crypto');
const { createJobStore } = require('../../lib/aiJobs.js');
const { blobsStore } = require('../../lib/accounts.js');

const jobStore = () => createJobStore(blobsStore());

/** Token internal supaya hanya fungsi milik aplikasi yang bisa memicu worker. */
function internalToken() {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET || 'tanpa-secret')
    .update('ai-worker')
    .digest('hex');
}

function workerUrl(origin) {
  const base = process.env.URL || origin || '';
  return `${String(base).replace(/\/$/, '')}/.netlify/functions/ai-worker`;
}

/** Picu worker di latar; balasan 202 dan pekerja berjalan sampai 15 menit. */
async function invokeWorker(jobId, origin) {
  try {
    const response = await fetch(workerUrl(origin), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': internalToken() },
      body: JSON.stringify({ jobId }),
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
  } catch (error) {
    console.error('Gagal memicu worker AI.', error.message);
  }
}

/** Simpan teks + model, lalu jalankan worker di latar. */
async function startJob({ username, action, text, provider, model, usage, origin }) {
  const store = jobStore();
  const job = await store.create({ username, action, text, provider, model, usage });
  await invokeWorker(job.id, origin);
  return job;
}

module.exports = { jobStore, internalToken, invokeWorker, startJob, workerUrl };
