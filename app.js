'use strict';

const DB_KEY = 'pregflow_db';
const THEME_KEY = 'pregflow_theme';
const DB_VERSION = 1;

const STATE = {
    sermons: [],
    currentId: null,
    timer: null,
    seconds: 0,
    isRunning: false
};

// ---- INIT ----

document.addEventListener('DOMContentLoaded', () => {
    loadDB();
    applyTheme();
    initBibleData();
    bindEvents();

    setTimeout(() => {
        const splash = document.getElementById('splash');
        splash.style.opacity = '0';
        setTimeout(() => { splash.style.display = 'none'; showScreen('homeScreen'); }, 500);
    }, 1200);

    renderList();

    window.addEventListener('beforeunload', performSave);

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }
});

function loadDB() {
    try {
        const saved = localStorage.getItem(DB_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) STATE.sermons = parsed;
        }
    } catch {
        STATE.sermons = [];
    }
}

function applyTheme() {
    if (localStorage.getItem(THEME_KEY) === 'dark') document.body.classList.add('dark');
}

// ---- EVENT BINDING ----

function bindEvents() {
    // Home
    document.getElementById('btn-settings').addEventListener('click', () => toggleSettings(true));
    document.getElementById('btn-new-sermon').addEventListener('click', createNewSermon);

    // Editor nav
    document.getElementById('btn-back').addEventListener('click', goHome);
    document.getElementById('btn-pdf').addEventListener('click', exportPDF);
    document.getElementById('btn-bible').addEventListener('click', () => toggleBible(true));
    document.getElementById('btn-preach').addEventListener('click', startPreachMode);

    // Toolbar
    document.getElementById('btn-new-block').addEventListener('mousedown', addNewBlock);
    document.getElementById('btn-move-up').addEventListener('mousedown', (e) => { e.preventDefault(); moveBlock(-1); });
    document.getElementById('btn-move-down').addEventListener('mousedown', (e) => { e.preventDefault(); moveBlock(1); });

    document.querySelectorAll('[data-format]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => applyFormat(e, btn.dataset.format));
    });

    // Preach HUD
    document.getElementById('btn-font-dec').addEventListener('click', () => adjustFont(-4));
    document.getElementById('btn-timer').addEventListener('click', toggleTimer);
    document.getElementById('btn-font-inc').addEventListener('click', () => adjustFont(4));
    document.getElementById('btn-exit-preach').addEventListener('click', exitPreach);
    document.getElementById('hud-tap-zone').addEventListener('click', toggleHud);

    // Bible modal
    document.getElementById('bibleModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) toggleBible(false);
    });
    document.getElementById('btn-bible-close').addEventListener('click', () => toggleBible(false));
    document.getElementById('bibleBook').addEventListener('change', loadChapters);
    document.getElementById('bibleChapter').addEventListener('change', fetchBibleText);

    // Settings modal
    document.getElementById('settingsModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) toggleSettings(false);
    });
    document.getElementById('btn-settings-close').addEventListener('click', () => toggleSettings(false));
    document.getElementById('btn-theme').addEventListener('click', toggleTheme);
    document.getElementById('btn-backup-dl').addEventListener('click', downloadBackup);
    document.getElementById('btn-backup-restore').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', (e) => restoreBackup(e.target));

    // Event delegation for dynamic sermon cards
    document.getElementById('sermonList').addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('[data-delete-id]');
        if (deleteBtn) { deleteSermon(parseInt(deleteBtn.dataset.deleteId)); return; }
        const card = e.target.closest('[data-sermon-id]');
        if (card) openSermon(parseInt(card.dataset.sermonId));
    });
}

// ---- PERSISTENCE ----

function saveDB() {
    localStorage.setItem(DB_KEY, JSON.stringify(STATE.sermons));
    updateSaveStatus('Salvo');
}

let saveTimer;

function updateSaveStatus(msg) {
    const el = document.getElementById('saveStatus');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('saving', msg === 'Salvando...');
}

function triggerSave() {
    updateSaveStatus('Salvando...');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(performSave, 800);
}

function performSave() {
    if (!STATE.currentId) return;
    const s = STATE.sermons.find(x => x.id === STATE.currentId);
    if (!s) return;
    s.title = document.getElementById('docTitle').value;
    s.ref = document.getElementById('docRef').value;
    s.updated = Date.now();
    const domBlocks = document.querySelectorAll('#editorBlocks .block');
    s.content = Array.from(domBlocks).map(b => ({ type: b.dataset.type, text: b.innerText }));
    saveDB();
}

