/* ============================================================
   ESCALA DE LOUVOR — app.js
   ============================================================ */

// ── STATE ──────────────────────────────────────────────────
let state = {
  year: new Date().getFullYear(),
  darkMode: false,
  members: [],       // { id, name, role }
  teams: [],         // { id, name, order, color, minister, back1, back2, guitar, electric, bass, drums, keyboard }
  schedule: {},      // { 'YYYY-MM-DD': { teamId, overrides:{}, songs:[{id,title,key,artist}] } }
  songs: [],         // { id, title, key, artist, date, ministerId, ministerName }
  activeWeekDate: null,
  activeMinisterId: null,
  activeSemester: 1,
  activeMembersTab: 'members',
  editingMemberId: null,
  weekOverrideDraft: {},
  firebaseConfig: null,
};

let db = null;

const TEAM_COLORS = ['#7C3AED','#F59E0B','#16A34A','#EF4444','#3B82F6'];
const ROLES_LABELS = {
  minister:  '🎤 Ministro',
  back1:     '🎵 Back 1',
  back2:     '🎵 Back 2',
  guitar:    '🎸 Violão',
  electric:  '⚡ Guitarra',
  bass:      '🎸 Baixo',
  drums:     '🥁 Bateria',
  keyboard:  '🎹 Teclado',
};
const ROLES = Object.keys(ROLES_LABELS);

// ── LOCAL STORAGE ───────────────────────────────────────────
function saveLocal() {
  const data = { year: state.year, darkMode: state.darkMode, members: state.members,
    teams: state.teams, schedule: state.schedule, songs: state.songs,
    firebaseConfig: state.firebaseConfig };
  localStorage.setItem('escala-louvor', JSON.stringify(data));
}

function loadLocal() {
  try {
    const raw = localStorage.getItem('escala-louvor');
    if (!raw) return;
    const d = JSON.parse(raw);
    Object.assign(state, d);
  } catch(e) {}
}

// ── FIREBASE ────────────────────────────────────────────────
async function initFirebase(config) {
  try {
    if (firebase.apps.length) firebase.app().delete();
    firebase.initializeApp(config);
    db = firebase.firestore();
    // Test connection
    await db.collection('_ping').doc('test').set({ ts: Date.now() });
    state.firebaseConfig = config;
    saveLocal();
    showToast('Firebase conectado ✓');
    document.getElementById('firebase-status').textContent = '✅ Conectado';
    document.getElementById('btn-disconnect-firebase').style.display = '';
    document.getElementById('firebase-alert').classList.add('hidden');
    await syncFromFirebase();
  } catch(e) {
    db = null;
    showToast('Erro ao conectar Firebase: ' + e.message);
    document.getElementById('firebase-status').textContent = '❌ Erro: ' + e.message;
  }
}

async function syncFromFirebase() {
  if (!db) return;
  try {
    const [membersSnap, teamsSnap, schedSnap, songsSnap] = await Promise.all([
      db.collection('members').get(),
      db.collection('teams').get(),
      db.collection('schedule').get(),
      db.collection('songs').get(),
    ]);
    state.members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.teams   = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.order - b.order);
    state.songs   = songsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.schedule = {};
    schedSnap.docs.forEach(d => { state.schedule[d.id] = d.data(); });
    saveLocal();
    renderCurrentScreen();
  } catch(e) { showToast('Erro ao sincronizar: ' + e.message); }
}

async function dbSet(collection, id, data) {
  if (db) {
    await db.collection(collection).doc(id).set(data, { merge: true });
  }
  saveLocal();
}

async function dbDelete(collection, id) {
  if (db) {
    await db.collection(collection).doc(id).delete();
  }
  saveLocal();
}

function disconnectFirebase() {
  db = null;
  state.firebaseConfig = null;
  saveLocal();
  document.getElementById('firebase-status').textContent = 'Desconectado';
  document.getElementById('btn-disconnect-firebase').style.display = 'none';
  document.getElementById('firebase-alert').classList.remove('hidden');
  showToast('Firebase desconectado');
}

