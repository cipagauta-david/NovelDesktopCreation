const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('__NOVEL_DESKTOP__', {
  platform: 'desktop',
  fs: {
    saveFile: (payload) => ipcRenderer.invoke('novel:fs:save-file', payload),
    pickTextFile: (payload) => ipcRenderer.invoke('novel:fs:pick-text-file', payload),
  },
  stateStorage: {
    init: () => ipcRenderer.invoke('novel:state:init'),
    saveState: (state) => ipcRenderer.invoke('novel:state:save', state),
    loadState: () => ipcRenderer.invoke('novel:state:load'),
    clearState: () => ipcRenderer.invoke('novel:state:clear'),
  },
  syncStorage: {
    init: () => ipcRenderer.invoke('novel:sync:init'),
    readQueue: () => ipcRenderer.invoke('novel:sync:read-queue'),
    writeQueue: (queue) => ipcRenderer.invoke('novel:sync:write-queue', queue),
    readLastState: () => ipcRenderer.invoke('novel:sync:read-last-state'),
    writeLastState: (state) => ipcRenderer.invoke('novel:sync:write-last-state', state),
    clear: () => ipcRenderer.invoke('novel:sync:clear'),
  },
  search: {
    ftsSearch: (payload) => ipcRenderer.invoke('novel:search:fts', payload),
  },
})