// ---- SCREENS ----

function showScreen(id) {
    document.querySelectorAll('.screen, #preachScreen').forEach(el => {
        el.classList.remove('active');
        el.id === 'preachScreen' ? el.classList.add('hidden') : el.style.display = 'none';
    });
    const target = document.getElementById(id);
    if (id === 'preachScreen') {
        target.classList.remove('hidden');
    } else {
        target.style.display = 'block';
        setTimeout(() => target.classList.add('active'), 10);
    }
}

// ---- SERMONS ----

function renderList() {
    const list = document.getElementById('sermonList');
    const empty = document.getElementById('emptyState');
    list.innerHTML = '';
    if (STATE.sermons.length === 0) { empty.style.display = 'block'; return; }
    empty.style.display = 'none';

    STATE.sermons.sort((a, b) => b.updated - a.updated).forEach(s => {
        const div = document.createElement('div');
        div.className = 'sermon-card';
        div.dataset.sermonId = s.id;
        div.innerHTML = `
            <div class="card-info" style="flex-grow:1;">
                <h3>${escapeHtml(s.title || 'Sem Título')}</h3>
                <p>${escapeHtml(s.ref || 'Rascunho')} &bull; ${new Date(s.updated).toLocaleDateString('pt-BR')}</p>
            </div>
            <button class="icon-btn" data-delete-id="${s.id}" title="Excluir">
                <svg class="icon" style="stroke:var(--danger)"><use href="#icon-trash"></use></svg>
            </button>
        `;
        list.appendChild(div);
    });
}

function openSermon(id) {
    STATE.currentId = id;
    const s = STATE.sermons.find(x => x.id === id);
    document.getElementById('docTitle').value = s.title;
    document.getElementById('docRef').value = s.ref;
    document.getElementById('docTitle').addEventListener('input', triggerSave, { once: false });
    document.getElementById('docRef').addEventListener('input', triggerSave, { once: false });

    const container = document.getElementById('editorBlocks');
    container.innerHTML = '';
    const blocks = s.content.length ? s.content : [{ type: 'p', text: '' }];
    blocks.forEach(b => createBlockUI(b.type, b.text));
    showScreen('editorScreen');
}

function createNewSermon() {
    const id = Date.now();
    STATE.sermons.push({ id, title: '', ref: '', content: [{ type: 'p', text: '' }], updated: id });
    openSermon(id);
}

function deleteSermon(id) {
    if (!confirm('Tem certeza que deseja excluir esta mensagem?')) return;
    STATE.sermons = STATE.sermons.filter(s => s.id !== id);
    saveDB();
    renderList();
}

function goHome() { performSave(); renderList(); showScreen('homeScreen'); }

// ---- EDITOR BLOCKS ----

function createBlockUI(type, text, after = null) {
    const div = document.createElement('div');
    div.className = 'block';
    if (type === 'quote') div.classList.add('preach-quote');
    if (type === 'warn') div.classList.add('preach-warn');
    if (type === 'box') div.classList.add('preach-box');

    div.contentEditable = 'true';
    div.dataset.type = type;
    div.innerText = text;
    div.setAttribute('placeholder', getPlaceholder(type));

    div.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const newBlock = createBlockUI('p', '');
            const c = document.getElementById('editorBlocks');
            c.insertBefore(newBlock, div.nextSibling);
            newBlock.focus();
            triggerSave();
        }
        if (e.key === 'Backspace' && !e.target.innerText.trim()) {
            const prev = e.target.previousElementSibling;
            if (prev) { e.preventDefault(); e.target.remove(); prev.focus(); triggerSave(); }
        }
    });
    div.addEventListener('input', triggerSave);

    const c = document.getElementById('editorBlocks');
    if (after) c.insertBefore(div, after.nextSibling);
    else c.appendChild(div);
    return div;
}

function addNewBlock(e) {
    e.preventDefault();
    const newBlock = createBlockUI('p', '');
    document.getElementById('editorBlocks').appendChild(newBlock);
    newBlock.focus();
    window.scrollTo(0, document.body.scrollHeight);
    triggerSave();
}