// ── NAVIGATION ──────────────────────────────────────────────
let currentScreen = 'screen-home';

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
    currentScreen = id;
    el.scrollTop = 0;
    renderScreen(id);
  }
}

function renderCurrentScreen() { renderScreen(currentScreen); }

function renderScreen(id) {
  if (id === 'screen-annual')   renderAnnual();
  if (id === 'screen-semester') renderSemester();
  if (id === 'screen-minister') renderMinisterScreen();
  if (id === 'screen-members')  { renderMembers(); renderTeams(); }
  if (id === 'screen-songs')    renderSongs();
  if (id === 'screen-settings') renderSettings();
}

// ── DARK MODE ───────────────────────────────────────────────
function toggleDark() {
  state.darkMode = !state.darkMode;
  applyDark();
  saveLocal();
}
function applyDark() {
  document.body.classList.toggle('dark', state.darkMode);
  const t = document.getElementById('toggle-dark');
  if (t) t.classList.toggle('on', state.darkMode);
}

// ── TOAST ───────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ── MODAL ───────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close modal on backdrop click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ── DATE HELPERS ────────────────────────────────────────────
function getSundaysForYear(year) {
  const sundays = [];
  const d = new Date(year, 0, 1);
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
  while (d.getFullYear() === year) {
    sundays.push(toDateStr(new Date(d)));
    d.setDate(d.getDate() + 7);
  }
  return sundays;
}

function toDateStr(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth()+1).padStart(2,'0') + '-' +
    String(d.getDate()).padStart(2,'0');
}

function parseDate(str) {
  const [y,m,d] = str.split('-').map(Number);
  return new Date(y, m-1, d);
}

function formatDateLong(str) {
  const d = parseDate(str);
  return d.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}

function formatDateShort(str) {
  const d = parseDate(str);
  return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
}

function getMonthName(str) {
  const d = parseDate(str);
  return d.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
}

function getDay(str) {
  return parseDate(str).getDate();
}

function getWeekdayShort(str) {
  const d = parseDate(str);
  return d.toLocaleDateString('pt-BR', { weekday:'short' }).replace('.','');
}

// ── TEAM HELPERS ────────────────────────────────────────────
function getTeam(teamId) { return state.teams.find(t => t.id === teamId); }
function getMember(memberId) { return state.members.find(m => m.id === memberId); }
function getMemberName(memberId) { return getMember(memberId)?.name || '—'; }
function getTeamColor(teamId) {
  const t = getTeam(teamId);
  return t?.color || '#7C3AED';
}

function getWeekData(dateStr) {
  return state.schedule[dateStr] || {};
}

function getWeekTeam(dateStr) {
  const w = getWeekData(dateStr);
  return getTeam(w.teamId);
}

function getWeekMember(dateStr, role) {
  const w = getWeekData(dateStr);
  if (w.overrides && w.overrides[role]) return w.overrides[role];
  const team = getTeam(w.teamId);
  return team ? team[role] : null;
}

function getMinisterForWeek(dateStr) {
  return getWeekMember(dateStr, 'minister');
}

// ── SCHEDULE GENERATION ─────────────────────────────────────
async function autoGenerateSchedule() {
  if (state.teams.length === 0) {
    showToast('Cadastre as equipes primeiro'); return;
  }
  const confirmed = confirm(`Gerar escala para ${state.year} com ${state.teams.length} equipes em rodízio?\n\nIsso substituirá a escala atual.`);
  if (!confirmed) return;

  const sundays = getSundaysForYear(state.year);
  const newSchedule = { ...state.schedule };

  sundays.forEach((dateStr, i) => {
    const teamId = state.teams[i % state.teams.length].id;
    if (!newSchedule[dateStr]) {
      newSchedule[dateStr] = { teamId, overrides: {}, songs: [] };
    } else {
      newSchedule[dateStr].teamId = teamId;
    }
  });

  state.schedule = newSchedule;

  if (db) {
    const batch = db.batch();
    Object.entries(newSchedule).forEach(([dateStr, data]) => {
      batch.set(db.collection('schedule').doc(dateStr), data);
    });
    await batch.commit();
  }
  saveLocal();
  showToast(`✓ Escala gerada: ${sundays.length} domingos`);
  renderCurrentScreen();
}

