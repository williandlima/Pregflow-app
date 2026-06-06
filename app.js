'use strict';

// =============================================
// CONSTANTES
// =============================================
const STORAGE_KEY = 'financeflow_v1';

const CATEGORIES = [
  { id: 'salary',    emoji: '💰', label: 'Salário',      color: '#10B981', bg: 'rgba(16,185,129,0.15)', type: 'income' },
  { id: 'advance',   emoji: '💳', label: 'Adiantamento', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)',  type: 'income' },
  { id: 'extra',     emoji: '🎁', label: 'Extra',        color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)',  type: 'income' },
  { id: 'food',      emoji: '🍔', label: 'Alimentação',  color: '#F97316', bg: 'rgba(249,115,22,0.15)',  type: 'expense' },
  { id: 'transport', emoji: '🚗', label: 'Transporte',   color: '#06B6D4', bg: 'rgba(6,182,212,0.15)',   type: 'expense' },
  { id: 'home',      emoji: '🏠', label: 'Moradia',      color: '#84CC16', bg: 'rgba(132,204,22,0.15)',  type: 'expense' },
  { id: 'health',    emoji: '💊', label: 'Saúde',        color: '#EC4899', bg: 'rgba(236,72,153,0.15)',  type: 'expense' },
  { id: 'edu',       emoji: '📚', label: 'Educação',     color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', type: 'expense' },
  { id: 'fun',       emoji: '🎭', label: 'Lazer',        color: '#FBBF24', bg: 'rgba(251,191,36,0.15)',  type: 'expense' },
  { id: 'clothes',   emoji: '👕', label: 'Vestuário',    color: '#F43F5E', bg: 'rgba(244,63,94,0.15)',   type: 'expense' },
  { id: 'bills',     emoji: '💡', label: 'Contas',       color: '#0EA5E9', bg: 'rgba(14,165,233,0.15)',  type: 'expense' },
  { id: 'other',     emoji: '📦', label: 'Outros',       color: '#6B7280', bg: 'rgba(107,114,128,0.15)', type: 'both' },
];

const GOAL_EMOJIS = ['🎯','✈️','🏖️','🚗','🏠','💻','💍','📱','🎓','👶','🐶','🌍','💪','🎸','⛵'];
const GOAL_COLORS = ['#7C3AED','#10B981','#3B82F6','#F97316','#EC4899','#FBBF24','#06B6D4','#EF4444','#84CC16','#8B5CF6'];
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// =============================================
// STATE
// =============================================
let db = {
  transactions: [],
  recurring: [],
  investments: [],
  goals: [],
  budgets: [],
  settings: { name: '', dark: true }
};

let ui = {
  page: 'dashboard',
  history: [],
  extratoMonth: new Date().getMonth(),
  extratoYear: new Date().getFullYear(),
  reportMonth: new Date().getMonth(),
  reportYear: new Date().getFullYear(),
  orcMonth: new Date().getMonth(),
  orcYear: new Date().getFullYear(),
  filterCat: 'all',
  lancType: 'expense',
  recType: 'expense',
  selectedLancCat: null,
  selectedRecCat: null,
  selectedMetaEmoji: '🎯',
  selectedMetaColor: '#7C3AED',
};

let charts = {};

// =============================================
// STORAGE
// =============================================
function saveDB() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch(e) {}
}

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) db = Object.assign({ transactions:[], recurring:[], investments:[], goals:[], budgets:[], settings:{name:'',dark:true} }, JSON.parse(raw));
  } catch(e) {}
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// =============================================
// UTILS
// =============================================
function fmtCurrency(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function monthLabel(m, y) {
  return `${MONTH_NAMES[m]} ${y}`;
}

function getCat(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES.find(c => c.id === 'other');
}

function getTransactionsForMonth(m, y) {
  return db.transactions.filter(t => {
    const d = new Date(t.date + 'T12:00:00');
    return d.getMonth() === m && d.getFullYear() === y;
  });
}

function monthIncome(txs) { return txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0); }
function monthExpense(txs) { return txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0); }

// =============================================
// NAVIGATION
// =============================================
const PAGE_TITLES = {
  dashboard: 'Início', extrato: 'Extrato',
  investimentos: 'Investimentos', metas: 'Metas',
  recorrentes: 'Recorrentes', relatorios: 'Relatórios',
  orcamento: 'Orçamento', configuracoes: 'Configurações'
};

function navigate(page) {
  if (ui.page !== page) ui.history.push(ui.page);
  ui.page = page;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');

  document.getElementById('page-title').textContent = PAGE_TITLES[page] || '';

  // back button
  const backBtn = document.getElementById('btn-back');
  const hasPrev = ui.history.length > 0 && page !== 'dashboard';
  backBtn.classList.toggle('hidden', !hasPrev);

  // nav active state
  document.querySelectorAll('.nav-btn[data-page]').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });

  // hide FAB on certain pages
  const hideFab = ['configuracoes', 'relatorios'];
  document.getElementById('fab').style.display = hideFab.includes(page) ? 'none' : '';

  // render page
  renderPage(page);
}

function navigateBack() {
  const prev = ui.history.pop() || 'dashboard';
  ui.page = prev;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + prev).classList.add('active');
  document.getElementById('page-title').textContent = PAGE_TITLES[prev] || '';
  document.getElementById('btn-back').classList.toggle('hidden', ui.history.length === 0 || prev === 'dashboard');
  document.querySelectorAll('.nav-btn[data-page]').forEach(b => {
    b.classList.toggle('active', b.dataset.page === prev);
  });
  document.getElementById('fab').style.display = ['configuracoes','relatorios'].includes(prev) ? 'none' : '';
  renderPage(prev);
}