function moveBlock(direction) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    let node = sel.anchorNode;
    while (node && (!node.classList || !node.classList.contains('block'))) {
        node = node.parentNode;
        if (node === document.body) return;
    }
    if (!node) return;
    if (direction === -1 && node.previousElementSibling) {
        node.parentNode.insertBefore(node, node.previousElementSibling);
        node.focus();
    } else if (direction === 1 && node.nextElementSibling) {
        node.parentNode.insertBefore(node.nextElementSibling, node);
        node.focus();
    }
    triggerSave();
}

function getPlaceholder(type) {
    const map = { p: 'Comece a escrever...', h1: 'Título Principal', h2: 'Subtítulo', quote: 'Citação...', warn: 'Aviso...', box: 'Destaque...' };
    return map[type] || '...';
}

function applyFormat(e, type) {
    e.preventDefault();
    const sel = window.getSelection();
    let node = sel.anchorNode;
    if (!sel.rangeCount || !node) {
        const blocks = document.querySelectorAll('.block');
        node = blocks.length > 0 ? blocks[blocks.length - 1] : createBlockUI('p', '');
    }
    while (node && (!node.classList || !node.classList.contains('block'))) { node = node.parentNode; }
    if (!node) return;

    node.className = 'block';
    node.dataset.type = type;
    node.setAttribute('placeholder', getPlaceholder(type));
    if (type === 'quote') node.classList.add('preach-quote');
    if (type === 'warn') node.classList.add('preach-warn');
    if (type === 'box') node.classList.add('preach-box');

    document.querySelectorAll('.tool-chip').forEach(b => b.classList.remove('active'));
    const btn = e.target.closest('.tool-chip');
    if (btn && !btn.classList.contains('action')) btn.classList.add('active');

    triggerSave();
    node.focus();
}

// ---- BIBLE ----

const bibleBooks = [
    { n: 'Gênesis', c: 50 }, { n: 'Êxodo', c: 40 }, { n: 'Levítico', c: 27 }, { n: 'Números', c: 36 }, { n: 'Deuteronômio', c: 34 },
    { n: 'Josué', c: 24 }, { n: 'Juízes', c: 21 }, { n: 'Rute', c: 4 }, { n: '1 Samuel', c: 31 }, { n: '2 Samuel', c: 24 },
    { n: '1 Reis', c: 22 }, { n: '2 Reis', c: 25 }, { n: '1 Crônicas', c: 29 }, { n: '2 Crônicas', c: 36 }, { n: 'Esdras', c: 10 },
    { n: 'Neemias', c: 13 }, { n: 'Ester', c: 10 }, { n: 'Jó', c: 42 }, { n: 'Salmos', c: 150 }, { n: 'Provérbios', c: 31 },
    { n: 'Eclesiastes', c: 12 }, { n: 'Cânticos', c: 8 }, { n: 'Isaías', c: 66 }, { n: 'Jeremias', c: 52 }, { n: 'Lamentações', c: 5 },
    { n: 'Ezequiel', c: 48 }, { n: 'Daniel', c: 12 }, { n: 'Oseias', c: 14 }, { n: 'Joel', c: 3 }, { n: 'Amós', c: 9 },
    { n: 'Obadias', c: 1 }, { n: 'Jonas', c: 4 }, { n: 'Miqueias', c: 7 }, { n: 'Naum', c: 3 }, { n: 'Habacuque', c: 3 },
    { n: 'Sofonias', c: 3 }, { n: 'Ageu', c: 2 }, { n: 'Zacarias', c: 14 }, { n: 'Malaquias', c: 4 },
    { n: 'Mateus', c: 28 }, { n: 'Marcos', c: 16 }, { n: 'Lucas', c: 24 }, { n: 'João', c: 21 }, { n: 'Atos', c: 28 },
    { n: 'Romanos', c: 16 }, { n: '1 Coríntios', c: 16 }, { n: '2 Coríntios', c: 13 }, { n: 'Gálatas', c: 6 }, { n: 'Efésios', c: 6 },
    { n: 'Filipenses', c: 4 }, { n: 'Colossenses', c: 4 }, { n: '1 Tessalonicenses', c: 5 }, { n: '2 Tessalonicenses', c: 3 },
    { n: '1 Timóteo', c: 6 }, { n: '2 Timóteo', c: 4 }, { n: 'Tito', c: 3 }, { n: 'Filemom', c: 1 }, { n: 'Hebreus', c: 13 },
    { n: 'Tiago', c: 5 }, { n: '1 Pedro', c: 5 }, { n: '2 Pedro', c: 3 }, { n: '1 João', c: 5 }, { n: '2 João', c: 1 },
    { n: '3 João', c: 1 }, { n: 'Judas', c: 1 }, { n: 'Apocalipse', c: 22 }
];

