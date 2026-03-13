import type { ChangeEvent, PersistedState } from '../../types/workspace'

export type SyncQueueItem = {
  id: string
  enqueuedAt: string
  retries: number
  lastError?: string
  changeEventId: string
  projectId?: string
  state: PersistedState
}

export type SyncMergeResult = {
  merged: PersistedState
  conflictsResolved: number
}

export type SyncEngineStatus = 'idle' | 'queued' | 'merging' | 'error'

export type SyncEngine = {
  enqueueStateFromChange: (state: PersistedState, change: ChangeEvent) => Promise<void>
  peekQueue: () => Promise<SyncQueueItem[]>
  clearQueue: () => Promise<void>
  flushRemoteQueue: (params: {
    endpoint: string
    workspaceId: string
    authToken?: string
  }) => Promise<{ pushed: number; conflictsResolved: number; retries: number; lastError?: string }>
  mergeRemoteState: (localState: PersistedState, remoteState: PersistedState) => SyncMergeResult
}
