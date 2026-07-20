'use strict';
/* SlackerVSCode renderer: a VS Code-disguised novel reader. */

const ICONS = window.ICONS;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ------------------------------ Utilities ------------------------------ */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function toast(msg, ms = 2000) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), ms);
}

/* --------------------------- Chapter parsing --------------------------- */
function parseChapters(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const chapRe = /^[\s\u3000]*(第[\s]*[零一二三四五六七八九十百千万0-9]+[\s]*[章回节卷篇部集][\s\S]*?|序章|楔子|引子|前言|序言|后记|尾声|终章|番外[^\n]*|Chapter\s+\d+[^\n]*)$/i;
  const chapters = [];
  let cur = { title: '', content: [] };
  let started = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (chapRe.test(trimmed)) {
      if (started) chapters.push({ title: cur.title, content: cur.content.join('\n') });
      cur = { title: trimmed, content: [] };
      started = true;
    } else {
      cur.content.push(raw);
      if (!started) { cur.title = '序章'; started = true; }
    }
  }
  if (started) chapters.push({ title: cur.title, content: cur.content.join('\n') });

  // Fallback: no chapter markers -> split into chunks of ~300 lines.
  if (chapters.length <= 1 && lines.length > 400) {
    const chunks = [];
    const size = 300;
    for (let i = 0; i < lines.length; i += size) {
      chunks.push({ title: '第 ' + (Math.floor(i / size) + 1) + ' 段', content: lines.slice(i, i + size).join('\n') });
    }
    return chunks;
  }
  // Drop chapters with no real content (keep at least one)
  const filtered = chapters.filter(c => c.content.trim().length > 0);
  return filtered.length ? filtered : chapters;
}

/* ------------------------------- State --------------------------------- */
let store = { books: [], settings: { fontSize: 14, sidebarWidth: 260, sidebarVisible: true, readingMode: false } };
const bookCache = new Map(); // bookId -> { chapters, encoding, mtime }
let activeBookId = null;
// Track expanded subdirectory groups: Set of "bookId:groupIdx"
const expandedDirs = new Set();
const CHAPTERS_PER_DIR = 20;
let activeChapterIndex = -1;
let tabs = []; // { bookId, chapterIndex }
let activeTabIndex = -1;

const SCROLL = $('#editorScroll');
const EDITOR = $('#editor');

/* ----------------------------- Persistence ----------------------------- */
async function persist() {
  store.settings.sidebarWidth = parseInt($('#sidebar').style.width) || 260;
  await window.api.store.save(store);
}
const persistDebounced = debounce(persist, 400);

/* --------------------------- Book operations --------------------------- */
async function pickAndAddBooks() {
  const paths = await window.api.dialog.openBook();
  if (!paths || !paths.length) return;
  let added = 0;
  for (const p of paths) {
    if (store.books.some(b => b.filePath === p)) { toast('已在书架中: ' + pathBasename(p)); continue; }
    const res = await window.api.book.read(p);
    if (!res || !res.ok) { toast('打开失败: ' + p); continue; }
    const chapters = parseChapters(res.text);
    const id = uid();
    const book = {
      id, title: pathBasename(p).replace(/\.txt$/i, ''),
      filePath: p, addedAt: Date.now(), lastReadAt: Date.now(),
      encoding: res.encoding, size: res.size, mtime: res.mtime,
      progress: { chapterIndex: 0, scrollPercent: 0 },
      chapterCount: chapters.length
    };
    store.books.push(book);
    bookCache.set(id, { chapters, encoding: res.encoding, mtime: res.mtime, title: book.title });
    added++;
  }
  if (added) {
    await persist();
    renderBookshelf();
    toast('已添加 ' + added + ' 本小说');
  }
}

function pathBasename(p) { return p.split(/[\\/]/).pop(); }

async function ensureBookLoaded(book) {
  // Use the in-memory cache directly; the refresh button clears it to force a reload.
  if (bookCache.has(book.id)) return bookCache.get(book.id);
  const res = await window.api.book.read(book.filePath);
  if (!res || !res.ok) { toast('读取失败'); return null; }
  const chapters = parseChapters(res.text);
  bookCache.set(book.id, { chapters, encoding: res.encoding, mtime: res.mtime, title: book.title });
  book.chapterCount = chapters.length;
  book.encoding = res.encoding;
  book.mtime = res.mtime;
  return bookCache.get(book.id);
}

function removeBook(id) {
  const idx = store.books.findIndex(b => b.id === id);
  if (idx < 0) return;
  store.books.splice(idx, 1);
  bookCache.delete(id);
  // close related tabs
  tabs = tabs.filter(t => t.bookId !== id);
  if (activeBookId === id) { activeBookId = null; activeChapterIndex = -1; }
  if (tabs.length) { selectTab(tabs.length - 1); } else { showWelcome(); }
  persist(); renderBookshelf();
}

