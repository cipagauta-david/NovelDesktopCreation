import type { PersistedState } from '../types/workspace'

type DesktopWorkerBridge = {
  platform?: 'desktop'
  stateStorage?: {
    init?: () => Promise<void>
    saveState?: (state: PersistedState) => Promise<void>
    loadState?: () => Promise<PersistedState | null>
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
}

const DB_NAME = 'novel-desktop-worker-db'
const DB_VERSION = 1
const STATE_STORE = 'workspace-state'
const STATE_ID = 'latest'

function getDesktopBridge(): DesktopWorkerBridge | undefined {
  return (globalThis as { __NOVEL_DESKTOP__?: DesktopWorkerBridge }).__NOVEL_DESKTOP__
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
  }
}

function createDesktopAdapter(bridge: DesktopWorkerBridge): StateStorageAdapter {
  return {
    runtime: 'desktop',
    async init() {
      if (bridge.stateStorage?.init) {
        await bridge.stateStorage.init()
      }
    },
    async saveState(state: PersistedState) {
      if (bridge.stateStorage?.saveState) {
        await bridge.stateStorage.saveState(state)
        return
      }
      await createWebIndexedDbAdapter().saveState(state)
    },
    async loadState() {
      if (bridge.stateStorage?.loadState) {
        return bridge.stateStorage.loadState()
      }
      return createWebIndexedDbAdapter().loadState()
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
