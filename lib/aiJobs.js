/**
 * Penyimpanan pekerjaan AI panjang (background function) di Netlify Blobs.
 *
 * Kenapa: fungsi sinkron di akun ini dibunuh tepat pada 30 detik (terukur:
 * `Duration: 30377 ms` lalu koneksi ditutup 504). Teks 100.000 karakter butuh
 * ±28 detik di mesin lokal sebelum，短短 masih di bawah tembok itu.
 * Background function punya batas 15 menit, jadi pekerjaan panjang
 * dipindahkan ke sana dan klien melakukan polling.
 */
const crypto = require('node:crypto');

const JOB_TTL_MS = 30 * 60 * 1000;

function jobKey(id) {
  return `job:${id}`;
}

/**
 * store: { get(key), set(key, value), delete(key) } — semua async.
 */
function createJobStore(store) {
  async function save(job) {
    await store.set(jobKey(job.id), JSON.stringify({ ...job, updatedAt: Date.now() }));
    return job;
  }

  async function get(id) {
    if (typeof id !== 'string' || !/^[a-f0-9]{16,64}$/.test(id)) return null;
    const raw = await store.get(jobKey(id));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  async function create({ username, action, text, provider, model, usage }) {
    const job = {
      id: crypto.randomBytes(12).toString('hex'),
      username,
      action,
      text,
      provider,
      model,
      usage,
      status: 'running',
      result: null,
      error: null,
      createdAt: Date.now(),
    };
    return save(job);
  }

  async function finish(id, result) {
    const job = await get(id);
    if (!job) return null;
    job.status = 'done';
    job.result = result;
    job.text = '';
    return save(job);
  }

  async function fail(id, message) {
    const job = await get(id);
    if (!job) return null;
    job.status = 'error';
    job.error = message || 'Pekerjaan gagal.';
    job.text = '';
    return save(job);
  }

  /** Buang pekerjaan yang terlalu lama (pengguna tidak pernah mem-poll). */
  async function prune(now = Date.now()) {
    for (const key of await store.list('job:')) {
      const raw = await store.get(key);
      if (!raw) continue;
      try {
        const job = JSON.parse(raw);
        if (now - (job.createdAt || 0) > JOB_TTL_MS) await store.delete(key);
      } catch {
        await store.delete(key);
      }
    }
  }

  return { create, get, save, finish, fail, prune, JOB_TTL_MS };
}

module.exports = { createJobStore, JOB_TTL_MS };
