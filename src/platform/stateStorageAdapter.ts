import type { PersistedState } from '../types/workspace'

type DesktopWorkerBridge = {
  platform?: 'desktop'
  stateStorage?: {
    init?: () => Promise<void>
    saveState?: (state: PersistedState) => Promise<void>
    loadState?: () => Promise<PersistedState | null>
    clearState?: () => Promise<void>
  }
}

type PersistedStateRecord = {
  id: string
  value: PersistedState
}

export type StateStorageAdapter = {
  runtime: 'web' | 'desktop'
  init: () => Promise<void>
  saveState: (state: PersistedState) => Promise<void>
  loadState: () => Promise<PersistedState | null>
  clearState: () => Promise<void>
}

const DB_NAME = 'novel-desktop-worker-db'
const DB_VERSION = 1
const STATE_STORE = 'workspace-state'
const STATE_ID = 'latest'

function getDesktopBridge(): DesktopWorkerBridge | undefined {
  return (globalThis as { __NOVEL_DESKTOP__?: DesktopWorkerBridge }).__NOVEL_DESKTOP__
}

// Verificar si estamos en contexto de Web Worker (no tiene acceso a window)
function isInWebWorker(): boolean {
  try {
    // Web Workers no tienen acceso a window
    return typeof window === 'undefined'
  } catch {
    return true
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function createWebIndexedDbAdapter(): StateStorageAdapter {
  return {
    runtime: 'web',
    async init() {
      if (typeof indexedDB === 'undefined') {
        return
      }
      const db = await openDatabase()
      db.close()
    },
    async saveState(state: PersistedState) {
      if (typeof indexedDB === 'undefined') {
        return
      }
      const db = await openDatabase()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STATE_STORE, 'readwrite')
        tx.objectStore(STATE_STORE).put({ id: STATE_ID, value: state } satisfies PersistedStateRecord)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
      db.close()
    },
    async loadState() {
      if (typeof indexedDB === 'undefined') {
        return null
      }
      const db = await openDatabase()
      const state = await new Promise<PersistedState | null>((resolve, reject) => {
        const tx = db.transaction(STATE_STORE, 'readonly')
        const request = tx.objectStore(STATE_STORE).get(STATE_ID)
        request.onsuccess = () => {
          const record = request.result as PersistedStateRecord | undefined
          resolve(record?.value ?? null)
        }
        request.onerror = () => reject(request.error)
        tx.onabort = () => reject(tx.error)
      })
      db.close()
      return state
    },
    async clearState() {
      if (typeof indexedDB === 'undefined') {
        return
      }
      const db = await openDatabase()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STATE_STORE, 'readwrite')
        tx.objectStore(STATE_STORE).delete(STATE_ID)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
      db.close()
    },
  }
}

function createDesktopAdapter(bridge: DesktopWorkerBridge): StateStorageAdapter {
  // Desktop usa IPC channels para SQLite en main process
  const ipcBridge = bridge as DesktopWorkerBridge & {
    stateStorage?: {
      init?: () => Promise<void>
      saveState?: (state: PersistedState) => Promise<void>
      loadState?: () => Promise<PersistedState | null>
      clearState?: () => Promise<void>
    }
  }

  // En Web Worker, IPC no está disponible, usar IndexedDB fallback
  if (isInWebWorker()) {
    console.log('[StateStorage] Desktop: Running in Web Worker, using IndexedDB fallback')
    return createWebIndexedDbAdapter()
  }

  return {
    runtime: 'desktop',
    async init() {
      if (ipcBridge.stateStorage?.init) {
        await ipcBridge.stateStorage.init()
        console.log('[StateStorage] Desktop: Initialized SQLite via IPC')
      }
    },
    async saveState(state: PersistedState) {
      if (ipcBridge.stateStorage?.saveState) {
        await ipcBridge.stateStorage.saveState(state)
        console.log('[StateStorage] Desktop: State saved to SQLite via IPC')
        return
      }
      console.warn('[StateStorage] Desktop: No IPC bridge for saveState, using IndexedDB fallback')
      await createWebIndexedDbAdapter().saveState(state)
    },
    async loadState() {
      if (ipcBridge.stateStorage?.loadState) {
        const state = await ipcBridge.stateStorage.loadState()
        console.log('[StateStorage] Desktop: State loaded from SQLite via IPC')
        return state
      }
      console.warn('[StateStorage] Desktop: No IPC bridge for loadState, using IndexedDB fallback')
      return createWebIndexedDbAdapter().loadState()
    },
    async clearState() {
      if (ipcBridge.stateStorage?.clearState) {
        await ipcBridge.stateStorage.clearState()
        console.log('[StateStorage] Desktop: State cleared from SQLite via IPC')
        return
      }
      console.warn('[StateStorage] Desktop: No IPC bridge for clearState, using IndexedDB fallback')
      await createWebIndexedDbAdapter().clearState()
    },
  }
}

export function getStateStorageAdapter(): StateStorageAdapter {
  const bridge = getDesktopBridge()
  if (bridge?.platform === 'desktop') {
    return createDesktopAdapter(bridge)
  }
  return createWebIndexedDbAdapter()
}

// Exportar versión directa para uso en renderer (no worker)
// Esta versión siempre usa IPC para desktop
export function getStateStorageAdapterDirect(): StateStorageAdapter {
  const bridge = getDesktopBridge()
  if (bridge?.platform === 'desktop' && !isInWebWorker()) {
    return createDesktopAdapter(bridge)
  }
  return createWebIndexedDbAdapter()
}
