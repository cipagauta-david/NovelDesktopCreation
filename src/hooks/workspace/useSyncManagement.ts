import { useEffect, useMemo, useRef, useState } from 'react'

import type { PersistedState } from '../../types/workspace'
import type { SyncEngineStatus } from '../../services/sync/types'
import { createSyncEngine } from '../../services/sync/engine'
import { readWorkspaceSyncToken } from '../../services/security/apiKeyVault'
import { appendCorrelationReport } from '../../utils/workspace'
import { finalizeCorrelationIntent, recordCorrelationStage, startCorrelationIntent } from '../../services/correlation'

export function useSyncManagement(
  data: PersistedState,
  setData: React.Dispatch<React.SetStateAction<PersistedState>>,
) {
  const syncEngine = useMemo(() => createSyncEngine(), [])
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatus>('idle')
  const previousChangeCountRef = useRef(data.changeLog.length)

  useEffect(() => {
    if (data.changeLog.length <= previousChangeCountRef.current) {
      return
    }

    const latestChange = data.changeLog[data.changeLog.length - 1]
    previousChangeCountRef.current = data.changeLog.length
    queueMicrotask(() => setSyncStatus('queued'))

    syncEngine
      .enqueueStateFromChange(data, latestChange)
      .then(() => {
        setData((current) => ({
          ...current,
          syncStats: {
            pending: (current.syncStats?.pending ?? 0) + 1,
            retries: current.syncStats?.retries ?? 0,
            poisoned: current.syncStats?.poisoned ?? 0,
            conflictsResolved: current.syncStats?.conflictsResolved ?? 0,
            lastError: current.syncStats?.lastError,
            lastSyncedAt: current.syncStats?.lastSyncedAt,
          },
        }))
        setSyncStatus('idle')
      })
      .catch((error) => {
        console.error('[Sync] No se pudo encolar operación local', error)
        setSyncStatus('error')
      })
  }, [data, setData, syncEngine])

  async function flushRemoteSync() {
    const correlationId = startCorrelationIntent('sync.flush')
    const config = data.syncRemoteConfig
    if (!config?.endpoint || !config.workspaceId) {
      const report = finalizeCorrelationIntent(correlationId, 'error')
      if (report) {
        setData((current) => appendCorrelationReport(current, report))
      }
      throw new Error('Sync remoto no configurado')
    }

    setSyncStatus('merging')
    const authToken = await readWorkspaceSyncToken(config.workspaceId)
    recordCorrelationStage(correlationId, 'sync.flush.start', `workspace:${config.workspaceId}`)
    const result = await syncEngine.flushRemoteQueue({
      endpoint: config.endpoint,
      workspaceId: config.workspaceId,
      authToken,
      contractVersion: config.contractVersion,
    })

    setData((current) => {
      const base = {
        ...current,
        syncStats: {
          pending: Math.max(0, (current.syncStats?.pending ?? 0) - result.pushed + result.retries),
          retries: (current.syncStats?.retries ?? 0) + result.retries,
          poisoned: (current.syncStats?.poisoned ?? 0) + result.poisoned,
          conflictsResolved: (current.syncStats?.conflictsResolved ?? 0) + result.conflictsResolved,
          lastError: result.lastError,
          lastSyncedAt: new Date().toISOString(),
        },
      }
      recordCorrelationStage(correlationId, 'sync.flush.result', `pushed:${result.pushed}; retries:${result.retries}; conflicts:${result.conflictsResolved}`)
      const report = finalizeCorrelationIntent(correlationId, result.lastError ? 'error' : 'ok')
      return report ? appendCorrelationReport(base, report) : base
    })

    setSyncStatus(result.lastError ? 'error' : 'idle')
    return result
  }

  return {
    syncStatus,
    mergeRemoteState: syncEngine.mergeRemoteState,
    inspectPendingSync: syncEngine.peekQueue,
    clearPendingSync: syncEngine.clearQueue,
    flushRemoteSync,
  }
}
