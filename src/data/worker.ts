import * as Comlink from 'comlink'
import type { EntityRecord, PersistedState } from '../types/workspace'
import { withSpan } from '../services/tracing'
import { migratePersistedState } from '../utils/workspace'
import { getStateStorageAdapter } from '../platform/stateStorageAdapter'
import {
  EntityRecordSchema,
  FtsSearchResultSchema,
  PersistedStateSchema,
  parseWithContract,
} from '../services/llm/schemas'
import { SearchIndex } from './search/SearchIndex'
import type { FtsSearchResult } from './search/types'

type WorkerRequestMeta = {
  correlationId?: string
  origin?: string
}

export interface AppWorker {
  init(): Promise<void>
  persistState(state: PersistedState, meta?: WorkerRequestMeta): Promise<void>
  loadState(): Promise<PersistedState | null>
  resetWorkspace(): Promise<void>
  searchEntities(query: string, entities: EntityRecord[], meta?: WorkerRequestMeta): Promise<EntityRecord[]>
  // ── FTS5 index API ──────────────────────────────────
  ftsIndex(entities: EntityRecord[], meta?: WorkerRequestMeta): Promise<number>
  ftsSearch(query: string, meta?: WorkerRequestMeta): Promise<FtsSearchResult[]>
  ftsUpsert(entity: EntityRecord, meta?: WorkerRequestMeta): Promise<void>
  ftsRemove(entityId: string, meta?: WorkerRequestMeta): Promise<void>
  // ── Desktop detection ────────────────────────────────
  isDesktopRuntime(): boolean
}

let fallbackState: PersistedState | null = null
const stateStorage = getStateStorageAdapter()

// Detectar si estamos en runtime desktop
function isDesktopRuntime(): boolean {
  const bridge = (globalThis as { __NOVEL_DESKTOP__?: { platform?: string } }).__NOVEL_DESKTOP__
  return bridge?.platform === 'desktop'
}

// Instancia singleton del índice FTS (solo para web)
const searchIndex = new SearchIndex()

async function saveStateToIndexedDb(state: PersistedState): Promise<void> {
  const normalizedState = migratePersistedState(state)

  parseWithContract(PersistedStateSchema, normalizedState, {
    provider: 'Local/Ollama',
    contract: 'ipc-worker-persist-state',
    message: 'PersistedState inválido al persistir',
  })

  await stateStorage.saveState(normalizedState)
}

