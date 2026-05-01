/* SISKERMA - Sistem Informasi Kerjasama
 * Vanilla JS SPA with localStorage persistence.
 */

const STORAGE_KEYS = {
  session: 'siskerma_session',
  mitra: 'siskerma_mitra',
  kerjasama: 'siskerma_kerjasama',
};

const DEFAULT_USER = { username: 'admin', password: 'admin123', name: 'Admin Kerjasama' };

const SEED_MITRA = [
  { id: 'm1', nama: 'PT Bank Mandiri (Persero) Tbk', jenis: 'Swasta', kontak: '021-5245000', email: 'kerjasama@bankmandiri.co.id', alamat: 'Jl. Jend. Gatot Subroto, Jakarta' },
  { id: 'm2', nama: 'Universitas Indonesia', jenis: 'Perguruan Tinggi', kontak: '021-7867222', email: 'humas@ui.ac.id', alamat: 'Depok, Jawa Barat' },
  { id: 'm3', nama: 'Pemerintah Kota Tangerang Selatan', jenis: 'Pemerintah', kontak: '021-5312345', email: 'humas@tangerangselatankota.go.id', alamat: 'Jl. Witana Harja, Pamulang' },
  { id: 'm4', nama: 'SMA Negeri 1 Pamulang', jenis: 'Sekolah', kontak: '021-7409999', email: 'info@sman1pamulang.sch.id', alamat: 'Jl. Surya Kencana, Pamulang' },
];

const SEED_KERJASAMA = [
  { id: 'k1', nomor: '001/MoU/2025', jenis: 'MoU', judul: 'Kerjasama Pengembangan SDM dan Magang', mitraId: 'm1', mulai: '2025-01-15', selesai: '2027-01-14', status: 'Aktif', lingkup: 'Magang mahasiswa, beasiswa, riset bersama', pj: 'Dr. Andi Wijaya' },
  { id: 'k2', nomor: '002/PKS/2025', jenis: 'PKS', judul: 'Pelaksanaan Tridharma Perguruan Tinggi', mitraId: 'm2', mulai: '2025-02-01', selesai: '2026-02-01', status: 'Aktif', lingkup: 'Penelitian dan pengabdian masyarakat', pj: 'Prof. Siti Rahma' },
  { id: 'k3', nomor: '003/MoU/2024', jenis: 'MoU', judul: 'Pemberdayaan Masyarakat Tangsel', mitraId: 'm3', mulai: '2024-06-01', selesai: '2025-05-31', status: 'Aktif', lingkup: 'KKN tematik dan pelatihan UMKM', pj: 'Dr. Budi Santoso' },
  { id: 'k4', nomor: '004/IA/2024', jenis: 'IA', judul: 'Program Kampus Mengajar', mitraId: 'm4', mulai: '2024-08-01', selesai: '2025-07-31', status: 'Aktif', lingkup: 'Penempatan mahasiswa pendidikan di sekolah', pj: 'Dewi Lestari, M.Pd.' },
  { id: 'k5', nomor: '005/PKS/2023', jenis: 'PKS', judul: 'Sertifikasi Kompetensi Mahasiswa', mitraId: 'm1', mulai: '2023-03-01', selesai: '2024-02-29', status: 'Berakhir', lingkup: 'Pelaksanaan uji sertifikasi', pj: 'Dr. Andi Wijaya' },
];

// ----- Storage helpers -----
function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function uid(prefix = '') { return prefix + Math.random().toString(36).slice(2, 10); }

function seedIfEmpty() {
  if (!localStorage.getItem(STORAGE_KEYS.mitra)) save(STORAGE_KEYS.mitra, SEED_MITRA);
  if (!localStorage.getItem(STORAGE_KEYS.kerjasama)) save(STORAGE_KEYS.kerjasama, SEED_KERJASAMA);
}

// ----- State -----
const state = {
  user: null,
  route: 'dashboard',
  ksFilter: { q: '', jenis: '', status: '' },
  mtFilter: { q: '', jenis: '' },
};