function initBibleData() {
    const sel = document.getElementById('bibleBook');
    bibleBooks.forEach((b, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = b.n;
        sel.appendChild(opt);
    });
    loadChapters();
}

function loadChapters() {
    const bookIdx = parseInt(document.getElementById('bibleBook').value);
    const chapSel = document.getElementById('bibleChapter');
    chapSel.innerHTML = '';
    for (let i = 1; i <= bibleBooks[bookIdx].c; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        chapSel.appendChild(opt);
    }
    fetchBibleText();
}

async function fetchWithRetry(url, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res;
        } catch (err) {
            if (attempt === maxRetries - 1) throw err;
            await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
        }
    }
}

async function fetchBibleText() {
    const bookIdx = parseInt(document.getElementById('bibleBook').value);
    const bookName = bibleBooks[bookIdx].n;
    const chapter = document.getElementById('bibleChapter').value;
    const display = document.getElementById('bibleText');

    display.innerHTML = "<div style='text-align:center; padding:20px; color:var(--text-muted); font-family:var(--font-ui)'>Carregando...</div>";

    try {
        const res = await fetchWithRetry(
            `https://bible-api.com/${encodeURIComponent(bookName + ' ' + chapter)}?translation=almeida`
        );
        const data = await res.json();

        if (data.error || !data.verses) {
            display.innerHTML = "<div style='text-align:center; padding:20px; color:var(--text-muted); font-family:var(--font-ui)'>Capítulo não encontrado.</div>";
            return;
        }

        display.innerHTML = '';
        data.verses.forEach(v => {
            const ref = `${bookName} ${chapter}:${v.verse}`;
            const verseText = v.text.trim();

            const item = document.createElement('div');
            item.className = 'verse-item';

            const textEl = document.createElement('div');
            textEl.className = 'verse-text';
            textEl.innerHTML = `<b>${v.verse}.</b> ${verseText}`;

            const copyBtn = document.createElement('button');
            copyBtn.className = 'verse-btn';
            copyBtn.textContent = 'Copiar';
            copyBtn.addEventListener('click', () => copyVerseText(`${verseText} — ${ref}`, copyBtn));

            const insertBtn = document.createElement('button');
            insertBtn.className = 'verse-btn insert';
            insertBtn.textContent = 'Inserir';
            insertBtn.addEventListener('click', () => insertSingleVerse(`${verseText} (${ref})`));

            const actions = document.createElement('div');
            actions.className = 'verse-actions';
            actions.appendChild(copyBtn);
            actions.appendChild(insertBtn);

            item.appendChild(textEl);
            item.appendChild(actions);
            display.appendChild(item);
        });
    } catch {
        display.innerHTML = `
            <div style='text-align:center; padding:24px; color:var(--text-muted); font-family:var(--font-ui)'>
                <div style='font-size:32px; margin-bottom:12px'>📡</div>
                <p style='margin:0 0 8px 0; font-weight:600'>Sem conexão</p>
                <p style='margin:0; font-size:13px'>Verifique sua internet e tente novamente.</p>
            </div>`;
    }
}

function copyVerseText(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        const original = btn.textContent;
        btn.textContent = 'OK!';
        setTimeout(() => { btn.textContent = original; }, 1200);
    }).catch(() => showToast('Não foi possível copiar'));
}

function insertSingleVerse(text) {
    createBlockUI('quote', text);
    toggleBible(false);
    triggerSave();
    window.scrollTo(0, document.body.scrollHeight);
}

function toggleBible(show) {
    document.getElementById('bibleModal').classList.toggle('active', show);
    if (show) {
        const display = document.getElementById('bibleText');
        if (!display.querySelector('.verse-item')) fetchBibleText();
    }
}

// ---- PREACH MODE ----

