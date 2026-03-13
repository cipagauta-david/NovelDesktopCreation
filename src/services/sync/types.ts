import type { ChangeEvent, PersistedState, SyncContractVersion, SyncOperation } from '../../types/workspace'

export type SyncQueueItem = {
  id: string
  enqueuedAt: string
  retries: number
  nextAttemptAt: string
  poisonedAt?: string
  lastError?: string
  changeEventId: string
  projectId?: string
  operation: SyncOperation
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
    contractVersion?: SyncContractVersion
    maxRetries?: number
  }) => Promise<{ pushed: number; conflictsResolved: number; retries: number; poisoned: number; lastError?: string }>
  mergeRemoteState: (localState: PersistedState, remoteState: PersistedState) => SyncMergeResult
}