function renderPage(page) {
  const fns = {
    dashboard: renderDashboard,
    extrato: renderExtrato,
    investimentos: renderInvestimentos,
    metas: renderMetas,
    recorrentes: renderRecorrentes,
    relatorios: renderRelatorios,
    orcamento: renderOrcamento,
    configuracoes: renderConfiguracoes,
  };
  if (fns[page]) fns[page]();
}

function navFromMais(page) {
  closeModal('modal-mais');
  setTimeout(() => navigate(page), 120);
}

// =============================================
// DASHBOARD
// =============================================
function renderDashboard() {
  const now = new Date();
  const m = now.getMonth(), y = now.getFullYear();
  const txs = getTransactionsForMonth(m, y);
  const inc = monthIncome(txs);
  const exp = monthExpense(txs);
  const bal = inc - exp;

  const name = db.settings.name;
  const hour = now.getHours();
  const greet = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  document.getElementById('hero-greeting').textContent = name ? `${greet}, ${name}! 👋` : `${greet}! 👋`;
  document.getElementById('hero-balance').textContent = fmtCurrency(bal);
  document.getElementById('hero-balance').style.color = bal < 0 ? '#FCA5A5' : 'white';
  document.getElementById('hero-period').textContent = monthLabel(m, y);
  document.getElementById('dash-income').textContent = fmtCurrency(inc);
  document.getElementById('dash-expense').textContent = fmtCurrency(exp);

  // Upcoming bills (next 7 days)
  const today = now.getDate();
  const upcoming = db.recurring.filter(r => r.active && r.type === 'expense').map(r => {
    let daysUntil = r.day - today;
    if (daysUntil < 0) daysUntil += 30;
    return { ...r, daysUntil };
  }).filter(r => r.daysUntil <= 7).sort((a, b) => a.daysUntil - b.daysUntil);

  const badge = document.getElementById('upcoming-badge');
  const upList = document.getElementById('upcoming-list');
  const upEmpty = document.getElementById('upcoming-empty');
  badge.textContent = upcoming.length || '';
  badge.style.display = upcoming.length ? '' : 'none';
  upList.innerHTML = '';
  upEmpty.classList.toggle('hidden', upcoming.length > 0);
  upcoming.slice(0, 5).forEach(r => {
    const cat = getCat(r.category);
    const div = document.createElement('div');
    div.className = 'upcoming-item';
    const dayText = r.daysUntil === 0 ? 'hoje' : r.daysUntil === 1 ? 'amanhã' : `em ${r.daysUntil} dias`;
    div.innerHTML = `
      <div class="upcoming-dot" style="background:${cat.color}"></div>
      <div class="upcoming-name">${r.name}</div>
      <div class="upcoming-day">${dayText}</div>
      <div class="upcoming-val">${fmtCurrency(r.amount)}</div>`;
    upList.appendChild(div);
  });

  // Recent transactions
  const recentList = document.getElementById('recent-list');
  const recentEmpty = document.getElementById('recent-empty');
  const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  recentList.innerHTML = '';
  recentEmpty.classList.toggle('hidden', sorted.length > 0);
  sorted.forEach(t => recentList.appendChild(makeTxItem(t, false)));

  // Chart: last 6 months balance
  renderDashboardChart(m, y);
}

function renderDashboardChart(curM, curY) {
  const labels = [], incData = [], expData = [];
  for (let i = 5; i >= 0; i--) {
    let m = curM - i, y = curY;
    if (m < 0) { m += 12; y--; }
    const txs = getTransactionsForMonth(m, y);
    labels.push(MONTH_NAMES[m].slice(0, 3));
    incData.push(monthIncome(txs));
    expData.push(monthExpense(txs));
  }
  const ctx = document.getElementById('chart-dashboard').getContext('2d');
  if (charts.dashboard) charts.dashboard.destroy();
  charts.dashboard = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Entradas', data: incData, backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6 },
        { label: 'Saídas', data: expData, backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 6 },
      ]
    },
    options: chartDefaults({ legend: true })
  });
}

// =============================================
// EXTRATO
// =============================================
function renderExtrato() {
  const m = ui.extratoMonth, y = ui.extratoYear;
  document.getElementById('extrato-month-label').textContent = monthLabel(m, y);

  let txs = getTransactionsForMonth(m, y);
  const inc = monthIncome(txs), exp = monthExpense(txs), bal = inc - exp;
  document.getElementById('ext-income').textContent = fmtCurrency(inc);
  document.getElementById('ext-expense').textContent = fmtCurrency(exp);
  document.getElementById('ext-balance').textContent = fmtCurrency(bal);
  document.getElementById('ext-balance').style.color = bal < 0 ? 'var(--red)' : 'var(--green)';

  // Category chips
  const filterRow = document.getElementById('cat-filter-row');
  const usedCats = [...new Set(txs.map(t => t.category))];
  filterRow.innerHTML = `<button class="chip${ui.filterCat==='all'?' active':''}" data-cat="all" onclick="filterCat(this,'all')">Todos</button>`;
  usedCats.forEach(cid => {
    const c = getCat(cid);
    filterRow.innerHTML += `<button class="chip${ui.filterCat===cid?' active':''}" data-cat="${cid}" onclick="filterCat(this,'${cid}')">${c.emoji} ${c.label}</button>`;
  });

  // Filter
  if (ui.filterCat !== 'all') txs = txs.filter(t => t.category === ui.filterCat);
  txs.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  const list = document.getElementById('extrato-list');
  const empty = document.getElementById('extrato-empty');
  list.innerHTML = '';
  if (!txs.length) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  // Group by date
  const groups = {};
  txs.forEach(t => { if (!groups[t.date]) groups[t.date] = []; groups[t.date].push(t); });
  Object.keys(groups).sort((a,b) => b.localeCompare(a)).forEach(date => {
    const label = document.createElement('div');
    label.className = 'tx-group-label';
    label.textContent = fmtDate(date);
    list.appendChild(label);
    groups[date].forEach(t => list.appendChild(makeTxItem(t, true)));
  });
}

