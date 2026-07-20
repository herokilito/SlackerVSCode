import { app, BrowserWindow, Menu } from 'electron'
import path from 'path'
import { registerIpc } from './ipc'

// Store all app data next to the executable: portable + leaves no traces in
// the user profile (handy for a 摸鱼 tool) and works under restricted sandboxes.
app.setPath('userData', path.join(__dirname, '..', '..', '.userdata'))

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
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
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  })

  // In dev mode electron-vite serves the renderer; in production load the built file.
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'out', 'renderer', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  // Keep the in-app menu minimal; the renderer draws its own menu bar.
  Menu.setApplicationMenu(null)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
