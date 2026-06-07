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
    document.getElementById('btn-fmt-strike').addEventListener('mousedown', (e) => { e.preventDefault(); formatText('strikeThrough'); });
    document.getElementById('btn-highlight').addEventListener('mousedown', (e) => { e.preventDefault(); document.execCommand('backColor', false, '#FEF08A'); });
    document.getElementById('btn-fmt-clear').addEventListener('mousedown', (e) => { e.preventDefault(); formatText('removeFormat'); });

    // Cores de texto
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            document.execCommand('foreColor', false, btn.dataset.color);
        });
    });

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
    document.getElementById('btn-generate-study').addEventListener('click', generateAIContent);
    document.getElementById('btn-export-study').addEventListener('click', exportAIStudyPDF);

    // AI type tabs
    document.querySelectorAll('.ai-type-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.ai-type-tab').forEach(t => t.classList.toggle('active', t === tab));
            aiCurrentMode = tab.dataset.mode;
        });
    });

    // Barra flutuante — tipo de bloco
    document.querySelectorAll('#floatingBar [data-format]').forEach(btn => {
        btn.addEventListener('mousedown', (e) => { saveSnapshot(); applyFormat(e, btn.dataset.format); });
    });
    // Barra flutuante — cores de texto
    document.querySelectorAll('#floatingBar .fcolor').forEach(btn => {
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); document.execCommand('foreColor', false, btn.dataset.color); });
    });
    // Barra flutuante — inline
    document.getElementById('fbt-bold').addEventListener('mousedown', (e) => { e.preventDefault(); formatText('bold'); });
    document.getElementById('fbt-italic').addEventListener('mousedown', (e) => { e.preventDefault(); formatText('italic'); });
    document.getElementById('fbt-underline').addEventListener('mousedown', (e) => { e.preventDefault(); formatText('underline'); });
    document.getElementById('fbt-strike').addEventListener('mousedown', (e) => { e.preventDefault(); formatText('strikeThrough'); });
    document.getElementById('fbt-highlight').addEventListener('mousedown', (e) => { e.preventDefault(); document.execCommand('backColor', false, '#FEF08A'); });
    document.getElementById('fbt-clear').addEventListener('mousedown', (e) => { e.preventDefault(); formatText('removeFormat'); });
    // Barra flutuante — ações de bloco
    document.getElementById('fbt-new').addEventListener('mousedown', addNewBlock);
    document.getElementById('fbt-done').addEventListener('mousedown', (e) => { e.preventDefault(); toggleBlockDone(); });
    document.getElementById('fbt-up').addEventListener('mousedown', (e) => { e.preventDefault(); saveSnapshot(); moveBlock(-1); });
    document.getElementById('fbt-down').addEventListener('mousedown', (e) => { e.preventDefault(); saveSnapshot(); moveBlock(1); });
    document.getElementById('fbt-undo').addEventListener('mousedown', (e) => { e.preventDefault(); undoAction(); });
    document.getElementById('fbt-del').addEventListener('mousedown', (e) => { e.preventDefault(); deleteCurrentBlock(); });
    document.getElementById('fbt-ai').addEventListener('mousedown', (e) => { e.preventDefault(); toggleAIStudy(true); });

    // Scroll do editor: reposicionar barra flutuante
    document.getElementById('editorScreen').addEventListener('scroll', () => {
        if (focusedBlock) updateFloatingBar(focusedBlock);
    });

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
    updateOutlineNumbers();
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
    updateOutlineNumbers();
    setEditorHeader(true);
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

function setEditorHeader(show) {
    const h = document.querySelector('.editor-header');
    if (h) h.style.display = show ? 'block' : 'none';
}

function updateFloatingBar(block) {
    const bar = document.getElementById('floatingBar');
    if (!bar || !block) return;
    const rect = block.getBoundingClientRect();
    const headerH = 120;
    const barH = 40;
    const gap = 6;
    let top = rect.top - barH - gap;
    if (top < headerH + 4) top = rect.bottom + gap;
    top = Math.min(top, window.innerHeight - barH - 8);
    bar.style.top = top + 'px';
    bar.classList.remove('hidden');
}

function hideFloatingBar() {
    const bar = document.getElementById('floatingBar');
    if (bar) bar.classList.add('hidden');
}

