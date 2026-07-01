import { useEffect, useState, useRef } from 'react'
import { AppShell } from './components/layout/AppShell'
import ErrorBoundary from './components/ErrorBoundary'
import { OnboardingScreen } from './components/onboarding/OnboardingScreen'
import { useAppWorker } from './hooks/useAppWorker'
import { ThemeProvider, useTheme } from './hooks/useTheme'
import { getDefaultPersistedState } from './data/seed/project'
import type { PersistedState } from './types/workspace'
import { getStateStorageAdapterDirect } from './platform/stateStorageAdapter'
import './styles/App.css';

// Detectar runtime desktop
function isDesktopRuntime(): boolean {
  const bridge = (globalThis as { __NOVEL_DESKTOP__?: { platform?: string } }).__NOVEL_DESKTOP__
  const isDesktop = bridge?.platform === 'desktop'
  console.log('[App] Bridge check:', bridge, 'isDesktop:', isDesktop)
  return isDesktop
}

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
                streamEnabled: payload.streamEnabled ?? true,
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
        <AppShell key={`${initialData.activeProjectId}-${worker ? 'r' : 'n'}`} initialData={initialData} worker={worker} />
      </ErrorBoundary>
    </div>
  )
}

export default App
