import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import { decodeBuffer } from './decode'

/** Persistent JSON store (books + settings + progress).
 *  Computed lazily so app.setPath('userData', ...) in index.ts takes effect
 *  (ES module imports are hoisted, so a top-level const would run before setPath).
 */
function getStorePath(): string {
  return path.join(app.getPath('userData'), 'slacker-store.json')
}

function loadStore(): AppStore {
  try {
    const storePath = getStorePath()
    if (fs.existsSync(storePath)) {
      return JSON.parse(fs.readFileSync(storePath, 'utf8'))
    }
  } catch (e) {
    console.error('Failed to load store:', e)
  }
  return { books: [], settings: {} }
}

function saveStore(data: AppStore): void {
  try {
    const storePath = getStorePath()
    fs.mkdirSync(path.dirname(storePath), { recursive: true })
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf8')
  } catch (e) {
    console.error('Failed to save store:', e)
  }
}

export function registerIpc(): void {
  /* ------------------------------- IPC: store ----------------------------- */
  ipcMain.handle('store:load', () => loadStore())
  ipcMain.handle('store:save', (_evt, data: AppStore) => {
    saveStore(data)
    return true
  })
  // Synchronous save — used in beforeunload so the window doesn't close
  // before the write finishes.
  ipcMain.on('store:save-sync', (evt, data: AppStore) => {
    saveStore(data)
    evt.returnValue = true
  })

  /* ------------------------------ IPC: dialogs ---------------------------- */
  ipcMain.handle('dialog:openBook', async () => {
    const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow()!, {
      title: 'Open File',
      defaultPath: app.getPath('documents'),
      filters: [
        { name: 'Text', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile', 'multiSelections']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths
  })

  /* --------------------------- IPC: read txt file ------------------------- */
  ipcMain.handle('book:read', (_evt, filePath: string): BookReadResult => {
    try {
      const buffer = fs.readFileSync(filePath)
      const { text, encoding } = decodeBuffer(buffer)
      const stat = fs.statSync(filePath)
      return { ok: true, text, encoding, size: stat.size, mtime: stat.mtimeMs }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  /* --------------------------- IPC: window control ------------------------ */
  ipcMain.handle('window:minimize', () => {
    const w = BrowserWindow.getFocusedWindow()
    if (w) w.minimize()
  })
  ipcMain.handle('window:maximize', () => {
    const w = BrowserWindow.getFocusedWindow()
    if (!w) return false
    if (w.isMaximized()) {
      w.unmaximize()
      return false
    }
    w.maximize()
    return true
  })
  ipcMain.handle('window:close', () => {
    const w = BrowserWindow.getFocusedWindow()
    if (w) w.close()
  })
  ipcMain.handle('window:isMaximized', () => {
    const w = BrowserWindow.getFocusedWindow()
    return !!(w && w.isMaximized())
  })

  /* --------------------------- IPC: open in browser ----------------------- */
  ipcMain.handle('shell:openExternal', (_evt, url: string) => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return false
    shell.openExternal(url)
    return true
  })
}

/* ----------------------------- Shared types ----------------------------- */
export interface BookRecord {
  id: string
  title: string
  filePath: string
  addedAt: number
  lastReadAt: number
  encoding?: string
  size?: number
  mtime?: number
  chapterCount?: number
  progress: { chapterIndex: number; scrollByChapter?: Record<string, number> }
}

export interface AppStore {
  books: BookRecord[]
  settings: {
    fontSize?: number
    sidebarWidth?: number
    sidebarVisible?: boolean
    readingMode?: boolean
  }
}

export interface BookReadResult {
  ok: boolean
  text?: string
  encoding?: string
  size?: number
  mtime?: number
  error?: string
}