// ── RENDER: ANNUAL SCHEDULE ─────────────────────────────────
function renderAnnual(sundays) {
  const all = sundays || getSundaysForYear(state.year);
  document.getElementById('annual-title').textContent = `Escala ${state.year}`;
  document.getElementById('annual-subtitle').textContent = `${all.length} domingos`;

  const container = document.getElementById('annual-list');
  if (all.length === 0) { container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><h3>Nenhum domingo encontrado</h3></div>'; return; }

  const byMonth = {};
  all.forEach(dateStr => {
    const key = getMonthName(dateStr);
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(dateStr);
  });

  container.innerHTML = Object.entries(byMonth).map(([month, dates]) => `
    <div class="month-group">
      <div class="month-label">${month}</div>
      ${dates.map(d => renderWeekRow(d)).join('')}
    </div>
  `).join('');
}

function renderWeekRow(dateStr) {
  const w = getWeekData(dateStr);
  const team = getTeam(w.teamId);
  const ministerName = team ? getMemberName(getWeekMember(dateStr, 'minister')) : 'Sem equipe';
  const songCount = (w.songs || []).length;
  const color = team ? getTeamColor(w.teamId) : '#ccc';

  return `<div class="week-row ${team ? '' : 'no-team'}" onclick="openWeekDetail('${dateStr}')">
    <div class="week-date-box">
      <div class="week-date-day">${getWeekdayShort(dateStr)}</div>
      <div class="week-date-num">${getDay(dateStr)}</div>
    </div>
    <div class="week-info">
      <h3><span class="team-dot" style="background:${color}"></span>${team ? team.name : 'Sem equipe'}</h3>
      <p>${ministerName}</p>
    </div>
    ${songCount > 0 ? `<span class="week-songs-badge">🎵 ${songCount}</span>` : ''}
  </div>`;
}

// ── RENDER: SEMESTER ─────────────────────────────────────────
function renderSemester() {
  const all = getSundaysForYear(state.year);
  const half = Math.ceil(all.length / 2);
  const subset = state.activeSemester === 1 ? all.slice(0, half) : all.slice(half);
  renderAnnual(subset);
  document.getElementById('semester-list').innerHTML = document.getElementById('annual-list').innerHTML;
  document.getElementById('annual-list').innerHTML = '';
}

function setSemester(n, btn) {
  state.activeSemester = n;
  document.querySelectorAll('#screen-semester .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderSemester();
}

// ── RENDER: BY MINISTER ─────────────────────────────────────
function renderMinisterScreen() {
  const ministers = state.members.filter(m => m.role === 'minister');
  const grid = document.getElementById('minister-grid');

  if (ministers.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="padding:40px 16px"><div class="empty-state-icon">🎤</div><h3>Nenhum ministro</h3><p>Adicione ministros em Membros & Equipes</p></div>';
    document.getElementById('minister-dates-list').innerHTML = '';
    return;
  }

  grid.innerHTML = ministers.map(m => `
    <div class="minister-card ${state.activeMinisterId === m.id ? 'active' : ''}" onclick="selectMinister('${m.id}')">
      <div class="minister-avatar-lg">${m.name.charAt(0).toUpperCase()}</div>
      <h3>${m.name}</h3>
      <p>${countMinisterDates(m.id)} domingos</p>
    </div>
  `).join('');

  if (!state.activeMinisterId && ministers.length > 0) {
    state.activeMinisterId = ministers[0].id;
    renderMinisterScreen();
    return;
  }
  renderMinisterDates();
}

function countMinisterDates(mId) {
  const all = getSundaysForYear(state.year);
  return all.filter(d => getMinisterForWeek(d) === mId).length;
}

function selectMinister(mId) {
  state.activeMinisterId = mId;
  document.querySelectorAll('.minister-card').forEach(c => c.classList.remove('active'));
  event.currentTarget.classList.add('active');
  renderMinisterDates();
}

function renderMinisterDates() {
  if (!state.activeMinisterId) return;
  const all = getSundaysForYear(state.year);
  const dates = all.filter(d => getMinisterForWeek(d) === state.activeMinisterId);
  const container = document.getElementById('minister-dates-list');

  if (dates.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><h3>Nenhuma data</h3><p>Gere a escala automática primeiro</p></div>';
    return;
  }

  container.innerHTML = `<div style="padding:12px 16px 4px;font-size:13px;font-weight:700;color:var(--text-muted)">${dates.length} DOMINGOS</div>` +
    dates.map(d => renderWeekRow(d)).join('');
}

// ── WEEK DETAIL MODAL ────────────────────────────────────────
function openWeekDetail(dateStr) {
  state.activeWeekDate = dateStr;
  const w = getWeekData(dateStr);
  const team = getTeam(w.teamId);

  document.getElementById('modal-week-title').textContent = formatDateLong(dateStr);
  document.getElementById('modal-week-team').textContent = team ? `${team.name}` : 'Domingo sem equipe';

  // Roles
  const rolesDiv = document.getElementById('modal-week-roles');
  rolesDiv.innerHTML = ROLES.map(role => {
    const memberId = getWeekMember(dateStr, role);
    const name = memberId ? getMemberName(memberId) : null;
    return `<div class="role-row">
      <span class="role-label">${ROLES_LABELS[role]}</span>
      <span class="role-value ${name ? '' : 'role-empty'}">${name || 'Não definido'}</span>
    </div>`;
  }).join('');

  renderWeekSongs(dateStr);
  openModal('modal-week');
}

function renderWeekSongs(dateStr) {
  const w = getWeekData(dateStr);
  const songs = w.songs || [];
  const div = document.getElementById('modal-week-songs');
  div.innerHTML = songs.length === 0
    ? '<p style="font-size:13px;color:var(--text-muted);margin-bottom:8px">Nenhuma música registrada ainda.</p>'
    : songs.map((s, i) => `
      <div class="song-chip">
        <span class="song-chip-title">${s.title}${s.artist ? ` <span style="color:var(--text-muted);font-weight:400">· ${s.artist}</span>` : ''}</span>
        <span class="song-chip-key">${s.key}</span>
        <button class="song-chip-del" onclick="deleteSongFromWeek('${dateStr}',${i})">✕</button>
      </div>`).join('');
}

async function deleteSongFromWeek(dateStr, idx) {
  const w = state.schedule[dateStr];
  if (!w) return;
  w.songs = (w.songs || []).filter((_,i) => i !== idx);
  await dbSet('schedule', dateStr, w);
  renderWeekSongs(dateStr);
  showToast('Música removida');
}

// ── ADD SONG MODAL ───────────────────────────────────────────
function openAddSongModal() {
  document.getElementById('song-title-input').value = '';
  document.getElementById('song-artist-input').value = '';
  document.getElementById('song-key-input').value = 'C';
  openModal('modal-add-song');
}

async function saveSong() {
  const title = document.getElementById('song-title-input').value.trim();
  const key   = document.getElementById('song-key-input').value;
  const artist = document.getElementById('song-artist-input').value.trim();
  if (!title) { showToast('Informe o nome da música'); return; }

  const dateStr = state.activeWeekDate;
  const w = state.schedule[dateStr] || { teamId: null, overrides: {}, songs: [] };
  if (!w.songs) w.songs = [];

  const song = { title, key, artist };
  w.songs.push(song);
  state.schedule[dateStr] = w;

  // Also save to global songs db
  const ministerName = getMemberName(getMinisterForWeek(dateStr));
  const globalSong = {
    title, key, artist,
    date: dateStr,
    ministerId: getMinisterForWeek(dateStr) || '',
    ministerName,
  };
  const songId = 'song_' + Date.now();
  state.songs.push({ id: songId, ...globalSong });
  await dbSet('schedule', dateStr, w);
  await dbSet('songs', songId, globalSong);

  closeModal('modal-add-song');
  renderWeekSongs(dateStr);
  showToast('Música adicionada ✓');
}

// ── EDIT WEEK TEAM MODAL ─────────────────────────────────────
function openEditWeekTeam() {
  const dateStr = state.activeWeekDate;
  const w = getWeekData(dateStr);
  state.weekOverrideDraft = { ...w.overrides };

  const memberOptions = state.members.map(m =>
    `<option value="${m.id}">${m.name} (${ROLES_LABELS[m.role] || m.role})</option>`).join('');

  document.getElementById('edit-week-roles').innerHTML = ROLES.map(role => {
    const currentId = getWeekMember(dateStr, role);
    return `<div class="form-group">
      <label class="form-label">${ROLES_LABELS[role]}</label>
      <select class="form-select" id="override-${role}">
        <option value="">— Usar equipe padrão —</option>
        ${memberOptions}
      </select>
    </div>`;
  }).join('');

  ROLES.forEach(role => {
    const currentId = getWeekMember(dateStr, role);
    const sel = document.getElementById('override-' + role);
    if (sel && currentId) sel.value = currentId;
  });

  openModal('modal-edit-week');
}

async function saveWeekOverride() {
  const dateStr = state.activeWeekDate;
  const w = state.schedule[dateStr] || { teamId: null, overrides: {}, songs: [] };
  const overrides = {};
  ROLES.forEach(role => {
    const val = document.getElementById('override-' + role)?.value;
    if (val) overrides[role] = val;
  });
  w.overrides = overrides;
  state.schedule[dateStr] = w;
  await dbSet('schedule', dateStr, w);
  closeModal('modal-edit-week');
  openWeekDetail(dateStr); // refresh
  showToast('Equipe atualizada ✓');
}

// ── MEMBERS ──────────────────────────────────────────────────
function renderMembers() {
  const q = document.getElementById('member-search')?.value?.toLowerCase() || '';
  const list = document.getElementById('members-list');
  const filtered = state.members.filter(m => m.name.toLowerCase().includes(q));

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><h3>Nenhum membro</h3><p>Toque no + para adicionar</p></div>';
    return;
  }

  list.innerHTML = filtered.map(m => `
    <div class="member-row">
      <div class="member-avatar">${m.name.charAt(0).toUpperCase()}</div>
      <div class="member-info">
        <div class="member-name">${m.name}</div>
        <div class="member-role">${ROLES_LABELS[m.role] || m.role}</div>
      </div>
      <div class="member-actions">
        <button class="icon-btn" onclick="editMember('${m.id}')" title="Editar">✏️</button>
        <button class="icon-btn" onclick="deleteMember('${m.id}')" title="Excluir" style="color:var(--danger)">🗑️</button>
      </div>
    </div>`).join('');
}

function openAddMemberModal() {
  state.editingMemberId = null;
  document.getElementById('modal-member-title').textContent = 'Adicionar Membro';
  document.getElementById('member-name-input').value = '';
  document.getElementById('member-role-input').value = 'minister';
  openModal('modal-add-member');
}

function editMember(id) {
  const m = getMember(id);
  if (!m) return;
  state.editingMemberId = id;
  document.getElementById('modal-member-title').textContent = 'Editar Membro';
  document.getElementById('member-name-input').value = m.name;
  document.getElementById('member-role-input').value = m.role;
  openModal('modal-add-member');
}

async function saveMember() {
  const name = document.getElementById('member-name-input').value.trim();
  const role = document.getElementById('member-role-input').value;
  if (!name) { showToast('Informe o nome'); return; }

  if (state.editingMemberId) {
    const m = getMember(state.editingMemberId);
    if (m) { m.name = name; m.role = role; }
    await dbSet('members', state.editingMemberId, { name, role });
  } else {
    const id = 'member_' + Date.now();
    state.members.push({ id, name, role });
    await dbSet('members', id, { name, role });
  }

  closeModal('modal-add-member');
  renderMembers();
  showToast('Membro salvo ✓');
}

async function deleteMember(id) {
  if (!confirm('Excluir este membro?')) return;
  state.members = state.members.filter(m => m.id !== id);
  await dbDelete('members', id);
  renderMembers();
  showToast('Membro excluído');
}

// ── TEAMS ────────────────────────────────────────────────────
function renderTeams() {
  const list = document.getElementById('teams-list');
  if (state.teams.length === 0) {
    list.innerHTML = `<div style="padding:16px">
      <button class="btn btn-primary" style="width:100%" onclick="createDefaultTeams()">
        ✨ Criar 5 Equipes Padrão
      </button>
    </div>`;
    return;
  }

  const memberOptions = (selectedId) => state.members.map(m =>
    `<option value="${m.id}" ${m.id === selectedId ? 'selected' : ''}>${m.name}</option>`).join('');

  list.innerHTML = state.teams.map((team, idx) => `
    <div class="team-card" id="team-card-${team.id}">
      <div class="team-header" onclick="toggleTeamCard('${team.id}')">
        <span class="team-dot" style="background:${team.color};width:14px;height:14px;border-radius:50%;display:inline-block"></span>
        <h3>${team.name}</h3>
        <span class="team-collapse-icon">▾</span>
      </div>
      <div class="team-body">
        ${ROLES.map(role => `
          <div class="form-group" style="padding:0 0 10px">
            <label class="form-label">${ROLES_LABELS[role]}</label>
            <select class="form-select" id="team-${team.id}-${role}" onchange="updateTeamRole('${team.id}','${role}',this.value)">
              <option value="">— Não definido —</option>
              ${memberOptions(team[role])}
            </select>
          </div>`).join('')}
        <div style="display:flex;gap:8px;margin-top:6px">
          <input class="form-input" style="flex:1" placeholder="Nome da equipe" value="${team.name}"
            onchange="renameTeam('${team.id}',this.value)">
          <button class="btn btn-danger" onclick="deleteTeam('${team.id}')">🗑️</button>
        </div>
      </div>
    </div>`).join('');
}

function toggleTeamCard(id) {
  document.getElementById('team-card-' + id)?.classList.toggle('expanded');
}

async function updateTeamRole(teamId, role, memberId) {
  const team = getTeam(teamId);
  if (!team) return;
  team[role] = memberId || null;
  await dbSet('teams', teamId, team);
  saveLocal();
}

async function renameTeam(teamId, name) {
  const team = getTeam(teamId);
  if (!team) return;
  team.name = name;
  await dbSet('teams', teamId, team);
  saveLocal();
}

async function deleteTeam(teamId) {
  if (!confirm('Excluir esta equipe?')) return;
  state.teams = state.teams.filter(t => t.id !== teamId);
  await dbDelete('teams', teamId);
  renderTeams();
  showToast('Equipe excluída');
}

async function createDefaultTeams() {
  const names = ['Equipe 1', 'Equipe 2', 'Equipe 3', 'Equipe 4', 'Equipe 5'];
  for (let i = 0; i < 5; i++) {
    const id = 'team_' + (i+1);
    const team = { id, name: names[i], order: i, color: TEAM_COLORS[i],
      minister: null, back1: null, back2: null, guitar: null, electric: null,
      bass: null, drums: null, keyboard: null };
    state.teams.push(team);
    await dbSet('teams', id, team);
  }
  renderTeams();
  showToast('5 equipes criadas ✓');
}

function setMembersTab(tab, btn) {
  state.activeMembersTab = tab;
  document.querySelectorAll('#screen-members .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-members').classList.toggle('hidden', tab !== 'members');
  document.getElementById('tab-teams').classList.toggle('hidden', tab !== 'teams');
  document.getElementById('fab-member').classList.toggle('hidden', tab !== 'members');
  if (tab === 'teams') renderTeams();
}

// ── SONGS SCREEN ─────────────────────────────────────────────
function renderSongs() {
  const q = (document.getElementById('song-search')?.value || '').toLowerCase();
  const filtered = state.songs.filter(s =>
    s.title.toLowerCase().includes(q) ||
    (s.ministerName || '').toLowerCase().includes(q) ||
    (s.artist || '').toLowerCase().includes(q)
  );

  const list = document.getElementById('songs-list');
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎼</div><h3>Nenhuma música</h3><p>Registre músicas ao abrir um domingo na escala</p></div>';
    return;
  }

  // Sort by date desc
  filtered.sort((a,b) => (b.date || '').localeCompare(a.date || ''));

  list.innerHTML = filtered.map(s => `
    <div class="member-row">
      <div class="member-avatar" style="background:var(--primary-soft);color:var(--primary);font-size:20px">🎵</div>
      <div class="member-info">
        <div class="member-name">${s.title}</div>
        <div class="member-role">${s.ministerName || ''}${s.date ? ' · ' + formatDateShort(s.date) : ''}${s.artist ? ' · ' + s.artist : ''}</div>
      </div>
      <span class="week-songs-badge" style="background:var(--primary-soft);color:var(--primary)">${s.key}</span>
    </div>`).join('');
}

