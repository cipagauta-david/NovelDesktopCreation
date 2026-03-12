import { useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { useAppWorker } from './hooks/useAppWorker'
import { getDefaultPersistedState } from './data/seed'
import type { PersistedState } from './types/workspace'

function App() {
  const { worker, isReady } = useAppWorker()
  const [initialData, setInitialData] = useState<PersistedState | null>(null)

  useEffect(() => {
    if (!worker || !isReady) return

    // Cargar estado inicial desde el worker off-main-thread
    worker.loadState().then((saved: any) => {
      setInitialData(saved ?? getDefaultPersistedState())
    }).catch((err: unknown) => {
      console.error('[App] Fallo recuperando data, inicializando fallback', err)
      setInitialData(getDefaultPersistedState())
    })
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
