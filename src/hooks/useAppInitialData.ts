import { useEffect, useState, useRef, type Dispatch, type SetStateAction } from 'react'
import * as Comlink from 'comlink'
import { getDefaultPersistedState } from '../data/seed/project'
import { getStateStorageAdapterDirect } from '../platform/stateStorageAdapter'
import type { PersistedState } from '../types/workspace'
import type { AppWorker } from '../data/worker'

function isDesktopRuntime(): boolean {
  const bridge = (globalThis as { __NOVEL_DESKTOP__?: { platform?: string } }).__NOVEL_DESKTOP__
  const isDesktop = bridge?.platform === 'desktop'
  console.log('[App] Bridge check:', bridge, 'isDesktop:', isDesktop)
  return isDesktop
}

export function useAppInitialData(
  worker: Comlink.Remote<AppWorker> | null,
  isReady: boolean,
): { initialData: PersistedState | null; setInitialData: Dispatch<SetStateAction<PersistedState | null>> } {
  const [initialData, setInitialData] = useState<PersistedState | null>(null)
  const stateStorageRef = useRef(getStateStorageAdapterDirect())
  const isDesktopRef = useRef(isDesktopRuntime())

  useEffect(() => {
    if (!worker || !isReady) return

    const loadInitialState = async () => {
      try {
        if (typeof worker.loadState !== 'function') {
          console.error('[App] Worker proxy inválido: loadState no es una función')
          return getDefaultPersistedState()
        }

        // Desktop: cargar desde SQLite primero, luego sincronizar worker
        if (isDesktopRef.current) {
          console.log('[App] Desktop runtime: Loading state')
          await stateStorageRef.current.init()

          // 1. Cargar desde SQLite
          const sqliteState = await stateStorageRef.current.loadState()

          // 2. Cargar desde worker (IndexedDB)
          const workerState = await worker.loadState()

          console.log('[App] Desktop: SQLite state:', sqliteState ? 'found' : 'null', 'Worker state:', workerState ? 'found' : 'null')

          // Preferir worker state si tiene más datos, sino SQLite, sino default
          if (workerState && workerState.projects.length > 0) {
            console.log('[App] Desktop: Using worker state (IndexedDB), projects:', workerState.projects.length)
            // Sincronizar worker state a SQLite
            await stateStorageRef.current.saveState(workerState)
            console.log('[App] Desktop: Synced worker state to SQLite')
            return workerState
          }

          if (sqliteState) {
            console.log('[App] Desktop: Using SQLite state, projects:', sqliteState.projects.length)
            return sqliteState
          }

          console.log('[App] Desktop: No existing state, using default')
          const defaultState = getDefaultPersistedState()
          // Guardar default a SQLite
          await stateStorageRef.current.saveState(defaultState)
          return defaultState
        }

        // Web: usar worker para cargar estado (off-main-thread)
        console.log('[App] Web runtime: Loading state via worker')
        return await worker.loadState() ?? getDefaultPersistedState()
      } catch (err) {
        console.error('[App] Error loading initial state:', err)
        return getDefaultPersistedState()
      }
    }

    loadInitialState().then((data) => {
      queueMicrotask(() => setInitialData(data))
    })
  }, [worker, isReady])

  return { initialData, setInitialData }
}
