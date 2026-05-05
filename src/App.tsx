import { AppShell } from './components/layout/AppShell'
import ErrorBoundary from './components/ErrorBoundary'
import { OnboardingGate } from './components/onboarding/OnboardingGate'
import { useAppWorker } from './hooks/useAppWorker'
import { ThemeProvider, useTheme } from './hooks/useTheme'
import { useAppInitialData } from './hooks/useAppInitialData'
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
  const { initialData, setInitialData } = useAppInitialData(worker, isReady)

  if (!worker || !initialData) {
    return (
      <div data-resolved-theme={resolvedTheme} className="surface-panel empty-state app-loading-state">
        <h3>Iniciando Motor Off-Thread...</h3>
        <p>Cargando índices FTS5 y base de datos local</p>
      </div>
    )
  }

  return (
    <div data-resolved-theme={resolvedTheme}>
      <OnboardingGate initialData={initialData} onComplete={setInitialData}>
        <ErrorBoundary>
          <AppShell key={`${initialData.activeProjectId}-${worker ? 'r' : 'n'}`} initialData={initialData} worker={worker} />
        </ErrorBoundary>
      </OnboardingGate>
    </div>
  )
}

export default App