function goHome() { performSave(); setEditorHeader(false); hideFloatingBar(); renderList(); showScreen('homeScreen'); }

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

    div.addEventListener('focus', () => {
        focusedBlock = div;
        setTimeout(() => {
            div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            updateFloatingBar(div);
        }, 300);
    });

    div.addEventListener('blur', () => {
        setTimeout(() => {
            if (!document.activeElement || !document.activeElement.classList.contains('block')) {
                hideFloatingBar();
            }
        }, 150);
    });

    div.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                // Shift+Enter: criar novo bloco abaixo
                saveSnapshot();
                const newBlock = createBlockUI('p', '');
                const c = document.getElementById('editorBlocks');
                c.insertBefore(newBlock, div.nextSibling);
                updateOutlineNumbers();
                newBlock.focus();
            } else {
                // Enter: quebra de linha dentro do bloco
                document.execCommand('insertLineBreak');
            }
            triggerSave();
        }
        if (e.key === 'Backspace' && !e.target.innerText.trim()) {
            const prev = e.target.previousElementSibling;
            if (prev) { e.preventDefault(); e.target.remove(); prev.focus(); updateOutlineNumbers(); triggerSave(); }
        }
    });
    div.addEventListener('input', triggerSave);

    const c = document.getElementById('editorBlocks');
    if (after) c.insertBefore(div, after.nextSibling);
    else c.appendChild(div);
    return div;
}

function updateOutlineNumbers() {
    const blocks = document.querySelectorAll('#editorBlocks .block');
    let topicNum = 0, subNum = 1;
    blocks.forEach(b => {
        const type = b.dataset.type;
        if (type === 'topic') {
            topicNum++;
            subNum = 1;
            b.dataset.number = `${topicNum}.`;
        } else if (type === 'subtopic') {
            b.dataset.number = `${Math.max(1, topicNum)}.${subNum++}`;
        } else {
            delete b.dataset.number;
        }
    });
}

function addNewBlock(e) {
    e.preventDefault();
    const focused = getFocusedBlock();
    const container = document.getElementById('editorBlocks');
    const newBlock = createBlockUI('p', '');
    if (focused && focused.parentNode === container) {
        container.insertBefore(newBlock, focused.nextSibling);
    } else {
        container.appendChild(newBlock);
    }
    updateOutlineNumbers();
    newBlock.focus();
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
    updateOutlineNumbers();
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
    updateOutlineNumbers();
    triggerSave();
}

