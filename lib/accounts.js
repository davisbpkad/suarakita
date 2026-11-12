/**
 * Akun, kuota harian, dan audit di atas penyimpanan key-value (Netlify Blobs).
 * Modul ini tidak mengimpor @netlify/blobs supaya bisa diuji dengan store tiruan.
 */
const crypto = require('node:crypto');

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const MIN_PASSWORD = 12;
const DEFAULT_DAILY_QUOTA = 30;
// Hash palsu: menjaga biaya scrypt saat username tidak ada.
const DUMMY_ENTRY = { salt: '0'.repeat(32), hash: '0'.repeat(64) };
const DEFAULT_GLOBAL_QUOTA = 300;
const GEMINI_DAILY_LIMITS = { 'gemini-3.5-flash-lite': 500, 'gemini-3.6-flash': 20 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return { salt, hash };
}

function verifyPassword(entry, password) {
  if (!entry || typeof entry.salt !== 'string' || typeof entry.hash !== 'string') return false;
  if (typeof password !== 'string' || !password || password.length > 200) return false;
  let actual;
  try {
    actual = crypto.scryptSync(password, entry.salt, 32);
  } catch {
    return false;
  }
  const expected = Buffer.from(entry.hash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function generatePassword() {
  return crypto.randomBytes(12).toString('base64url');
}

function passwordUsable(password, minimum = MIN_PASSWORD) {
  return typeof password === 'string' && password.length >= minimum && password.length <= 200;
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function normalizeUsername(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validUsername(value) {
  return USERNAME_RE.test(normalizeUsername(value));
}

/**
 * store: { get(key), set(key, value), list(prefix), delete(key) } — semua async.
 */
function createAccounts(store, options = {}) {
  const defaultQuota = options.defaultDailyQuota || DEFAULT_DAILY_QUOTA;
  const globalQuota = options.globalDailyQuota || DEFAULT_GLOBAL_QUOTA;

  const userKey = username => `user:${normalizeUsername(username)}`;
  const usageKey = (date, username) => `usage:${date}:${normalizeUsername(username)}`;
  const totalKey = date => `usage:${date}:__total`;

  async function readNumber(key) {
    const raw = await store.get(key);
    const value = Number(raw || 0);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  async function getUser(username) {
    const raw = await store.get(userKey(username));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function putUser(user) {
    await store.set(userKey(user.username), JSON.stringify(user));
    return user;
  }

  // Indeks satu kunci: `list()` Blobs bisa tertinggal, `get()` satu kunci tidak.
  async function readIndex() {
    const raw = await store.get('users:index');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(name => typeof name === 'string') : null;
    } catch {
      return null;
    }
  }

  async function addToIndex(username) {
    const index = (await readIndex()) || (await store.list('user:')).map(key => key.slice('user:'.length));
    const name = normalizeUsername(username);
    if (!index.includes(name)) index.push(name);
    await store.set('users:index', JSON.stringify(index.sort()));
  }

  async function removeFromIndex(username) {
    const index = (await readIndex()) || [];
    await store.set('users:index', JSON.stringify(index.filter(name => name !== normalizeUsername(username))));
  }

  async function listUsers() {
    let index = await readIndex();
    if (!index) {
      index = (await store.list('user:')).map(key => key.slice('user:'.length));
      await store.set('users:index', JSON.stringify(index.sort()));
    }
    const users = [];
    for (const name of index) {
      const raw = await store.get(userKey(name));
      if (!raw) continue;
      try {
        const user = JSON.parse(raw);
        users.push({ username: user.username, role: user.role, active: user.active, quotaPerDay: user.quotaPerDay, createdAt: user.createdAt, lastLogin: user.lastLogin });
      } catch {
        // Entri rusak dilewati, tidak menggagalkan dashboard.
      }
    }
    return users.sort((a, b) => a.username.localeCompare(b.username));
  }

  async function createUser({ username, password, quotaPerDay = defaultQuota, role = 'user' }) {
    const name = normalizeUsername(username);
    if (!validUsername(name)) throw new Error('Username harus 3-32 karakter: huruf kecil, angka, titik, garis bawah, atau strip.');
    if (!passwordUsable(password)) throw new Error(`Password minimal ${MIN_PASSWORD} karakter.`);
    if (await getUser(name)) throw new Error('Username sudah dipakai.');
    const { salt, hash } = hashPassword(password);
    const user = await putUser({ username: name, salt, hash, role, active: true, quotaPerDay: Number(quotaPerDay) || defaultQuota, createdAt: new Date().toISOString(), lastLogin: null });
    await addToIndex(name);
    return user;
  }

  async function setPassword(username, password) {
    const user = await getUser(username);
    if (!user) throw new Error('User tidak ditemukan.');
    if (!passwordUsable(password)) throw new Error(`Password minimal ${MIN_PASSWORD} karakter.`);
    const { salt, hash } = hashPassword(password);
    user.salt = salt;
    user.hash = hash;
    return putUser(user);
  }

  async function setActive(username, active) {
    const user = await getUser(username);
    if (!user) throw new Error('User tidak ditemukan.');
    user.active = Boolean(active);
    return putUser(user);
  }

  async function removeUser(username) {
    const user = await getUser(username);
    if (!user) throw new Error('User tidak ditemukan.');
    if (user.role === 'admin') throw new Error('Akun admin tidak bisa dihapus dari dashboard.');
    await store.delete(userKey(username));
    await removeFromIndex(username);
  }

  async function authenticate(username, password) {
    const user = await getUser(username);
    if (!user || !user.active) {
      // Biaya scrypt tetap dijalankan supaya waktu balasan tidak membocorkan username terdaftar.
      verifyPassword(DUMMY_ENTRY, password);
      return null;
    }
    if (!verifyPassword(user, password)) return null;
    user.lastLogin = new Date().toISOString();
    await putUser(user);
    return { username: user.username, role: user.role, quotaPerDay: user.quotaPerDay };
  }

  /** Dipanggil sebelum aksi AI; menolak saat kuota user atau total harian habis. */
  async function consume(username, date = todayKey()) {
    const user = await getUser(username);
    if (!user) return { allowed: false, reason: 'unknown' };
    if (!user.active) return { allowed: false, reason: 'inactive' };
    const limit = Number(user.quotaPerDay) || defaultQuota;
    const used = await readNumber(usageKey(date, username));
    const total = await readNumber(totalKey(date));
    if (used >= limit) return { allowed: false, reason: 'user', used, limit, total, globalLimit: globalQuota };
    if (total >= globalQuota) return { allowed: false, reason: 'global', used, limit, total, globalLimit: globalQuota };
    await store.set(usageKey(date, username), String(used + 1));
    await store.set(totalKey(date), String(total + 1));
    return { allowed: true, used: used + 1, limit, total: total + 1, globalLimit: globalQuota };
  }

  /** Simpan cuplikan kuota provider agar dashboard admin bisa menampilkannya. */
  async function recordProviderQuota(quota, provider) {
    if (!quota || typeof quota !== 'object' || !Number.isSafeInteger(quota.observedAt)) return;
    const keep = ['limitRequests', 'limitTokens', 'remainingRequests', 'remainingTokens', 'resetRequests', 'resetTokens', 'retryAfter', 'observedAt'];
    const slim = {};
    for (const field of keep) if (quota[field] !== undefined) slim[field] = quota[field];
    // Nama provider ikut disimpan supaya admin tahu snapshot ini milik model yang mana.
    if (typeof provider === 'string' && provider) slim.provider = provider;
    await store.set('provider:quota', JSON.stringify(slim));
  }

  /**
   * Perkiraan kuota harian Gemini per model; reset tengah malam Pasifik seperti Google.
   * ponytail: batas gratis diambil dari pesan 429 Google (Nov 2026); perbarui bila Google mengubahnya.
   * Tidak atomik dan tidak melihat pemakaian key di luar aplikasi ini.
   */
  async function recordGeminiUsage(model, calls, exhausted, now = new Date()) {
    const limit = GEMINI_DAILY_LIMITS[model] || 500;
    const day = now.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    const key = `gemini:${day}:${model}`;
    let used = await readNumber(key);
    const next = exhausted ? Math.max(limit, used + calls) : used + calls;
    if (next !== used) await store.set(key, String(next));
    used = Math.min(next, limit);
    return { model, used, limit, percent: Math.round(used / limit * 100) };
  }

  async function providerQuota() {
    const raw = await store.get('provider:quota');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  /** Pilihan model koreksi/notulen; null berarti pakai bawaan server. */
  async function readAiSettings() {
    const raw = await store.get('settings:ai');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  async function writeAiSettings(settings) {
    const value = { provider: settings.provider, model: settings.model };
    await store.set('settings:ai', JSON.stringify(value));
    return value;
  }

  async function usageToday(date = todayKey()) {
    const entries = await store.list(`usage:${date}:`);
    const usage = {};
    for (const entry of entries) {
      usage[entry.slice(`usage:${date}:`.length)] = await readNumber(entry);
    }
    return { date, usage, globalLimit: globalQuota };
  }

  async function audit(actor, action, target, detail = '') {
    const at = new Date().toISOString();
    const id = `audit:${at}:${crypto.randomBytes(4).toString('hex')}`;
    await store.set(id, JSON.stringify({ actor, action, target, detail, at }));
    return id;
  }

  // --- Pembatasan percobaan masuk (per username, jendela 15 menit) ----------
  const LOGIN_WINDOW_MS = 15 * 60 * 1000;
  const LOGIN_MAX_FAILURES = 10;

  function loginBucket(now = Date.now()) {
    return Math.floor(now / LOGIN_WINDOW_MS);
  }

  async function loginBlocked(username, now = Date.now()) {
    const used = await readNumber(`loginfail:${normalizeUsername(username)}:${loginBucket(now)}`);
    return used >= LOGIN_MAX_FAILURES;
  }

  async function registerLoginFailure(username, now = Date.now()) {
    const key = `loginfail:${normalizeUsername(username)}:${loginBucket(now)}`;
    const used = await readNumber(key);
    await store.set(key, String(used + 1));
    return used + 1 >= LOGIN_MAX_FAILURES;
  }

  async function clearLoginFailures(username, now = Date.now()) {
    await store.delete(`loginfail:${normalizeUsername(username)}:${loginBucket(now)}`);
  }

  async function auditLog(limit = 50) {    const entries = await store.list('audit:');
    const items = [];
    for (const entry of entries.slice(-limit)) {
      const raw = await store.get(entry);
      if (!raw) continue;
      try {
        items.push(JSON.parse(raw));
      } catch {
        // lewati entri rusak
      }
    }
    return items.reverse();
  }

  return { getUser, putUser, listUsers, createUser, setPassword, setActive, removeUser, authenticate, consume, usageToday, recordProviderQuota, recordGeminiUsage, providerQuota, audit, auditLog, loginBlocked, registerLoginFailure, clearLoginFailures, globalQuota, defaultQuota, readAiSettings, writeAiSettings };
}

/** Store Blobs asli; hanya dipakai di runtime Netlify. */
function blobsStore(name = 'suarakita') {
  const { getStore } = require('@netlify/blobs');
  // API modern + konsistensi kuat: user baru langsung terlihat saat login.
  const store = getStore({ name, consistency: 'strong' });
  return {
    get: key => store.get(key),
    set: (key, value) => store.set(key, value),
    delete: key => store.delete(key),
    list: async prefix => {
      const { blobs } = await store.list({ prefix });
      return blobs.map(item => item.key);
    },
  };
}

/** Store in-memory untuk pengujian tanpa Netlify Blobs. */
function memoryStore(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    async get(key) { return map.has(key) ? map.get(key) : null; },
    async set(key, value) { map.set(key, String(value)); },
    async delete(key) { map.delete(key); },
    async list(prefix = '') { return [...map.keys()].filter(key => key.startsWith(prefix)); },
  };
}

module.exports = { createAccounts, blobsStore, memoryStore, hashPassword, verifyPassword, generatePassword, passwordUsable, validUsername, normalizeUsername, todayKey, MIN_PASSWORD, DEFAULT_DAILY_QUOTA, DEFAULT_GLOBAL_QUOTA };
