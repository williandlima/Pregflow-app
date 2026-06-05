'use strict';

const DB_KEY = 'pregflow_db';
const THEME_KEY = 'pregflow_theme';
const API_KEY_STORAGE = 'pregflow_api_key';
const DB_VERSION = 1;

// ---- UNDO STACK ----
const undoStack = [];

const STATE = {
    sermons: [],
    currentId: null,
    timer: null,
    seconds: 0,
    isRunning: false
};

// Rastreia o bloco em foco
let focusedBlock = null;

// ---- INIT ----

document.addEventListener('DOMContentLoaded', () => {
    loadDB();
    applyTheme();
    initBibleData();
    bindEvents();

    // Pré-carregar API key salva no campo de configurações
    const savedKey = localStorage.getItem(API_KEY_STORAGE);
    if (savedKey) {
        const apiInput = document.getElementById('apiKeyInput');
        if (apiInput) apiInput.value = savedKey;
    }

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

    // Toolbar: Novo bloco
    document.getElementById('btn-new-block').addEventListener('mousedown', addNewBlock);

    // Toolbar: Mover blocos
    document.getElementById('btn-move-up').addEventListener('mousedown', (e) => { e.preventDefault(); saveSnapshot(); moveBlock(-1); });
    document.getElementById('btn-move-down').addEventListener('mousedown', (e) => { e.preventDefault(); saveSnapshot(); moveBlock(1); });

    // Toolbar: Formato de bloco
    document.querySelectorAll('[data-format]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => { saveSnapshot(); applyFormat(e, btn.dataset.format); });
    });

    // Toolbar: Formatação inline
    document.getElementById('btn-fmt-bold').addEventListener('mousedown', (e) => { e.preventDefault(); formatText('bold'); });
    document.getElementById('btn-fmt-italic').addEventListener('mousedown', (e) => { e.preventDefault(); formatText('italic'); });
    document.getElementById('btn-fmt-underline').addEventListener('mousedown', (e) => { e.preventDefault(); formatText('underline'); });

    // Toolbar: Ações
    document.getElementById('btn-done').addEventListener('mousedown', (e) => { e.preventDefault(); toggleBlockDone(); });
    document.getElementById('btn-delete-block').addEventListener('mousedown', (e) => { e.preventDefault(); deleteCurrentBlock(); });
    document.getElementById('btn-undo').addEventListener('mousedown', (e) => { e.preventDefault(); undoAction(); });

    // Toolbar: IA
    document.getElementById('btn-ai-study').addEventListener('mousedown', (e) => { e.preventDefault(); toggleAIStudy(true); });

    // Preach HUD
    document.getElementById('btn-font-dec').addEventListener('click', () => adjustFont(-4));
    document.getElementById('btn-timer').addEventListener('click', toggleTimer);
    document.getElementById('btn-font-inc').addEventListener('click', () => adjustFont(4));
    document.getElementById('btn-exit-preach').addEventListener('click', exitPreach);
    document.getElementById('hud-tap-zone').addEventListener('click', toggleHud);
    document.getElementById('btn-ministrado').addEventListener('click', markCurrentPreachBlockDone);

    // Bible modal
    document.getElementById('bibleModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) toggleBible(false);
    });
    document.getElementById('btn-bible-close').addEventListener('click', () => toggleBible(false));
    document.getElementById('bibleBook').addEventListener('change', loadChapters);
    document.getElementById('bibleChapter').addEventListener('change', fetchBibleText);

    // Bible search com debounce
    let bibleSearchTimer;
    document.getElementById('bibleSearch').addEventListener('input', (e) => {
        clearTimeout(bibleSearchTimer);
        bibleSearchTimer = setTimeout(() => handleBibleSearch(e.target.value.trim()), 600);
    });

    // Settings modal
    document.getElementById('settingsModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) toggleSettings(false);
    });
    document.getElementById('btn-settings-close').addEventListener('click', () => toggleSettings(false));
    document.getElementById('btn-theme').addEventListener('click', toggleTheme);
    document.getElementById('btn-backup-dl').addEventListener('click', downloadBackup);
    document.getElementById('btn-backup-restore').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', (e) => restoreBackup(e.target));

    // API Key
    document.getElementById('btn-save-api-key').addEventListener('click', saveApiKey);
    document.getElementById('apiKeyInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveApiKey(); });

    // AI Study modal
    document.getElementById('aiStudyModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) toggleAIStudy(false);
    });
    document.getElementById('btn-ai-close').addEventListener('click', () => toggleAIStudy(false));
    document.getElementById('btn-generate-study').addEventListener('click', generateAIStudy);
    document.getElementById('btn-export-study').addEventListener('click', exportAIStudyPDF);

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
    s.content = Array.from(domBlocks).map(b => ({
        type: b.dataset.type,
        text: b.innerText,
        done: b.dataset.done === 'true'
    }));
    saveDB();
}