/* --------------------------- Bookshelf view ---------------------------- */
function renderBookshelf() {
  const root = $('#bookshelf');
  root.innerHTML = '';
  if (!store.books.length) {
    root.innerHTML = `
      <div class="empty-state">书架为空<br>添加本地 txt 小说开始摸鱼</div>
      <button class="add-book-btn" data-act="add">${ICONS.add}<span>打开小说…</span></button>`;
    return;
  }
  // Sort by last read desc
  const books = [...store.books].sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0));
  for (const b of books) {
    const expanded = b.id === activeBookId;
    const pct = b.progress ? Math.round(((b.progress.chapterIndex || 0) + (getChapterScroll(b, b.progress.chapterIndex || 0))) / Math.max(1, b.chapterCount || 1) * 100) : 0;
    const fakeName = window.DISGUISE.fakeProjectName(b.id);
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="tree-item book-row ${expanded ? 'active' : ''}" data-book="${b.id}">
        <span class="chevron">${expanded ? ICONS.chevronDown : ICONS.chevronRight}</span>
        <span class="ti-icon">${expanded ? ICONS.folderOpen : ICONS.folder}</span>
        <span class="ti-label" title="${escapeHtml(b.title)}">${escapeHtml(fakeName)}</span>
        <span class="ti-progress">${pct}%</span>
        <span class="ti-del" data-del="${b.id}" title="移除">${ICONS.close}</span>
      </div>`;
    const childWrap = document.createElement('div');
    childWrap.className = 'tree-children' + (expanded ? '' : ' collapsed');
    childWrap.dataset.children = b.id;
    root.appendChild(wrap.firstElementChild);
    root.appendChild(childWrap);
    if (expanded) renderChapterList(b.id, childWrap);
  }
}

async function renderChapterList(bookId, container) {
  const book = store.books.find(b => b.id === bookId);
  if (!book) return;
  const data = await ensureBookLoaded(book);
  if (!data) return;
  container.innerHTML = '';
  const cur = book.progress ? (book.progress.chapterIndex || 0) : 0;
  const D = window.DISGUISE;
  const total = data.chapters.length;
  const groupCount = Math.ceil(total / CHAPTERS_PER_DIR);

  // If only one group, render flat (no subdirectory wrapper).
  if (groupCount <= 1) {
    data.chapters.forEach((ch, i) => container.appendChild(buildChapterRow(bookId, ch, i, cur)));
    return;
  }

  for (let g = 0; g < groupCount; g++) {
    const start = g * CHAPTERS_PER_DIR;
    const end = Math.min(start + CHAPTERS_PER_DIR, total);
    const dirName = D.fakeDirName(bookId, g);
    const dirKey = bookId + ':' + g;
    // Auto-expand the group containing the active chapter (based on the
    // actually-opened tab, not the global activeBookId which also tracks
    // which book's tree is merely expanded).
    const at = activeTabChapter();
    const containsActive = !!at && at.bookId === bookId && at.chapterIndex >= start && at.chapterIndex < end;
    const expanded = expandedDirs.has(dirKey) || containsActive;
    if (containsActive) expandedDirs.add(dirKey);

    const dirRow = document.createElement('div');
    dirRow.className = 'tree-item dir-row';
    dirRow.innerHTML = `
      <span class="chevron">${expanded ? ICONS.chevronDown : ICONS.chevronRight}</span>
      <span class="ti-icon">${expanded ? ICONS.folderOpen : ICONS.folder}</span>
      <span class="ti-label">${escapeHtml(dirName)}</span>`;
    dirRow.addEventListener('click', (e) => {
      e.stopPropagation();
      if (expandedDirs.has(dirKey)) expandedDirs.delete(dirKey); else expandedDirs.add(dirKey);
      renderChapterList(bookId, container);
    });
    container.appendChild(dirRow);

    const childWrap = document.createElement('div');
    childWrap.className = 'tree-children' + (expanded ? '' : ' collapsed');
    for (let i = start; i < end; i++) {
      childWrap.appendChild(buildChapterRow(bookId, data.chapters[i], i, cur));
    }
    container.appendChild(childWrap);
  }
}

// 当前编辑器中实际打开的章节（基于 tab），用于判断章节高亮，
// 避免点击书名展开目录树时误用全局 activeChapterIndex 导致跨书误高亮。
function activeTabChapter() {
  const t = tabs[activeTabIndex];
  return t ? t : null;
}

function buildChapterRow(bookId, ch, i, cur) {
  const D = window.DISGUISE;
  const read = i < cur;
  const at = activeTabChapter();
  const isActive = !!at && at.bookId === bookId && at.chapterIndex === i;
  const fakeName = D.fakeChapterFilename(i, bookId);
  const icon = ICONS.fileTypeIcon(fakeName);
  const row = document.createElement('div');
  row.className = 'tree-item chapter-row' + (isActive ? ' active' : '');
  row.innerHTML = `
    <span class="ti-spacer"></span>
    <span class="ti-icon">${icon}</span>
    <span class="ti-label ${read ? 'read' : ''}" title="${escapeHtml(ch.title)}">${escapeHtml(fakeName)}</span>`;
  row.addEventListener('click', (e) => { e.stopPropagation(); openChapter(bookId, i); });
  return row;
}

/* ------------------------------ Tabs ----------------------------------- */
function openChapter(bookId, chapterIndex) {
  const existing = tabs.findIndex(t => t.bookId === bookId && t.chapterIndex === chapterIndex);
  if (existing >= 0) {
    selectTab(existing);
  } else {
    // Replace the current tab if it belongs to the same book (navigate in place, like VS Code preview)
    const sameBook = tabs.findIndex((t, i) => i === activeTabIndex && t.bookId === bookId);
    if (sameBook >= 0) {
      tabs[sameBook] = { bookId, chapterIndex };
      activeTabIndex = sameBook;
    } else {
      tabs.push({ bookId, chapterIndex });
      activeTabIndex = tabs.length - 1;
    }
  }
  activeBookId = bookId;
  activeChapterIndex = chapterIndex;
  const book = store.books.find(b => b.id === bookId);
  if (book) {
    book.lastReadAt = Date.now();
    ensureProgress(book);
    book.progress.chapterIndex = chapterIndex;
  }
  renderTabs();
  renderEditor();
  renderBookshelf();
  persistDebounced();
}

function selectTab(index) {
  if (index < 0 || index >= tabs.length) return;
  activeTabIndex = index;
  const t = tabs[index];
  activeBookId = t.bookId;
  activeChapterIndex = t.chapterIndex;
  renderTabs();
  renderEditor();
  renderBookshelf();
}

function closeTab(index) {
  tabs.splice(index, 1);
  if (activeTabIndex >= tabs.length) activeTabIndex = tabs.length - 1;
  if (tabs.length === 0) { showWelcome(); renderTabs(); return; }
  selectTab(Math.max(0, activeTabIndex));
}

function renderTabs() {
  const bar = $('#tabs');
  bar.innerHTML = '';
  tabs.forEach((t, i) => {
    const book = store.books.find(b => b.id === t.bookId);
    if (!book) return;
    const data = bookCache.get(t.bookId);
    const realTitle = data && data.chapters[t.chapterIndex] ? data.chapters[t.chapterIndex].title : '';
    const fakeName = window.DISGUISE.fakeChapterFilename(t.chapterIndex, t.bookId);
    const tab = document.createElement('div');
    tab.className = 'tab' + (i === activeTabIndex ? ' active' : '');
    // title 挂在整个 tab 上，悬浮在图标/标签/关闭按钮任意位置都能显示真实章节标题
    tab.title = realTitle || fakeName;
    tab.innerHTML = `
      <span class="tab-icon">${ICONS.fileTypeIcon(fakeName)}</span>
      <span class="tab-label">${escapeHtml(fakeName)}</span>
      <span class="tab-close">${ICONS.close}</span>`;
    tab.addEventListener('click', () => selectTab(i));
    tab.querySelector('.tab-close').addEventListener('click', (e) => { e.stopPropagation(); closeTab(i); });
    bar.appendChild(tab);
  });
}

/* ------------------------------ Editor --------------------------------- */
function showWelcome() {
  EDITOR.innerHTML = `
    <div id="welcome" class="welcome">
      <div class="welcome-inner">
        <div class="welcome-logo">${ICONS.extensions}</div>
        <h1>Visual Studio Code</h1>
        <p class="welcome-sub">Editing evolved</p>
        <div class="welcome-actions">
          <button class="wa" data-act="open">Open a Novel…</button>
          <button class="wa" data-act="clone">Clone from library…</button>
        </div>
        <p class="welcome-tip">Tip: 按下 Ctrl+P 快速跳转章节 · Alt+←/→ 翻页</p>
      </div>
    </div>`;
  bindWelcome();
  renderBreadcrumbs();
  renderStatus();
}

async function renderEditor() {
  const t = tabs[activeTabIndex];
  if (!t) return showWelcome();
  const book = store.books.find(b => b.id === t.bookId);
  const data = await ensureBookLoaded(book);
  if (!data) return;
  const ch = data.chapters[t.chapterIndex];
  if (!ch) return;
  // 数据异步加载完成后，刷新标签页 title（首次打开时 bookCache 为空，
  // renderTabs 拿不到真实章节标题，这里补上）
  renderTabs();
  const D = window.DISGUISE;
  const lines = D.buildDisguisedLines(book.id, t.chapterIndex, ch);
  let frag = '<div class="novel">';
  for (let i = 0; i < lines.length; i++) {
    const ln = i + 1;
    const item = lines[i];
    let inner;
    if (item.kind === 'code') {
      inner = item.text ? D.highlightCode(item.text) : '&nbsp;';
    } else {
      inner = '<span class="tok-com">' + D.escapeHtml(item.text) + '</span>';
    }
    const cls = item.kind === 'header' ? ' novel-header' : (item.kind === 'comment' ? ' novel-comment' : '');
    frag += '<div class="novel-line' + cls + '"><span class="ln">' + ln + '</span><span class="tx">' + inner + '</span></div>';
  }
  frag += '</div>';
  EDITOR.innerHTML = frag;
  EDITOR.classList.toggle('reading-mode', !!store.settings.readingMode);
  EDITOR.style.fontSize = (store.settings.fontSize || 14) + 'px';
  renderBreadcrumbs();
  renderStatus();
  // Restore scroll position saved for this specific chapter (0 = top)
  const pct = getChapterScroll(book, t.chapterIndex);
  requestAnimationFrame(() => {
    const max = SCROLL.scrollHeight - SCROLL.clientHeight;
    SCROLL.scrollTop = Math.max(0, Math.round(max * pct));
  });
}

function renderBreadcrumbs() {
  const bc = $('#breadcrumbs');
  const t = tabs[activeTabIndex];
  if (!t) { bc.innerHTML = ''; return; }
  const book = store.books.find(b => b.id === t.bookId);
  const data = bookCache.get(t.bookId);
  const realTitle = data && data.chapters[t.chapterIndex] ? data.chapters[t.chapterIndex].title : '';
  const fakeName = window.DISGUISE.fakeChapterFilename(t.chapterIndex, t.bookId);
  // 小说名也要伪装为英文工程名（和侧边栏书架保持一致），悬浮显示真实书名
  const fakeProj = window.DISGUISE.fakeProjectName(t.bookId);
  const projTitle = book ? book.title : '';
  bc.innerHTML = `
    <span class="crumb" title="${escapeHtml(projTitle)}">${ICONS.folder}<span>${escapeHtml(fakeProj)}</span></span>
    <span class="sep">›</span>
    <span class="crumb" title="${escapeHtml(realTitle)}">${ICONS.fileTypeIcon(fakeName)}<span>${escapeHtml(fakeName)}</span></span>`;
}

function renderStatus() {
  const left = $('#statusLeft');
  const right = $('#statusRight');
  const t = tabs[activeTabIndex];
  if (!t) {
    left.innerHTML = `<span class="sb-item">${ICONS.check}<span>主分支 master</span></span>`;
    right.innerHTML = `<span class="sb-item">Ln 1, Col 1</span><span class="sb-item">UTF-8</span><span class="sb-item">Spaces: 4</span><span class="sb-item">TypeScript</span>`;
    return;
  }
  const book = store.books.find(b => b.id === t.bookId);
  const data = bookCache.get(t.bookId);
  const total = data ? data.chapters.length : 0;
  const idx = t.chapterIndex + 1;
  const ch = data && data.chapters[t.chapterIndex] ? data.chapters[t.chapterIndex] : { content: '' };
  const lineCount = ch.content.split('\n').length;
  const fakeName = window.DISGUISE.fakeChapterFilename(t.chapterIndex, t.bookId);
  const ext = fakeName.split('.').pop();
  const langMap = { ts: 'TypeScript', tsx: 'TypeScript JSX', js: 'JavaScript', jsx: 'JavaScript JSX', vue: 'Vue', svelte: 'Svelte' };
  const lang = langMap[ext] || 'Plain Text';
  left.innerHTML = `<span class="sb-item">${ICONS.check}<span>主分支 master</span></span><span class="sb-item">${ICONS.error}<span>0</span></span><span class="sb-item">${idx}/${total}</span>`;
  right.innerHTML = `<span class="sb-item">${book ? book.encoding : 'UTF-8'}</span><span class="sb-item">Lines: ${lineCount}</span><span class="sb-item">${lang}</span>`;
}

/* --------------------------- Navigation -------------------------------- */
async function nextChapter(delta) {
  const t = tabs[activeTabIndex];
  if (!t) return;
  const book = store.books.find(b => b.id === t.bookId);
  const data = await ensureBookLoaded(book);
  if (!data) return;
  const ni = t.chapterIndex + delta;
  if (ni < 0) { toast('已是第一章'); return; }
  if (ni >= data.chapters.length) { toast('已是最后一章'); return; }
  openChapter(t.bookId, ni);
}

/* ------------------------- Progress tracking --------------------------- */
// Scroll position is stored per-chapter so switching chapters starts at top
// unless the reader previously left a saved position in that specific chapter.
function ensureProgress(book) {
  if (!book.progress) book.progress = { chapterIndex: 0, scrollByChapter: {} };
  if (!book.progress.scrollByChapter) book.progress.scrollByChapter = {};
  return book.progress;
}
function getChapterScroll(book, chapterIndex) {
  const p = ensureProgress(book);
  return p.scrollByChapter[String(chapterIndex)] || 0;
}
function setChapterScroll(book, chapterIndex, pct) {
  const p = ensureProgress(book);
  p.scrollByChapter[String(chapterIndex)] = pct;
}

const onScrollProgress = debounce(() => {
  const t = tabs[activeTabIndex];
  if (!t) return;
  const book = store.books.find(b => b.id === t.bookId);
  if (!book) return;
  const max = SCROLL.scrollHeight - SCROLL.clientHeight;
  const pct = max > 0 ? SCROLL.scrollTop / max : 0;
  ensureProgress(book);
  book.progress.chapterIndex = t.chapterIndex;
  setChapterScroll(book, t.chapterIndex, pct);
  persistDebounced();
}, 300);

SCROLL.addEventListener('scroll', onScrollProgress, { passive: true });

/* ----------------------------- Search panel ---------------------------- */
let searchTimer = null;
let currentSearchToken = 0;

function showSidebarPanel(name) {
  $('#explorerPanel').classList.toggle('hidden', name !== 'explorer');
  $('#searchPanel').classList.toggle('hidden', name !== 'search');
}

function initSearchPanel() {
  $('#searchIcon').innerHTML = ICONS.search;
  const input = $('#searchInput');
  input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runSearch, 200);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.value = ''; runSearch(); input.blur(); }
    else if (e.key === 'Enter') {
      // Jump to first result
      const first = $('#searchResults .sr-item');
      if (first) first.click();
    }
  });
}

function openSearchPanel() {
  // Activate the search icon in the activity bar.
  $$('.ab-icon', $('#abTop')).forEach(x => x.classList.remove('active'));
  const icons = $$('.ab-icon', $('#abTop'));
  if (icons[1]) icons[1].classList.add('active');
  showSidebarPanel('search');
  if (!store.settings.sidebarVisible) toggleSidebar();
  setTimeout(() => $('#searchInput').focus(), 50);
}

const runSearch = debounce(async () => {
  const q = $('#searchInput').value.trim();
  const out = $('#searchResults');
  const countEl = $('#searchCount');
  const detailEl = $('#searchDetail');
  const myToken = ++currentSearchToken;

  if (!q) {
    out.innerHTML = '';
    countEl.textContent = '';
    detailEl.textContent = '搜索当前打开的小说';
    return;
  }

  // Search only the currently active book.
  const book = store.books.find(b => b.id === activeBookId) || (tabs[activeTabIndex] && store.books.find(b => b.id === tabs[activeTabIndex].bookId));
  if (!book) {
    out.innerHTML = '<div class="sr-empty">请先打开一本小说</div>';
    countEl.textContent = '';
    detailEl.textContent = '无打开的小说';
    return;
  }
  const data = await ensureBookLoaded(book);
  if (!data || myToken !== currentSearchToken) return;

  const ql = q.toLowerCase();
  const groups = []; // { chapterIndex, matches: [{para, idx}] }
  let totalMatches = 0;

  for (let i = 0; i < data.chapters.length; i++) {
    const ch = data.chapters[i];
    const paras = ch.content.split('\n').map(l => l.trim()).filter(Boolean);
    const matches = [];
    for (let p = 0; p < paras.length; p++) {
      const lower = paras[p].toLowerCase();
      let pos = lower.indexOf(ql);
      while (pos >= 0) {
        matches.push({ para: paras[p], idx: pos });
        pos = lower.indexOf(ql, pos + ql.length);
      }
    }
    if (matches.length) {
      groups.push({ chapterIndex: i, matches });
      totalMatches += matches.length;
    }
    // Stop early if too many matches (perf safeguard)
    if (totalMatches > 2000) break;
  }

  countEl.textContent = totalMatches > 0 ? String(totalMatches) : '';
  detailEl.textContent = totalMatches > 0
    ? `${totalMatches} 个结果 · ${groups.length} 章`
    : '无结果';

  if (groups.length === 0) {
    out.innerHTML = '<div class="sr-empty">无匹配结果</div>';
    return;
  }

  const D = window.DISGUISE;
  let html = '';
  for (const g of groups) {
    const fakeName = D.fakeChapterFilename(g.chapterIndex, book.id);
    const realTitle = data.chapters[g.chapterIndex].title;
    const icon = ICONS.fileTypeIcon(fakeName);
    // Show up to 3 matched lines per chapter
    const shown = g.matches.slice(0, 3);
    const extra = g.matches.length - shown.length;
    html += `<div class="sr-group" data-chapter="${g.chapterIndex}">`;
    html += `<div class="sr-file" data-jump="${g.chapterIndex}" title="${escapeHtml(realTitle)}">`;
    html += `<span class="sr-file-icon">${icon}</span>`;
    html += `<span class="sr-file-name">${escapeHtml(fakeName)}</span>`;
    html += `<span class="sr-file-count">${g.matches.length}</span></div>`;
    for (const m of shown) {
      const preview = makePreview(m.para, m.idx, q.length);
      html += `<div class="sr-item" data-jump="${g.chapterIndex}" data-para="${pIdx(g, m)}">${preview}</div>`;
    }
    if (extra > 0) {
      html += `<div class="sr-item" data-jump="${g.chapterIndex}" style="color:#666">…还有 ${extra} 处匹配</div>`;
    }
    html += '</div>';
  }
  out.innerHTML = html;

  // Bind clicks — jump to chapter, then scroll to first match if para known.
  $$('.sr-file, .sr-item', out).forEach(el => {
    el.addEventListener('click', (e) => {
      const ch = parseInt(el.dataset.jump, 10);
      if (isNaN(ch)) return;
      openChapter(book.id, ch);
      // If a specific paragraph match, try to scroll to it after render.
      const paraIdx = el.dataset.para;
      if (paraIdx !== undefined) {
        setTimeout(() => scrollToMatch(q), 80);
      }
    });
  });
}, 200);

// Build a preview snippet with the match highlighted.
function makePreview(text, idx, qlen) {
  const start = Math.max(0, idx - 12);
  const end = Math.min(text.length, idx + qlen + 20);
  let prefix = start > 0 ? '…' : '';
  let suffix = end < text.length ? '…' : '';
  const before = escapeHtml(text.slice(start, idx));
  const match = escapeHtml(text.slice(idx, idx + qlen));
  const after = escapeHtml(text.slice(idx + qlen, end));
  return prefix + before + '<mark>' + match + '</mark>' + after + suffix;
}

// Paragraph index inside the chapter — we just store a counter per group.
function pIdx(group, match) {
  if (!group._counter) group._counter = 0;
  return group._counter++;
}

// After jumping to a chapter, scroll to the first occurrence of the query.
function scrollToMatch(q) {
  const ql = q.toLowerCase();
  const lines = $$('.novel-line .tx', EDITOR);
  for (const ln of lines) {
    if (ln.textContent.toLowerCase().includes(ql)) {
      const rect = ln.getBoundingClientRect();
      const containerRect = SCROLL.getBoundingClientRect();
      SCROLL.scrollTop += rect.top - containerRect.top - 80;
      // Brief highlight flash
      ln.style.transition = 'background .3s';
      ln.style.background = 'rgba(255, 215, 0, .18)';
      setTimeout(() => { ln.style.background = ''; }, 1200);
      break;
    }
  }
}

/* -------------------------- Quick open (Ctrl+P) ------------------------ */
function openQuickOpen() {
  const book = store.books.find(b => b.id === activeBookId) || store.books[0];
  if (!book) { toast('请先打开一本小说'); return; }
  ensureBookLoaded(book).then(data => {
    if (!data) return;
    const box = $('#quickOpen');
    const list = $('#qoList');
    const input = $('#qoInput');
    box.classList.remove('hidden');
    input.value = '';
    input.focus();
    const items = data.chapters.map((c, i) => ({ i, title: c.title, fake: window.DISGUISE.fakeChapterFilename(i, book.id) }));
    let selected = activeChapterIndex >= 0 ? activeChapterIndex : 0;
    function render(filter) {
      const f = (filter || '').trim().toLowerCase();
      const filtered = f ? items.filter(it => it.title.toLowerCase().includes(f) || it.fake.toLowerCase().includes(f)) : items;
      list.innerHTML = '';
      filtered.slice(0, 200).forEach((it, k) => {
        const row = document.createElement('div');
        row.className = 'qo-item' + (k === 0 ? ' selected' : '');
        row.innerHTML = `<span class="qi-num">${it.i + 1}</span><span class="qi-icon">${ICONS.file}</span><span class="qi-fake">${escapeHtml(it.fake)}</span><span class="qi-real">${escapeHtml(it.title)}</span>`;
        row.addEventListener('click', () => { openChapter(book.id, it.i); closeQuickOpen(); });
        list.appendChild(row);
      });
      list._filtered = filtered;
      list._sel = 0;
    }
    render('');
    input.oninput = () => render(input.value);
    input.onkeydown = (e) => {
      const arr = list._filtered || [];
      if (e.key === 'ArrowDown') { e.preventDefault(); list._sel = Math.min(arr.length - 1, list._sel + 1); updateSel(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); list._sel = Math.max(0, list._sel - 1); updateSel(); }
      else if (e.key === 'Enter') { e.preventDefault(); const it = arr[list._sel]; if (it) { openChapter(book.id, it.i); closeQuickOpen(); } }
      else if (e.key === 'Escape') { closeQuickOpen(); }
    };
    function updateSel() { $$('.qo-item', list).forEach((r, k) => r.classList.toggle('selected', k === list._sel)); }
  });
}
function closeQuickOpen() { $('#quickOpen').classList.add('hidden'); }

/* ----------------------------- Menu bar -------------------------------- */
const MENUS = [
  { label: 'File', items: [
    { label: 'New Text File', shortcut: 'Ctrl+N', disabled: true },
    { label: 'New File...', shortcut: 'Ctrl+Alt+N', disabled: true },
    { label: 'Open File...', shortcut: 'Ctrl+O', act: 'open' },
    { label: 'Open Folder...', shortcut: 'Ctrl+K Ctrl+O', disabled: true },
    { sep: true },
    { label: 'Auto Save', disabled: true },
    { sep: true },
    { label: 'Exit', act: 'exit' },
  ]},
  { label: 'Edit', items: [
    { label: 'Undo', shortcut: 'Ctrl+Z', disabled: true },
    { label: 'Redo', shortcut: 'Ctrl+Y', disabled: true },
    { sep: true },
    { label: 'Cut', shortcut: 'Ctrl+X', disabled: true },
    { label: 'Copy', shortcut: 'Ctrl+C', disabled: true },
    { label: 'Paste', shortcut: 'Ctrl+V', disabled: true },
    { sep: true },
    { label: 'Find', shortcut: 'Ctrl+F', act: 'find' },
  ]},
  { label: 'Selection', items: [
    { label: 'Select All', shortcut: 'Ctrl+A', disabled: true },
    { label: 'Expand Selection', shortcut: 'Shift+Alt+→', disabled: true },
  ]},
  { label: 'View', items: [
    { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', act: 'palette' },
    { sep: true },
    { label: 'Toggle Side Bar', shortcut: 'Ctrl+B', act: 'toggleSidebar' },
    { label: 'Reading Mode', act: 'toggleReading', check: () => store.settings.readingMode },
    { sep: true },
    { label: 'Zoom In', shortcut: 'Ctrl+=', act: 'zoomIn' },
    { label: 'Zoom Out', shortcut: 'Ctrl+-', act: 'zoomOut' },
    { label: 'Reset Zoom', shortcut: 'Ctrl+0', act: 'zoomReset' },
  ]},
  { label: 'Go', items: [
    { label: 'Back', shortcut: 'Alt+←', act: 'prev' },
    { label: 'Forward', shortcut: 'Alt+→', act: 'next' },
    { sep: true },
    { label: 'Go to Chapter...', shortcut: 'Ctrl+P', act: 'quickOpen' },
  ]},
  { label: 'Run', items: [
    { label: 'Start Debugging', shortcut: 'F5', disabled: true },
    { label: 'Run Without Debugging', shortcut: 'Ctrl+F5', disabled: true },
  ]},
  { label: 'Terminal', items: [
    { label: 'New Terminal', shortcut: 'Ctrl+`', disabled: true },
  ]},
  { label: 'Help', items: [
    { label: 'Welcome', act: 'welcome' },
    { sep: true },
    { label: 'About', act: 'about' },
  ]},
];

