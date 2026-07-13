'use strict';
/* Disguise helpers: turn novel content into a VS-Code-like source file view. */

/* --------------------------- Deterministic RNG -------------------------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

/* ----------------------- Fake chapter filenames ------------------------- */
function fakeChapterFilename(chapterIndex, bookId) {
  const rng = mulberry32(hashStr(bookId + ':ch:' + chapterIndex));
  const num = String(chapterIndex + 1).padStart(2, '0');
  const prefixes = ['chapter', 'ch', 'module', 'section', 'part', 'step', 'stage', 'phase', 'page', 'view'];
  const names = ['handler', 'parser', 'processor', 'service', 'controller', 'manager', 'utils', 'helper', 'model', 'config', 'index', 'main', 'core', 'base', 'types', 'impl', 'spec', 'test', 'route', 'store', 'hook', 'provider'];
  const exts = ['ts', 'tsx', 'js', 'jsx', 'vue', 'svelte'];
  const prefix = prefixes[Math.floor(rng() * prefixes.length)];
  const useName = rng() > 0.35;
  const name = useName ? names[Math.floor(rng() * names.length)] : '';
  const ext = exts[Math.floor(rng() * exts.length)];
  const sep1 = rng() > 0.5 ? '' : '_';
  const sep2 = useName ? (rng() > 0.5 ? '_' : '-') : '';
  return prefix + sep1 + num + sep2 + name + '.' + ext;
}

/* ----------------------- Fake subdirectory names ------------------------ */
// Realistic project directory names; deterministic per (bookId, groupIndex).
const DIR_WORDS = [
  'src', 'lib', 'core', 'utils', 'components', 'modules', 'services', 'handlers',
  'routes', 'models', 'types', 'config', 'tests', 'specs', 'assets', 'views',
  'pages', 'features', 'plugins', 'api', 'app', 'common', 'shared', 'internal',
  'pkg', 'cmd', 'db', 'auth', 'middleware', 'helpers', 'controllers', 'hooks',
  'stores', 'schemas', 'migrations', 'fixtures', 'mocks', 'scripts', 'tools',
  'build', 'public', 'static', 'templates', 'layouts', 'locales', 'styles',
  'directives', 'pipes', 'guards', 'interceptors', 'entities', 'dto', 'vo'
];
function fakeDirName(bookId, groupIndex) {
  const rng = mulberry32(hashStr(bookId + ':dir:' + groupIndex));
  return DIR_WORDS[Math.floor(rng() * DIR_WORDS.length)];
}

/* --------------------- File extension extraction ------------------------ */
function getExt(filename) {
  return (filename.split('.').pop() || '').toLowerCase();
}

/* --------------------------- Fake code blocks --------------------------- */
const IMPORT_LINES = [
  "import { readFile, writeFile } from 'fs/promises';",
  "import { parse, stringify } from './parser';",
  "import { Config, Options } from './types';",
  "import { Logger } from './logger';",
  "import { validate } from './validator';",
  "import { Database } from './database';",
  "import { EventEmitter } from 'events';",
  "import { Client } from './client';",
  "import { transform } from './transformer';",
  "import { pipeline } from './pipeline';",
  "import { cache } from './cache';",
  "import { Model } from './model';",
  "import { request } from 'https';",
  "import { join, resolve } from 'path';",
  "import { createContext } from './context';",
];

const CODE_BLOCKS = [
  ["  const config = {", "    timeout: 3000,", "    retries: 5,", "    enabled: true", "  };"],
  ["  for (const item of items) {", "    if (item.status === 'active') {", "      process(item);", "    }", "  }"],
  ["  const result = await api.getData(params);", "  if (!result.success) {", "    throw new Error(result.message);", "  }", "  return result.data;"],
  ["  const map = new Map<string, User>();", "  users.forEach(u => map.set(u.id, u));", "  return map;"],
  ["  try {", "    const res = await fetch(url);", "    return await res.json();", "  } catch (e) {", "    console.error(e);", "    return null;", "  }"],
  ["  const filtered = data", "    .filter(x => x.active)", "    .map(x => ({ id: x.id, name: x.name }));"],
  ["  if (typeof value !== 'string') {", "    throw new TypeError('Expected string');", "  }"],
  ["  class Handler extends Base {", "    constructor(opts) {", "      super(opts);", "      this.queue = [];", "    }", "  }"],
  ["  switch (state) {", "    case 'init':", "      return bootstrap();", "    case 'ready':", "      return run();", "    default:", "      return null;", "  }"],
  ["  const timer = setTimeout(() => {", "    callback(null, 'done');", "  }, 1000);"],
  ["  const buf = Buffer.from(input, 'utf8');", "  const hash = createHash('sha256').update(buf).digest('hex');"],
  ["  let total = 0;", "  for (let i = 0; i < rows.length; i++) {", "    total += rows[i].amount;", "  }", "  return total;"],
  ["  const stream = createReadStream(path);", "  stream.on('data', chunk => buffer.push(chunk));", "  stream.on('end', () => resolve(Buffer.concat(buffer)));"],
  ["  Object.keys(config).forEach(key => {", "    if (config[key] === undefined) {", "      delete config[key];", "    }", "  });"],
  ["  const promise = new Promise((resolve, reject) => {", "    exec(cmd, (err, stdout) => {", "      if (err) reject(err);", "      else resolve(stdout);", "    });", "  });"],
  ["  return items.reduce((acc, item) => {", "    return acc.concat(item.children);", "  }, []);"],
  ["  interface Result<T> {", "    data: T;", "    error: string | null;", "    status: number;", "  }"],
  ["  const ctx = createContext(options);", "  const output = await pipeline(ctx);", "  ctx.dispose();"],
  ["  const deferred = defer();", "  queue.push(deferred);", "  return deferred.promise;"],
  ["  if (!Array.isArray(list)) {", "    return [];", "  }", "  return list.sort((a, b) => a.priority - b.priority);"],
  ["  const keys = Object.keys(target);", "  const picked = keys.filter(k => k.startsWith('_'));"],
  ["  async function load(path) {", "    const raw = await readFile(path, 'utf8');", "    return parse(raw);", "  }"],
  ["  const emitter = new EventEmitter();", "  emitter.on('update', handleChange);", "  emitter.on('error', handleError);"],
  ["  const validated = validate(schema, input);", "  if (!validated.valid) {", "    return { errors: validated.errors };", "  }"],
  ["  while (queue.length > 0) {", "    const task = queue.shift();", "    await task.run();", "  }"],
  ["  const id = crypto.randomUUID();", "  const record = { id, createdAt: Date.now() };", "  store.set(id, record);"],
  ["  const entries = Object.entries(env).filter(([k]) => k.startsWith('APP_'));"],
  ["  export function create(opts) {", "    const instance = Object.create(proto);", "    instance.init(opts);", "    return instance;", "  }"],
];