function startPreachMode() {
    performSave();
    const s = STATE.sermons.find(x => x.id === STATE.currentId);
    if (!s) return;

    let html = `<div style="text-align:center; margin-bottom:40px; opacity:0.8; border-bottom:1px solid var(--border); padding-bottom:30px">
        <h1 style="font-size:1.8em; margin:0; line-height:1.2; font-family:var(--font-ui)">${escapeHtml(s.title)}</h1>
        <p style="font-size:1.2em; color:var(--primary); margin:10px 0 0 0; font-weight:600; font-family:var(--font-ui)">${escapeHtml(s.ref)}</p>
    </div>`;

    s.content.forEach(b => {
        const txt = escapeHtml(b.text) || '&nbsp;';
        if (b.type === 'h1') html += `<h2 style="font-size:1.6em; margin-top:40px; line-height:1.2; font-weight:800; font-family:var(--font-ui)">${txt}</h2>`;
        else if (b.type === 'h2') html += `<h3 style="color:var(--primary); margin-top:30px; font-size:1.3em; font-family:var(--font-ui)">${txt}</h3>`;
        else if (b.type === 'quote') html += `<div class="preach-quote">${txt}</div>`;
        else if (b.type === 'warn') html += `<div class="preach-warn">${txt}</div>`;
        else if (b.type === 'box') html += `<div class="preach-box">${txt}</div>`;
        else html += `<p style="margin-bottom:20px">${txt}</p>`;
    });

    document.getElementById('preachContent').innerHTML = html;
    showScreen('preachScreen');
    resetTimer();
}

function exitPreach() {
    clearInterval(STATE.timer);
    STATE.isRunning = false;
    showScreen('editorScreen');
}

function exportPDF() {
    if (!STATE.currentId) return;
    performSave();
    startPreachMode();
    setTimeout(() => window.print(), 800);
}

function toggleHud() { document.getElementById('hud').classList.toggle('hidden-hud'); }

function adjustFont(delta) {
    const el = document.getElementById('preachContent');
    const current = parseFloat(window.getComputedStyle(el).fontSize);
    el.style.fontSize = Math.max(16, Math.min(60, current + delta)) + 'px';
}

// ---- TIMER ----

function toggleTimer() {
    const btn = document.getElementById('btn-timer');
    if (STATE.isRunning) {
        clearInterval(STATE.timer);
        STATE.isRunning = false;
        if (btn) btn.textContent = '▶';
    } else {
        STATE.isRunning = true;
        if (btn) btn.textContent = '⏸';
        STATE.timer = setInterval(() => {
            STATE.seconds++;
            const m = String(Math.floor(STATE.seconds / 60)).padStart(2, '0');
            const s = String(STATE.seconds % 60).padStart(2, '0');
            const el = document.getElementById('timerDisplay');
            if (el) el.textContent = `${m}:${s}`;
        }, 1000);
    }
}

function resetTimer() {
    clearInterval(STATE.timer);
    STATE.isRunning = false;
    STATE.seconds = 0;
    const el = document.getElementById('timerDisplay');
    if (el) el.textContent = '00:00';
    const btn = document.getElementById('btn-timer');
    if (btn) btn.textContent = '▶';
}

// ---- SETTINGS ----

function toggleSettings(show) {
    document.getElementById('settingsModal').classList.toggle('active', show);
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem(THEME_KEY, document.body.classList.contains('dark') ? 'dark' : 'light');
}

function downloadBackup() {
    performSave();
    const payload = JSON.stringify({ version: DB_VERSION, exported: new Date().toISOString(), data: STATE.sermons }, null, 2);
    const url = 'data:application/json;charset=utf-8,' + encodeURIComponent(payload);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PregFlow_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
}

function validateBackup(parsed) {
    let data = parsed;
    if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.data)) data = parsed.data;
    if (!Array.isArray(data) || data.length === 0) return null;
    const valid = data.every(s =>
        s && typeof s.id === 'number' &&
        typeof s.title === 'string' &&
        typeof s.ref === 'string' &&
        Array.isArray(s.content)
    );
    return valid ? data : null;
}

function restoreBackup(input) {
    const f = input.files[0];
    if (!f) return;
    if (!f.name.endsWith('.json')) { showToast('Use um arquivo .json'); input.value = ''; return; }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            const data = validateBackup(parsed);
            if (!data) { showToast('Formato de backup inválido'); input.value = ''; return; }
            STATE.sermons = data;
            saveDB();
            renderList();
            toggleSettings(false);
            showToast(`${data.length} mensagem(ns) restaurada(s) com sucesso`);
        } catch {
            showToast('Arquivo corrompido ou inválido');
        }
        input.value = '';
    };
    reader.readAsText(f);
}

// ---- UTILITIES ----

let toastTimer;
function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