async function loadStateFromIndexedDb(): Promise<PersistedState | null> {
  const result = await stateStorage.loadState()
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
    const runtime = isDesktopRuntime() ? 'desktop (SQLite)' : 'web (IndexedDB)'
    console.log(`[Worker] Initializing... Runtime: ${runtime}`)

    try {
      await stateStorage.init()

      // Intentar cargar estado y construir el índice FTS de inmediato
      const savedState = await loadStateFromIndexedDb()
      if (savedState) {
        // Solo construir índice FTS en memoria para web
        // Desktop usa SQLite FTS que se mantiene en main.cjs
        if (!isDesktopRuntime()) {
          const allEntities = savedState.projects.flatMap((p) => p.entities)
          searchIndex.buildFromEntities(allEntities)
          console.log(`[Worker] Web FTS Index built: ${searchIndex.indexedCount} entities`)
        } else {
          console.log('[Worker] Desktop runtime: Using SQLite FTS, skipping in-memory index')
        }
      }
    } catch (error) {
      console.warn('[Worker] Fallo inicializando storage/FTS, usando fallback en memoria', error)
    }
  },

  async persistState(state: PersistedState, meta?: WorkerRequestMeta): Promise<void> {
    await withSpan('worker.persist_state', {
      projects: state.projects.length,
      correlationId: meta?.correlationId,
      origin: meta?.origin,
      runtime: isDesktopRuntime() ? 'desktop' : 'web',
    }, async () => {
      const validatedState = migratePersistedState(parseWithContract(PersistedStateSchema, state, {
        provider: 'Local/Ollama',
        contract: 'ipc-worker-persist-state',
        message: 'PersistedState inválido recibido por worker',
      }) as PersistedState)

      // Solo construir índice FTS en memoria para web
      // Desktop delega FTS a SQLite via stateStorage adapter
      if (!isDesktopRuntime()) {
        const allEntities = validatedState.projects.flatMap((p) => p.entities)
        searchIndex.buildFromEntities(allEntities)
      }

      try {
        await saveStateToIndexedDb(validatedState)
        if (isDesktopRuntime()) {
          console.log('[Worker] State persisted to SQLite via IPC')
        }
      } catch (error) {
        console.error('[Worker] Fallo guardando estado en adapter, persistiendo en memoria', error)
        fallbackState = validatedState
      }
    })
  },

  async loadState(): Promise<PersistedState | null> {
    try {
      const saved = await loadStateFromIndexedDb()
      if (saved && !isDesktopRuntime()) {
        // Reconstruir índice FTS en memoria después de cargar para web
        const allEntities = saved.projects.flatMap((p) => p.entities)
        searchIndex.buildFromEntities(allEntities)
      }
      return saved ? migratePersistedState(saved) : fallbackState
    } catch (error) {
      console.error('[Worker] Fallo leyendo estado desde adapter, usando fallback en memoria', error)
      return fallbackState
    }
  },

  async resetWorkspace(): Promise<void> {
    try {
      await stateStorage.clearState()
    } catch (error) {
      console.warn('[Worker] Fallo limpiando adapter de estado', error)
    }
    fallbackState = null
    if (!isDesktopRuntime()) {
      searchIndex.buildFromEntities([])
    }
  },

  // Mantener compatibilidad con el API original (filtro lineal)
  async searchEntities(query: string, entities: EntityRecord[], meta?: WorkerRequestMeta): Promise<EntityRecord[]> {
    return withSpan('worker.search_entities', {
      queryLength: query.length,
      correlationId: meta?.correlationId,
      origin: meta?.origin,
    }, async () => {
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

  // ── FTS5 Index API ──────────────────────────────────
  // Desktop usa SQLite FTS directamente, worker solo mantiene índice en memoria para web

  async ftsIndex(entities: EntityRecord[], meta?: WorkerRequestMeta): Promise<number> {
    // Skip FTS indexing on desktop - SQLite FTS se mantiene en main.cjs
    if (isDesktopRuntime()) {
      console.log('[Worker] Desktop runtime: Skipping in-memory FTS, using SQLite')
      return 0
    }

    return withSpan('worker.fts_index', {
      entities: entities.length,
      correlationId: meta?.correlationId,
      origin: meta?.origin,
    }, async () => {
      const validatedEntities = entities.map((entity) => parseWithContract(EntityRecordSchema, entity, {
        provider: 'Local/Ollama',
        contract: 'ipc-worker-fts-index',
        message: 'Entidad inválida para indexación FTS',
      }))
      searchIndex.buildFromEntities(validatedEntities)
      return searchIndex.indexedCount
    })
  },

  async ftsSearch(query: string, meta?: WorkerRequestMeta): Promise<FtsSearchResult[]> {
    // Skip FTS search on desktop - se usa desktopSearchAdapter que va directo a SQLite
    if (isDesktopRuntime()) {
      console.log('[Worker] Desktop runtime: FTS search delegated to desktopSearchAdapter')
      return []
    }

    return withSpan('worker.fts_search', {
      queryLength: query.length,
      correlationId: meta?.correlationId,
      origin: meta?.origin,
    }, async () => {
      const results = searchIndex.search(query)
      return results.map((result) => parseWithContract(FtsSearchResultSchema, result, {
        provider: 'Local/Ollama',
        contract: 'ipc-worker-fts-search',
        message: 'Resultado FTS inválido',
      }))
    })
  },

  async ftsUpsert(entity: EntityRecord): Promise<void> {
    // Skip FTS upsert on desktop
    if (isDesktopRuntime()) {
      return
    }
    const validatedEntity = parseWithContract(EntityRecordSchema, entity, {
      provider: 'Local/Ollama',
      contract: 'ipc-worker-fts-upsert',
      message: 'Entidad inválida para upsert FTS',
    })
    searchIndex.upsertEntity(validatedEntity)
  },

  async ftsRemove(entityId: string): Promise<void> {
    // Skip FTS remove on desktop
    if (isDesktopRuntime()) {
      return
    }
    searchIndex.removeEntity(entityId)
  },

  isDesktopRuntime(): boolean {
    return isDesktopRuntime()
  },
}

Comlink.expose(workerObj)
