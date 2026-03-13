import { useEffect, useMemo, useRef, useState } from 'react'

import type { PersistedState } from '../../types/workspace'
import type { SyncEngineStatus } from '../../services/sync/types'
import { createSyncEngine } from '../../services/sync/engine'

export function useSyncManagement(data: PersistedState) {
  const syncEngine = useMemo(() => createSyncEngine(), [])
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatus>('idle')
  const previousChangeCountRef = useRef(data.changeLog.length)

  useEffect(() => {
    if (data.changeLog.length <= previousChangeCountRef.current) {
      return
    }

    const latestChange = data.changeLog[data.changeLog.length - 1]
    previousChangeCountRef.current = data.changeLog.length
    setSyncStatus('queued')

    syncEngine
      .enqueueStateFromChange(data, latestChange)
      .then(() => setSyncStatus('idle'))
      .catch((error) => {
        console.error('[Sync] No se pudo encolar operación local', error)
        setSyncStatus('error')
      })
  }, [data, syncEngine])

  return {
    syncStatus,
    mergeRemoteState: syncEngine.mergeRemoteState,
    inspectPendingSync: syncEngine.peekQueue,
    clearPendingSync: syncEngine.clearQueue,
  }
}
