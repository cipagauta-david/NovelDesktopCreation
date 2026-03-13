import type {
  ChangeEvent,
  EntityRecord,
  PersistedState,
  Project,
  SyncContractVersion,
  SyncOperation,
} from '../../types/workspace'
import type { SyncEngine, SyncMergeResult, SyncQueueItem } from './types'
import { uid } from '../../utils/workspace'
import { mergeTextFromCrdt } from './crdtText'
import { getSyncStorageAdapter } from '../../platform/syncStorageAdapter'

const DEFAULT_CONTRACT_VERSION: SyncContractVersion = '2026-03-sync-v2'
const DEFAULT_MAX_RETRIES = 5
const BASE_BACKOFF_MS = 1_250

const syncStorage = getSyncStorageAdapter()

type RemoteSyncPayload = {
  contractVersion: SyncContractVersion
  workspaceId: string
  operations: SyncOperation[]
}

type RemoteSyncResponse = {
  state?: PersistedState
  acceptedOperationIds?: string[]
}

async function readQueue(): Promise<SyncQueueItem[]> {
  return syncStorage.readQueue()
}

async function writeQueue(queue: SyncQueueItem[]): Promise<void> {
  await syncStorage.writeQueue(queue)
}

async function readLastState(): Promise<PersistedState | null> {
  return syncStorage.readLastState()
}

async function writeLastState(state: PersistedState): Promise<void> {
  await syncStorage.writeLastState(state)
}

function shouldAttempt(item: SyncQueueItem): boolean {
  return new Date(item.nextAttemptAt).getTime() <= Date.now() && !item.poisonedAt
}

function nextBackoffDelayMs(retries: number): number {
  const jitter = 0.75 + Math.random() * 0.5
  return Math.round(BASE_BACKOFF_MS * Math.pow(2, Math.max(0, retries - 1)) * jitter)
}