function makeTxItem(t, showDelete) {
  const cat = getCat(t.category);
  const div = document.createElement('div');
  div.className = 'tx-item' + (t.recurring_id ? ' tx-recurring' : '');
  div.innerHTML = `
    <div class="tx-cat-icon" style="background:${cat.bg};color:${cat.color}">${cat.emoji}</div>
    <div class="tx-info">
      <div class="tx-desc">${t.description || cat.label}${t.recurring_id ? ' <span class="rec-badge">🔄</span>' : ''}</div>
      <div class="tx-date">${cat.label} · ${fmtDate(t.date)}</div>
    </div>
    <div class="tx-amount ${t.type}">${t.type==='income'?'+':'-'}${fmtCurrency(t.amount)}</div>`;

  let pressTimer = null;
  let longFired = false;

  div.addEventListener('touchstart', () => {
    longFired = false;
    pressTimer = setTimeout(() => {
      longFired = true;
      if (navigator.vibrate) navigator.vibrate(40);
      promptRecorrente(t);
    }, 600);
  }, { passive: true });

  div.addEventListener('touchmove', () => clearTimeout(pressTimer));
  div.addEventListener('touchend', () => clearTimeout(pressTimer));

  div.addEventListener('click', () => {
    if (longFired) { longFired = false; return; }
    editTransaction(t);
  });

  div.addEventListener('contextmenu', e => { e.preventDefault(); promptRecorrente(t); });

  return div;
}

function promptRecorrente(t) {
  if (t.recurring_id) {
    confirmAction(
      'Remover das recorrentes?',
      `"${t.description || getCat(t.category).label}" vai parar de aparecer automaticamente nos próximos meses.`,
      () => removeFromRecurring(t.recurring_id),
      '🔄'
    );
  } else {
    const dia = new Date(t.date + 'T12:00:00').getDate();
    confirmAction(
      'Tornar recorrente?',
      `"${t.description || getCat(t.category).label}" vai aparecer automaticamente todo mês no dia ${dia}.`,
      () => makeRecurring(t),
      '🔁'
    );
  }
}

function makeRecurring(t) {
  const dia = new Date(t.date + 'T12:00:00').getDate();
  const recId = uid();
  db.recurring.push({
    id: recId,
    name: t.description || getCat(t.category).label,
    amount: t.amount,
    day: dia,
    type: t.type,
    category: t.category,
    active: true
  });
  const idx = db.transactions.findIndex(tx => tx.id === t.id);
  if (idx !== -1) db.transactions[idx].recurring_id = recId;
  saveDB();
  renderPage(ui.page);
}

function removeFromRecurring(recurringId) {
  db.recurring = db.recurring.filter(r => r.id !== recurringId);
  db.transactions.forEach(tx => { if (tx.recurring_id === recurringId) delete tx.recurring_id; });
  saveDB();
  renderPage(ui.page);
}

function changeMonth(delta) {
  ui.extratoMonth += delta;
  if (ui.extratoMonth > 11) { ui.extratoMonth = 0; ui.extratoYear++; }
  if (ui.extratoMonth < 0) { ui.extratoMonth = 11; ui.extratoYear--; }
  ui.filterCat = 'all';
  renderExtrato();
}

function filterCat(btn, cat) {
  ui.filterCat = cat;
  document.querySelectorAll('#cat-filter-row .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderExtrato();
}

// =============================================
// LANÇAMENTOS MODAL
// =============================================
function openModalLancamento(type) {
  ui.lancType = type || 'expense';
  ui.selectedLancCat = null;
  document.getElementById('lanc-modal-title').textContent = 'Novo Lançamento';
  document.getElementById('lanc-id').value = '';
  document.getElementById('lanc-amount').value = '';
  document.getElementById('lanc-desc').value = '';
  document.getElementById('lanc-date').value = todayISO();
  setLancType(ui.lancType);
  buildCatGrid('lanc-cat-grid', null, ui.lancType);
  openModal('modal-lancamento');
}

function editTransaction(t) {
  ui.lancType = t.type;
  ui.selectedLancCat = t.category;
  document.getElementById('lanc-modal-title').textContent = 'Editar Lançamento';
  document.getElementById('lanc-id').value = t.id;
  document.getElementById('lanc-amount').value = t.amount;
  document.getElementById('lanc-desc').value = t.description;
  document.getElementById('lanc-date').value = t.date;
  setLancType(t.type);
  buildCatGrid('lanc-cat-grid', t.category, t.type);
  openModal('modal-lancamento');
}

function setLancType(type) {
  ui.lancType = type;
  const ti = document.getElementById('tab-income');
  const te = document.getElementById('tab-expense');
  ti.className = 'type-tab' + (type === 'income' ? ' active income-tab' : '');
  te.className = 'type-tab' + (type === 'expense' ? ' active expense-tab' : '');
  buildCatGrid('lanc-cat-grid', ui.selectedLancCat, type);
}

function buildCatGrid(containerId, selected, typeFilter) {
  const grid = document.getElementById(containerId);
  grid.innerHTML = '';
  const cats = CATEGORIES.filter(c => c.type === typeFilter || c.type === 'both');
  cats.forEach(c => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cat-btn' + (c.id === selected ? ' active' : '');
    btn.innerHTML = `<span class="cat-emoji">${c.emoji}</span><span>${c.label}</span>`;
    btn.onclick = () => {
      grid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (containerId === 'lanc-cat-grid') ui.selectedLancCat = c.id;
      else if (containerId === 'rec-cat-grid') ui.selectedRecCat = c.id;
    };
    grid.appendChild(btn);
  });
}