// ----- Utilities -----
function fmtDate(s) {
  if (!s) return '-';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type;
  setTimeout(() => el.classList.add('hidden'), 2400);
}
function getMitra() { return load(STORAGE_KEYS.mitra, []); }
function getKerjasama() { return load(STORAGE_KEYS.kerjasama, []); }
function findMitra(id) { return getMitra().find(m => m.id === id); }

// ----- Auth -----
function tryLogin(username, password) {
  if (username === DEFAULT_USER.username && password === DEFAULT_USER.password) {
    const session = { username: DEFAULT_USER.username, name: DEFAULT_USER.name, loggedAt: Date.now() };
    save(STORAGE_KEYS.session, session);
    state.user = session;
    return true;
  }
  return false;
}
function logout() {
  localStorage.removeItem(STORAGE_KEYS.session);
  state.user = null;
  showLogin();
}
function showLogin() {
  document.getElementById('login-page').classList.remove('hidden');
  document.getElementById('app-shell').classList.add('hidden');
}
function showApp() {
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  const initial = (state.user.name || 'A').charAt(0).toUpperCase();
  document.getElementById('user-name').textContent = state.user.name;
  document.getElementById('user-avatar').textContent = initial;
  document.getElementById('profile-name').textContent = state.user.name;
  document.getElementById('profile-avatar').textContent = initial;
  document.getElementById('profile-username').textContent = state.user.username;
  navigate(location.hash.replace('#','') || 'dashboard');
}

// ----- Routing -----
const PAGES = {
  dashboard: { title: 'Dashboard', subtitle: 'Ringkasan data kerjasama', render: renderDashboard },
  kerjasama: { title: 'Daftar Kerjasama', subtitle: 'Kelola dokumen MoU, PKS, dan IA', render: renderKerjasama },
  mitra: { title: 'Daftar Mitra', subtitle: 'Kelola data mitra kerjasama', render: renderMitra },
  profil: { title: 'Profil Pengguna', subtitle: 'Informasi akun', render: () => {} },
};

function navigate(route) {
  if (!PAGES[route]) route = 'dashboard';
  state.route = route;
  location.hash = route;
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.dataset.route === route);
  });
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById('view-' + route).classList.remove('hidden');
  document.getElementById('page-title').textContent = PAGES[route].title;
  document.getElementById('page-subtitle').textContent = PAGES[route].subtitle;
  PAGES[route].render();
}

