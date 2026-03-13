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
  searchEntities(query: string, entities: EntityRecord[], meta?: WorkerRequestMeta): Promise<EntityRecord[]>
  // ── FTS5 index API ──────────────────────────────────
  ftsIndex(entities: EntityRecord[], meta?: WorkerRequestMeta): Promise<number>
  ftsSearch(query: string, meta?: WorkerRequestMeta): Promise<FtsSearchResult[]>
  ftsUpsert(entity: EntityRecord, meta?: WorkerRequestMeta): Promise<void>
  ftsRemove(entityId: string, meta?: WorkerRequestMeta): Promise<void>
}

let fallbackState: PersistedState | null = null
const stateStorage = getStateStorageAdapter()

// Instancia singleton del índice FTS
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
    console.log('[Worker] Initializing FTS Index Engine + State Storage Adapter...')

    try {
      await stateStorage.init()

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

  async persistState(state: PersistedState, meta?: WorkerRequestMeta): Promise<void> {
    await withSpan('worker.persist_state', {
      projects: state.projects.length,
      correlationId: meta?.correlationId,
      origin: meta?.origin,
    }, async () => {
      const validatedState = migratePersistedState(parseWithContract(PersistedStateSchema, state, {
        provider: 'Local/Ollama',
        contract: 'ipc-worker-persist-state',
        message: 'PersistedState inválido recibido por worker',
      }) as PersistedState)

      const allEntities = validatedState.projects.flatMap((p) => p.entities)
      searchIndex.buildFromEntities(allEntities)

      try {
        await saveStateToIndexedDb(validatedState)
      } catch (error) {
        console.error('[Worker] Fallo guardando estado en adapter, persistiendo en memoria', error)
        fallbackState = validatedState
      }
    })
  },

  async loadState(): Promise<PersistedState | null> {
    try {
      const saved = await loadStateFromIndexedDb()
      return saved ? migratePersistedState(saved) : fallbackState
    } catch (error) {
      console.error('[Worker] Fallo leyendo estado desde adapter, usando fallback en memoria', error)
      return fallbackState
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

  async ftsIndex(entities: EntityRecord[], meta?: WorkerRequestMeta): Promise<number> {
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

  async ftsUpsert(entity: EntityRecord, _meta?: WorkerRequestMeta): Promise<void> {
    const validatedEntity = parseWithContract(EntityRecordSchema, entity, {
      provider: 'Local/Ollama',
      contract: 'ipc-worker-fts-upsert',
      message: 'Entidad inválida para upsert FTS',
    })
    searchIndex.upsertEntity(validatedEntity)
  },

  async ftsRemove(entityId: string, _meta?: WorkerRequestMeta): Promise<void> {
    searchIndex.removeEntity(entityId)
  },
}

Comlink.expose(workerObj)