function saveLancamento() {
  const amount = parseFloat(document.getElementById('lanc-amount').value);
  const desc = document.getElementById('lanc-desc').value.trim();
  const date = document.getElementById('lanc-date').value;
  const id = document.getElementById('lanc-id').value;
  const cat = ui.selectedLancCat || (ui.lancType === 'income' ? 'salary' : 'other');

  if (!amount || amount <= 0) { alert('Informe um valor válido.'); return; }
  if (!date) { alert('Informe a data.'); return; }

  if (id) {
    const idx = db.transactions.findIndex(t => t.id === id);
    if (idx !== -1) db.transactions[idx] = { ...db.transactions[idx], amount, description: desc, date, type: ui.lancType, category: cat };
  } else {
    db.transactions.push({ id: uid(), amount, description: desc, date, type: ui.lancType, category: cat });
  }

  saveDB();
  closeModal('modal-lancamento');
  if (ui.page === 'extrato') renderExtrato();
  else if (ui.page === 'dashboard') renderDashboard();
  else if (ui.page === 'orcamento') renderOrcamento();
}

function deleteTransaction(id) {
  confirmAction('Excluir lançamento?', 'Esta ação não pode ser desfeita.', () => {
    db.transactions = db.transactions.filter(t => t.id !== id);
    saveDB();
    closeModal('modal-lancamento');
    renderPage(ui.page);
  });
}

// =============================================
// RECORRENTES
// =============================================
function renderRecorrentes() {
  const recs = db.recurring;
  const totalExp = recs.filter(r => r.type === 'expense' && r.active).reduce((s, r) => s + r.amount, 0);
  const totalInc = recs.filter(r => r.type === 'income' && r.active).reduce((s, r) => s + r.amount, 0);
  document.getElementById('rec-total-exp').textContent = fmtCurrency(totalExp);
  document.getElementById('rec-total-inc').textContent = fmtCurrency(totalInc);
  document.getElementById('rec-total-bal').textContent = fmtCurrency(totalInc - totalExp);
  document.getElementById('rec-total-bal').style.color = totalInc - totalExp >= 0 ? 'var(--green)' : 'var(--red)';

  const list = document.getElementById('recorrentes-list');
  const empty = document.getElementById('recorrentes-empty');
  list.innerHTML = '';
  if (!recs.length) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  recs.sort((a, b) => a.day - b.day).forEach(r => {
    const cat = getCat(r.category);
    const item = document.createElement('div');
    item.className = 'rec-item';
    item.innerHTML = `
      <div class="rec-cat-icon" style="background:${cat.bg};color:${cat.color}">${cat.emoji}</div>
      <div class="rec-info">
        <div class="rec-name">${r.name}</div>
        <div class="rec-day-label">Dia ${r.day} · ${cat.label}</div>
      </div>
      <div class="rec-amount ${r.type}">${r.type==='income'?'+':'-'}${fmtCurrency(r.amount)}</div>
      <label class="toggle-sw rec-toggle">
        <input type="checkbox" ${r.active?'checked':''} onchange="toggleRecurring('${r.id}',this.checked)">
        <span class="sw-track"><span class="sw-thumb"></span></span>
      </label>`;
    item.querySelector('.rec-info').onclick = () => editRecorrente(r);
    list.appendChild(item);
  });
}

function openModalRecorrente() {
  ui.recType = 'expense';
  ui.selectedRecCat = null;
  document.getElementById('rec-modal-title').textContent = 'Nova Recorrente';
  document.getElementById('rec-id').value = '';
  document.getElementById('rec-name').value = '';
  document.getElementById('rec-amount').value = '';
  document.getElementById('rec-day').value = '';
  setRecType('expense');
  buildCatGrid('rec-cat-grid', null, 'expense');
  openModal('modal-recorrente');
}

function editRecorrente(r) {
  ui.recType = r.type;
  ui.selectedRecCat = r.category;
  document.getElementById('rec-modal-title').textContent = 'Editar Recorrente';
  document.getElementById('rec-id').value = r.id;
  document.getElementById('rec-name').value = r.name;
  document.getElementById('rec-amount').value = r.amount;
  document.getElementById('rec-day').value = r.day;
  setRecType(r.type);
  buildCatGrid('rec-cat-grid', r.category, r.type);
  openModal('modal-recorrente');
}

function setRecType(type) {
  ui.recType = type;
  const ti = document.getElementById('tab-rec-income');
  const te = document.getElementById('tab-rec-expense');
  ti.className = 'type-tab' + (type === 'income' ? ' active income-tab' : '');
  te.className = 'type-tab' + (type === 'expense' ? ' active expense-tab' : '');
  buildCatGrid('rec-cat-grid', ui.selectedRecCat, type);
}

function saveRecorrente() {
  const name = document.getElementById('rec-name').value.trim();
  const amount = parseFloat(document.getElementById('rec-amount').value);
  const day = parseInt(document.getElementById('rec-day').value);
  const id = document.getElementById('rec-id').value;
  const cat = ui.selectedRecCat || (ui.recType === 'income' ? 'salary' : 'bills');

  if (!name) { alert('Informe o nome.'); return; }
  if (!amount || amount <= 0) { alert('Informe um valor válido.'); return; }
  if (!day || day < 1 || day > 31) { alert('Informe o dia (1-31).'); return; }

  if (id) {
    const idx = db.recurring.findIndex(r => r.id === id);
    if (idx !== -1) db.recurring[idx] = { ...db.recurring[idx], name, amount, day, type: ui.recType, category: cat };
  } else {
    db.recurring.push({ id: uid(), name, amount, day, type: ui.recType, category: cat, active: true });
  }

  saveDB();
  closeModal('modal-recorrente');
  if (ui.page === 'recorrentes') renderRecorrentes();
  else if (ui.page === 'dashboard') renderDashboard();
}

function toggleRecurring(id, active) {
  const r = db.recurring.find(r => r.id === id);
  if (r) { r.active = active; saveDB(); renderRecorrentes(); }
}

