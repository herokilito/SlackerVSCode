import { contextBridge, ipcRenderer } from 'electron'

// Secure bridge between renderer and main process.
contextBridge.exposeInMainWorld('api', {
  store: {
    load: () => ipcRenderer.invoke('store:load'),
    save: (data: unknown) => ipcRenderer.invoke('store:save', data),
    saveSync: (data: unknown) => ipcRenderer.sendSync('store:save-sync', data)
  },
  dialog: {
    openBook: () => ipcRenderer.invoke('dialog:openBook')
  },
  book: {
    read: (filePath: string) => ipcRenderer.invoke('book:read', filePath)
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized')
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url)
  }
})

export type ElectronAPI = typeof window.api
