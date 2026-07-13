const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const iconv = require('iconv-lite');

// Store all app data next to the executable: portable + leaves no traces in
// the user profile (handy for a 摸鱼 tool) and works under restricted sandboxes.
app.setPath('userData', path.join(__dirname, '.userdata'));

// Path to the persistent JSON store (books + settings + progress)
const storePath = path.join(app.getPath('userData'), 'slacker-store.json');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 720,
    minHeight: 480,
    show: false,
    backgroundColor: '#1e1e1e',
    title: 'Visual Studio Code',
    // Frameless custom title bar — we draw our own window controls.
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Keep the in-app menu minimal; the renderer draws its own menu bar.
  Menu.setApplicationMenu(null);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/* --------------------------- Window controls ----------------------------- */

ipcMain.handle('window:minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) { mainWindow.unmaximize(); return false; }
  mainWindow.maximize(); return true;
});
ipcMain.handle('window:close', () => { if (mainWindow) mainWindow.close(); });
ipcMain.handle('window:isMaximized', () => !!(mainWindow && mainWindow.isMaximized()));

/* ----------------------------- Storage helpers ---------------------------- */

function loadStore() {
  try {
    if (fs.existsSync(storePath)) {
      return JSON.parse(fs.readFileSync(storePath, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to load store:', e);
  }
  return { books: [], settings: {} };
}

function saveStore(data) {
  try {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save store:', e);
  }
}

/* ------------------------------- IPC: store ------------------------------- */

ipcMain.handle('store:load', () => loadStore());
ipcMain.handle('store:save', (_evt, data) => { saveStore(data); return true; });

/* ------------------------------ IPC: dialogs ------------------------------ */

ipcMain.handle('dialog:openBook', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open File',
    defaultPath: app.getPath('documents'),
    filters: [
      { name: 'Text', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile', 'multiSelections']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths;
});

/* --------------------------- IPC: read txt file --------------------------- */

function decodeBuffer(buffer) {
  // Strip BOM
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return { text: buffer.slice(3).toString('utf8'), encoding: 'UTF-8' };
  }
  // Try UTF-8; if it has replacement chars, fall back to GBK (common for CN novels)
  const utf8 = buffer.toString('utf8');
  if (!/\uFFFD/.test(utf8)) return { text: utf8, encoding: 'UTF-8' };
  return { text: iconv.decode(buffer, 'gbk'), encoding: 'GBK' };
}

ipcMain.handle('book:read', (_evt, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    const { text, encoding } = decodeBuffer(buffer);
    const stat = fs.statSync(filePath);
    return {
      ok: true,
      text,
      encoding,
      size: stat.size,
      mtime: stat.mtimeMs
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});