function buildMenuBar() {
  const bar = $('#menubar');
  bar.innerHTML = '';
  MENUS.forEach((m, mi) => {
    const item = document.createElement('div');
    item.className = 'menu-item';
    item.textContent = m.label;
    item.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(mi, item); });
    item.addEventListener('mouseenter', () => { if ($('.menu-dropdown')) toggleMenu(mi, item); });
    bar.appendChild(item);
  });
}

function toggleMenu(mi, anchor) {
  closeMenus();
  anchor.classList.add('open');
  const layer = $('#menuLayer');
  layer.classList.remove('hidden');
  const dd = document.createElement('div');
  dd.className = 'menu-dropdown';
  const rect = anchor.getBoundingClientRect();
  dd.style.left = rect.left + 'px';
  dd.style.top = rect.bottom + 'px';
  const m = MENUS[mi];
  m.items.forEach(it => {
    if (it.sep) { const s = document.createElement('div'); s.className = 'menu-sep'; dd.appendChild(s); return; }
    const row = document.createElement('div');
    row.className = 'menu-row' + (it.disabled ? ' disabled' : '');
    if (it.check && it.check()) row.classList.add('checked');
    row.innerHTML = `<span>${it.label}</span>${it.shortcut ? `<span class="shortcut">${it.shortcut}</span>` : ''}`;
    if (!it.disabled) row.addEventListener('click', () => { closeMenus(); handleMenuAct(it.act); });
    dd.appendChild(row);
  });
  layer.appendChild(dd);
}
function closeMenus() {
  $('#menuLayer').classList.add('hidden');
  $('#menuLayer').innerHTML = '';
  $$('.menu-item').forEach(m => m.classList.remove('open'));
}

