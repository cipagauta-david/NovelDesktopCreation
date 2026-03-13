import type { Project, WorkspaceView } from '../../types/workspace'
import { useTheme } from '../../hooks/useTheme'

type WorkspaceHeaderProps = {
  project: Project | undefined
  searchResultsCount: number
  workspaceView: WorkspaceView
  godMode: boolean
  leftPanelOpen: boolean
  inspectorOpen: boolean
  hasActiveSearch: boolean
  onOpenSearch: () => void
  onViewChange: (view: WorkspaceView) => void
  onToggleGodMode: () => void
  onToggleLeftPanel: () => void
  onToggleInspector: () => void
}

export function WorkspaceHeader({
  project,
  searchResultsCount,
  workspaceView,
  godMode,
  leftPanelOpen,
  inspectorOpen,
  hasActiveSearch,
  onOpenSearch,
  onViewChange,
  onToggleGodMode,
  onToggleLeftPanel,
  onToggleInspector,
}: WorkspaceHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()

  const handleToggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const navItems: Array<{
    key: string
    label: string
    active: boolean
    onClick: () => void
  }> = [
    {
      key: 'navigation',
      label: 'Navegación',
      active: leftPanelOpen,
      onClick: onToggleLeftPanel,
    },
    {
      key: 'writing',
      label: 'Escritura',
      active: workspaceView === 'editor',
      onClick: () => onViewChange('editor'),
    },
    {
      key: 'map',
      label: 'Mapa',
      active: workspaceView === 'graph',
      onClick: () => onViewChange('graph'),
    },
    {
      key: 'context',
      label: 'Contexto',
      active: inspectorOpen,
      onClick: onToggleInspector,
    },
  ]

  return (
    <header className="workspace-header">
      <div className="workspace-header-title">
        <div className="workspace-project-meta">
          <span className="eyebrow">Proyecto</span>
          <strong>{project?.name ?? 'Proyecto narrativo'}</strong>
          <small>{project?.description ?? 'Escribe y conecta escenas, personajes y lugares.'}</small>
        </div>
      </div>

      <div className="workspace-header-actions">
        <div className="workspace-header-primary-actions minimal-header-actions">
          <nav className="workspace-header-nav" aria-label="Vistas del workspace">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={item.active ? 'workspace-nav-item active' : 'workspace-nav-item'}
                onClick={item.onClick}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            className={godMode ? 'header-utility-button active' : 'header-utility-button'}
            onClick={onToggleGodMode}
            aria-pressed={godMode}
          >
            {godMode ? 'Modo mapa' : 'God Mode'}
          </button>

          <button
            type="button"
            className="header-utility-button"
            onClick={handleToggleTheme}
            aria-label={resolvedTheme === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
            title={resolvedTheme === 'dark' ? 'Modo Parchment (Día)' : 'Modo Obsidian Ink (Noche)'}
          >
            <span className="theme-switcher-icon minimal-theme-icon" aria-hidden="true">
              {resolvedTheme === 'dark' ? '☀' : '☽'}
            </span>
          </button>

          <button
            type="button"
            className={hasActiveSearch ? 'header-search-trigger active' : 'header-search-trigger'}
            onClick={onOpenSearch}
          >
            <span>Buscar…</span>
            <small>Ctrl+K</small>
          </button>
        </div>

        <div className="workspace-status">
          {hasActiveSearch
            ? `${searchResultsCount} coincidencia${searchResultsCount === 1 ? '' : 's'}`
            : project?.updatedAt
              ? 'Todo en contexto'
              : 'Listo para escribir'}
        </div>
      </div>
    </header>
  )
}
