const { contextBridge, ipcRenderer } = require('electron');

// Secure bridge between renderer and main process.
contextBridge.exposeInMainWorld('api', {
  store: {
    load: () => ipcRenderer.invoke('store:load'),
    save: (data) => ipcRenderer.invoke('store:save', data)
  },
  dialog: {
    openBook: () => ipcRenderer.invoke('dialog:openBook')
  },
  book: {
    read: (filePath) => ipcRenderer.invoke('book:read', filePath)
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized')
  }
});