function handleMenuAct(act) {
  switch (act) {
    case 'open': pickAndAddBooks(); break;
    case 'exit': window.close(); break;
    case 'find': openSearchPanel(); break;
    case 'palette': openQuickOpen(); break;
    case 'toggleSidebar': toggleSidebar(); break;
    case 'toggleReading': store.settings.readingMode = !store.settings.readingMode; EDITOR.classList.toggle('reading-mode', store.settings.readingMode); persistDebounced(); toast(store.settings.readingMode ? '阅读模式' : '代码模式'); break;
    case 'zoomIn': zoom(1); break;
    case 'zoomOut': zoom(-1); break;
    case 'zoomReset': store.settings.fontSize = 14; renderEditor(); break;
    case 'prev': nextChapter(-1); break;
    case 'next': nextChapter(1); break;
    case 'quickOpen': openQuickOpen(); break;
    case 'welcome': showWelcome(); break;
    case 'about': toast('SlackerVSCode 1.0 — 仅供摸鱼使用'); break;
  }
}

/* ------------------------------ Sidebar -------------------------------- */
function toggleSidebar() {
  const sb = $('#sidebar');
  const visible = store.settings.sidebarVisible;
  store.settings.sidebarVisible = !visible;
  sb.style.display = store.settings.sidebarVisible ? 'flex' : 'none';
  $('#sash').style.display = store.settings.sidebarVisible ? 'block' : 'none';
  persistDebounced();
}

