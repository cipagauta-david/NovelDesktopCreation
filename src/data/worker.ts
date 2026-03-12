import * as Comlink from 'comlink'
import type { EntityRecord, PersistedState } from '../types/workspace'

export interface AppWorker {
  init(): Promise<void>
  persistState(state: PersistedState): Promise<void>
  loadState(): Promise<PersistedState | null>
  searchEntities(query: string, entities: EntityRecord[]): Promise<EntityRecord[]>
}

const DB_NAME = 'novel-desktop-worker-db'
const DB_VERSION = 1
const STATE_STORE = 'workspace-state'
const STATE_ID = 'latest'

let fallbackState: PersistedState | null = null

type PersistedStateRecord = {
  id: string
  value: PersistedState
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error ?? 'error desconocido')
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
    request.onerror = () => {
      reject(new Error(`No se pudo abrir IndexedDB: ${formatErrorMessage(request.error)}`))
    }
  })
}

async function saveStateToIndexedDb(state: PersistedState): Promise<void> {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readwrite')
    tx.objectStore(STATE_STORE).put({ id: STATE_ID, value: state } satisfies PersistedStateRecord)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(new Error(`No se pudo guardar estado: ${formatErrorMessage(tx.error)}`))
    tx.onabort = () => {
      const abortDetail = tx.error ? formatErrorMessage(tx.error) : 'sin detalle de transacción'
      reject(new Error(`Transacción abortada al guardar estado: ${abortDetail}`))
    }
  })
  db.close()
}

async function loadStateFromIndexedDb(): Promise<PersistedState | null> {
  const db = await openDatabase()
  const result = await new Promise<PersistedState | null>((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readonly')
    const request = tx.objectStore(STATE_STORE).get(STATE_ID)
    request.onsuccess = () => {
      const record = request.result as PersistedStateRecord | undefined
      resolve(record?.value ?? null)
    }
    request.onerror = () => reject(new Error(`No se pudo leer estado: ${formatErrorMessage(request.error)}`))
    tx.onabort = () => {
      const abortDetail = tx.error ? formatErrorMessage(tx.error) : 'sin detalle de transacción'
      reject(new Error(`Transacción abortada al leer estado: ${abortDetail}`))
    }
  })
  db.close()
  return result
}

const workerObj = {
  async init(): Promise<void> {
    console.log('[Worker] Initializing SQLite / OPFS Engine...')
    if (typeof indexedDB === 'undefined') {
      console.warn('[Worker] IndexedDB no disponible, usando fallback en memoria')
      return
    }

    try {
      const db = await openDatabase()
      db.close()
    } catch (error) {
      console.warn('[Worker] Fallo inicializando IndexedDB, usando fallback en memoria', error)
    }
  },

  async persistState(state: PersistedState): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      fallbackState = state
      return
    }

    try {
      await saveStateToIndexedDb(state)
    } catch (error) {
      console.error('[Worker] Fallo guardando en IndexedDB, persistiendo en memoria', error)
      fallbackState = state
    }
  },

  async loadState(): Promise<PersistedState | null> {
    if (typeof indexedDB === 'undefined') {
      return fallbackState
    }

    try {
      const saved = await loadStateFromIndexedDb()
      return saved ?? fallbackState
    } catch (error) {
      console.error('[Worker] Fallo leyendo IndexedDB, usando fallback en memoria', error)
      return fallbackState
    }
  },

  async searchEntities(query: string, entities: EntityRecord[]): Promise<EntityRecord[]> {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return []

    return entities.filter((e) =>
      e.title.toLowerCase().includes(normalized) ||
      e.aliases.some((alias: string) => alias.toLowerCase().includes(normalized)) ||
      e.content.toLowerCase().includes(normalized)
    )
  }
}

Comlink.expose(workerObj)
