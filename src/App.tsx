import { useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { useAppWorker } from './hooks/useAppWorker'
import { getDefaultPersistedState } from './data/seed/project'
import type { PersistedState } from './types/workspace'

function App() {
  const { worker, isReady } = useAppWorker()
  const [initialData, setInitialData] = useState<PersistedState | null>(null)

  useEffect(() => {
    if (!worker || !isReady) return

    try {
      if (typeof worker.loadState !== 'function') {
        console.error('[App] Worker proxy inválido: loadState no es una función')
        queueMicrotask(() => setInitialData(getDefaultPersistedState()))
        return
      }

      worker.loadState().then((saved) => {
        queueMicrotask(() => setInitialData(saved ?? getDefaultPersistedState()))
      }).catch((err: unknown) => {
        console.error('[App] Fallo recuperando data, inicializando fallback', err)
        queueMicrotask(() => setInitialData(getDefaultPersistedState()))
      })
      } catch (err) {
        console.error('[App] Error síncrono inicializando worker state, fallback activado', err)
        queueMicrotask(() => setInitialData(getDefaultPersistedState()))
      }
  }, [worker, isReady])

  if (!worker || !initialData) {
    return (
      <div className="surface-panel empty-state" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h3>Iniciando Motor Off-Thread...</h3>
        <p>Cargando índices FTS5 y base de datos local</p>
      </div>
    )
  }

  return <AppShell initialData={initialData} worker={worker} />
}

export default App
