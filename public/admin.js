/* Dashboard admin: satu halaman, tanpa framework. */
const state = { username: '' };

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

function showLogin(message = '') {
  el('login-card').classList.remove('hidden');
  el('panel').classList.add('hidden');
  el('session').textContent = '';
  el('login-error').textContent = message;
}

function showPanel(username) {
  state.username = username;
  el('login-card').classList.add('hidden');
  el('panel').classList.remove('hidden');
  el('session').textContent = `Masuk sebagai ${username}`;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function loadUsers() {
  el('users-error').textContent = '';
  try {
    const data = await api('/api/admin/users');
    el('usage-summary').textContent = `Total aksi hari ini: ${data.usage.usage.__total || 0} / ${data.usage.globalLimit}`;
    el('users-body').innerHTML = data.users.map(user => {
      const used = data.usage.usage[user.username] || 0;
      const quota = user.role === 'admin' ? 'tanpa batas' : `${user.quotaPerDay}`;
      const actions = user.role === 'admin' || user.source === 'env'
        ? '<span class="muted">-</span>'
        : `<button data-action="reset" data-user="${esc(user.username)}">Reset password</button>
           <button data-action="${user.active ? 'deactivate' : 'activate'}" data-user="${esc(user.username)}">${user.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
           <button class="danger" data-action="delete" data-user="${esc(user.username)}">Hapus</button>`;
      return `<tr>
        <td>${esc(user.username)}</td>
        <td>${esc(user.role)}</td>
        <td>${user.active ? 'aktif' : 'nonaktif'}</td>
        <td>${esc(quota)}</td>
        <td>${used}</td>
        <td class="muted">${user.lastLogin ? esc(new Date(user.lastLogin).toLocaleString('id-ID')) : '-'}</td>
        <td>${actions}</td>
      </tr>`;
    }).join('');
    el('audit').innerHTML = data.audit.map(item =>
      `<li>${esc(new Date(item.at).toLocaleString('id-ID'))} · <strong>${esc(item.actor)}</strong> ${esc(item.action)} ${esc(item.target)}</li>`
    ).join('') || '<li class="muted">Belum ada aktivitas.</li>';
    return true;
  } catch (error) {
    if (error.status === 401 || error.status === 403) { showLogin('Sesi admin berakhir. Masuk lagi.'); return false; }
    el('users-error').textContent = error.message;
    return true;
  }
}

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
    el('create-result').innerHTML = `User <strong>${esc(data.user.username)}</strong> dibuat. Password (tampil sekali): <code>${esc(data.password)}</code>`;
    el('create-user').value = '';
    await loadUsers();
  } catch (error) {
    el('create-error').textContent = error.message;
  }
});

el('users-body').addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const username = button.dataset.user;
  const action = button.dataset.action;
  if (action === 'delete' && !confirm(`Hapus user ${username}?`)) return;
  try {
    const data = await api('/api/admin/users', { method: 'POST', body: JSON.stringify({ action, username }) });
    if (action === 'reset') alert(`Password baru untuk ${username} (tampil sekali):\n\n${data.password}`);
    await loadUsers();
  } catch (error) {
    el('users-error').textContent = error.message;
  }
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
