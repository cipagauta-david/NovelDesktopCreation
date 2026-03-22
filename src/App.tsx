import { useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import ErrorBoundary from './components/ErrorBoundary'
import { OnboardingScreen } from './components/onboarding/OnboardingScreen'
import { useAppWorker } from './hooks/useAppWorker'
import { ThemeProvider, useTheme } from './hooks/useTheme'
import { getDefaultPersistedState } from './data/seed/project'
import type { PersistedState } from './types/workspace'
import './styles/App.css';



function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

function AppContent() {
  const { resolvedTheme } = useTheme()
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
      <div data-resolved-theme={resolvedTheme} className="surface-panel empty-state app-loading-state">
        <h3>Iniciando Motor Off-Thread...</h3>
        <p>Cargando índices FTS5 y base de datos local</p>
      </div>
    )
  }

  if (!initialData.settings) {
    return (
      <div data-resolved-theme={resolvedTheme}>
        <OnboardingScreen
          onSubmit={(payload) => {
            setInitialData((current) => ({
              ...(current as PersistedState),
              settings: {
                authorName: payload.authorName || 'Autor(a)',
                provider: payload.provider,
                model: payload.model,
                apiKeyHint: payload.apiKey ? `••••${payload.apiKey.slice(-4)}` : 'Modo local',
              },
            }))
          }}
        />
      </div>
    )
  }

  return (
    <div data-resolved-theme={resolvedTheme}>
      <ErrorBoundary>
        <AppShell key={`${initialData.id}-${worker ? 'r' : 'n'}`} initialData={initialData} worker={worker} />
      </ErrorBoundary>
    </div>
  )
}

export default App