// ---- UNDO ----

function saveSnapshot() {
    const domBlocks = document.querySelectorAll('#editorBlocks .block');
    const snapshot = Array.from(domBlocks).map(b => ({
        type: b.dataset.type,
        text: b.innerText,
        done: b.dataset.done === 'true'
    }));
    undoStack.push(JSON.stringify(snapshot));
    if (undoStack.length > 30) undoStack.shift();
}

function undoAction() {
    if (undoStack.length === 0) { showToast('Nada para desfazer'); return; }
    const snapshot = JSON.parse(undoStack.pop());
    const container = document.getElementById('editorBlocks');
    container.innerHTML = '';
    snapshot.forEach(b => createBlockUI(b.type, b.text, null, b.done));
    triggerSave();
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
    undoStack.length = 0;
    const s = STATE.sermons.find(x => x.id === id);
    document.getElementById('docTitle').value = s.title;
    document.getElementById('docRef').value = s.ref;
    document.getElementById('docTitle').addEventListener('input', triggerSave, { once: false });
    document.getElementById('docRef').addEventListener('input', triggerSave, { once: false });

    const container = document.getElementById('editorBlocks');
    container.innerHTML = '';
    const blocks = s.content.length ? s.content : [{ type: 'p', text: '', done: false }];
    blocks.forEach(b => createBlockUI(b.type, b.text, null, b.done));
    showScreen('editorScreen');
}

