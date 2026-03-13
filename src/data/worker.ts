import * as Comlink from 'comlink'
import type { EntityRecord, PersistedState } from '../types/workspace'
import { withSpan } from '../services/tracing'
import { migratePersistedState } from '../utils/workspace'
import {
  EntityRecordSchema,
  FtsSearchResultSchema,
  PersistedStateSchema,
  parseWithContract,
} from '../services/llm/schemas'
import { SearchIndex } from './search/SearchIndex'
import type { FtsSearchResult } from './search/types'

export interface AppWorker {
  init(): Promise<void>
  persistState(state: PersistedState): Promise<void>
  loadState(): Promise<PersistedState | null>
  searchEntities(query: string, entities: EntityRecord[]): Promise<EntityRecord[]>
  // ── FTS5 index API ──────────────────────────────────
  ftsIndex(entities: EntityRecord[]): Promise<number>
  ftsSearch(query: string): Promise<FtsSearchResult[]>
  ftsUpsert(entity: EntityRecord): Promise<void>
  ftsRemove(entityId: string): Promise<void>
}

const DB_NAME = 'novel-desktop-worker-db'
const DB_VERSION = 1
const STATE_STORE = 'workspace-state'
const STATE_ID = 'latest'

let fallbackState: PersistedState | null = null

// Instancia singleton del índice FTS
const searchIndex = new SearchIndex()

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
  const normalizedState = migratePersistedState(state)

  parseWithContract(PersistedStateSchema, normalizedState, {
    provider: 'Local/Ollama',
    contract: 'ipc-worker-persist-state',
    message: 'PersistedState inválido al persistir',
  })

  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STATE_STORE, 'readwrite')
    tx.objectStore(STATE_STORE).put({ id: STATE_ID, value: normalizedState } satisfies PersistedStateRecord)
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
  if (!result) {
    return null
  }
  return parseWithContract(PersistedStateSchema, result, {
    provider: 'Local/Ollama',
    contract: 'ipc-worker-load-state',
    message: 'PersistedState inválido al cargar',
  }) as PersistedState
}

const workerObj: AppWorker = {
  async init(): Promise<void> {
    console.log('[Worker] Initializing FTS Index Engine + IndexedDB...')
    if (typeof indexedDB === 'undefined') {
      console.warn('[Worker] IndexedDB no disponible, usando fallback en memoria')
      return
    }

    try {
      const db = await openDatabase()
      db.close()

      // Intentar cargar estado y construir el índice FTS de inmediato
      const savedState = await loadStateFromIndexedDb()
      if (savedState) {
        const allEntities = savedState.projects.flatMap((p) => p.entities)
        searchIndex.buildFromEntities(allEntities)
        console.log(`[Worker] FTS Index built: ${searchIndex.indexedCount} entities indexed`)
      }
    } catch (error) {
      console.warn('[Worker] Fallo inicializando IndexedDB/FTS, usando fallback en memoria', error)
    }
  },

  async persistState(state: PersistedState): Promise<void> {
    await withSpan('worker.persist_state', { projects: state.projects.length }, async () => {
      const validatedState = migratePersistedState(parseWithContract(PersistedStateSchema, state, {
        provider: 'Local/Ollama',
        contract: 'ipc-worker-persist-state',
        message: 'PersistedState inválido recibido por worker',
      }) as PersistedState)

      const allEntities = validatedState.projects.flatMap((p) => p.entities)
      searchIndex.buildFromEntities(allEntities)

      if (typeof indexedDB === 'undefined') {
        fallbackState = validatedState
        return
      }

      try {
        await saveStateToIndexedDb(validatedState)
      } catch (error) {
        console.error('[Worker] Fallo guardando en IndexedDB, persistiendo en memoria', error)
        fallbackState = validatedState
      }
    })
  },

  async loadState(): Promise<PersistedState | null> {
    if (typeof indexedDB === 'undefined') {
      return fallbackState
    }

    try {
      const saved = await loadStateFromIndexedDb()
      return saved ? migratePersistedState(saved) : fallbackState
    } catch (error) {
      console.error('[Worker] Fallo leyendo IndexedDB, usando fallback en memoria', error)
      return fallbackState
    }
  },

  // Mantener compatibilidad con el API original (filtro lineal)
  async searchEntities(query: string, entities: EntityRecord[]): Promise<EntityRecord[]> {
    return withSpan('worker.search_entities', { queryLength: query.length }, async () => {
      const normalized = query.trim().toLowerCase()
      if (!normalized) return []

      const validatedEntities = entities.map((entity) => parseWithContract(EntityRecordSchema, entity, {
        provider: 'Local/Ollama',
        contract: 'ipc-worker-search-entities',
        message: 'Entidad inválida en búsqueda worker',
      }))

      return validatedEntities.filter((e) =>
        e.title.toLowerCase().includes(normalized) ||
        e.aliases.some((alias: string) => alias.toLowerCase().includes(normalized)) ||
        e.content.toLowerCase().includes(normalized)
      )
    })
  },

  // ── FTS5 Index API ──────────────────────────────────

  async ftsIndex(entities: EntityRecord[]): Promise<number> {
    return withSpan('worker.fts_index', { entities: entities.length }, async () => {
      const validatedEntities = entities.map((entity) => parseWithContract(EntityRecordSchema, entity, {
        provider: 'Local/Ollama',
        contract: 'ipc-worker-fts-index',
        message: 'Entidad inválida para indexación FTS',
      }))
      searchIndex.buildFromEntities(validatedEntities)
      return searchIndex.indexedCount
    })
  },

  async ftsSearch(query: string): Promise<FtsSearchResult[]> {
    return withSpan('worker.fts_search', { queryLength: query.length }, async () => {
      const results = searchIndex.search(query)
      return results.map((result) => parseWithContract(FtsSearchResultSchema, result, {
        provider: 'Local/Ollama',
        contract: 'ipc-worker-fts-search',
        message: 'Resultado FTS inválido',
      }))
    })
  },

  async ftsUpsert(entity: EntityRecord): Promise<void> {
    const validatedEntity = parseWithContract(EntityRecordSchema, entity, {
      provider: 'Local/Ollama',
      contract: 'ipc-worker-fts-upsert',
      message: 'Entidad inválida para upsert FTS',
    })
    searchIndex.upsertEntity(validatedEntity)
  },

  async ftsRemove(entityId: string): Promise<void> {
    searchIndex.removeEntity(entityId)
  },
}

Comlink.expose(workerObj)
