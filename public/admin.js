/* Dashboard admin: satu halaman, tanpa framework. */
const state = { username: '', provider: null, settings: null, providers: [] };

const el = id => document.getElementById(id);

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let data = {};
  try { data = await response.json(); } catch { /* balasan kosong */ }
  if (!response.ok) throw Object.assign(new Error(data.error || `HTTP ${response.status}`), { status: response.status });
  return data;
}

function showPage(name) {
  for (const page of document.querySelectorAll('.page')) page.classList.toggle('hidden', page.dataset.page !== name);
  for (const item of document.querySelectorAll('[data-nav]')) item.classList.toggle('active', item.dataset.nav === name);
}

function closeMenu() {
  el('app').classList.remove('open');
  el('overlay').classList.remove('show');
}

function showLogin(message = '') {
  el('app').classList.add('auth-locked');
  el('login-card').classList.remove('hidden');
  el('panel').classList.add('hidden');
  el('logout').classList.add('hidden');
  el('session').textContent = '';
  el('nav-count').textContent = '';
  el('login-error').textContent = message;
  closeMenu();
}

function showPanel(username) {
  state.username = username;
  el('app').classList.remove('auth-locked');
  el('login-card').classList.add('hidden');
  el('panel').classList.remove('hidden');
  el('logout').classList.remove('hidden');
  el('session').textContent = `Masuk sebagai ${username}`;
  showPage('users');
  closeMenu();
}

/** Notifikasi kecil di pojok untuk status singkat. */
function toast(message, { tone = 'ok', duration = 3200 } = {}) {
  const host = el('toasts');
  if (!host) return () => {};
  // Satu notifikasi sekaligus: toast lama tidak menumpuk menutupi tombol tabel.
  for (const old of host.querySelectorAll('.toast')) old.remove();
  const node = document.createElement('div');
  node.className = `toast ${tone}`;
  const dot = document.createElement('span');
  dot.className = 'toast-dot';
  const body = document.createElement('div');
  body.className = 'toast-body';
  const text = document.createElement('div');
  text.textContent = message;
  body.append(text);
  const close = document.createElement('button');
  close.className = 'toast-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Tutup notifikasi');
  close.textContent = '×';
  node.append(dot, body, close);
  host.append(node);
  requestAnimationFrame(() => node.classList.add('show'));
  let timer;
  const remove = () => {
    clearTimeout(timer);
    node.classList.remove('show');
    setTimeout(() => node.remove(), 240);
  };
  close.addEventListener('click', remove);
  if (duration) timer = setTimeout(remove, duration);
  return remove;
}

/** Password + tombol salin. `user-select: all` membuat satu klik memilih seluruh password. */
function passwordField(password) {
  const row = document.createElement('div');
  row.className = 'toast-password';
  const code = document.createElement('code');
  code.textContent = password;
  code.title = 'Klik untuk memilih seluruh password';
  const copy = document.createElement('button');
  copy.className = 'btn small';
  copy.type = 'button';
  copy.textContent = 'Salin';
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(password); copy.textContent = 'Tersalin'; }
    catch { copy.textContent = 'Salin manual'; }
  });
  row.append(code, copy);
  return row;
}

/** Panel tepat di bawah baris user; hanya satu panel pada satu waktu. */
function mountRowPanel(username, tone = 'ok') {
  for (const old of document.querySelectorAll('tr.row-panel')) old.remove();
  const row = el('users-body').querySelector(`tr[data-row="${CSS.escape(username)}"]`);
  if (!row) return null;

  const panel = document.createElement('tr');
  panel.className = 'row-panel';
  const cell = document.createElement('td');
  cell.colSpan = 8;
  const card = document.createElement('div');
  card.className = `toast ${tone}`;
  const dot = document.createElement('span');
  dot.className = 'toast-dot';
  const body = document.createElement('div');
  body.className = 'toast-body';
  const close = document.createElement('button');
  close.className = 'toast-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Tutup');
  close.textContent = '×';
  close.addEventListener('click', () => panel.remove());
  card.append(dot, body, close);
  cell.append(card);
  panel.append(cell);
  row.after(panel);
  requestAnimationFrame(() => card.classList.add('show'));
  return body;
}

