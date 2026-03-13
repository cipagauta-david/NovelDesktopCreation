import type { ChangeEvent, EntityRecord, PersistedState, Project } from '../../types/workspace'
import type { SyncEngine, SyncMergeResult, SyncQueueItem } from './types'
import { uid } from '../../utils/workspace'

const SYNC_QUEUE_KEY = 'novel.sync.queue.v1'

function readQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SyncQueueItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(queue: SyncQueueItem[]): void {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
}

type RemoteSyncPayload = {
  workspaceId: string
  correlationId?: string
  state: PersistedState
}

async function pushRemoteState(params: {
  endpoint: string
  workspaceId: string
  authToken?: string
  state: PersistedState
  correlationId?: string
}): Promise<PersistedState | null> {
  const response = await fetch(`${params.endpoint.replace(/\/$/, '')}/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(params.authToken ? { Authorization: `Bearer ${params.authToken}` } : {}),
    },
    body: JSON.stringify({
      workspaceId: params.workspaceId,
      correlationId: params.correlationId,
      state: params.state,
    } satisfies RemoteSyncPayload),
  })

  if (!response.ok) {
    throw new Error(`Sync remoto falló (${response.status})`)
  }

  const payload = await response.json().catch(() => null) as { state?: PersistedState } | null
  return payload?.state ?? null
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
  const mergedCorrelationReports = Array.from(correlationMap.values())
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

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
      correlationReports: mergedCorrelationReports,
    },
    conflictsResolved,
  }
}

export function createSyncEngine(): SyncEngine {
  return {
    async enqueueStateFromChange(state: PersistedState, change: ChangeEvent) {
      const queue = readQueue()
      queue.push({
        id: uid('sync-op'),
        enqueuedAt: new Date().toISOString(),
        retries: 0,
        changeEventId: change.id,
        projectId: change.projectId,
        state,
      })
      writeQueue(queue)
    },

    async peekQueue() {
      return readQueue()
    },

    async clearQueue() {
      writeQueue([])
    },

    async flushRemoteQueue(params) {
      const queue = readQueue()
      if (queue.length === 0) {
        return { pushed: 0, conflictsResolved: 0, retries: 0 }
      }

      let pushed = 0
      let conflictsResolved = 0
      let retries = 0
      let lastError: string | undefined
      const nextQueue: SyncQueueItem[] = []

      for (const item of queue) {
        try {
          const remote = await pushRemoteState({
            endpoint: params.endpoint,
            workspaceId: params.workspaceId,
            authToken: params.authToken,
            state: item.state,
            correlationId: item.changeEventId,
          })

          if (remote) {
            const merged = mergePersistedStates(item.state, remote)
            conflictsResolved += merged.conflictsResolved
          }
          pushed += 1
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Error de sync remoto'
          const retryCount = item.retries + 1
          retries += 1
          lastError = message
          nextQueue.push({
            ...item,
            retries: retryCount,
            lastError: message,
          })
        }
      }

      writeQueue(nextQueue)
      return { pushed, conflictsResolved, retries, lastError }
    },

    mergeRemoteState(localState: PersistedState, remoteState: PersistedState) {
      return mergePersistedStates(localState, remoteState)
    },
  }
}