// ── SETTINGS ─────────────────────────────────────────────────
function renderSettings() {
  document.getElementById('setting-year').value = state.year;
  const t = document.getElementById('toggle-dark');
  if (t) t.classList.toggle('on', state.darkMode);
  if (state.firebaseConfig) {
    document.getElementById('firebase-config-input').value = JSON.stringify(state.firebaseConfig, null, 2);
    document.getElementById('firebase-status').textContent = db ? '✅ Conectado' : '⚠️ Config salva, reconectar';
    document.getElementById('btn-disconnect-firebase').style.display = '';
  }
}

function saveYear() {
  const yr = parseInt(document.getElementById('setting-year').value);
  if (yr >= 2024 && yr <= 2035) {
    state.year = yr;
    saveLocal();
    showToast('Ano salvo: ' + yr);
  }
}

async function saveFirebaseConfig() {
  const raw = document.getElementById('firebase-config-input').value.trim();
  try {
    const config = JSON.parse(raw);
    await initFirebase(config);
  } catch(e) {
    showToast('JSON inválido: ' + e.message);
  }
}

function exportData() {
  const data = { year: state.year, members: state.members, teams: state.teams,
    schedule: state.schedule, songs: state.songs };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `escala-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
}

async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (data.members) state.members = data.members;
    if (data.teams) state.teams = data.teams;
    if (data.schedule) state.schedule = data.schedule;
    if (data.songs) state.songs = data.songs;
    if (data.year) state.year = data.year;
    saveLocal();
    showToast('Backup restaurado ✓');
    renderCurrentScreen();
  } catch(e) {
    showToast('Erro ao importar: ' + e.message);
  }
}

function clearAllData() {
  if (!confirm('Apagar TODOS os dados? Esta ação não pode ser desfeita.')) return;
  state.members = []; state.teams = []; state.schedule = {}; state.songs = [];
  saveLocal();
  showToast('Dados apagados');
  renderCurrentScreen();
}

// ── SHARE ────────────────────────────────────────────────────
function shareWeekWhatsApp() {
  const dateStr = state.activeWeekDate;
  const w = getWeekData(dateStr);
  const team = getTeam(w.teamId);
  const lines = [
    `📅 *${formatDateLong(dateStr)}*`,
    `🎵 ${team ? team.name : 'Sem equipe'}`,
    '',
    ...ROLES.map(role => {
      const name = getMemberName(getWeekMember(dateStr, role));
      return `${ROLES_LABELS[role]}: ${name}`;
    }),
  ];
  const songs = w.songs || [];
  if (songs.length > 0) {
    lines.push('', '🎼 *Repertório:*');
    songs.forEach(s => lines.push(`• ${s.title} (${s.key})`));
  }
  const text = lines.join('\n');
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}

function shareWeekCalendar() {
  const dateStr = state.activeWeekDate;
  const w = getWeekData(dateStr);
  const team = getTeam(w.teamId);
  const ministerName = getMemberName(getWeekMember(dateStr, 'minister'));
  const d = parseDate(dateStr);
  const fmt = (dt) => dt.toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';
  const start = new Date(d); start.setHours(9,0,0,0);
  const end   = new Date(d); end.setHours(11,0,0,0);

  const title = `Culto — ${team ? team.name : 'Sem equipe'} · ${ministerName}`;
  const desc = ROLES.map(r => `${ROLES_LABELS[r]}: ${getMemberName(getWeekMember(dateStr, r))}`).join('\n');

  const url = `https://www.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${fmt(start)}/${fmt(end)}` +
    `&details=${encodeURIComponent(desc)}`;
  window.open(url, '_blank');
}