function createNewSermon() {
    const id = Date.now();
    STATE.sermons.push({ id, title: '', ref: '', content: [{ type: 'p', text: '', done: false }], updated: id });
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

function createBlockUI(type, text, after = null, done = false) {
    const div = document.createElement('div');
    div.className = 'block';
    if (type === 'quote') div.classList.add('preach-quote');
    if (type === 'warn') div.classList.add('preach-warn');
    if (type === 'box') div.classList.add('preach-box');

    div.contentEditable = 'true';
    div.dataset.type = type;
    div.innerText = text;
    div.setAttribute('placeholder', getPlaceholder(type));

    if (done) div.dataset.done = 'true';

    div.addEventListener('focus', () => { focusedBlock = div; });

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

function getFocusedBlock() {
    // Tenta via selection primeiro, depois cai para focusedBlock
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
        let node = sel.anchorNode;
        while (node && node !== document.body) {
            if (node.classList && node.classList.contains('block')) return node;
            node = node.parentNode;
        }
    }
    return focusedBlock;
}

function deleteCurrentBlock() {
    const allBlocks = document.querySelectorAll('#editorBlocks .block');
    if (allBlocks.length <= 1) { showToast('Mantenha pelo menos 1 bloco'); return; }
    const block = getFocusedBlock();
    if (!block) { showToast('Selecione um bloco para deletar'); return; }
    saveSnapshot();
    const prev = block.previousElementSibling || block.nextElementSibling;
    block.remove();
    if (prev) prev.focus();
    triggerSave();
}

function moveBlock(direction) {
    const node = getFocusedBlock();
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
    const map = {
        p: 'Comece a escrever...',
        h1: 'Título Principal',
        h2: 'Subtítulo',
        h3: 'Subtópico...',
        bullet: 'Ponto...',
        quote: 'Citação...',
        warn: 'Aviso...',
        box: 'Destaque...'
    };
    return map[type] || '...';
}

function applyFormat(e, type) {
    e.preventDefault();
    const node = getFocusedBlock() || (() => {
        const blocks = document.querySelectorAll('.block');
        return blocks.length > 0 ? blocks[blocks.length - 1] : createBlockUI('p', '');
    })();
    if (!node) return;

    node.className = 'block';
    node.dataset.type = type;
    node.setAttribute('placeholder', getPlaceholder(type));
    if (type === 'quote') node.classList.add('preach-quote');
    if (type === 'warn') node.classList.add('preach-warn');
    if (type === 'box') node.classList.add('preach-box');
    // Manter o estado done ao mudar formato
    if (node.dataset.done === 'true') node.dataset.done = 'true';

    document.querySelectorAll('.tool-chip').forEach(b => b.classList.remove('active'));
    const btn = e.target.closest('.tool-chip');
    if (btn && !btn.classList.contains('action')) btn.classList.add('active');

    triggerSave();
    node.focus();
}

// ---- INLINE FORMATTING ----

function formatText(command) {
    document.execCommand(command, false, null);
}

// ---- DONE (MINISTRADO) ----

function toggleBlockDone() {
    const block = getFocusedBlock();
    if (!block) { showToast('Selecione um bloco'); return; }
    const isDone = block.dataset.done === 'true';
    block.dataset.done = isDone ? 'false' : 'true';
    triggerSave();
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

// ---- BIBLE SEARCH ----

function parseBibleRef(query) {
    const regex = /^(.+?)\s+(\d+)(?::(\d+))?$/;
    const match = query.match(regex);
    if (!match) return null;

    const bookQuery = match[1].trim().toLowerCase();
    const chapter = parseInt(match[2]);
    const verse = match[3] ? parseInt(match[3]) : null;

    // Busca por nome exato, startsWith e includes
    let bookIdx = bibleBooks.findIndex(b => b.n.toLowerCase() === bookQuery);
    if (bookIdx === -1) bookIdx = bibleBooks.findIndex(b => b.n.toLowerCase().startsWith(bookQuery));
    if (bookIdx === -1) bookIdx = bibleBooks.findIndex(b => b.n.toLowerCase().includes(bookQuery));

    if (bookIdx === -1 || chapter < 1 || chapter > bibleBooks[bookIdx].c) return null;
    return { bookIdx, chapter, verse };
}

async function handleBibleSearch(query) {
    if (!query) {
        // Limpar destaques
        document.querySelectorAll('.verse-item.highlighted').forEach(el => el.classList.remove('highlighted'));
        return;
    }

    const ref = parseBibleRef(query);

    if (ref) {
        // Navegar para o livro/capítulo e destacar versículo
        const bookSel = document.getElementById('bibleBook');
        const chapSel = document.getElementById('bibleChapter');

        bookSel.value = ref.bookIdx;

        // Rebuild chapters for new book
        chapSel.innerHTML = '';
        for (let i = 1; i <= bibleBooks[ref.bookIdx].c; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = i;
            chapSel.appendChild(opt);
        }
        chapSel.value = ref.chapter;

        await fetchBibleText();

        if (ref.verse) {
            // Destacar o versículo específico
            const items = document.querySelectorAll('.verse-item');
            items.forEach(item => item.classList.remove('highlighted'));
            if (items[ref.verse - 1]) {
                items[ref.verse - 1].classList.add('highlighted');
                items[ref.verse - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    } else {
        // Buscar texto dentro do capítulo carregado
        const items = document.querySelectorAll('.verse-item');
        const lowerQuery = query.toLowerCase();
        let found = false;
        items.forEach(item => {
            const textEl = item.querySelector('.verse-text');
            if (textEl && textEl.textContent.toLowerCase().includes(lowerQuery)) {
                item.classList.add('highlighted');
                if (!found) {
                    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    found = true;
                }
            } else {
                item.classList.remove('highlighted');
            }
        });
        if (!found && items.length > 0) showToast('Nenhum versículo encontrado');
    }
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
            item.dataset.verse = v.verse;

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
        // Limpar busca ao abrir
        document.getElementById('bibleSearch').value = '';
    }
}

// ---- PREACH MODE ----

// Índice do bloco em foco no modo pregação
let preachFocusIndex = 0;

function startPreachMode() {
    performSave();
    const s = STATE.sermons.find(x => x.id === STATE.currentId);
    if (!s) return;

    let html = `<div style="text-align:center; margin-bottom:40px; opacity:0.8; border-bottom:1px solid var(--border); padding-bottom:30px">
        <h1 style="font-size:1.8em; margin:0; line-height:1.2; font-family:var(--font-ui)">${escapeHtml(s.title)}</h1>
        <p style="font-size:1.2em; color:var(--primary); margin:10px 0 0 0; font-weight:600; font-family:var(--font-ui)">${escapeHtml(s.ref)}</p>
    </div>`;

    s.content.forEach((b, idx) => {
        const txt = escapeHtml(b.text) || '&nbsp;';
        const doneStyle = b.done ? ' preach-block-done' : '';
        const dataAttr = `data-preach-idx="${idx}"`;

        if (b.type === 'h1') html += `<h2 ${dataAttr} class="${doneStyle}" style="font-size:1.6em; margin-top:40px; line-height:1.2; font-weight:800; font-family:var(--font-ui)">${txt}</h2>`;
        else if (b.type === 'h2') html += `<h3 ${dataAttr} class="${doneStyle}" style="color:var(--primary); margin-top:30px; font-size:1.3em; font-family:var(--font-ui)">${txt}</h3>`;
        else if (b.type === 'h3') html += `<p ${dataAttr} class="${doneStyle}" style="font-family:var(--font-ui);font-size:0.8em;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);margin-top:20px;">${txt}</p>`;
        else if (b.type === 'bullet') html += `<p ${dataAttr} class="${doneStyle}" style="padding-left:36px; position:relative;"><span style="position:absolute;left:14px;color:var(--primary);font-size:1.2em;">›</span>${txt}</p>`;
        else if (b.type === 'quote') html += `<div ${dataAttr} class="preach-quote${doneStyle}">${txt}</div>`;
        else if (b.type === 'warn') html += `<div ${dataAttr} class="preach-warn${doneStyle}">${txt}</div>`;
        else if (b.type === 'box') html += `<div ${dataAttr} class="preach-box${doneStyle}">${txt}</div>`;
        else html += `<p ${dataAttr} class="${doneStyle}" style="margin-bottom:20px">${txt}</p>`;
    });

    preachFocusIndex = 0;
    document.getElementById('preachContent').innerHTML = html;

    // Clique em blocos do modo pregação atualiza preachFocusIndex
    document.getElementById('preachContent').addEventListener('click', (e) => {
        const el = e.target.closest('[data-preach-idx]');
        if (el) preachFocusIndex = parseInt(el.dataset.preachIdx);
    });

    showScreen('preachScreen');
    resetTimer();
}

function markCurrentPreachBlockDone() {
    // Marcar o bloco no dado salvo e atualizar o DOM do modo pregação
    const s = STATE.sermons.find(x => x.id === STATE.currentId);
    if (!s || !s.content[preachFocusIndex]) return;

    s.content[preachFocusIndex].done = !s.content[preachFocusIndex].done;
    saveDB();

    // Atualizar visual no preachContent
    const el = document.querySelector(`[data-preach-idx="${preachFocusIndex}"]`);
    if (el) {
        el.classList.toggle('preach-block-done', s.content[preachFocusIndex].done);
    }

    showToast(s.content[preachFocusIndex].done ? 'Tópico marcado como ministrado' : 'Marcação removida');
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
    if (show) {
        // Preencher campo com chave salva
        const saved = localStorage.getItem(API_KEY_STORAGE);
        if (saved) document.getElementById('apiKeyInput').value = saved;
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem(THEME_KEY, document.body.classList.contains('dark') ? 'dark' : 'light');
}

function saveApiKey() {
    const key = document.getElementById('apiKeyInput').value.trim();
    if (!key) { showToast('Digite uma chave API válida'); return; }
    localStorage.setItem(API_KEY_STORAGE, key);
    showToast('Chave API salva com sucesso!');
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

// ---- AI STUDY ----

function toggleAIStudy(show) {
    document.getElementById('aiStudyModal').classList.toggle('active', show);
}

function renderMarkdown(text) {
    // Simples renderer: **bold**, ## heading, - item, \n\n parágrafo
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Headings: ## texto
    html = html.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');

    // Bold: **texto**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Listas: - item
    html = html.replace(/^-\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/gs, (match) => `<ul>${match}</ul>`);

    // Parágrafos: \n\n
    html = html.replace(/\n\n+/g, '</p><p>');
    html = `<p>${html}</p>`;

    // Limpeza: não envolver h3 e ul dentro de p
    html = html.replace(/<p>(<h3>)/g, '$1');
    html = html.replace(/(<\/h3>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');
    html = html.replace(/<p><\/p>/g, '');

    return html;
}

async function generateAIStudy() {
    const apiKey = localStorage.getItem(API_KEY_STORAGE);
    if (!apiKey) {
        showToast('Configure a chave API nas Configurações');
        toggleAIStudy(false);
        toggleSettings(true);
        return;
    }

    const s = STATE.sermons.find(x => x.id === STATE.currentId);
    const title = s ? (s.title || 'Sem título') : 'Sem título';
    const ref = s ? (s.ref || '') : '';
    const content = s ? s.content.map(b => b.text).filter(Boolean).join('\n') : '';

    const contentEl = document.getElementById('aiStudyContent');
    const btn = document.getElementById('btn-generate-study');
    contentEl.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted); font-family:var(--font-ui);"><div style="font-size:32px; margin-bottom:16px">⏳</div><p>Gerando estudo com IA...</p></div>`;
    btn.disabled = true;
    btn.textContent = 'Gerando...';

    const prompt = `Você é um pastor experiente. Com base na mensagem abaixo, gere um estudo de células completo em português brasileiro.

**Título da Mensagem:** ${title}
**Referência Bíblica:** ${ref}
**Conteúdo da Mensagem:**
${content}

Estruture o estudo de células com:

## Tema
(tema central do estudo)

## Texto Base
(versículo(s) principal(is))

## Aquecimento
(1 pergunta quebra-gelo para iniciar a conversa)

## Estudo Bíblico
(4 perguntas de estudo baseadas no texto bíblico e na mensagem)

## Aplicação Prática
(3 pontos práticos de aplicação para a semana)

## Oração Sugerida
(uma oração curta relacionada ao tema)

## Versículo para Memorizar
(um versículo para a semana)`;

    try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-opus-4-8',
                max_tokens: 2048,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!res.ok) {
            if (res.status === 401) {
                contentEl.innerHTML = `<p style="color:var(--danger); padding:20px;">Chave API inválida. Verifique nas configurações.</p>`;
            } else {
                const errData = await res.json().catch(() => ({}));
                contentEl.innerHTML = `<p style="color:var(--danger); padding:20px;">Erro ${res.status}: ${errData.error?.message || 'Erro desconhecido. Tente novamente.'}</p>`;
            }
            return;
        }

        const data = await res.json();
        const text = data.content && data.content[0] ? data.content[0].text : '';
        contentEl.innerHTML = renderMarkdown(text);

    } catch (err) {
        contentEl.innerHTML = `<p style="color:var(--danger); padding:20px;">Erro de conexão: ${escapeHtml(err.message || 'Verifique sua internet e tente novamente.')}</p>`;
    } finally {
        btn.disabled = false;
        btn.textContent = '✦ Gerar Estudo com IA';
    }
}

function exportAIStudyPDF() {
    const s = STATE.sermons.find(x => x.id === STATE.currentId);
    const title = s ? (s.title || 'Estudo de Células') : 'Estudo de Células';
    const content = document.getElementById('aiStudyContent').innerHTML;

    const win = window.open('', '_blank');
    if (!win) { showToast('Permita pop-ups para exportar PDF'); return; }

    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)} - Estudo de Células</title>
<style>
  body { font-family: 'Georgia', serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #111; font-size: 14pt; line-height: 1.7; }
  h1 { font-size: 24pt; font-weight: 800; text-align: center; margin-bottom: 8px; }
  h2 { font-size: 14pt; color: #7C3AED; text-align: center; margin-bottom: 32px; }
  h3 { font-size: 16pt; font-weight: 700; color: #7C3AED; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin: 24px 0 12px 0; }
  p { margin: 0 0 12px 0; }
  ul, ol { margin: 0 0 12px 0; padding-left: 20px; }
  li { margin-bottom: 6px; }
  strong { font-weight: 700; }
  @media print { body { margin: 0; padding: 24px; } }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<h2>Estudo de Células</h2>
${content}
</body>
</html>`);

    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 500);
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