/* ------------------------------- Zoom ---------------------------------- */
function zoom(dir) {
  store.settings.fontSize = Math.max(10, Math.min(28, (store.settings.fontSize || 14) + dir));
  renderEditor();
  persistDebounced();
}

/* --------------------------- Activity bar ------------------------------ */
function buildActivityBar() {
  const top = $('#abTop');
  const items = [
    { key: 'explorer', icon: 'explorer', tip: '书架 Explorer' },
    { key: 'search', icon: 'search', tip: '搜索 Search' },
    { key: 'scm', icon: 'scm', tip: '源代码管理 Source Control' },
    { key: 'run', icon: 'run', tip: '运行和调试 Run and Debug' },
    { key: 'extensions', icon: 'extensions', tip: '扩展 Extensions' },
  ];
  items.forEach((it, i) => {
    const el = document.createElement('div');
    el.className = 'ab-icon' + (i === 0 ? ' active' : '');
    el.innerHTML = ICONS[it.icon];
    el.title = it.tip;
    el.addEventListener('click', () => {
      if (it.key !== 'explorer' && it.key !== 'search') { toast('摸鱼模式下该面板已禁用 :)'); return; }
      $$('.ab-icon', top).forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      if (it.key === 'explorer') {
        showSidebarPanel('explorer');
        if (!store.settings.sidebarVisible) toggleSidebar();
      } else if (it.key === 'search') {
        showSidebarPanel('search');
        if (!store.settings.sidebarVisible) toggleSidebar();
        setTimeout(() => $('#searchInput').focus(), 50);
      }
    });
    top.appendChild(el);
  });
  const bottom = $('#abBottom');
  const acct = document.createElement('div');
  acct.className = 'ab-icon';
  acct.innerHTML = ICONS.account;
  acct.title = '账户';
  acct.addEventListener('click', () => toast('摸鱼不需要登录 :)'));
  const gear = document.createElement('div');
  gear.className = 'ab-icon';
  gear.innerHTML = ICONS.settings;
  gear.title = '管理 设置';
  gear.addEventListener('click', () => handleMenuAct('toggleReading'));
  bottom.appendChild(acct);
  bottom.appendChild(gear);
}

