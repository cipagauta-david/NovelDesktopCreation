const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const fs = require('fs/promises')
const path = require('path')

const APP_STATE_PATH = path.join(app.getPath('userData'), 'workspace-state.json')

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1560,
    height: 980,
    minWidth: 1100,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
    return
  }

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

ipcMain.handle('novel:fs:save-file', async (_event, payload) => {
  const response = await dialog.showSaveDialog({
    defaultPath: payload.filename,
    filters: [{ name: 'JSON', extensions: ['json'] }, { name: 'Text', extensions: ['txt', 'md'] }, { name: 'All', extensions: ['*'] }],
  })
  if (response.canceled || !response.filePath) {
    return false
  }
  await fs.writeFile(response.filePath, payload.content, 'utf8')
  return true
})

ipcMain.handle('novel:fs:pick-text-file', async (_event, payload) => {
  const response = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Import', extensions: ['json', 'txt', 'md'] }],
  })
  if (response.canceled || response.filePaths.length === 0) {
    return null
  }
  const filePath = response.filePaths[0]
  const content = await fs.readFile(filePath, 'utf8')
  return content
})

ipcMain.handle('novel:state:init', async () => true)
ipcMain.handle('novel:state:save', async (_event, state) => {
  await fs.writeFile(APP_STATE_PATH, JSON.stringify(state), 'utf8')
  return true
})
ipcMain.handle('novel:state:load', async () => {
  try {
    const content = await fs.readFile(APP_STATE_PATH, 'utf8')
    return JSON.parse(content)
  } catch {
    return null
  }
})
ipcMain.handle('novel:state:clear', async () => {
  try {
    await fs.rm(APP_STATE_PATH, { force: true })
  } catch {
    // ignore
  }
  return true
})

app.whenReady().then(() => {
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