function showPasswordRow(username, password) {
  const body = mountRowPanel(username);
  if (!body) return;
  const text = document.createElement('div');
  text.textContent = `Password baru untuk ${username}`;
  body.append(text, passwordField(password));
}

/** Konfirmasi hapus bergaya sama dengan panel password, bukan dialog bawaan browser. */
function showDeleteRow(username) {
  const body = mountRowPanel(username, 'bad');
  if (!body) return;
  const text = document.createElement('div');
  text.textContent = `Hapus user ${username}? Tindakan ini tidak bisa dibatalkan.`;
  const actions = document.createElement('div');
  actions.className = 'toast-actions';
  const cancel = document.createElement('button');
  cancel.className = 'btn small';
  cancel.type = 'button';
  cancel.textContent = 'Batal';
  const yes = document.createElement('button');
  yes.className = 'btn small danger';
  yes.type = 'button';
  yes.textContent = 'Hapus';
  cancel.addEventListener('click', () => actions.closest('tr').remove());
  yes.addEventListener('click', () => runAction('delete', username));
  actions.append(cancel, yes);
  body.append(text, actions);
}

/** "1m26.4s" / "2.977s" gaya durasi Groq → milidetik. */
function parseDurationMs(value) {
  if (typeof value !== 'string' || !value) return null;
  const units = { ms: 1, s: 1000, m: 60000, h: 3600000 };
  let total = 0;
  let matched = false;
  for (const [, amount, unit] of value.matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)) {
    matched = true;
    total += Number(amount) * units[unit];
  }
  return matched ? total : null;
}