async function pushRemoteOperations(params: {
  endpoint: string
  workspaceId: string
  authToken?: string
  contractVersion: SyncContractVersion
  operations: SyncOperation[]
}): Promise<RemoteSyncResponse> {
  const base = params.endpoint.replace(/\/$/, '')
  const response = await fetch(`${base}/api/v2/sync/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sync-Contract-Version': params.contractVersion,
      ...(params.authToken ? { Authorization: `Bearer ${params.authToken}` } : {}),
    },
    body: JSON.stringify({
      contractVersion: params.contractVersion,
      workspaceId: params.workspaceId,
      operations: params.operations,
    } satisfies RemoteSyncPayload),
  })

  if (!response.ok) {
    throw new Error(`Sync remoto falló (${response.status})`)
  }

  return (await response.json().catch(() => ({}))) as RemoteSyncResponse
}

function mergeById<T extends { id: string }>(first: T[], second: T[], resolver: (a: T, b: T) => T): T[] {
  const map = new Map(first.map((item) => [item.id, item]))
  for (const item of second) {
    const existing = map.get(item.id)
    map.set(item.id, existing ? resolver(existing, item) : item)
  }
  return Array.from(map.values())
}

function isRemoteNewer(localTimestamp: string, remoteTimestamp: string): boolean {
  return new Date(remoteTimestamp).getTime() > new Date(localTimestamp).getTime()
}

function mergeEntity(localEntity: EntityRecord, remoteEntity: EntityRecord): { entity: EntityRecord; conflict: boolean } {
  if (localEntity.content !== remoteEntity.content) {
    const mergedText = mergeTextFromCrdt({
      actorId: localEntity.id,
      localText: localEntity.content,
      remoteText: remoteEntity.content,
      localState: localEntity.textCrdtState,
      remoteState: remoteEntity.textCrdtState,
    })

    const remoteWins = isRemoteNewer(localEntity.updatedAt, remoteEntity.updatedAt)
    return {
      entity: {
        ...(remoteWins ? remoteEntity : localEntity),
        content: mergedText.text,
        textCrdtState: mergedText.state,
      },
      conflict: true,
    }
  }

  if (isRemoteNewer(localEntity.updatedAt, remoteEntity.updatedAt)) {
    return { entity: remoteEntity, conflict: true }
  }

  return { entity: localEntity, conflict: false }
}

function mergeProject(localProject: Project, remoteProject: Project): { project: Project; conflicts: number } {
  let conflicts = 0

  const mergedEntities = mergeById(localProject.entities, remoteProject.entities, (localEntity, remoteEntity) => {
    const merged = mergeEntity(localEntity, remoteEntity)
    if (merged.conflict) conflicts += 1
    return merged.entity
  })

  const mergedTabs = mergeById(localProject.tabs, remoteProject.tabs, (localTab, remoteTab) =>
    isRemoteNewer(localProject.updatedAt, remoteProject.updatedAt) ? remoteTab : localTab,
  )

  const mergedTemplates = mergeById(localProject.templates, remoteProject.templates, (localTemplate, remoteTemplate) =>
    isRemoteNewer(localProject.updatedAt, remoteProject.updatedAt) ? remoteTemplate : localTemplate,
  )

  const mergedHistory = mergeById(localProject.history, remoteProject.history, (localEvent, remoteEvent) =>
    isRemoteNewer(localEvent.timestamp, remoteEvent.timestamp) ? remoteEvent : localEvent,
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const remoteWins = isRemoteNewer(localProject.updatedAt, remoteProject.updatedAt)
  return {
    project: {
      ...localProject,
      ...(remoteWins ? { name: remoteProject.name, description: remoteProject.description } : {}),
      updatedAt: remoteWins ? remoteProject.updatedAt : localProject.updatedAt,
      entities: mergedEntities,
      tabs: mergedTabs,
      relations: mergeById(localProject.relations ?? [], remoteProject.relations ?? [], (localRelation, remoteRelation) =>
        isRemoteNewer(localRelation.updatedAt, remoteRelation.updatedAt) ? remoteRelation : localRelation,
      ),
      templates: mergedTemplates,
      history: mergedHistory,
    },
    conflicts,
  }
}

function deriveSyncOperations(previous: PersistedState | null, current: PersistedState, change: ChangeEvent): SyncOperation[] {
  const operations: SyncOperation[] = []

  if (!previous) {
    operations.push({
      id: uid('sync-op'),
      changeEventId: change.id,
      correlationId: change.correlationId,
      timestamp: change.timestamp,
      type: 'workspace.settings',
      payload: {
        settings: current.settings,
        syncRemoteConfig: current.syncRemoteConfig,
      },
    })
    for (const project of current.projects) {
      operations.push({
        id: uid('sync-op'),
        changeEventId: change.id,
        correlationId: change.correlationId,
        timestamp: change.timestamp,
        type: 'project.upsert',
        projectId: project.id,
        payload: project,
      })
    }
    return operations
  }

  if (JSON.stringify(previous.settings) !== JSON.stringify(current.settings) || JSON.stringify(previous.syncRemoteConfig) !== JSON.stringify(current.syncRemoteConfig)) {
    operations.push({
      id: uid('sync-op'),
      changeEventId: change.id,
      correlationId: change.correlationId,
      timestamp: change.timestamp,
      type: 'workspace.settings',
      payload: {
        settings: current.settings,
        syncRemoteConfig: current.syncRemoteConfig,
      },
    })
  }

  if (previous.activeProjectId !== current.activeProjectId || previous.activeTabId !== current.activeTabId || previous.activeEntityId !== current.activeEntityId) {
    operations.push({
      id: uid('sync-op'),
      changeEventId: change.id,
      correlationId: change.correlationId,
      timestamp: change.timestamp,
      type: 'workspace.pointer',
      payload: {
        activeProjectId: current.activeProjectId,
        activeTabId: current.activeTabId,
        activeEntityId: current.activeEntityId,
      },
    })
  }

  const prevProjects = new Map(previous.projects.map((project) => [project.id, project]))
  const currProjects = new Map(current.projects.map((project) => [project.id, project]))

  for (const [projectId, project] of currProjects) {
    const prevProject = prevProjects.get(projectId)
    if (!prevProject) {
      operations.push({
        id: uid('sync-op'),
        changeEventId: change.id,
        correlationId: change.correlationId,
        timestamp: change.timestamp,
        type: 'project.upsert',
        projectId,
        payload: project,
      })
      continue
    }

    if (project.updatedAt !== prevProject.updatedAt || project.name !== prevProject.name || project.description !== prevProject.description) {
      operations.push({
        id: uid('sync-op'),
        changeEventId: change.id,
        correlationId: change.correlationId,
        timestamp: change.timestamp,
        type: 'project.upsert',
        projectId,
        payload: {
          id: project.id,
          name: project.name,
          description: project.description,
          updatedAt: project.updatedAt,
          tabs: project.tabs,
          templates: project.templates,
        },
      })
    }

    const prevEntities = new Map(prevProject.entities.map((entity) => [entity.id, entity]))
    const currEntities = new Map(project.entities.map((entity) => [entity.id, entity]))

    for (const [entityId, entity] of currEntities) {
      const prevEntity = prevEntities.get(entityId)
      if (!prevEntity || prevEntity.revision !== entity.revision || prevEntity.updatedAt !== entity.updatedAt || prevEntity.content !== entity.content) {
        operations.push({
          id: uid('sync-op'),
          changeEventId: change.id,
          correlationId: change.correlationId,
          timestamp: change.timestamp,
          type: 'entity.upsert',
          projectId,
          entityId,
          payload: entity,
        })
      }
    }

    for (const entityId of prevEntities.keys()) {
      if (!currEntities.has(entityId)) {
        operations.push({
          id: uid('sync-op'),
          changeEventId: change.id,
          correlationId: change.correlationId,
          timestamp: change.timestamp,
          type: 'entity.delete',
          projectId,
          entityId,
          payload: { id: entityId },
        })
      }
    }

    const prevRelations = new Map((prevProject.relations ?? []).map((relation) => [relation.id, relation]))
    const currRelations = new Map((project.relations ?? []).map((relation) => [relation.id, relation]))

    for (const [relationId, relation] of currRelations) {
      const prevRelation = prevRelations.get(relationId)
      if (!prevRelation || prevRelation.updatedAt !== relation.updatedAt) {
        operations.push({
          id: uid('sync-op'),
          changeEventId: change.id,
          correlationId: change.correlationId,
          timestamp: change.timestamp,
          type: 'relation.upsert',
          projectId,
          payload: relation,
        })
      }
    }

    for (const relationId of prevRelations.keys()) {
      if (!currRelations.has(relationId)) {
        operations.push({
          id: uid('sync-op'),
          changeEventId: change.id,
          correlationId: change.correlationId,
          timestamp: change.timestamp,
          type: 'relation.delete',
          projectId,
          payload: { id: relationId },
        })
      }
    }
  }

  for (const projectId of prevProjects.keys()) {
    if (!currProjects.has(projectId)) {
      operations.push({
        id: uid('sync-op'),
        changeEventId: change.id,
        correlationId: change.correlationId,
        timestamp: change.timestamp,
        type: 'project.delete',
        projectId,
        payload: { id: projectId },
      })
    }
  }

  return operations
}

export function mergePersistedStates(localState: PersistedState, remoteState: PersistedState): SyncMergeResult {
  let conflictsResolved = 0

  const mergedProjects = mergeById(localState.projects, remoteState.projects, (localProject, remoteProject) => {
    const merged = mergeProject(localProject, remoteProject)
    conflictsResolved += merged.conflicts
    return merged.project
  })

  const mergedChangeLog = mergeById(localState.changeLog, remoteState.changeLog, (localEvent, remoteEvent) =>
    isRemoteNewer(localEvent.timestamp, remoteEvent.timestamp) ? remoteEvent : localEvent,
  ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const mergedGraphLayouts = {
    ...(localState.graphLayouts ?? {}),
    ...(remoteState.graphLayouts ?? {}),
  }

  const mergedLlmTraces = mergeById(localState.llmTraces ?? [], remoteState.llmTraces ?? [], (localTrace, remoteTrace) =>
    isRemoteNewer(localTrace.timestamp, remoteTrace.timestamp) ? remoteTrace : localTrace,
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const correlationMap = new Map((localState.correlationReports ?? []).map((report) => [report.correlationId, report]))
  for (const report of remoteState.correlationReports ?? []) {
    const current = correlationMap.get(report.correlationId)
    if (!current) {
      correlationMap.set(report.correlationId, report)
      continue
    }
    const localTs = current.finishedAt ?? current.startedAt
    const remoteTs = report.finishedAt ?? report.startedAt
    correlationMap.set(report.correlationId, isRemoteNewer(localTs, remoteTs) ? report : current)
  }

  return {
    merged: {
      ...localState,
      settings: remoteState.settings ?? localState.settings,
      projects: mergedProjects,
      activeProjectId: remoteState.activeProjectId || localState.activeProjectId,
      activeTabId: remoteState.activeTabId || localState.activeTabId,
      activeEntityId: remoteState.activeEntityId || localState.activeEntityId,
      changeLog: mergedChangeLog,
      graphLayouts: mergedGraphLayouts,
      llmTraces: mergedLlmTraces,
      checkpoints: localState.checkpoints,
      syncRemoteConfig: remoteState.syncRemoteConfig ?? localState.syncRemoteConfig,
      syncStats: remoteState.syncStats ?? localState.syncStats,
      correlationReports: Array.from(correlationMap.values())
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()),
    },
    conflictsResolved,
  }
}

export function createSyncEngine(): SyncEngine {
  return {
    async enqueueStateFromChange(state: PersistedState, change: ChangeEvent) {
      await syncStorage.init()
      const queue = await readQueue()
      const previous = await readLastState()
      const operations = deriveSyncOperations(previous, state, change)
      const nowIso = new Date().toISOString()

      for (const operation of operations) {
        queue.push({
          id: uid('sync-queue'),
          enqueuedAt: nowIso,
          retries: 0,
          nextAttemptAt: nowIso,
          changeEventId: change.id,
          projectId: operation.projectId,
          operation,
        })
      }

      await writeQueue(queue)
      await writeLastState(state)
    },

    async peekQueue() {
      await syncStorage.init()
      return readQueue()
    },

    async clearQueue() {
      await syncStorage.init()
      await writeQueue([])
    },

    async flushRemoteQueue(params) {
      await syncStorage.init()
      const queue = await readQueue()
      if (queue.length === 0) {
        return { pushed: 0, conflictsResolved: 0, retries: 0, poisoned: 0 }
      }

      const maxRetries = params.maxRetries ?? DEFAULT_MAX_RETRIES
      const contractVersion = params.contractVersion ?? DEFAULT_CONTRACT_VERSION

      let pushed = 0
      let conflictsResolved = 0
      let retries = 0
      let poisoned = 0
      let lastError: string | undefined
      const nextQueue: SyncQueueItem[] = []

      for (const item of queue) {
        if (!shouldAttempt(item)) {
          nextQueue.push(item)
          continue
        }

        try {
          const remote = await pushRemoteOperations({
            endpoint: params.endpoint,
            workspaceId: params.workspaceId,
            authToken: params.authToken,
            contractVersion,
            operations: [item.operation],
          })

          if (remote.state) {
            const localSnapshot = (await readLastState()) ?? remote.state
            const merged = mergePersistedStates(localSnapshot, remote.state)
            conflictsResolved += merged.conflictsResolved
          }
          pushed += 1
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Error de sync remoto'
          const retryCount = item.retries + 1
          retries += 1
          lastError = message

          if (retryCount >= maxRetries) {
            poisoned += 1
            nextQueue.push({
              ...item,
              retries: retryCount,
              lastError: message,
              poisonedAt: new Date().toISOString(),
            })
            continue
          }

          nextQueue.push({
            ...item,
            retries: retryCount,
            lastError: message,
            nextAttemptAt: new Date(Date.now() + nextBackoffDelayMs(retryCount)).toISOString(),
          })
        }
      }

      await writeQueue(nextQueue)
      return { pushed, conflictsResolved, retries, poisoned, lastError }
    },

    mergeRemoteState(localState: PersistedState, remoteState: PersistedState) {
      return mergePersistedStates(localState, remoteState)
    },
  }
}
