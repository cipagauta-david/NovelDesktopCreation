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
})