/* ------------------------------ Sidebar UI ----------------------------- */
function buildSidebarActions() {
  const root = $('#sbActions');
  root.innerHTML = '';
  const add = document.createElement('span');
  add.className = 'icon-btn';
  add.innerHTML = ICONS.add;
  add.title = '打开小说';
  add.addEventListener('click', pickAndAddBooks);
  const refresh = document.createElement('span');
  refresh.className = 'icon-btn';
  refresh.innerHTML = ICONS.refresh;
  refresh.title = '刷新';
  refresh.addEventListener('click', () => { bookCache.clear(); renderBookshelf(); toast('已刷新书架'); });
  root.appendChild(add);
  root.appendChild(refresh);
}

/* ------------------------------ Sash drag ------------------------------ */
function initSash() {
  const sash = $('#sash');
  const sb = $('#sidebar');
  let dragging = false;
  let startX = 0, startW = 0;
  sash.addEventListener('mousedown', (e) => {
    dragging = true; startX = e.clientX; startW = sb.offsetWidth;
    sash.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    let w = startW + (e.clientX - startX);
    w = Math.max(170, Math.min(560, w));
    sb.style.width = w + 'px';
    sb.style.flex = '0 0 ' + w + 'px';
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false; sash.classList.remove('dragging');
    document.body.style.cursor = '';
    persistDebounced();
  });
}