function printWeek() {
  const dateStr = state.activeWeekDate;
  const w = getWeekData(dateStr);
  const team = getTeam(w.teamId);
  const rows = ROLES.map(r => `<tr><td style="font-weight:600;padding:6px 12px;border-bottom:1px solid #eee">${ROLES_LABELS[r]}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${getMemberName(getWeekMember(dateStr, r))}</td></tr>`).join('');
  const songs = (w.songs || []).map(s => `<li>${s.title} <strong>(${s.key})</strong>${s.artist ? ' · ' + s.artist : ''}</li>`).join('');

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>Escala ${dateStr}</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;max-width:600px;margin:auto}
    h1{color:#7C3AED}table{width:100%;border-collapse:collapse}
    @media print{@page{margin:20mm}}</style></head><body>
    <h1>🎵 Escala de Louvor</h1>
    <h2>${formatDateLong(dateStr)}</h2>
    <p style="color:#666">${team ? team.name : ''}</p>
    <table>${rows}</table>
    ${songs ? `<h3 style="margin-top:24px">Repertório</h3><ul>${songs}</ul>` : ''}
    <script>window.print();window.close();<\/script></body></html>`);
}

function shareFullSchedule(mode) {
  const all = getSundaysForYear(state.year);
  const lines = [`📅 *Escala de Louvor ${state.year}*`, ''];
  all.slice(0, mode === 'semester' ? (state.activeSemester === 1 ? Math.ceil(all.length/2) : all.length) : all.length)
    .slice(mode === 'semester' && state.activeSemester === 2 ? Math.ceil(all.length/2) : 0)
    .forEach(d => {
      const team = getWeekTeam(d);
      const min = getMemberName(getMinisterForWeek(d));
      lines.push(`• ${formatDateShort(d)} — ${team ? team.name : 'S/E'} · ${min}`);
    });
  window.open('https://wa.me/?text=' + encodeURIComponent(lines.join('\n')), '_blank');
}

// ── YEAR PICKER ──────────────────────────────────────────────
function showYearPicker() {
  const yr = state.year;
  const opts = document.getElementById('year-options');
  opts.innerHTML = [yr-1, yr, yr+1, yr+2].map(y => `
    <button class="btn ${y === yr ? 'btn-primary' : 'btn-ghost'}" style="width:100%" onclick="selectYear(${y})">${y}</button>
  `).join('');
  openModal('modal-year');
}

function selectYear(y) {
  state.year = y;
  saveLocal();
  closeModal('modal-year');
  renderAnnual();
  showToast('Ano: ' + y);
}

// ── INIT ─────────────────────────────────────────────────────
async function init() {
  loadLocal();
  applyDark();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  if (state.firebaseConfig) {
    try {
      await initFirebase(state.firebaseConfig);
    } catch(e) {}
  } else {
    document.getElementById('firebase-alert').classList.remove('hidden');
  }

  setTimeout(() => {
    document.getElementById('splash').classList.add('hide');
    showScreen('screen-home');
  }, 900);
}

document.addEventListener('DOMContentLoaded', init);