function generateMonthlyRecurring() {
  const now = new Date();
  const m = now.getMonth(), y = now.getFullYear();
  const monthStr = `${y}-${String(m+1).padStart(2,'0')}`;
  let added = 0;

  db.recurring.filter(r => r.active).forEach(r => {
    const day = Math.min(r.day, new Date(y, m+1, 0).getDate());
    const date = `${monthStr}-${String(day).padStart(2,'0')}`;
    const alreadyExists = db.transactions.some(t => t.recurring_id === r.id && t.date.startsWith(monthStr));
    if (!alreadyExists) {
      db.transactions.push({ id: uid(), amount: r.amount, description: r.name, date, type: r.type, category: r.category, recurring_id: r.id });
      added++;
    }
  });

  saveDB();
  alert(added > 0 ? `${added} lançamento(s) gerado(s) com sucesso!` : 'Todos os lançamentos recorrentes já foram gerados este mês.');
  if (ui.page === 'extrato') renderExtrato();
  else if (ui.page === 'dashboard') renderDashboard();
}

// =============================================
// INVESTIMENTOS
// =============================================
function renderInvestimentos() {
  const total = db.investments.reduce((s, i) => s + i.amount, 0);
  const proj12 = db.investments.reduce((s, i) => s + calcProjection(i, 12), 0);
  document.getElementById('invest-total').textContent = fmtCurrency(total);
  document.getElementById('invest-proj12').textContent = fmtCurrency(proj12);

  const list = document.getElementById('invest-list');
  const empty = document.getElementById('invest-empty');
  list.innerHTML = '';
  if (!db.investments.length) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  db.investments.forEach(inv => {
    const proj = calcProjection(inv, 12);
    const gain = proj - inv.amount;
    const card = document.createElement('div');
    card.className = 'inv-card';
    card.innerHTML = `
      <div class="inv-card-head">
        <div>
          <div class="inv-name">${inv.name}</div>
          <div class="inv-bank">${inv.bank}</div>
        </div>
        <div class="inv-type-badge">${inv.type}</div>
      </div>
      <div class="inv-row">
        <div class="inv-stat">
          <div class="inv-stat-label">Investido</div>
          <div class="inv-stat-value">${fmtCurrency(inv.amount)}</div>
        </div>
        <div class="inv-stat">
          <div class="inv-stat-label">Projeção 12 meses</div>
          <div class="inv-stat-value" style="color:var(--green)">${fmtCurrency(proj)}</div>
        </div>
      </div>
      <div class="inv-rate-badge">${inv.rate}% a.m. · ganho: +${fmtCurrency(gain)}</div>`;
    card.onclick = () => editInvestimento(inv);
    list.appendChild(card);
  });

  // Pie chart
  renderInvestPie();
}

function calcProjection(inv, months) {
  const rate = inv.rate / 100;
  return inv.amount * Math.pow(1 + rate, months);
}

function renderInvestPie() {
  if (!db.investments.length) {
    document.getElementById('invest-pie-section').style.display = 'none';
    return;
  }
  document.getElementById('invest-pie-section').style.display = '';
  const colors = ['#7C3AED','#10B981','#3B82F6','#F97316','#EC4899','#FBBF24','#06B6D4','#EF4444'];
  const ctx = document.getElementById('chart-invest-pie').getContext('2d');
  if (charts.investPie) charts.investPie.destroy();
  charts.investPie = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: db.investments.map(i => i.name),
      datasets: [{ data: db.investments.map(i => i.amount), backgroundColor: db.investments.map((_, idx) => colors[idx % colors.length]), borderWidth: 2, borderColor: 'var(--bg2)' }]
    },
    options: { ...chartDefaults({ legend: false }), cutout: '65%' }
  });

  const legend = document.getElementById('invest-pie-legend');
  legend.innerHTML = '';
  db.investments.forEach((inv, idx) => {
    const total = db.investments.reduce((s, i) => s + i.amount, 0);
    const pct = total ? ((inv.amount / total) * 100).toFixed(1) : 0;
    legend.innerHTML += `<div class="pie-legend-item"><div class="pie-legend-dot" style="background:${colors[idx % colors.length]}"></div>${inv.name} (${pct}%)</div>`;
  });
}

function openModalInvestimento() {
  document.getElementById('inv-modal-title').textContent = 'Novo Investimento';
  document.getElementById('inv-id').value = '';
  document.getElementById('inv-name').value = '';
  document.getElementById('inv-bank').value = '';
  document.getElementById('inv-type').value = 'CDB';
  document.getElementById('inv-amount').value = '';
  document.getElementById('inv-rate').value = '';
  document.getElementById('inv-date').value = todayISO();
  openModal('modal-investimento');
}

function editInvestimento(inv) {
  document.getElementById('inv-modal-title').textContent = 'Editar Investimento';
  document.getElementById('inv-id').value = inv.id;
  document.getElementById('inv-name').value = inv.name;
  document.getElementById('inv-bank').value = inv.bank;
  document.getElementById('inv-type').value = inv.type;
  document.getElementById('inv-amount').value = inv.amount;
  document.getElementById('inv-rate').value = inv.rate;
  document.getElementById('inv-date').value = inv.startDate;
  openModal('modal-investimento');
}

function saveInvestimento() {
  const name = document.getElementById('inv-name').value.trim();
  const bank = document.getElementById('inv-bank').value.trim();
  const type = document.getElementById('inv-type').value;
  const amount = parseFloat(document.getElementById('inv-amount').value);
  const rate = parseFloat(document.getElementById('inv-rate').value);
  const startDate = document.getElementById('inv-date').value;
  const id = document.getElementById('inv-id').value;

  if (!name) { alert('Informe o nome.'); return; }
  if (!amount || amount <= 0) { alert('Informe o valor investido.'); return; }
  if (isNaN(rate) || rate < 0) { alert('Informe a taxa de rendimento.'); return; }

  const data = { name, bank, type, amount, rate, startDate };
  if (id) {
    const idx = db.investments.findIndex(i => i.id === id);
    if (idx !== -1) db.investments[idx] = { ...db.investments[idx], ...data };
  } else {
    db.investments.push({ id: uid(), ...data });
  }

  saveDB();
  closeModal('modal-investimento');
  renderInvestimentos();
}

