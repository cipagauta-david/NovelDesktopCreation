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
      llmTraces: localState.llmTraces,
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

    mergeRemoteState(localState: PersistedState, remoteState: PersistedState) {
      return mergePersistedStates(localState, remoteState)
    },
  }
}