// ----- Dashboard -----
function renderDashboard() {
  const ks = getKerjasama();
  const today = new Date();
  const in60 = new Date(); in60.setDate(today.getDate() + 60);

  const total = ks.length;
  const mou = ks.filter(k => k.jenis === 'MoU' && k.status === 'Aktif').length;
  const pks = ks.filter(k => k.jenis === 'PKS' && k.status === 'Aktif').length;
  const soon = ks.filter(k => {
    if (k.status !== 'Aktif') return false;
    const end = new Date(k.selesai);
    return end >= today && end <= in60;
  }).length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-mou').textContent = mou;
  document.getElementById('stat-pks').textContent = pks;
  document.getElementById('stat-soon').textContent = soon;

  const recent = [...ks].sort((a,b) => (b.mulai || '').localeCompare(a.mulai || '')).slice(0, 5);
  document.getElementById('recent-kerjasama').innerHTML = recent.length ? recent.map(k => {
    const m = findMitra(k.mitraId);
    return `<tr>
      <td>${escapeHtml(k.nomor)}</td>
      <td>${escapeHtml(k.judul)}</td>
      <td>${escapeHtml(m ? m.nama : '-')}</td>
      <td>${statusBadge(k.status)}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="4" class="empty">Belum ada data</td></tr>';

  const jenisCount = { MoU: 0, PKS: 0, IA: 0 };
  ks.forEach(k => { if (jenisCount[k.jenis] != null) jenisCount[k.jenis]++; });
  const max = Math.max(1, ...Object.values(jenisCount));
  document.getElementById('distribusi-list').innerHTML = Object.entries(jenisCount).map(([j, c]) => {
    const pct = Math.round((c / max) * 100);
    return `<div class="distribusi-item">
      <div class="distribusi-label">${j}</div>
      <div class="distribusi-bar"><div class="distribusi-fill" style="width:${pct}%">${c}</div></div>
    </div>`;
  }).join('');
}

function statusBadge(s) {
  const cls = s === 'Aktif' ? 'badge-aktif' : s === 'Berakhir' ? 'badge-berakhir' : 'badge-draft';
  return `<span class="badge ${cls}">${escapeHtml(s)}</span>`;
}
function jenisBadge(j) {
  const cls = j === 'MoU' ? 'badge-mou' : j === 'PKS' ? 'badge-pks' : 'badge-ia';
  return `<span class="badge ${cls}">${escapeHtml(j)}</span>`;
}

// ----- Kerjasama -----
function renderKerjasama() {
  const all = getKerjasama();
  const { q, jenis, status } = state.ksFilter;
  const qLower = q.toLowerCase();
  const filtered = all.filter(k => {
    const m = findMitra(k.mitraId);
    const matchQ = !q ||
      k.nomor.toLowerCase().includes(qLower) ||
      k.judul.toLowerCase().includes(qLower) ||
      (m && m.nama.toLowerCase().includes(qLower));
    const matchJ = !jenis || k.jenis === jenis;
    const matchS = !status || k.status === status;
    return matchQ && matchJ && matchS;
  });

  const tbody = document.getElementById('ks-tbody');
  const empty = document.getElementById('ks-empty');
  if (!filtered.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  tbody.innerHTML = filtered.map(k => {
    const m = findMitra(k.mitraId);
    return `<tr>
      <td><strong>${escapeHtml(k.nomor)}</strong></td>
      <td>${jenisBadge(k.jenis)}</td>
      <td>${escapeHtml(k.judul)}</td>
      <td>${escapeHtml(m ? m.nama : '-')}</td>
      <td>${fmtDate(k.mulai)} <small style="color:#9ca3af">s.d.</small> ${fmtDate(k.selesai)}</td>
      <td>${statusBadge(k.status)}</td>
      <td>
        <button class="btn btn-ghost btn-sm" data-edit-ks="${k.id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-del-ks="${k.id}">Hapus</button>
      </td>
    </tr>`;
  }).join('');
}

function openKerjasamaModal(id) {
  populateMitraSelect();
  const modal = document.getElementById('modal-kerjasama');
  const title = document.getElementById('mk-title');
  if (id) {
    const k = getKerjasama().find(x => x.id === id);
    if (!k) return;
    title.textContent = 'Edit Kerjasama';
    document.getElementById('ks-id').value = k.id;
    document.getElementById('ks-nomor').value = k.nomor;
    document.getElementById('ks-jenis').value = k.jenis;
    document.getElementById('ks-judul').value = k.judul;
    document.getElementById('ks-mitra').value = k.mitraId;
    document.getElementById('ks-mulai').value = k.mulai;
    document.getElementById('ks-selesai').value = k.selesai;
    document.getElementById('ks-lingkup').value = k.lingkup || '';
    document.getElementById('ks-status').value = k.status;
    document.getElementById('ks-pj').value = k.pj || '';
  } else {
    title.textContent = 'Tambah Kerjasama';
    document.getElementById('form-kerjasama').reset();
    document.getElementById('ks-id').value = '';
  }
  modal.classList.remove('hidden');
}

function populateMitraSelect() {
  const sel = document.getElementById('ks-mitra');
  const items = getMitra();
  sel.innerHTML = '<option value="">-- Pilih Mitra --</option>' +
    items.map(m => `<option value="${m.id}">${escapeHtml(m.nama)}</option>`).join('');
}

function saveKerjasama(e) {
  e.preventDefault();
  const id = document.getElementById('ks-id').value;
  const data = {
    nomor: document.getElementById('ks-nomor').value.trim(),
    jenis: document.getElementById('ks-jenis').value,
    judul: document.getElementById('ks-judul').value.trim(),
    mitraId: document.getElementById('ks-mitra').value,
    mulai: document.getElementById('ks-mulai').value,
    selesai: document.getElementById('ks-selesai').value,
    lingkup: document.getElementById('ks-lingkup').value.trim(),
    status: document.getElementById('ks-status').value,
    pj: document.getElementById('ks-pj').value.trim(),
  };
  if (!data.mitraId) { toast('Pilih mitra terlebih dahulu', 'error'); return; }
  if (data.selesai < data.mulai) { toast('Tanggal selesai tidak boleh sebelum tanggal mulai', 'error'); return; }

  const all = getKerjasama();
  if (id) {
    const idx = all.findIndex(x => x.id === id);
    if (idx >= 0) all[idx] = { ...all[idx], ...data };
    toast('Kerjasama diperbarui');
  } else {
    all.push({ id: uid('k'), ...data });
    toast('Kerjasama ditambahkan');
  }
  save(STORAGE_KEYS.kerjasama, all);
  document.getElementById('modal-kerjasama').classList.add('hidden');
  renderKerjasama();
}

function deleteKerjasama(id) {
  if (!confirm('Hapus data kerjasama ini?')) return;
  const all = getKerjasama().filter(k => k.id !== id);
  save(STORAGE_KEYS.kerjasama, all);
  toast('Kerjasama dihapus');
  renderKerjasama();
}

// ----- Mitra -----
function renderMitra() {
  const all = getMitra();
  const { q, jenis } = state.mtFilter;
  const qLower = q.toLowerCase();
  const filtered = all.filter(m => {
    const matchQ = !q || m.nama.toLowerCase().includes(qLower) ||
      (m.email || '').toLowerCase().includes(qLower);
    const matchJ = !jenis || m.jenis === jenis;
    return matchQ && matchJ;
  });

  const tbody = document.getElementById('mt-tbody');
  const empty = document.getElementById('mt-empty');
  if (!filtered.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  tbody.innerHTML = filtered.map(m => `<tr>
    <td><strong>${escapeHtml(m.nama)}</strong></td>
    <td>${escapeHtml(m.jenis)}</td>
    <td>${escapeHtml(m.kontak || '-')}</td>
    <td>${escapeHtml(m.email || '-')}</td>
    <td>${escapeHtml(m.alamat || '-')}</td>
    <td>
      <button class="btn btn-ghost btn-sm" data-edit-mt="${m.id}">Edit</button>
      <button class="btn btn-danger btn-sm" data-del-mt="${m.id}">Hapus</button>
    </td>
  </tr>`).join('');
}

function openMitraModal(id) {
  const modal = document.getElementById('modal-mitra');
  const title = document.getElementById('mm-title');
  if (id) {
    const m = getMitra().find(x => x.id === id);
    if (!m) return;
    title.textContent = 'Edit Mitra';
    document.getElementById('mt-id').value = m.id;
    document.getElementById('mt-nama').value = m.nama;
    document.getElementById('mt-jenis').value = m.jenis;
    document.getElementById('mt-kontak').value = m.kontak || '';
    document.getElementById('mt-email').value = m.email || '';
    document.getElementById('mt-alamat').value = m.alamat || '';
  } else {
    title.textContent = 'Tambah Mitra';
    document.getElementById('form-mitra').reset();
    document.getElementById('mt-id').value = '';
  }
  modal.classList.remove('hidden');
}

function saveMitra(e) {
  e.preventDefault();
  const id = document.getElementById('mt-id').value;
  const data = {
    nama: document.getElementById('mt-nama').value.trim(),
    jenis: document.getElementById('mt-jenis').value,
    kontak: document.getElementById('mt-kontak').value.trim(),
    email: document.getElementById('mt-email').value.trim(),
    alamat: document.getElementById('mt-alamat').value.trim(),
  };
  const all = getMitra();
  if (id) {
    const idx = all.findIndex(x => x.id === id);
    if (idx >= 0) all[idx] = { ...all[idx], ...data };
    toast('Mitra diperbarui');
  } else {
    all.push({ id: uid('m'), ...data });
    toast('Mitra ditambahkan');
  }
  save(STORAGE_KEYS.mitra, all);
  document.getElementById('modal-mitra').classList.add('hidden');
  renderMitra();
}

function deleteMitra(id) {
  const linked = getKerjasama().some(k => k.mitraId === id);
  if (linked) { toast('Mitra masih dipakai pada data kerjasama', 'error'); return; }
  if (!confirm('Hapus data mitra ini?')) return;
  const all = getMitra().filter(m => m.id !== id);
  save(STORAGE_KEYS.mitra, all);
  toast('Mitra dihapus');
  renderMitra();
}

// ----- Init -----
function bindEvents() {
  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;
    const err = document.getElementById('login-error');
    if (tryLogin(u, p)) {
      err.classList.add('hidden');
      showApp();
    } else {
      err.textContent = 'Username atau password salah.';
      err.classList.remove('hidden');
    }
  });

  document.getElementById('btn-logout').addEventListener('click', logout);

  document.querySelectorAll('.nav-link').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      navigate(a.dataset.route);
    });
  });

  // Kerjasama filters
  document.getElementById('ks-search').addEventListener('input', e => {
    state.ksFilter.q = e.target.value; renderKerjasama();
  });
  document.getElementById('ks-filter-jenis').addEventListener('change', e => {
    state.ksFilter.jenis = e.target.value; renderKerjasama();
  });
  document.getElementById('ks-filter-status').addEventListener('change', e => {
    state.ksFilter.status = e.target.value; renderKerjasama();
  });
  document.getElementById('btn-new-kerjasama').addEventListener('click', () => openKerjasamaModal());
  document.getElementById('form-kerjasama').addEventListener('submit', saveKerjasama);
  document.getElementById('ks-tbody').addEventListener('click', e => {
    const ed = e.target.closest('[data-edit-ks]');
    const dl = e.target.closest('[data-del-ks]');
    if (ed) openKerjasamaModal(ed.dataset.editKs);
    if (dl) deleteKerjasama(dl.dataset.delKs);
  });

  // Mitra filters
  document.getElementById('mt-search').addEventListener('input', e => {
    state.mtFilter.q = e.target.value; renderMitra();
  });
  document.getElementById('mt-filter-jenis').addEventListener('change', e => {
    state.mtFilter.jenis = e.target.value; renderMitra();
  });
  document.getElementById('btn-new-mitra').addEventListener('click', () => openMitraModal());
  document.getElementById('form-mitra').addEventListener('submit', saveMitra);
  document.getElementById('mt-tbody').addEventListener('click', e => {
    const ed = e.target.closest('[data-edit-mt]');
    const dl = e.target.closest('[data-del-mt]');
    if (ed) openMitraModal(ed.dataset.editMt);
    if (dl) deleteMitra(dl.dataset.delMt);
  });

  // Modal close
  document.querySelectorAll('[data-close]').forEach(b => {
    b.addEventListener('click', () => {
      b.closest('.modal').classList.add('hidden');
    });
  });
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => {
      if (e.target === m) m.classList.add('hidden');
    });
  });

  // Hash routing
  window.addEventListener('hashchange', () => {
    if (state.user) navigate(location.hash.replace('#','') || 'dashboard');
  });
}

function init() {
  document.getElementById('year').textContent = new Date().getFullYear();
  seedIfEmpty();
  bindEvents();
  const session = load(STORAGE_KEYS.session, null);
  if (session) {
    state.user = session;
    showApp();
  } else {
    showLogin();
  }
}

document.addEventListener('DOMContentLoaded', init);