// =============================================
// METAS
// =============================================
function renderMetas() {
  const list = document.getElementById('metas-list');
  const empty = document.getElementById('metas-empty');
  list.innerHTML = '';
  if (!db.goals.length) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  db.goals.forEach(g => {
    const pct = Math.min(100, g.target > 0 ? (g.saved / g.target * 100) : 0);
    const remaining = Math.max(0, g.target - g.saved);
    let monthsLeft = null, monthlyNeeded = null;
    if (g.deadline) {
      const [dy, dm] = g.deadline.split('-').map(Number);
      const now = new Date();
      monthsLeft = (dy - now.getFullYear()) * 12 + dm - (now.getMonth() + 1);
      if (monthsLeft > 0 && remaining > 0) monthlyNeeded = remaining / monthsLeft;
    }

    const card = document.createElement('div');
    card.className = 'goal-card';
    card.innerHTML = `
      <div class="goal-head">
        <div class="goal-emoji-circle" style="background:${g.color}22;color:${g.color}">${g.emoji}</div>
        <div>
          <div class="goal-title">${g.name}</div>
          <div class="goal-deadline">${g.deadline ? 'Meta: ' + g.deadline.split('-').reverse().join('/').slice(3) : 'Sem prazo'}</div>
        </div>
      </div>
      <div class="goal-amounts">
        <div class="goal-saved" style="color:${g.color}">${fmtCurrency(g.saved)}</div>
        <div class="goal-target">de ${fmtCurrency(g.target)}</div>
      </div>
      <div class="goal-bar-bg">
        <div class="goal-bar-fill" style="width:${pct}%;background:${g.color}"></div>
      </div>
      <div class="goal-footer">
        <div class="goal-pct" style="color:${g.color}">${pct.toFixed(0)}% concluído</div>
        <div style="display:flex;gap:8px;align-items:center">
          ${monthlyNeeded ? `<span class="goal-monthly">${fmtCurrency(monthlyNeeded)}/mês</span>` : ''}
          <button class="btn-deposit" onclick="event.stopPropagation();openDeposito('${g.id}','${g.name}')">+ Depositar</button>
        </div>
      </div>`;
    card.onclick = () => editMeta(g);
    list.appendChild(card);
  });
}

function openModalMeta() {
  ui.selectedMetaEmoji = '🎯';
  ui.selectedMetaColor = GOAL_COLORS[0];
  document.getElementById('meta-modal-title').textContent = 'Nova Meta';
  document.getElementById('meta-id').value = '';
  document.getElementById('meta-name').value = '';
  document.getElementById('meta-target').value = '';
  document.getElementById('meta-saved').value = '';
  document.getElementById('meta-deadline').value = '';
  buildEmojiGrid();
  buildColorGrid();
  openModal('modal-meta');
}

function editMeta(g) {
  ui.selectedMetaEmoji = g.emoji;
  ui.selectedMetaColor = g.color;
  document.getElementById('meta-modal-title').textContent = 'Editar Meta';
  document.getElementById('meta-id').value = g.id;
  document.getElementById('meta-name').value = g.name;
  document.getElementById('meta-target').value = g.target;
  document.getElementById('meta-saved').value = g.saved;
  document.getElementById('meta-deadline').value = g.deadline || '';
  buildEmojiGrid();
  buildColorGrid();
  openModal('modal-meta');
}

function buildEmojiGrid() {
  const grid = document.getElementById('meta-emoji-grid');
  grid.innerHTML = '';
  GOAL_EMOJIS.forEach(em => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emoji-opt' + (em === ui.selectedMetaEmoji ? ' active' : '');
    btn.textContent = em;
    btn.onclick = () => {
      ui.selectedMetaEmoji = em;
      grid.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
    grid.appendChild(btn);
  });
}