/* --------------------------- Welcome buttons --------------------------- */
function bindWelcome() {
  $$('.wa').forEach(btn => btn.addEventListener('click', () => {
    const act = btn.dataset.act;
    if (act === 'open' || act === 'clone') pickAndAddBooks();
  }));
}

/* ----------------------------- Keybindings ----------------------------- */
function initKeys() {
  document.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key.toLowerCase() === 'o') { e.preventDefault(); pickAndAddBooks(); }
    else if (ctrl && e.key.toLowerCase() === 'p') { e.preventDefault(); openQuickOpen(); }
    else if (ctrl && e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); openQuickOpen(); }
    else if (ctrl && e.key.toLowerCase() === 'f') { e.preventDefault(); openSearchPanel(); }
    else if (ctrl && e.key.toLowerCase() === 'b') { e.preventDefault(); toggleSidebar(); }
    else if (ctrl && (e.key === '=' || e.key === '+')) { e.preventDefault(); zoom(1); }
    else if (ctrl && e.key === '-') { e.preventDefault(); zoom(-1); }
    else if (ctrl && e.key === '0') { e.preventDefault(); store.settings.fontSize = 14; renderEditor(); }
    else if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); nextChapter(-1); }
    else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); nextChapter(1); }
    else if (e.key === 'Escape') { closeQuickOpen(); closeMenus(); }
  });
}

