'use strict';

// ============================================================
// CIFRAPRO — Banco de Cifras para Músicos de Igreja
// ============================================================

// ==================== MUSIC THEORY ====================
const NOTES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const NOTE_NAMES_PT = {
  'C':'Dó','C#':'Dó#','Db':'Dób','D':'Ré','D#':'Ré#','Eb':'Réb',
  'E':'Mi','F':'Fá','F#':'Fá#','Gb':'Fáb','G':'Sol','G#':'Sol#',
  'Ab':'Láb','A':'Lá','A#':'Lá#','Bb':'Láb','B':'Si'
};
const ALL_KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
// Preferred flat display keys
const PREFER_FLAT_KEYS = new Set(['F','Bb','Eb','Ab','Db','Gb']);

function noteIndex(note) {
  let i = NOTES_SHARP.indexOf(note);
  if (i === -1) i = NOTES_FLAT.indexOf(note);
  return i;
}

function transposeNote(note, semitones, useFlat) {
  const idx = noteIndex(note);
  if (idx === -1) return note;
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  return useFlat ? NOTES_FLAT[newIdx] : NOTES_SHARP[newIdx];
}

// Regex to match a chord token: C, Am, F#m7, Gsus4, D/F#, etc.
const CHORD_RE = /\b([A-G][#b]?)(m(?:aj)?7?|maj7?|M7?|dim7?|aug|sus[24]?|add\d+|\d+|[#b]\d+)*(\([^)]*\))?(\/[A-G][#b]?)?\b/g;

function transposeChordToken(token, semitones, useFlat) {
  return token.replace(CHORD_RE, (full, root, suffix = '', paren = '', bass = '') => {
    const newRoot = transposeNote(root, semitones, useFlat);
    let newBass = bass;
    if (bass) {
      const bassNote = bass.slice(1);
      newBass = '/' + transposeNote(bassNote, semitones, useFlat);
    }
    return newRoot + suffix + paren + newBass;
  });
}

function isChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const tokens = trimmed.split(/\s+/);
  let chordCount = 0;
  for (const t of tokens) {
    if (/^[A-G][#b]?(m(?:aj)?7?|maj7?|M7?|dim7?|aug|sus[24]?|add\d+|\d+|[#b]\d+)*(\([^)]*\))?(\/[A-G][#b]?)?$/.test(t)) {
      chordCount++;
    }
  }
  return chordCount > 0 && chordCount >= Math.ceil(tokens.length * 0.6);
}

function transposeText(text, semitones, useFlat) {
  if (semitones === 0) return text;
  return text.split('\n').map(line => {
    if (isChordLine(line)) {
      return line.replace(CHORD_RE, (full, root, suffix = '', paren = '', bass = '') => {
        const newRoot = transposeNote(root, semitones, useFlat);
        let newBass = bass;
        if (bass) newBass = '/' + transposeNote(bass.slice(1), semitones, useFlat);
        return newRoot + (suffix||'') + (paren||'') + newBass;
      });
    }
    return line;
  }).join('\n');
}

function detectKey(text) {
  const tomMatch = text.match(/Tom\s*[:\-]\s*([A-G][#b]?m?)/i);
  if (tomMatch) return tomMatch[1].replace('m','');
  for (const line of text.split('\n')) {
    if (isChordLine(line)) {
      const m = line.trim().match(/^([A-G][#b]?)/);
      if (m) return m[1];
    }
  }
  return 'G';
}

function getSemitoneDiff(fromKey, toKey) {
  const a = noteIndex(fromKey);
  const b = noteIndex(toKey);
  if (a === -1 || b === -1) return 0;
  return ((b - a) + 12) % 12;
}

function renderChordHTML(text) {
  return text.split('\n').map(line => {
    if (isChordLine(line)) {
      return `<span class="chord-line">${escHtml(line)}</span>`;
    }
    return escHtml(line);
  }).join('\n');
}

// ==================== INDEXEDDB ====================
const DB_NAME = 'cifrapro';
const DB_VER  = 1;
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('songs')) {
        const s = d.createObjectStore('songs', { keyPath: 'id' });
        s.createIndex('title', 'title');
        s.createIndex('artist', 'artist');
        s.createIndex('dateAdded', 'dateAdded');
      }
      if (!d.objectStoreNames.contains('setlists')) {
        d.createObjectStore('setlists', { keyPath: 'id' });
      }
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

function dbAll(store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGet(store, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(store, obj) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(obj);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbDelete(store, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ==================== SCRAPER ====================
const CORS_PROXY = 'https://api.allorigins.win/get?url=';

async function fetchHtml(url) {
  const proxyUrl = CORS_PROXY + encodeURIComponent(url);
  const resp = await fetch(proxyUrl, { cache: 'no-store' });
  if (!resp.ok) throw new Error('Erro de rede: ' + resp.status);
  const data = await resp.json();
  return data.contents;
}

async function searchCifraClub(song, artist) {
  const q = [artist, song].filter(Boolean).join(' ');
  const url = `https://www.cifraclub.com.br/busca/?q=${encodeURIComponent(q)}&type=musica`;
  const html = await fetchHtml(url);
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const results = [];
  const seen = new Set();

  // Try multiple selectors for search results
  const selectors = [
    'a.art_music-link',
    '.js-song-link',
    'h2.t1 a',
    '.search-result a[href*="/"][href*=".com.br"]',
    'ul.art_musics li a',
    'a[href*="cifraclub.com.br/"]'
  ];

  for (const sel of selectors) {
    doc.querySelectorAll(sel).forEach(a => {
      const href = a.getAttribute('href') || '';
      const text = a.textContent.trim();
      if (!href || !text || seen.has(href)) return;
      if (!href.includes('/') || href === '#') return;

      const fullUrl = href.startsWith('http') ? href : 'https://www.cifraclub.com.br' + href;
      // Filter to only song pages (not search pages, categories, etc.)
      const parts = new URL(fullUrl).pathname.split('/').filter(Boolean);
      if (parts.length < 2) return;

      seen.add(href);
      const [artistSlug, songSlug] = parts;
      results.push({
        url: fullUrl,
        title: text,
        artistSlug,
        songSlug
      });
    });
    if (results.length >= 10) break;
  }

  return results.slice(0, 12);
}

async function downloadCifra(url) {
  const html = await fetchHtml(url);
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Title
  const titleEl = doc.querySelector('h1.t1, h1[class*="title"], h1');
  const title = titleEl?.textContent?.trim() || 'Sem título';

  // Artist
  const artistEl = doc.querySelector('h2.t2 a, .t2 a, h2 a, [class*="artist"] a');
  const artist = artistEl?.textContent?.trim() || '';

  // Key/Tom
  let key = 'G';
  const tomEl = doc.querySelector('#cifra_tom strong, .cifra-tom strong, [id*="tom"] strong');
  if (tomEl) key = tomEl.textContent.trim().split(' ')[0];

  // Chord content
  const preEl = doc.querySelector('pre.cifra_cnt, #cifra_original pre, #tablatura pre, .cifra pre');
  if (!preEl) {
    // Fallback: try to find any pre with chords
    const allPres = doc.querySelectorAll('pre');
    for (const pre of allPres) {
      if (pre.textContent.match(/[A-G][#b]?m?\s/)) {
        return buildSong(title, artist, key, parseCifraHTML(pre), url);
      }
    }
    throw new Error('Cifra não encontrada na página. Tente importar manualmente.');
  }

  return buildSong(title, artist, key, parseCifraHTML(preEl), url);
}

function parseCifraHTML(preEl) {
  // Clone to avoid mutating the DOM
  const clone = preEl.cloneNode(true);
  // <b> tags contain chord names in Cifra Club
  clone.querySelectorAll('b').forEach(b => {
    b.replaceWith(document.createTextNode(b.textContent));
  });
  clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  let text = clone.textContent;
  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Remove leading/trailing blank lines but keep internal structure
  text = text.replace(/^\n+/, '').replace(/\n+$/, '');
  return text;
}

function buildSong(title, artist, key, content, source) {
  const detectedKey = detectKey(content) || key;
  return {
    id: uid(),
    title: title || 'Sem título',
    artist: artist || '',
    key: detectedKey,
    originalKey: detectedKey,
    content,
    source: source || '',
    dateAdded: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// ==================== HELPERS ====================
function escHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function toast(msg, type = '', duration = 2500) {
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.textContent = msg;
  const container = document.getElementById('toast-container');
  container.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ==================== APP STATE ====================
const State = {
  currentScreen: 'home',
  screenStack: [],
  currentSong: null,         // Song object being viewed/edited
  currentSongSemitones: 0,  // Transposition offset from stored key
  currentSetlist: null,
  songs: [],
  setlists: [],
  displayFontSize: 18,
  twoCol: false,
  autoScrollActive: false,
  autoScrollInterval: null,
  editMode: false,
  searchTab: 'search',
};

// ==================== NAVIGATION ====================
const MAIN_SCREENS = ['home', 'search', 'library', 'setlists'];

const App = {
  // ---- NAV ----
  nav(screen, pushHistory = true) {
    const prev = State.currentScreen;
    if (prev === screen) return;

    if (pushHistory && MAIN_SCREENS.includes(prev) && !MAIN_SCREENS.includes(screen)) {
      State.screenStack.push(prev);
    } else if (MAIN_SCREENS.includes(screen)) {
      State.screenStack = [];
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + screen);
    if (el) el.classList.add('active');

    State.currentScreen = screen;
    this._updateNav(screen);
    this._updateHeader(screen);
    this._onScreenEnter(screen);
  },

  goBack() {
    if (State.screenStack.length) {
      const prev = State.screenStack.pop();
      this.nav(prev, false);
    } else {
      this.nav('home', false);
    }
  },

  _updateNav(screen) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const mainScreen = MAIN_SCREENS.includes(screen) ? screen : null;
    if (mainScreen) {
      const btn = document.getElementById('nav-' + mainScreen);
      if (btn) btn.classList.add('active');
    }
    const bottomNav = document.getElementById('bottom-nav');
    bottomNav.style.display = screen === 'display' ? 'none' : '';
  },

  _updateHeader(screen) {
    const backBtn = document.getElementById('header-back');
    const headerTitle = document.getElementById('header-title');
    const headerActions = document.getElementById('header-actions');
    headerActions.innerHTML = '';

    const isMain = MAIN_SCREENS.includes(screen);
    backBtn.style.display = isMain ? 'none' : 'block';

    const titles = {
      home: '🎸 CifraPro',
      search: '🔍 Buscar Cifras',
      library: '📚 Biblioteca',
      setlists: '🎼 Listas',
      song: '🎵 Cifra',
      display: 'Exibição',
      'setlist-view': '📋 Lista'
    };
    headerTitle.textContent = titles[screen] || 'CifraPro';

    if (screen === 'display') {
      document.getElementById('app-header').style.display = 'none';
    } else {
      document.getElementById('app-header').style.display = '';
    }
  },

  _onScreenEnter(screen) {
    if (screen === 'home') this.renderHome();
    if (screen === 'library') this.renderLibrary();
    if (screen === 'setlists') this.renderSetlists();
    if (screen === 'song' && State.currentSong) this.renderSong();
    if (screen === 'setlist-view' && State.currentSetlist) this.renderSetlistView();
  },

  // ---- SEARCH TAB ----
  switchSearchTab(tab) {
    State.searchTab = tab;
    ['search','batch','manual'].forEach(t => {
      document.getElementById(t + '-pane').style.display = t === tab ? '' : 'none';
      document.getElementById('tab-' + t).classList.toggle('active', t === tab);
    });
  },

  openManualImport() {
    this.nav('search');
    setTimeout(() => this.switchSearchTab('manual'), 100);
  },

  // ==================== HOME ====================
  renderHome() {
    document.getElementById('stat-songs').textContent = State.songs.length;
    document.getElementById('stat-setlists').textContent = State.setlists.length;

    const recent = [...State.songs]
      .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
      .slice(0, 5);

    const recentSection = document.getElementById('home-recent');
    const recentList = document.getElementById('home-recent-list');

    if (recent.length) {
      recentSection.style.display = '';
      recentList.innerHTML = recent.map(s => this._songItemHTML(s)).join('');
    } else {
      recentSection.style.display = 'none';
    }
  },

  _songItemHTML(song) {
    return `
      <div class="song-item" onclick="App.openSong('${song.id}')">
        <div class="song-item-icon">🎵</div>
        <div class="song-item-info">
          <div class="song-item-title">${escHtml(song.title)}</div>
          <div class="song-item-artist">${escHtml(song.artist || 'Sem artista')}</div>
        </div>
        <div class="song-item-key">${escHtml(song.key || '?')}</div>
      </div>`;
  },

  // ==================== SEARCH ONLINE ====================
  async searchOnline() {
    const song = document.getElementById('search-song').value.trim();
    const artist = document.getElementById('search-artist').value.trim();
    if (!song && !artist) { toast('Digite o nome da música', 'error'); return; }

    const area = document.getElementById('search-results-area');
    area.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><span>Buscando no Cifra Club...</span></div>';

    try {
      const results = await searchCifraClub(song, artist);
      if (!results.length) {
        area.innerHTML = '<div class="empty-state"><div class="empty-icon">😕</div><h3>Nenhum resultado</h3><p>Tente termos diferentes ou importe manualmente.</p></div>';
        return;
      }
      area.innerHTML = '<div class="search-results">' +
        results.map(r => `
          <div class="result-item">
            <div class="result-info">
              <div class="result-title">${escHtml(r.title)}</div>
              <div class="result-url">${escHtml(r.url)}</div>
            </div>
            <div class="result-actions">
              <button class="btn btn-primary btn-sm" onclick="App.downloadResult('${encodeURIComponent(r.url)}','${encodeURIComponent(r.title)}')">⬇️</button>
            </div>
          </div>`).join('') +
        '</div>';
    } catch (e) {
      area.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Erro na busca</h3><p>${escHtml(e.message)}</p></div>`;
    }
  },

  async downloadResult(encodedUrl, encodedTitle) {
    const url = decodeURIComponent(encodedUrl);
    toast('Baixando cifra...');
    try {
      const song = await downloadCifra(url);
      await dbPut('songs', song);
      State.songs = await dbAll('songs');
      toast('Cifra salva!', 'success');
      this.openSong(song.id);
    } catch (e) {
      toast('Erro: ' + e.message, 'error', 4000);
    }
  },

  // ==================== BATCH DOWNLOAD ====================
  async startBatchDownload() {
    const raw = document.getElementById('batch-list').value.trim();
    if (!raw) { toast('Cole a lista de músicas', 'error'); return; }

    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const area = document.getElementById('batch-progress-area');
    let done = 0, errors = 0;

    area.innerHTML = `
      <div class="card card-padded flex flex-col gap-12 mt-16">
        <div class="flex justify-between items-center">
          <span class="text-sm">Baixando <strong>${lines.length}</strong> músicas...</span>
          <span id="batch-count" class="badge badge-primary">0/${lines.length}</span>
        </div>
        <div class="progress-bar-wrap"><div class="progress-bar-fill" id="batch-fill" style="width:0%"></div></div>
        <div id="batch-log" class="flex flex-col gap-8" style="max-height:200px;overflow-y:auto;font-size:0.8rem;"></div>
      </div>`;

    for (const line of lines) {
      const [artist, ...songParts] = line.includes(' - ') ? line.split(' - ') : ['', line.split(' ')];
      const song = songParts.join(' ') || line;

      const log = document.getElementById('batch-log');
      const logItem = document.createElement('div');
      logItem.textContent = `⏳ ${line}`;
      logItem.style.color = 'var(--text-muted)';
      log.appendChild(logItem);
      log.scrollTop = log.scrollHeight;

      try {
        const results = await searchCifraClub(song.trim(), typeof artist === 'string' ? artist.trim() : '');
        if (results.length) {
          const cifra = await downloadCifra(results[0].url);
          await dbPut('songs', cifra);
          done++;
          logItem.textContent = `✅ ${line}`;
          logItem.style.color = 'var(--success)';
        } else {
          errors++;
          logItem.textContent = `❌ ${line} (não encontrado)`;
          logItem.style.color = 'var(--danger)';
        }
      } catch (e) {
        errors++;
        logItem.textContent = `❌ ${line} (erro)`;
        logItem.style.color = 'var(--danger)';
      }

      const total = done + errors;
      document.getElementById('batch-count').textContent = `${total}/${lines.length}`;
      document.getElementById('batch-fill').style.width = `${(total / lines.length) * 100}%`;
      await new Promise(r => setTimeout(r, 800)); // Rate limit
    }

    State.songs = await dbAll('songs');
    toast(`Concluído! ${done} salvas, ${errors} erros.`, done > 0 ? 'success' : 'error', 4000);
  },

  // ==================== MANUAL IMPORT ====================
  async saveManualImport() {
    const title = document.getElementById('manual-title').value.trim();
    const artist = document.getElementById('manual-artist').value.trim();
    const key = document.getElementById('manual-key').value;
    const content = document.getElementById('manual-content').value.trim();

    if (!title) { toast('Digite o título', 'error'); return; }
    if (!content) { toast('Cole a cifra', 'error'); return; }

    const song = buildSong(title, artist, key, content, '');
    await dbPut('songs', song);
    State.songs = await dbAll('songs');
    toast('Cifra salva!', 'success');

    document.getElementById('manual-title').value = '';
    document.getElementById('manual-artist').value = '';
    document.getElementById('manual-content').value = '';

    this.openSong(song.id);
  },

  // ==================== LIBRARY ====================
  renderLibrary() {
    const search = document.getElementById('library-search').value.toLowerCase();
    const sort = document.getElementById('library-sort').value;

    let songs = [...State.songs];
    if (search) {
      songs = songs.filter(s =>
        s.title.toLowerCase().includes(search) ||
        (s.artist || '').toLowerCase().includes(search)
      );
    }

    songs.sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title, 'pt-BR');
      if (sort === 'artist') return (a.artist || '').localeCompare(b.artist || '', 'pt-BR');
      if (sort === 'date') return new Date(b.dateAdded) - new Date(a.dateAdded);
      if (sort === 'key') return (a.key || '').localeCompare(b.key || '');
      return 0;
    });

    document.getElementById('library-count').textContent =
      `${songs.length} cifra${songs.length !== 1 ? 's' : ''}`;

    const list = document.getElementById('library-list');
    if (!songs.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">🎵</div><h3>Nenhuma cifra</h3><p>Busque online ou importe manualmente.</p></div>';
      return;
    }
    list.innerHTML = songs.map(s => this._songItemHTML(s)).join('');
  },

  filterLibrary(val) { this.renderLibrary(); },
  sortLibrary(val) { this.renderLibrary(); },

  // ==================== SONG VIEW ====================
  async openSong(id) {
    const song = await dbGet('songs', id);
    if (!song) { toast('Cifra não encontrada', 'error'); return; }
    State.currentSong = song;
    State.currentSongSemitones = 0;
    State.editMode = false;
    this.nav('song');
  },

  renderSong() {
    const song = State.currentSong;
    if (!song) return;

    const semitones = State.currentSongSemitones;
    const useFlat = PREFER_FLAT_KEYS.has(song.key);
    const displayKey = semitones === 0 ? song.key : transposeNote(song.key, semitones, useFlat);
    const transposedText = transposeText(song.content, semitones, useFlat);

    document.getElementById('song-title').textContent = song.title;
    document.getElementById('song-artist').textContent = song.artist || 'Sem artista';
    document.getElementById('current-key').textContent = displayKey;

    const diff = document.getElementById('semitone-diff');
    diff.textContent = semitones === 0 ? '' : (semitones > 0 ? `+${semitones}` : `${semitones}`) + ' st';

    // Render chord text with highlighted chord lines
    document.getElementById('chord-display').innerHTML = renderChordHTML(transposedText);

    // Build key selector chips
    const keySel = document.getElementById('key-selector');
    keySel.innerHTML = ALL_KEYS.map(k => {
      const semi = getSemitoneDiff(song.key, k);
      const isActive = semi === ((semitones % 12 + 12) % 12);
      return `<button class="key-chip${isActive ? ' active' : ''}" onclick="App.selectKey('${k}')">${k}</button>`;
    }).join('');

    // Edit fields
    document.getElementById('edit-title').value = song.title;
    document.getElementById('edit-artist').value = song.artist || '';
    document.getElementById('edit-key').value = song.key;
    document.getElementById('edit-content').value = song.content;

    this._applySongEditMode();
  },

  transposeBy(n) {
    State.currentSongSemitones = ((State.currentSongSemitones + n) % 12 + 12) % 12;
    this.renderSong();
  },

  selectKey(key) {
    if (!State.currentSong) return;
    const semi = getSemitoneDiff(State.currentSong.key, key);
    State.currentSongSemitones = semi;
    this.renderSong();
  },

  async saveTransposedKey() {
    if (!State.currentSong) return;
    const semitones = State.currentSongSemitones;
    const useFlat = PREFER_FLAT_KEYS.has(State.currentSong.key);
    const newKey = semitones === 0 ? State.currentSong.key : transposeNote(State.currentSong.key, semitones, useFlat);
    const newContent = transposeText(State.currentSong.content, semitones, useFlat);

    State.currentSong.key = newKey;
    State.currentSong.content = newContent;
    State.currentSong.updatedAt = new Date().toISOString();
    State.currentSongSemitones = 0;

    await dbPut('songs', State.currentSong);
    State.songs = await dbAll('songs');
    this.renderSong();
    toast('Tom salvo: ' + newKey, 'success');
  },

  async deleteSong() {
    if (!State.currentSong) return;
    if (!confirm(`Excluir "${State.currentSong.title}"?`)) return;
    await dbDelete('songs', State.currentSong.id);
    State.songs = await dbAll('songs');
    State.currentSong = null;
    toast('Cifra excluída');
    this.nav('library');
  },

  // ---- EDIT MODE ----
  toggleEdit() {
    State.editMode = !State.editMode;
    this._applySongEditMode();
  },

  _applySongEditMode() {
    document.getElementById('chord-view').style.display = State.editMode ? 'none' : '';
    document.getElementById('chord-edit-area').style.display = State.editMode ? '' : 'none';
  },

  async saveEdit() {
    if (!State.currentSong) return;
    const title = document.getElementById('edit-title').value.trim();
    const artist = document.getElementById('edit-artist').value.trim();
    const key = document.getElementById('edit-key').value;
    const content = document.getElementById('edit-content').value.trim();

    if (!title) { toast('Digite o título', 'error'); return; }

    State.currentSong.title = title;
    State.currentSong.artist = artist;
    State.currentSong.key = key;
    State.currentSong.originalKey = key;
    State.currentSong.content = content;
    State.currentSong.updatedAt = new Date().toISOString();
    State.currentSongSemitones = 0;

    await dbPut('songs', State.currentSong);
    State.songs = await dbAll('songs');
    State.editMode = false;
    this.renderSong();
    toast('Salvo!', 'success');
  },

  cancelEdit() {
    State.editMode = false;
    this.renderSong();
  },

  // ==================== DISPLAY MODE ====================
  openDisplayMode(songObj, keyOverride) {
    const song = songObj || State.currentSong;
    if (!song) return;

    const semitones = keyOverride !== undefined
      ? getSemitoneDiff(song.key, keyOverride)
      : State.currentSongSemitones;

    const useFlat = PREFER_FLAT_KEYS.has(song.key);
    const displayKey = semitones === 0 ? song.key : transposeNote(song.key, semitones, useFlat);
    const text = transposeText(song.content, semitones, useFlat);

    document.getElementById('display-title').textContent = song.title;
    document.getElementById('display-key-label').textContent = 'Tom: ' + displayKey;
    document.getElementById('display-chord-text').innerHTML = renderChordHTML(text);

    this._applyDisplayFont();
    State.twoCol = false;
    document.getElementById('display-content').classList.remove('two-col');
    document.getElementById('btn-two-col').classList.remove('active-ctrl');
    this.stopAutoScroll();

    State.autoScrollActive = false;
    document.getElementById('scroll-progress').style.width = '0%';

    this.nav('song'); // ensure we can go back
    State.screenStack.push('song');

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-display').classList.add('active');
    State.currentScreen = 'display';
    document.getElementById('app-header').style.display = 'none';
    document.getElementById('bottom-nav').style.display = 'none';
    document.getElementById('display-content').scrollTop = 0;

    // Tap anywhere to toggle header visibility
    const content = document.getElementById('display-content');
    content.onclick = null;
    content.onclick = () => {
      const h = document.getElementById('display-header');
      h.classList.toggle('hidden');
    };
  },

  closeDisplay() {
    this.stopAutoScroll();
    this.nav('song', false);
  },

  displayFontUp() {
    State.displayFontSize = Math.min(40, State.displayFontSize + 2);
    this._applyDisplayFont();
  },

  displayFontDown() {
    State.displayFontSize = Math.max(10, State.displayFontSize - 2);
    this._applyDisplayFont();
  },

  _applyDisplayFont() {
    document.getElementById('display-chord-text').style.fontSize = State.displayFontSize + 'px';
  },

  toggleTwoCol() {
    State.twoCol = !State.twoCol;
    const content = document.getElementById('display-content');
    content.classList.toggle('two-col', State.twoCol);
    document.getElementById('btn-two-col').classList.toggle('active-ctrl', State.twoCol);
  },

  toggleAutoScroll() {
    if (State.autoScrollActive) {
      this.stopAutoScroll();
    } else {
      this.startAutoScroll();
    }
  },

  startAutoScroll() {
    const content = document.getElementById('display-content');
    const btn = document.getElementById('btn-autoscroll');
    State.autoScrollActive = true;
    btn.textContent = '⏸';
    btn.classList.add('active-ctrl');

    const scrollStep = 1;
    const interval = 50; // ms per step

    State.autoScrollInterval = setInterval(() => {
      content.scrollTop += scrollStep;
      const progress = content.scrollTop / (content.scrollHeight - content.clientHeight);
      document.getElementById('scroll-progress').style.width = (progress * 100) + '%';
      if (content.scrollTop >= content.scrollHeight - content.clientHeight) {
        this.stopAutoScroll();
      }
    }, interval);
  },

  stopAutoScroll() {
    if (State.autoScrollInterval) {
      clearInterval(State.autoScrollInterval);
      State.autoScrollInterval = null;
    }
    State.autoScrollActive = false;
    const btn = document.getElementById('btn-autoscroll');
    if (btn) { btn.textContent = '▶'; btn.classList.remove('active-ctrl'); }
  },

  // ==================== SETLISTS ====================
  renderSetlists() {
    const list = document.getElementById('setlists-list');
    if (!State.setlists.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">🎼</div><h3>Nenhuma lista</h3><p>Crie uma lista para cada culto ou ministro.</p></div>';
      return;
    }
    const sorted = [...State.setlists].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    list.innerHTML = sorted.map(sl => `
      <div class="setlist-item" onclick="App.openSetlist('${sl.id}')">
        <div class="setlist-item-icon">🎼</div>
        <div class="setlist-item-info">
          <div class="setlist-item-name">${escHtml(sl.name)}</div>
          <div class="setlist-item-meta">
            ${sl.minister ? '👤 ' + escHtml(sl.minister) + ' &nbsp;' : ''}
            ${sl.date ? '📅 ' + fmtDate(sl.date) : ''}
            &nbsp;🎵 ${sl.items.length} músicas
          </div>
        </div>
        <span>›</span>
      </div>`).join('');
  },

  newSetlistModal() {
    this.openModal('Nova Lista', `
      <div class="flex flex-col gap-12">
        <div class="input-group">
          <label>Nome do culto / evento</label>
          <input type="text" id="new-sl-name" placeholder="Ex: Culto Domingo Manhã">
        </div>
        <div class="input-group">
          <label>Ministro / Líder</label>
          <input type="text" id="new-sl-minister" placeholder="Ex: João Silva">
        </div>
        <div class="input-group">
          <label>Data</label>
          <input type="date" id="new-sl-date" value="${new Date().toISOString().slice(0,10)}">
        </div>
        <button class="btn btn-primary btn-full" onclick="App.createSetlist()">✅ Criar lista</button>
      </div>
    `);
  },

  async createSetlist() {
    const name = document.getElementById('new-sl-name').value.trim();
    const minister = document.getElementById('new-sl-minister').value.trim();
    const date = document.getElementById('new-sl-date').value;

    if (!name) { toast('Digite o nome do culto', 'error'); return; }

    const sl = {
      id: uid(),
      name,
      minister,
      date,
      items: [],
      createdAt: new Date().toISOString()
    };
    await dbPut('setlists', sl);
    State.setlists = await dbAll('setlists');
    this.closeModal();
    this.openSetlist(sl.id);
    toast('Lista criada!', 'success');
  },

  async openSetlist(id) {
    const sl = await dbGet('setlists', id);
    if (!sl) { toast('Lista não encontrada', 'error'); return; }
    State.currentSetlist = sl;
    this.nav('setlist-view');
  },

  renderSetlistView() {
    const sl = State.currentSetlist;
    if (!sl) return;

    document.getElementById('sv-name').textContent = sl.name;
    document.getElementById('sv-minister').textContent = sl.minister || 'Sem ministro';
    document.getElementById('sv-date').textContent = sl.date ? fmtDate(sl.date) : 'Sem data';
    document.getElementById('sv-count').textContent = sl.items.length + ' músicas';

    const list = document.getElementById('setlist-songs-list');
    if (!sl.items.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">🎵</div><h3>Nenhuma música</h3><p>Adicione músicas da sua biblioteca.</p></div>';
      return;
    }

    list.innerHTML = sl.items.map((item, i) => {
      const song = State.songs.find(s => s.id === item.songId);
      if (!song) return '';
      return `
        <div class="setlist-song-row">
          <div class="setlist-song-order">${i + 1}</div>
          <div class="setlist-song-info">
            <div class="setlist-song-title">${escHtml(song.title)}</div>
            <div class="setlist-song-artist">${escHtml(song.artist || 'Sem artista')}</div>
          </div>
          <div class="setlist-song-key">${escHtml(item.key || song.key)}</div>
          <div class="setlist-song-actions">
            <button class="btn btn-secondary btn-sm btn-icon" onclick="App.viewSongInSetlist('${song.id}','${item.key || song.key}')" title="Ver cifra">👁️</button>
            <button class="btn btn-secondary btn-sm btn-icon" onclick="App.editSetlistItemKey(${i})" title="Mudar tom">🎵</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="App.removeFromSetlist(${i})" title="Remover">✕</button>
          </div>
        </div>`;
    }).join('');
  },

  async viewSongInSetlist(songId, key) {
    const song = await dbGet('songs', songId);
    if (!song) return;
    State.currentSong = song;
    State.currentSongSemitones = getSemitoneDiff(song.key, key);
    this.nav('song');
  },

  addSongToSetlist() {
    if (!State.currentSetlist) return;
    if (!State.songs.length) {
      toast('Biblioteca vazia. Baixe cifras primeiro.', 'error'); return;
    }

    this.openModal('Adicionar Música', `
      <div class="flex flex-col gap-12">
        <div class="search-input-wrap">
          <span class="search-input-icon">🔍</span>
          <input type="text" id="setlist-add-search" placeholder="Buscar na biblioteca..." oninput="App.filterSetlistAdd(this.value)">
        </div>
        <div id="setlist-add-list" class="flex flex-col gap-8" style="max-height:55dvh;overflow-y:auto;">
          ${this._setlistAddList(State.songs)}
        </div>
      </div>
    `);
  },

  filterSetlistAdd(q) {
    const filtered = q
      ? State.songs.filter(s => s.title.toLowerCase().includes(q.toLowerCase()) || (s.artist||'').toLowerCase().includes(q.toLowerCase()))
      : State.songs;
    document.getElementById('setlist-add-list').innerHTML = this._setlistAddList(filtered);
  },

  _setlistAddList(songs) {
    return [...songs]
      .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
      .map(s => `
        <div class="song-item" onclick="App.addSongChooseKey('${s.id}')">
          <div class="song-item-icon">🎵</div>
          <div class="song-item-info">
            <div class="song-item-title">${escHtml(s.title)}</div>
            <div class="song-item-artist">${escHtml(s.artist || '')}</div>
          </div>
          <div class="song-item-key">${escHtml(s.key || '?')}</div>
        </div>`).join('');
  },

  addSongChooseKey(songId) {
    const song = State.songs.find(s => s.id === songId);
    if (!song) return;

    this.openModal(`Tom para "${song.title}"`, `
      <div class="flex flex-col gap-12">
        <p class="text-sm text-muted">Escolha o tom que será tocado nessa lista:</p>
        <div class="key-selector" style="justify-content:center">
          ${ALL_KEYS.map(k => `<button class="key-chip${k === song.key ? ' active' : ''}" onclick="App.confirmAddToSetlist('${songId}','${k}')">${k}</button>`).join('')}
        </div>
        <button class="btn btn-ghost btn-sm" onclick="App.confirmAddToSetlist('${songId}','${song.key}')">Usar tom original (${song.key})</button>
      </div>
    `);
  },

  async confirmAddToSetlist(songId, key) {
    if (!State.currentSetlist) return;
    State.currentSetlist.items.push({ songId, key, order: State.currentSetlist.items.length });
    await dbPut('setlists', State.currentSetlist);
    State.setlists = await dbAll('setlists');
    this.closeModal();
    this.renderSetlistView();
    toast('Música adicionada!', 'success');
  },

  editSetlistItemKey(index) {
    const sl = State.currentSetlist;
    if (!sl) return;
    const item = sl.items[index];
    const song = State.songs.find(s => s.id === item.songId);
    if (!song) return;

    this.openModal(`Tom de "${song.title}"`, `
      <div class="flex flex-col gap-12">
        <p class="text-sm text-muted">Tom atual: <strong>${item.key || song.key}</strong></p>
        <div class="key-selector" style="justify-content:center">
          ${ALL_KEYS.map(k => `<button class="key-chip${k === (item.key||song.key) ? ' active' : ''}" onclick="App.saveSetlistItemKey(${index},'${k}')">${k}</button>`).join('')}
        </div>
      </div>
    `);
  },

  async saveSetlistItemKey(index, key) {
    State.currentSetlist.items[index].key = key;
    await dbPut('setlists', State.currentSetlist);
    State.setlists = await dbAll('setlists');
    this.closeModal();
    this.renderSetlistView();
    toast('Tom atualizado: ' + key, 'success');
  },

  async removeFromSetlist(index) {
    State.currentSetlist.items.splice(index, 1);
    await dbPut('setlists', State.currentSetlist);
    State.setlists = await dbAll('setlists');
    this.renderSetlistView();
    toast('Música removida');
  },

  async deleteCurrentSetlist() {
    if (!State.currentSetlist) return;
    if (!confirm(`Excluir lista "${State.currentSetlist.name}"?`)) return;
    await dbDelete('setlists', State.currentSetlist.id);
    State.setlists = await dbAll('setlists');
    State.currentSetlist = null;
    toast('Lista excluída');
    this.nav('setlists');
  },

  // Display all songs in setlist one by one
  displaySetlist() {
    const sl = State.currentSetlist;
    if (!sl || !sl.items.length) { toast('Nenhuma música na lista', 'error'); return; }

    let idx = 0;
    const showSong = async () => {
      const item = sl.items[idx];
      const song = State.songs.find(s => s.id === item.songId);
      if (!song) return;
      this.openDisplayMode(song, item.key || song.key);

      // Override display title to show setlist context
      document.getElementById('display-title').textContent =
        `${idx + 1}/${sl.items.length} — ${song.title}`;

      // Allow swiping to next song via a "PRÓXIMA" button
      const displayHeader = document.getElementById('display-header');
      // Remove existing next button if any
      const existingNext = displayHeader.querySelector('.next-song-btn');
      if (existingNext) existingNext.remove();

      if (idx < sl.items.length - 1) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'display-ctrl-btn next-song-btn';
        nextBtn.textContent = 'PRÓX ›';
        nextBtn.onclick = (e) => {
          e.stopPropagation();
          idx++;
          showSong();
        };
        displayHeader.querySelector('.display-controls').insertBefore(
          nextBtn,
          displayHeader.querySelector('#btn-two-col')
        );
      }
    };

    showSong();
  },

  // ==================== MODAL ====================
  openModal(title, bodyHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-backdrop').classList.add('open');
  },

  closeModal() {
    document.getElementById('modal-backdrop').classList.remove('open');
  },

  addToSetlistModal() {
    if (!State.currentSong) return;
    if (!State.setlists.length) {
      toast('Crie uma lista primeiro', 'error'); return;
    }
    this.openModal('Adicionar a uma lista', `
      <div class="flex flex-col gap-8">
        ${State.setlists.map(sl => `
          <button class="btn btn-secondary" onclick="App.addCurrentSongToSetlist('${sl.id}')">
            🎼 ${escHtml(sl.name)}
            ${sl.date ? ' — ' + fmtDate(sl.date) : ''}
          </button>`).join('')}
      </div>
    `);
  },

  addCurrentSongToSetlist(setlistId) {
    this.closeModal();
    const sl = State.setlists.find(s => s.id === setlistId);
    if (!sl) return;
    State.currentSetlist = sl;
    const song = State.currentSong;
    this.addSongChooseKey(song.id);
  },
};

// ==================== INIT ====================
async function init() {
  await openDB();
  State.songs = await dbAll('songs');
  State.setlists = await dbAll('setlists');
  App.renderHome();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
}

init().catch(e => console.error('Erro na inicialização:', e));