function buildColorGrid() {
  const grid = document.getElementById('meta-color-grid');
  grid.innerHTML = '';
  GOAL_COLORS.forEach(col => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-opt' + (col === ui.selectedMetaColor ? ' active' : '');
    btn.style.background = col;
    btn.onclick = () => {
      ui.selectedMetaColor = col;
      grid.querySelectorAll('.color-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
    grid.appendChild(btn);
  });
}

function saveMeta() {
  const name = document.getElementById('meta-name').value.trim();
  const target = parseFloat(document.getElementById('meta-target').value);
  const saved = parseFloat(document.getElementById('meta-saved').value) || 0;
  const deadline = document.getElementById('meta-deadline').value;
  const id = document.getElementById('meta-id').value;

  if (!name) { alert('Informe o nome da meta.'); return; }
  if (!target || target <= 0) { alert('Informe o valor alvo.'); return; }

  const data = { name, target, saved, deadline, emoji: ui.selectedMetaEmoji, color: ui.selectedMetaColor };
  if (id) {
    const idx = db.goals.findIndex(g => g.id === id);
    if (idx !== -1) db.goals[idx] = { ...db.goals[idx], ...data };
  } else {
    db.goals.push({ id: uid(), ...data });
  }

  saveDB();
  closeModal('modal-meta');
  renderMetas();
}

function openDeposito(goalId, goalName) {
  document.getElementById('dep-modal-title').textContent = `+ ${goalName}`;
  document.getElementById('dep-meta-id').value = goalId;
  document.getElementById('dep-amount').value = '';
  openModal('modal-deposito');
}

function saveDeposito() {
  const id = document.getElementById('dep-meta-id').value;
  const amount = parseFloat(document.getElementById('dep-amount').value);
  if (!amount || amount <= 0) { alert('Informe um valor válido.'); return; }
  const g = db.goals.find(g => g.id === id);
  if (g) { g.saved = (g.saved || 0) + amount; saveDB(); }
  closeModal('modal-deposito');
  renderMetas();
}

// =============================================
// RELATÓRIOS
// =============================================
function renderRelatorios() {
  const m = ui.reportMonth, y = ui.reportYear;
  document.getElementById('report-month-label').textContent = monthLabel(m, y);

  const txs = getTransactionsForMonth(m, y);
  renderCategoryPie(txs);
  renderMonthlyBars(m, y);
  renderBalanceLine(m, y);
}

function renderCategoryPie(txs) {
  const expenses = txs.filter(t => t.type === 'expense');
  const catMap = {};
  expenses.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const cats = Object.keys(catMap).map(id => ({ ...getCat(id), total: catMap[id] })).sort((a, b) => b.total - a.total);

  const ctx = document.getElementById('chart-cats').getContext('2d');
  if (charts.catPie) charts.catPie.destroy();

  if (!cats.length) return;

  charts.catPie = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: cats.map(c => c.label),
      datasets: [{ data: cats.map(c => c.total), backgroundColor: cats.map(c => c.color), borderWidth: 2, borderColor: 'var(--bg2)' }]
    },
    options: { ...chartDefaults({ legend: false }), cutout: '60%' }
  });

  const legend = document.getElementById('cats-legend');
  const total = cats.reduce((s, c) => s + c.total, 0);
  legend.innerHTML = cats.map(c => `
    <div class="pie-legend-item">
      <div class="pie-legend-dot" style="background:${c.color}"></div>
      ${c.emoji} ${c.label} — ${fmtCurrency(c.total)} (${total ? ((c.total/total)*100).toFixed(0) : 0}%)
    </div>`).join('');
}

function renderMonthlyBars(curM, curY) {
  const labels = [], incData = [], expData = [];
  for (let i = 5; i >= 0; i--) {
    let m = curM - i, y = curY;
    if (m < 0) { m += 12; y--; }
    const txs = getTransactionsForMonth(m, y);
    labels.push(MONTH_NAMES[m].slice(0, 3));
    incData.push(monthIncome(txs));
    expData.push(monthExpense(txs));
  }
  const ctx = document.getElementById('chart-monthly').getContext('2d');
  if (charts.monthly) charts.monthly.destroy();
  charts.monthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Entradas', data: incData, backgroundColor: 'rgba(16,185,129,0.75)', borderRadius: 6 },
        { label: 'Saídas', data: expData, backgroundColor: 'rgba(239,68,68,0.75)', borderRadius: 6 },
      ]
    },
    options: chartDefaults({ legend: true })
  });
}

function renderBalanceLine(curM, curY) {
  const labels = [], data = [];
  for (let i = 5; i >= 0; i--) {
    let m = curM - i, y = curY;
    if (m < 0) { m += 12; y--; }
    const txs = getTransactionsForMonth(m, y);
    labels.push(MONTH_NAMES[m].slice(0, 3));
    data.push(monthIncome(txs) - monthExpense(txs));
  }
  const ctx = document.getElementById('chart-balance-line').getContext('2d');
  if (charts.balanceLine) charts.balanceLine.destroy();
  charts.balanceLine = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Saldo',
        data,
        borderColor: '#7C3AED',
        backgroundColor: 'rgba(124,58,237,0.15)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#7C3AED',
        pointRadius: 4,
      }]
    },
    options: chartDefaults({ legend: false })
  });
}

function changeReportMonth(delta) {
  ui.reportMonth += delta;
  if (ui.reportMonth > 11) { ui.reportMonth = 0; ui.reportYear++; }
  if (ui.reportMonth < 0) { ui.reportMonth = 11; ui.reportYear--; }
  renderRelatorios();
}

// =============================================
// ORÇAMENTO
// =============================================
function renderOrcamento() {
  const m = ui.orcMonth, y = ui.orcYear;
  document.getElementById('orc-month-label').textContent = monthLabel(m, y);
  const monthStr = `${y}-${String(m+1).padStart(2,'0')}`;

  const budgets = db.budgets.filter(b => b.month === monthStr);
  const txs = getTransactionsForMonth(m, y).filter(t => t.type === 'expense');

  const list = document.getElementById('orc-list');
  const empty = document.getElementById('orc-empty');
  list.innerHTML = '';
  if (!budgets.length) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  budgets.forEach(b => {
    const cat = getCat(b.category);
    const spent = txs.filter(t => t.category === b.category).reduce((s, t) => s + t.amount, 0);
    const pct = b.limit > 0 ? Math.min(100, (spent / b.limit) * 100) : 0;
    const barColor = pct >= 100 ? 'var(--red)' : pct >= 80 ? 'var(--yellow)' : 'var(--green)';
    const remaining = Math.max(0, b.limit - spent);

    const card = document.createElement('div');
    card.className = 'orc-card';
    card.innerHTML = `
      <div class="orc-head">
        <div class="orc-cat"><span class="orc-cat-icon">${cat.emoji}</span>${cat.label}</div>
        <div class="orc-values">${fmtCurrency(spent)} / ${fmtCurrency(b.limit)}</div>
      </div>
      <div class="orc-bar-bg">
        <div class="orc-bar-fill" style="width:${pct}%;background:${barColor}"></div>
      </div>
      <div class="orc-footer">
        <span class="orc-pct" style="color:${barColor}">${pct.toFixed(0)}% utilizado</span>
        <span class="orc-remaining">${pct >= 100 ? 'Limite excedido!' : 'Restam ' + fmtCurrency(remaining)}</span>
      </div>`;
    card.onclick = () => editOrcamento(b, monthStr);
    list.appendChild(card);
  });
}