/* -------------------------------- Logo --------------------------------- */
function setLogo() {
  // A VS Code-like blue angular mark built from SVG.
  const logo = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path fill="#0e7fd6" d="M75 8 L92 16 L92 84 L75 92 L40 60 L18 78 L10 72 L30 50 L10 28 L18 22 L40 40 Z"/>
    <path fill="#fff" d="M75 24 L52 44 L62 50 L75 60 Z" opacity=".9"/>
  </svg>`;
  $('#tbLogo').innerHTML = logo;
  const w = $('#welcomeLogo');
  if (w) w.innerHTML = logo;
}

/* -------------------------- Window controls ---------------------------- */
function initWindowControls() {
  $('#wcMin').addEventListener('click', () => window.api.window.minimize());
  $('#wcMax').addEventListener('click', () => window.api.window.maximize());
  $('#wcClose').addEventListener('click', () => window.api.window.close());
}

/* ------------------------- Editor context menu ------------------------- */
// Right-click on selected novel text -> "在 Web 中搜索" opens Bing in the
// system default browser with the selected text as the query.
let lastSelectedText = ''; // cached at contextmenu time, used on menu click

function getSelectionText() {
  const sel = window.getSelection();
  return sel ? sel.toString().trim() : '';
}

function hideContextMenu() {
  $('#contextMenu').classList.add('hidden');
}

function showContextMenu(x, y, text) {
  const menu = $('#contextMenu');
  const queryEl = $('#cmQuery');
  const searchRow = menu.querySelector('[data-act="searchWeb"]');
  const copyRow = menu.querySelector('[data-act="copy"]');

  // Truncate the displayed query for layout sanity.
  const display = text.length > 28 ? text.slice(0, 28) + '…' : text;
  queryEl.textContent = display;
  searchRow.classList.add('search-row');
  searchRow.classList.remove('disabled');
  copyRow.classList.remove('disabled');

  // Position the menu; flip to left/top if it would overflow the viewport.
  menu.classList.remove('hidden');
  const rect = menu.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  let left = x, top = y;
  if (left + rect.width > vw - 4) left = Math.max(4, vw - rect.width - 4);
  if (top + rect.height > vh - 4) top = Math.max(4, vh - rect.height - 4);
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
}

function initContextMenu() {
  const menu = $('#contextMenu');

  // Right-click inside the editor (only on novel text lines).
  EDITOR.addEventListener('contextmenu', (e) => {
    const text = getSelectionText();
    if (!text) return; // no selection -> let the default browser menu show
    e.preventDefault();
    lastSelectedText = text;
    showContextMenu(e.clientX, e.clientY, text);
  });

  // Menu item clicks.
  menu.addEventListener('click', (e) => {
    const row = e.target.closest('.menu-row');
    if (!row) return;
    const act = row.dataset.act;
    // Prefer live selection; fall back to the cached text from contextmenu.
    const text = getSelectionText() || lastSelectedText;
    hideContextMenu();
    if (act === 'copy') {
      if (text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(() => {});
        } else {
          const ta = document.createElement('textarea');
          ta.value = text; document.body.appendChild(ta);
          ta.select(); try { document.execCommand('copy'); } catch (_) {}
          ta.remove();
        }
        toast('已复制');
      }
    } else if (act === 'searchWeb') {
      if (!text) return;
      const url = 'https://www.bing.com/search?q=' + encodeURIComponent(text);
      window.api.shell.openExternal(url).then((ok) => {
        if (!ok) toast('打开浏览器失败');
      });
    }
  });

  // Click anywhere outside the menu closes it.
  document.addEventListener('click', (e) => {
    if (!menu.classList.contains('hidden') && !e.target.closest('#contextMenu')) {
      hideContextMenu();
    }
  });
  document.addEventListener('scroll', hideContextMenu, true);
}

/* ------------------------------ Initialize ----------------------------- */
async function init() {
  setLogo();
  buildMenuBar();
  buildActivityBar();
  buildSidebarActions();
  initSash();
  initKeys();
  initWindowControls();
  initSearchPanel();
  initContextMenu();
  $('#sbTitle').textContent = 'EXPLORER';
  $('#statusLeft').innerHTML = `<span class="sb-item">${ICONS.check}<span>主分支 master</span></span>`;
  $('#statusRight').innerHTML = `<span class="sb-item">Ln 1, Col 1</span><span class="sb-item">UTF-8</span>`;
  // click outside menus closes them
  document.addEventListener('click', closeMenus);
  $('#menuLayer').addEventListener('click', closeMenus);
  // sidebar action delegation
  $('#bookshelf').addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) { e.stopPropagation(); removeBook(del.dataset.del); return; }
    const add = e.target.closest('[data-act="add"]');
    if (add) { pickAndAddBooks(); return; }
    const item = e.target.closest('[data-book]');
    if (item) {
      const id = item.dataset.book;
      if (activeBookId === id) {
        activeBookId = null;
      } else {
        activeBookId = id;
        const book = store.books.find(b => b.id === id);
        if (book && book.progress) {
          // Open last-read chapter on expand
        }
      }
      renderBookshelf();
      return;
    }
    const childItem = e.target.closest('.tree-children .tree-item');
    // chapter clicks handled by their own listeners
  });

  // Load persisted store
  store = await window.api.store.load();
  if (!store.books) store.books = [];
  if (!store.settings) store.settings = {};
  store.settings = Object.assign({ fontSize: 14, sidebarWidth: 260, sidebarVisible: true, readingMode: false }, store.settings);
  // apply sidebar width / visibility
  $('#sidebar').style.width = store.settings.sidebarWidth + 'px';
  $('#sidebar').style.flex = '0 0 ' + store.settings.sidebarWidth + 'px';
  if (store.settings.sidebarVisible === false) { $('#sidebar').style.display = 'none'; $('#sash').style.display = 'none'; }
  EDITOR.style.fontSize = (store.settings.fontSize || 14) + 'px';
  EDITOR.classList.toggle('reading-mode', !!store.settings.readingMode);

  renderBookshelf();
  // Restore last reading session
  if (store.books.length) {
    const last = [...store.books].sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0))[0];
    activeBookId = last.id;
    renderBookshelf();
    if (last.progress && last.progress.chapterIndex != null) {
      openChapter(last.id, last.progress.chapterIndex);
    } else {
      showWelcome();
    }
  } else {
    showWelcome();
  }
  bindWelcome();
}

window.addEventListener('DOMContentLoaded', init);