function resetCountdown(observedAt, value) {
  const duration = parseDurationMs(value);
  if (duration === null || !Number.isSafeInteger(observedAt)) return 'tidak tersedia';
  const left = Math.max(0, Math.ceil((observedAt + duration - Date.now()) / 1000));
  if (left === 0) return 'sudah lewat';
  return `dalam ${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
}

function remainingPercent(remaining, limit) {
  return Number.isSafeInteger(remaining) && Number.isSafeInteger(limit) && limit > 0
    ? Math.min(100, Math.floor((remaining / limit) * 100))
    : null;
}

const PROVIDER_LABEL = { groq: 'Groq', gemini: 'Gemini' };

let providerTick;
function renderProvider() {
  const active = state.settings?.provider;
  el('provider-title').textContent = `Sisa kuota server ${PROVIDER_LABEL[active] || 'Groq'}`;
  const snapshot = state.provider;
  // Snapshot provider lain disembunyikan supaya angka tidak salah dibaca sebagai model aktif.
  const matches = !snapshot?.provider || snapshot.provider === active;
  const quota = snapshot && matches ? snapshot : null;
  const request = remainingPercent(quota?.remainingRequests, quota?.limitRequests);
  const token = remainingPercent(quota?.remainingTokens, quota?.limitTokens);
  el('provider-request').textContent = request === null ? '-' : `${request}% (${quota.remainingRequests}/${quota.limitRequests})`;
  el('provider-token').textContent = token === null ? '-' : `${token}% (${quota.remainingTokens}/${quota.limitTokens})`;
  el('provider-request-bar').style.width = `${request ?? 0}%`;
  el('provider-token-bar').style.width = `${token ?? 0}%`;
  if (!quota) {
    el('provider-note').textContent = snapshot && !matches
      ? `Snapshot terakhir dari ${PROVIDER_LABEL[snapshot.provider] || snapshot.provider}. Data muncul lagi setelah satu aksi AI dengan model aktif.`
      : active === 'gemini'
        ? 'Gemini tidak mengirim header kuota. Pantau pemakaian di Google AI Studio.'
        : 'Belum ada data. Muncul setelah satu aksi AI berhasil.';
    return;
  }
  const updated = Number.isSafeInteger(quota.observedAt) ? new Date(quota.observedAt).toLocaleTimeString('id-ID') : '-';
  el('provider-note').textContent = `Reset request ${resetCountdown(quota.observedAt, quota.resetRequests)} · Reset token ${resetCountdown(quota.observedAt, quota.resetTokens)} · Diperbarui ${updated}.`;
}

function fillSettingsModels(providerId) {
  const provider = state.providers.find(item => item.id === providerId);
  if (!provider) return;
  el('settings-model').replaceChildren(...provider.models.map(model => new Option(model.label, model.id)));
}

function settingsNote() {
  const provider = state.providers.find(item => item.id === el('settings-provider').value);
  const model = provider?.models.find(item => item.id === el('settings-model').value);
  el('settings-note').textContent = model
    ? `Aktif: ${provider.label} · ${model.label}. Statistik kuota di halaman Pengguna mengikuti pilihan ini.`
    : '';
}

function renderSettings() {
  if (!state.providers.length || !state.settings) return;
  const select = el('settings-provider');
  if (!select.options.length) {
    select.replaceChildren(...state.providers.map(provider => {
      const option = new Option(provider.hasKey ? provider.label : `${provider.label} — key belum diatur`, provider.id);
      option.disabled = !provider.hasKey;
      return option;
    }));
    select.value = state.settings.provider;
    fillSettingsModels(state.settings.provider);
    el('settings-model').value = state.settings.model;
  }
  settingsNote();
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function loadUsers() {
  el('users-error').textContent = '';
  try {
    const data = await api('/api/admin/users');
    const total = data.usage.usage.__total || 0;
    const limit = data.usage.globalLimit || 0;
    const percent = limit ? Math.min(100, Math.round((total / limit) * 100)) : 0;
    el('usage-summary').textContent = `${total} / ${limit} aksi`;
    el('usage-percent').textContent = `${percent}%`;
    el('usage-bar').style.width = `${percent}%`;
    el('usage-date').textContent = data.usage.date ? `Tanggal ${data.usage.date} (UTC)` : '';
    el('nav-count').textContent = data.users.length;
    state.provider = data.providerQuota || null;
    state.settings = data.settings || null;
    state.providers = data.providers || [];
    renderSettings();
    renderProvider();
    if (!providerTick) providerTick = setInterval(renderProvider, 1000);
    el('users-body').innerHTML = data.users.map(user => {
      const used = data.usage.usage[user.username] || 0;
      const quota = user.role === 'admin' ? 'tanpa batas' : `${user.quotaPerDay}/hari`;
      const actions = user.role === 'admin' || user.source === 'env'
        ? '<span class="muted">-</span>'
        : `<div class="actions">
             <button class="btn small" data-action="reset" data-user="${esc(user.username)}">Reset</button>
             <button class="btn small" data-action="${user.active ? 'deactivate' : 'activate'}" data-user="${esc(user.username)}">${user.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
             <button class="btn small danger" data-action="delete" data-user="${esc(user.username)}">Hapus</button>
           </div>`;
      return `<tr data-row="${esc(user.username)}">
        <td data-label="Username"><div class="who"><span class="avatar">${esc(user.username.slice(0, 2))}</span>${esc(user.username)}</div></td>
        <td data-label="Peran">${esc(user.role)}</td>
        <td data-label="Status"><span class="badge ${user.active ? 'on' : 'off'}">${user.active ? 'aktif' : 'nonaktif'}</span></td>
        <td data-label="Kuota">${esc(quota)}</td>
        <td data-label="Hari ini">${used}</td>
        <td data-label="Sisa">${user.role === 'admin' ? '-' : Math.max(0, user.quotaPerDay - used)}</td>
        <td data-label="Login terakhir" class="muted">${user.lastLogin ? esc(new Date(user.lastLogin).toLocaleString('id-ID')) : '-'}</td>
        <td data-label="Aksi">${actions}</td>
      </tr>`;
    }).join('');
    el('audit').innerHTML = data.audit.map(item =>
      `<li><time>${esc(new Date(item.at).toLocaleString('id-ID'))}</time><span><strong>${esc(item.actor)}</strong> ${esc(item.action)} ${esc(item.target)}</span></li>`
    ).join('') || '<li class="muted">Belum ada aktivitas.</li>';
    return true;
  } catch (error) {
    if (error.status === 401 || error.status === 403) { showLogin(); return false; }
    el('users-error').textContent = error.message;
    return true;
  }
}

for (const item of document.querySelectorAll('[data-nav]')) {
  item.addEventListener('click', () => { showPage(item.dataset.nav); closeMenu(); });
}
el('menu').addEventListener('click', () => {
  el('app').classList.add('open');
  el('overlay').classList.add('show');
});
el('overlay').addEventListener('click', closeMenu);

el('login-form').addEventListener('submit', async event => {
  event.preventDefault();
  el('login-error').textContent = '';
  try {
    const data = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username: el('login-user').value.trim(), password: el('login-pass').value }),
    });
    if (data.role !== 'admin') return showLogin('Akun ini bukan admin.');
    el('login-pass').value = '';
    showPanel(data.username);
    await loadUsers();
  } catch (error) {
    el('login-error').textContent = error.status === 429 ? 'Terlalu banyak percobaan. Tunggu 15 menit.' : error.message;
  }
});

el('settings-provider').addEventListener('change', () => {
  fillSettingsModels(el('settings-provider').value);
  settingsNote();
});
el('settings-model').addEventListener('change', settingsNote);

el('settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  el('settings-error').textContent = '';
  const provider = el('settings-provider').value;
  const model = el('settings-model').value;
  try {
    const data = await api('/api/admin/users', { method: 'POST', body: JSON.stringify({ action: 'set-ai', provider, model }) });
    state.settings = data.settings;
    el('settings-provider').value = data.settings.provider;
    fillSettingsModels(data.settings.provider);
    el('settings-model').value = data.settings.model;
    settingsNote();
    toast(`Model AI diganti ke ${PROVIDER_LABEL[data.settings.provider] || data.settings.provider}.`);
    await loadUsers();
  } catch (error) {
    el('settings-error').textContent = error.message;
  }
});

el('create-form').addEventListener('submit', async event => {
  event.preventDefault();
  el('create-error').textContent = '';
  el('create-result').classList.add('hidden');
  try {
    const data = await api('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ action: 'create', username: el('create-user').value.trim(), quotaPerDay: Number(el('create-quota').value) }),
    });
    el('create-result').classList.remove('hidden');
    el('create-result').replaceChildren(
      `User ${data.user.username} dibuat. Password (tampil sekali): `,
      passwordField(data.password),
    );
    el('create-user').value = '';
    await loadUsers();
  } catch (error) {
    el('create-error').textContent = error.message;
  }
});

async function runAction(action, username) {
  try {
    const data = await api('/api/admin/users', { method: 'POST', body: JSON.stringify({ action, username }) });
    if (action === 'deactivate') toast(`${username} dinonaktifkan.`, { tone: 'warn' });
    else if (action === 'activate') toast(`${username} aktif kembali.`);
    else if (action === 'delete') toast(`${username} dihapus.`);
    await loadUsers();
    // Panel dipasang setelah tabel digambar ulang, menempel pada baris user tersebut.
    if (action === 'reset') showPasswordRow(username, data.password);
  } catch (error) {
    el('users-error').textContent = error.message;
    toast(error.message, { tone: 'bad' });
  }
}

el('users-body').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { user: username, action } = button.dataset;
  if (action === 'delete') return showDeleteRow(username);
  runAction(action, username);
});

el('rotate-form').addEventListener('submit', async event => {
  event.preventDefault();
  el('rotate-error').textContent = '';
  el('rotate-result').classList.add('hidden');
  try {
    const data = await api('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ action: 'rotate-admin', currentPassword: el('rotate-current').value, newPassword: el('rotate-next').value }),
    });
    el('rotate-result').classList.remove('hidden');
    el('rotate-result').textContent = data.note || 'Password admin diperbarui.';
    el('rotate-current').value = '';
    el('rotate-next').value = '';
  } catch (error) {
    el('rotate-error').textContent = error.message;
  }
});

el('logout').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST', body: '{}' }).catch(() => {});
  showLogin('Sudah keluar.');
});

(async () => {
  if (await loadUsers()) showPanel('admin');
})();