function getPlaceholder(type) {
    const map = {
        p: 'Comece a escrever...',
        h1: 'Título Principal',
        h2: 'Subtítulo',
        h3: 'Subtópico...',
        topic: 'Primeiro ponto...',
        subtopic: 'Aprofundamento...',
        bullet: 'Detalhe...',
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
    if (node.dataset.done === 'true') node.dataset.done = 'true';

    document.querySelectorAll('.tool-chip').forEach(b => b.classList.remove('active'));
    const btn = e.target.closest('.tool-chip');
    if (btn && !btn.classList.contains('action')) btn.classList.add('active');

    updateOutlineNumbers();
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

// Índice de temas, personagens e palavras-chave → referências bíblicas
const VERSE_INDEX = {
    // Temas principais
    'amor': ['1 João 4:8','João 3:16','1 Coríntios 13:4-7','Romanos 8:38-39','João 15:13','1 João 4:16'],
    'fé': ['Hebreus 11:1','Romanos 10:17','Gálatas 2:20','Tiago 2:17','Marcos 11:22','2 Coríntios 5:7'],
    'esperança': ['Romanos 5:5','Jeremias 29:11','Romanos 15:13','1 Pedro 1:3','Hebreus 6:19','Salmos 33:18'],
    'graça': ['Efésios 2:8-9','João 1:17','2 Coríntios 12:9','Romanos 5:20','Tito 2:11'],
    'salvação': ['João 3:16','Atos 4:12','Romanos 10:9-10','Efésios 2:8','Tito 3:5','Atos 16:31'],
    'perdão': ['Salmos 103:12','Efésios 4:32','1 João 1:9','Mateus 6:14-15','Colossenses 3:13'],
    'paz': ['João 14:27','Filipenses 4:7','Isaías 26:3','Romanos 5:1','Salmos 29:11','João 16:33'],
    'oração': ['Mateus 6:9-13','Filipenses 4:6','1 Tessalonicenses 5:17','Tiago 5:16','Jeremias 33:3'],
    'cura': ['Isaías 53:5','1 Pedro 2:24','Salmos 103:3','Êxodo 15:26','Tiago 5:14-15'],
    'bênção': ['Números 6:24-26','Salmos 1:1','Efésios 1:3','Malaquias 3:10','João 1:16'],
    'adoração': ['João 4:23-24','Salmos 100:1-4','Romanos 12:1','Salmos 95:6','Apocalipse 4:11'],
    'louvor': ['Salmos 150:1-6','Salmos 34:1','Efésios 5:19','Salmos 113:1','Atos 16:25'],
    'poder': ['Filipenses 4:13','2 Timóteo 1:7','Atos 1:8','Efésios 3:20','Isaías 40:31'],
    'força': ['Filipenses 4:13','Isaías 40:31','Salmos 28:7','Efésios 6:10','Neemias 8:10'],
    'vitória': ['1 Coríntios 15:57','Romanos 8:37','1 João 5:4','2 Coríntios 2:14'],
    'humildade': ['Filipenses 2:3-4','Tiago 4:10','Provérbios 22:4','Mateus 23:12','1 Pedro 5:6'],
    'santidade': ['1 Pedro 1:16','Levítico 11:44','Hebreus 12:14','1 Tessalonicenses 4:3'],
    'sabedoria': ['Provérbios 1:7','Tiago 1:5','Provérbios 3:5-6','Colossenses 2:3','1 Reis 3:9'],
    'confiança': ['Provérbios 3:5-6','Salmos 37:5','Isaías 26:4','Jeremias 17:7','Salmos 56:11'],
    'alegria': ['Neemias 8:10','Filipenses 4:4','Salmos 16:11','João 15:11','Romanos 15:13'],
    'sofrimento': ['Romanos 8:18','2 Coríntios 1:3-4','1 Pedro 5:10','Salmos 34:18','Romanos 5:3-5'],
    'perseverança': ['Tiago 1:2-4','Hebreus 12:1','Romanos 5:3-4','Gálatas 6:9','2 Timóteo 4:7'],
    'tentação': ['1 Coríntios 10:13','Tiago 1:12','Mateus 26:41','Hebreus 2:18'],
    'pecado': ['Romanos 3:23','1 João 1:9','Isaías 59:2','Romanos 6:23','Salmos 51:1-2'],
    'redenção': ['Efésios 1:7','Colossenses 1:14','Gálatas 3:13','1 Pedro 1:18-19'],
    'propósito': ['Jeremias 29:11','Romanos 8:28','Efésios 2:10','Provérbios 19:21'],
    'missão': ['Mateus 28:19-20','Marcos 16:15','Atos 1:8','João 20:21'],
    'obediência': ['João 14:15','Deuteronômio 28:1-2','1 Samuel 15:22','Romanos 6:17'],
    'prosperidade': ['3 João 1:2','Josué 1:8','Salmos 1:3','Provérbios 10:22'],
    'provisão': ['Filipenses 4:19','Mateus 6:33','Salmos 23:1','2 Coríntios 9:8'],
    'proteção': ['Salmos 91:1-4','Isaías 43:2','Salmos 121:1-8','Provérbios 18:10'],
    'livramento': ['Salmos 34:17','Daniel 6:27','1 Coríntios 10:13','Salmos 91:14'],
    'resurreicao': ['1 Coríntios 15:14','João 11:25','Romanos 6:4','Mateus 28:6'],
    'ressurreição': ['1 Coríntios 15:14','João 11:25','Romanos 6:4','Mateus 28:6'],
    'vida eterna': ['João 3:16','João 17:3','1 João 5:13','João 10:10','Romanos 6:23'],
    'morte': ['João 11:25-26','Romanos 6:23','1 Coríntios 15:55','Salmos 23:4'],
    // Família
    'família': ['Josué 24:15','Efésios 6:1-4','Colossenses 3:18-21','Provérbios 22:6'],
    'familia': ['Josué 24:15','Efésios 6:1-4','Colossenses 3:18-21','Provérbios 22:6'],
    'filhos': ['Provérbios 22:6','Efésios 6:1-3','Salmos 127:3','Mateus 19:14'],
    'casamento': ['Gênesis 2:24','Efésios 5:25-33','Hebreus 13:4','Mateus 19:6'],
    // Deus / Jesus / Espírito
    'deus': ['João 3:16','1 João 4:8','Gênesis 1:1','Romanos 8:28','Hebreus 11:6'],
    'jesus': ['João 14:6','Filipenses 2:9-11','Mateus 1:21','Atos 4:12','João 1:1'],
    'cristo': ['Filipenses 4:13','Gálatas 2:20','Romanos 8:1','Colossenses 1:27','2 Coríntios 5:17'],
    'espírito santo': ['João 14:16-17','Atos 1:8','Gálatas 5:22-23','João 16:13'],
    'espirito': ['João 14:16-17','Atos 1:8','Gálatas 5:22-23','Romanos 8:26'],
    'espírito': ['João 14:16-17','Atos 1:8','Gálatas 5:22-23','Romanos 8:26'],
    'trindade': ['Mateus 28:19','2 Coríntios 13:14','João 1:1-3'],
    // Igreja / Reino
    'reino': ['Mateus 6:33','Mateus 5:3','Lucas 17:21','Marcos 1:15'],
    'igreja': ['Mateus 16:18','Efésios 5:25-27','Atos 2:42-47','1 Coríntios 12:27'],
    'discipulado': ['Mateus 28:19-20','Lucas 9:23','João 8:31','2 Timóteo 2:2'],
    'unidade': ['João 17:21','Salmos 133:1','Efésios 4:3','Colossenses 3:14'],
    'frutos': ['Gálatas 5:22-23','João 15:5','Mateus 7:17-18','João 15:8'],
    'dons': ['1 Coríntios 12:4-11','Romanos 12:6-8','Efésios 4:11-12','1 Pedro 4:10'],
    'batismo': ['Mateus 28:19','Atos 2:38','Romanos 6:3-4','Marcos 16:16'],
    // Personagens
    'davi': ['1 Samuel 16:13','Salmos 23:1','Salmos 51:1','Atos 13:22','2 Samuel 7:8'],
    'abraão': ['Gênesis 12:1-3','Hebreus 11:8','Romanos 4:3','Gálatas 3:9'],
    'abrao': ['Gênesis 12:1-3','Hebreus 11:8','Romanos 4:3'],
    'moisés': ['Êxodo 3:10','Hebreus 11:24-26','Números 12:3'],
    'moises': ['Êxodo 3:10','Hebreus 11:24-26','Números 12:3'],
    'paulo': ['Filipenses 4:11-13','Gálatas 2:20','2 Coríntios 12:9','Atos 9:15'],
    'pedro': ['Mateus 16:18','João 21:17','Atos 2:14','1 Pedro 5:7'],
    'maria': ['Lucas 1:38','Lucas 1:46-49','João 2:5'],
    'noé': ['Gênesis 6:9','Hebreus 11:7','Gênesis 6:22'],
    'noe': ['Gênesis 6:9','Hebreus 11:7'],
    'josé': ['Gênesis 37:28','Gênesis 50:20','Atos 7:9-10'],
    'jose': ['Gênesis 37:28','Gênesis 50:20'],
    'salomão': ['1 Reis 3:9-14','Provérbios 1:1','1 Reis 4:29'],
    'salomao': ['1 Reis 3:9-14','Provérbios 1:1'],
    'elias': ['1 Reis 18:36-38','1 Reis 19:11-12','Tiago 5:17'],
    'daniel': ['Daniel 3:17-18','Daniel 6:10','Daniel 1:8'],
    'israel': ['Êxodo 3:10','Isaías 43:1','Romanos 11:26','Jeremias 31:31'],
    // Palavras-chave
    'luz': ['João 8:12','Mateus 5:14-16','Salmos 119:105','1 João 1:5'],
    'sal': ['Mateus 5:13','Colossenses 4:6'],
    'caminho': ['João 14:6','Provérbios 3:6','Salmos 16:11','Isaías 30:21'],
    'verdade': ['João 14:6','João 8:32','João 17:17','Efésios 4:15'],
    'vida': ['João 14:6','João 10:10','1 João 5:12','Deuteronômio 30:19'],
    'porta': ['João 10:9','Apocalipse 3:20','Mateus 7:7-8'],
    'pão': ['João 6:35','Mateus 6:11','João 6:48'],
    'agua': ['João 4:14','João 7:38','Apocalipse 22:17'],
    'água': ['João 4:14','João 7:38','Apocalipse 22:17'],
    'sangue': ['1 Pedro 1:19','Hebreus 9:22','Apocalipse 1:5','1 João 1:7'],
    'cruz': ['1 Coríntios 1:18','Gálatas 2:20','Filipenses 2:8','Colossenses 2:14'],
    'glória': ['Romanos 8:18','João 17:22','2 Coríntios 3:18','Salmos 19:1'],
    'gloria': ['Romanos 8:18','João 17:22','2 Coríntios 3:18'],
    'armadura': ['Efésios 6:10-18'],
    'armadura de deus': ['Efésios 6:10-18'],
    'pai nosso': ['Mateus 6:9-13','Lucas 11:2-4'],
    'salmo 23': ['Salmos 23:1-6'],
    'bem-aventuranças': ['Mateus 5:3-12'],
    'novo nascimento': ['João 3:3-7','1 Pedro 1:23','2 Coríntios 5:17'],
    'nova criatura': ['2 Coríntios 5:17','Gálatas 6:15','Efésios 4:24'],
    'criação': ['Gênesis 1:1','João 1:3','Colossenses 1:16','Hebreus 11:3'],
    'fogo': ['Atos 2:3','Jeremias 20:9','Deuteronômio 4:24','Lucas 12:49'],
    'bênçãos': ['Deuteronômio 28:1-14','Efésios 1:3','Números 6:24-26'],
    'gracas': ['1 Tessalonicenses 5:18','Filipenses 4:6','Colossenses 3:17'],
    'graças': ['1 Tessalonicenses 5:18','Filipenses 4:6','Colossenses 3:17'],
    'serviço': ['Mateus 20:28','Marcos 10:45','Gálatas 5:13'],
    'servir': ['Mateus 20:28','Josué 24:15','Romanos 12:11'],
    'libertação': ['Lucas 4:18','João 8:36','Gálatas 5:1','Romanos 8:2'],
    'libertacao': ['Lucas 4:18','João 8:36','Gálatas 5:1'],
};

function strNorm(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

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
    const resultsPanel = document.getElementById('bibleSearchResults');
    const indexList = document.getElementById('bibleIndexList');

    if (!query) {
        document.querySelectorAll('.verse-item.highlighted').forEach(el => el.classList.remove('highlighted'));
        if (resultsPanel) resultsPanel.style.display = 'none';
        return;
    }

    const ref = parseBibleRef(query);

    if (ref) {
        // Navigate to specific book/chapter/verse
        if (resultsPanel) resultsPanel.style.display = 'none';
        const bookSel = document.getElementById('bibleBook');
        const chapSel = document.getElementById('bibleChapter');

        bookSel.value = ref.bookIdx;
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
            const items = document.querySelectorAll('.verse-item');
            items.forEach(item => item.classList.remove('highlighted'));
            if (items[ref.verse - 1]) {
                items[ref.verse - 1].classList.add('highlighted');
                items[ref.verse - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        return;
    }

    // Theme/keyword search via VERSE_INDEX
    const norm = strNorm(query);
    const matchedRefs = [];
    for (const [key, refs] of Object.entries(VERSE_INDEX)) {
        if (strNorm(key).includes(norm) || norm.includes(strNorm(key))) {
            refs.forEach(r => { if (!matchedRefs.includes(r)) matchedRefs.push(r); });
        }
    }

    if (matchedRefs.length > 0 && resultsPanel && indexList) {
        indexList.innerHTML = '';
        matchedRefs.forEach(refText => {
            const chip = document.createElement('button');
            chip.className = 'ref-chip';
            chip.textContent = refText;
            chip.addEventListener('click', () => {
                document.getElementById('bibleSearch').value = refText;
                handleBibleSearch(refText);
            });
            indexList.appendChild(chip);
        });
        resultsPanel.style.display = 'block';
    } else if (resultsPanel) {
        resultsPanel.style.display = 'none';
    }

    // Also search current chapter text
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
    if (!found && matchedRefs.length === 0) showToast('Nenhuma referência encontrada');
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
    setEditorHeader(false);
    hideFloatingBar();
    performSave();
    const s = STATE.sermons.find(x => x.id === STATE.currentId);
    if (!s) return;

    let html = `<div style="text-align:center; margin-bottom:40px; opacity:0.8; border-bottom:1px solid var(--border); padding-bottom:30px">
        <h1 style="font-size:1.8em; margin:0; line-height:1.2; font-family:var(--font-ui)">${escapeHtml(s.title)}</h1>
        <p style="font-size:1.2em; color:var(--primary); margin:10px 0 0 0; font-weight:600; font-family:var(--font-ui)">${escapeHtml(s.ref)}</p>
    </div>`;

    let topicNum = 0, subNum = 1;
    s.content.forEach((b, idx) => {
        const txt = escapeHtml(b.text) || '&nbsp;';
        const doneStyle = b.done ? ' preach-block-done' : '';
        const dataAttr = `data-preach-idx="${idx}"`;
        if (b.type === 'topic') { topicNum++; subNum = 1; }

        if (b.type === 'h1') html += `<h2 ${dataAttr} class="${doneStyle}" style="font-size:1.6em; margin-top:40px; line-height:1.2; font-weight:800; font-family:var(--font-ui)">${txt}</h2>`;
        else if (b.type === 'h2') html += `<h3 ${dataAttr} class="${doneStyle}" style="color:var(--primary); margin-top:30px; font-size:1.3em; font-family:var(--font-ui)">${txt}</h3>`;
        else if (b.type === 'h3') html += `<p ${dataAttr} class="${doneStyle}" style="font-family:var(--font-ui);font-size:0.8em;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-secondary);margin-top:20px;">${txt}</p>`;
        else if (b.type === 'topic') html += `<p ${dataAttr} class="${doneStyle}" style="font-family:var(--font-ui);font-size:1.15em;font-weight:800;color:var(--text);margin-top:28px;border-left:3px solid var(--primary);padding-left:12px;"><span style="color:var(--primary)">${topicNum}. </span>${txt}</p>`;
        else if (b.type === 'subtopic') html += `<p ${dataAttr} class="${doneStyle}" style="font-family:var(--font-ui);font-size:0.95em;font-weight:500;color:var(--text-secondary);padding-left:28px;margin-top:6px;"><span style="color:var(--primary);font-weight:700;font-size:0.85em">${Math.max(1,topicNum)}.${subNum++}  </span>${txt}</p>`;
        else if (b.type === 'bullet') html += `<p ${dataAttr} class="${doneStyle}" style="font-family:var(--font-ui);font-size:0.9em;color:var(--text-secondary);padding-left:44px;margin-top:4px;"><span style="color:var(--primary);font-weight:700;">→  </span>${txt}</p>`;
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
    setEditorHeader(true);
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

let aiCurrentMode = 'study';

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

async function generateAIContent() {
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
    contentEl.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted); font-family:var(--font-ui);"><div style="font-size:32px; margin-bottom:16px">⏳</div><p>Gerando com IA...</p></div>`;
    btn.disabled = true;
    btn.textContent = 'Gerando...';

    const isDevotional = aiCurrentMode === 'devotional';

    const prompt = isDevotional
        ? `Você é um pastor experiente. Com base na mensagem abaixo, gere um devocional completo em português brasileiro para leitura diária.

**Título da Mensagem:** ${title}
**Referência Bíblica:** ${ref}
**Conteúdo da Mensagem:**
${content}

Estruture o devocional com:

## Título do Devocional
(título inspirador relacionado ao tema)

## Texto Base
(versículo principal do dia)

## Contexto Bíblico
(breve explicação do contexto histórico e espiritual)

## Reflexão
(3 parágrafos de meditação espiritual profunda baseados no texto)

## Aplicação Pessoal
(como viver este ensinamento hoje na prática)

## Oração
(oração pessoal baseada no tema)

## Declaração de Fé
(uma afirmação de fé para declarar ao longo do dia)`
        : `Você é um pastor experiente. Com base na mensagem abaixo, gere um estudo de células completo em português brasileiro.

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
        btn.textContent = '✦ Gerar com IA';
    }
}

function exportAIStudyPDF() {
    const s = STATE.sermons.find(x => x.id === STATE.currentId);
    const sermonTitle = s ? (s.title || 'Mensagem') : 'Mensagem';
    const typeLabel = aiCurrentMode === 'devotional' ? 'Devocional' : 'Estudo de Células';
    const content = document.getElementById('aiStudyContent').innerHTML;

    const win = window.open('', '_blank');
    if (!win) { showToast('Permita pop-ups para exportar PDF'); return; }

    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(sermonTitle)} - ${escapeHtml(typeLabel)}</title>
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
<h1>${escapeHtml(sermonTitle)}</h1>
<h2>${escapeHtml(typeLabel)}</h2>
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