function openModalOrcamento() {
  const m = ui.orcMonth, y = ui.orcYear;
  const monthStr = `${y}-${String(m+1).padStart(2,'0')}`;
  document.getElementById('orc-modal-title').textContent = 'Definir Orçamento';
  document.getElementById('orc-id').value = '';
  document.getElementById('orc-limit').value = '';

  const sel = document.getElementById('orc-cat');
  sel.innerHTML = '';
  const existing = db.budgets.filter(b => b.month === monthStr).map(b => b.category);
  CATEGORIES.filter(c => c.type === 'expense' || c.type === 'both').forEach(c => {
    if (!existing.includes(c.id)) {
      sel.innerHTML += `<option value="${c.id}">${c.emoji} ${c.label}</option>`;
    }
  });
  if (!sel.options.length) { alert('Todas as categorias já têm orçamento definido este mês.'); return; }
  openModal('modal-orcamento');
}

function editOrcamento(b, monthStr) {
  document.getElementById('orc-modal-title').textContent = 'Editar Orçamento';
  document.getElementById('orc-id').value = b.id;
  document.getElementById('orc-limit').value = b.limit;
  const cat = getCat(b.category);
  const sel = document.getElementById('orc-cat');
  sel.innerHTML = `<option value="${b.category}">${cat.emoji} ${cat.label}</option>`;
  openModal('modal-orcamento');
}

function saveOrcamento() {
  const category = document.getElementById('orc-cat').value;
  const limit = parseFloat(document.getElementById('orc-limit').value);
  const id = document.getElementById('orc-id').value;
  const m = ui.orcMonth, y = ui.orcYear;
  const month = `${y}-${String(m+1).padStart(2,'0')}`;

  if (!limit || limit <= 0) { alert('Informe o limite mensal.'); return; }

  if (id) {
    const idx = db.budgets.findIndex(b => b.id === id);
    if (idx !== -1) db.budgets[idx].limit = limit;
  } else {
    db.budgets.push({ id: uid(), category, limit, month });
  }

  saveDB();
  closeModal('modal-orcamento');
  renderOrcamento();
}

function changeOrcMonth(delta) {
  ui.orcMonth += delta;
  if (ui.orcMonth > 11) { ui.orcMonth = 0; ui.orcYear++; }
  if (ui.orcMonth < 0) { ui.orcMonth = 11; ui.orcYear--; }
  renderOrcamento();
}

// =============================================
// CONFIGURAÇÕES
// =============================================
function renderConfiguracoes() {
  document.getElementById('cfg-name').value = db.settings.name || '';
  document.getElementById('cfg-dark').checked = db.settings.dark !== false;
}

function saveCfgName() {
  db.settings.name = document.getElementById('cfg-name').value.trim();
  saveDB();
}

function toggleTheme() {
  db.settings.dark = document.getElementById('cfg-dark').checked;
  applyTheme();
  saveDB();
}

function applyTheme() {
  document.body.classList.toggle('light', !db.settings.dark);
}

function clearAllData() {
  localStorage.removeItem(STORAGE_KEY);
  db = { transactions: [], recurring: [], investments: [], goals: [], budgets: [], settings: { name: '', dark: true } };
  applyTheme();
  navigate('dashboard');
}

// =============================================
// EXPORTAR CSV
// =============================================
function exportCSV() {
  const headers = ['ID','Data','Tipo','Categoria','Descrição','Valor'];
  const rows = db.transactions.map(t => {
    const cat = getCat(t.category);
    return [t.id, fmtDate(t.date), t.type === 'income' ? 'Entrada' : 'Saída', cat.label, `"${(t.description||'').replace(/"/g,'""')}"`, t.amount.toFixed(2)];
  });
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `financeflow_${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// =============================================
// CONFIRM ACTION
// =============================================
function confirmAction(title, msg, fn, emoji) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = msg || '';
  document.getElementById('confirm-emoji').textContent = emoji || '⚠️';
  document.getElementById('confirm-ok').onclick = () => { closeModal('modal-confirmar'); fn(); };
  openModal('modal-confirmar');
}

// =============================================
// MODALS
// =============================================
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function overlayClose(e, id) {
  if (e.target === e.currentTarget) closeModal(id);
}

function openModalMais() {
  openModal('modal-mais');
}

// =============================================
// CHART DEFAULTS
// =============================================
function chartDefaults({ legend }) {
  const isDark = db.settings.dark !== false;
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#8B949E' : '#6B7280';
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: {
        display: !!legend,
        labels: { color: textColor, usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 12 } }
      },
      tooltip: {
        callbacks: {
          label: ctx => ' ' + fmtCurrency(ctx.raw)
        }
      }
    },
    scales: legend ? {
      x: { ticks: { color: textColor, font: { size: 11 } }, grid: { color: gridColor } },
      y: { ticks: { color: textColor, font: { size: 11 }, callback: v => 'R$ ' + Number(v).toLocaleString('pt-BR',{maximumFractionDigits:0}) }, grid: { color: gridColor } }
    } : undefined,
    animation: { duration: 400, easing: 'easeOutQuart' }
  };
}

// =============================================
// PWA
// =============================================
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
}

// =============================================
// INIT
// =============================================
function init() {
  loadDB();
  applyTheme();

  // Check recurring generation (once per month)
  const lastGen = localStorage.getItem('ff_last_gen');
  const nowKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;
  if (lastGen !== nowKey && db.recurring.some(r => r.active)) {
    generateMonthlyRecurring();
    localStorage.setItem('ff_last_gen', nowKey);
  }

  navigate('dashboard');

  // Splash hide
  setTimeout(() => {
    const splash = document.getElementById('splash');
    splash.style.opacity = '0';
    splash.style.transition = 'opacity .4s';
    setTimeout(() => { splash.style.display = 'none'; document.getElementById('app').classList.remove('hidden'); }, 400);
  }, 800);

  registerSW();
}

document.addEventListener('DOMContentLoaded', init);