function pickImports(rng, count) {
  const out = [];
  const pool = [...IMPORT_LINES];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function pickCodeBlock(rng) {
  return CODE_BLOCKS[Math.floor(rng() * CODE_BLOCKS.length)].slice();
}

/* ------------------------- Syntax highlighting -------------------------- */
const KEYWORDS = /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|super|this|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|void|delete|yield|static|get|set|public|private|protected|readonly|interface|type|enum|namespace|declare|abstract|implements|true|false|null|undefined)\b/g;

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function highlightCode(line) {
  // Tokenize: strings, comments, then code segments.
  const tokens = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '/' && line[i + 1] === '/') {
      tokens.push({ t: 'com', v: line.slice(i) });
      break;
    }
    const ch = line[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < line.length && line[j] !== ch) { if (line[j] === '\\') j++; j++; }
      tokens.push({ t: 'str', v: line.slice(i, Math.min(j + 1, line.length)) });
      i = j + 1;
      continue;
    }
    let next = line.length;
    for (const m of ['//', '"', "'", '`']) {
      const idx = line.indexOf(m, i);
      if (idx >= 0 && idx < next) next = idx;
    }
    tokens.push({ t: 'code', v: line.slice(i, next) });
    i = next;
  }
  return tokens.map(tok => {
    const esc = escapeHtml(tok.v);
    if (tok.t === 'str') return '<span class="tok-str">' + esc + '</span>';
    if (tok.t === 'com') return '<span class="tok-com">' + esc + '</span>';
    let s = esc;
    s = s.replace(KEYWORDS, '<span class="tok-kw">$1</span>');
    s = s.replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, '<span class="tok-type">$1</span>');
    s = s.replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-num">$1</span>');
    s = s.replace(/\b([a-z_][a-zA-Z0-9_]*)\s*(?=\()/g, '<span class="tok-fn">$1</span>');
    return s;
  }).join('');
}

/* --------------- Build disguised line list for a chapter ---------------- */
// Returns: [{ kind: 'header'|'code'|'comment', text: string }]
function buildDisguisedLines(bookId, chapterIndex, chapter) {
  const rng = mulberry32(hashStr(bookId + ':render:' + chapterIndex));
  const out = [];

  // Import lines at the top — looks like a real source file.
  pickImports(rng, 1 + Math.floor(rng() * 2)).forEach(l => out.push({ kind: 'code', text: l }));

  // Chapter title as a comment block header.
  const bar = '// ' + '='.repeat(48);
  out.push({ kind: 'header', text: bar });
  out.push({ kind: 'header', text: '// ' + chapter.title });
  out.push({ kind: 'header', text: bar });
  out.push({ kind: 'code', text: '' });

  // Initial fake code block.
  pickCodeBlock(rng).forEach(l => out.push({ kind: 'code', text: l }));

  // Novel paragraphs as comments, with fake code between them.
  const paras = chapter.content.split('\n').map(l => l.trim()).filter(Boolean);
  let sinceLastCode = 0;
  for (let i = 0; i < paras.length; i++) {
    out.push({ kind: 'comment', text: '// ' + paras[i] });
    sinceLastCode++;
    // Insert a code block every 1-3 paragraphs (but not after the last one).
    if (i < paras.length - 1 && sinceLastCode >= 1 + Math.floor(rng() * 3)) {
      out.push({ kind: 'code', text: '' });
      pickCodeBlock(rng).forEach(l => out.push({ kind: 'code', text: l }));
      sinceLastCode = 0;
    }
  }
  return out;
}

window.DISGUISE = { fakeChapterFilename, fakeDirName, getExt, buildDisguisedLines, highlightCode, escapeHtml };
