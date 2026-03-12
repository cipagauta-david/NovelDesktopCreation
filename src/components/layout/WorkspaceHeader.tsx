import type { Project, WorkspaceView } from '../../types/workspace'

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
        <div className="workspace-header-primary-actions">
          <button
            type="button"
            className={leftPanelOpen ? 'toggle-chip active' : 'toggle-chip'}
            onClick={onToggleLeftPanel}
          >
            Navegación
          </button>

          <div className="segmented-control">
            <button
              type="button"
              className={workspaceView === 'editor' ? 'active' : ''}
              onClick={() => onViewChange('editor')}
            >
              Escritura
            </button>
            <button
              type="button"
              className={workspaceView === 'graph' ? 'active' : ''}
              onClick={() => onViewChange('graph')}
            >
              Mapa
            </button>
          </div>

          <button
            type="button"
            className={inspectorOpen ? 'toggle-chip active' : 'toggle-chip'}
            onClick={onToggleInspector}
          >
            Contexto
          </button>

          <button
            type="button"
            className={godMode ? 'mode-switch-pill active' : 'mode-switch-pill'}
            onClick={onToggleGodMode}
            aria-pressed={godMode}
          >
            {godMode ? 'Salir God Mode' : 'God Mode'}
          </button>

          <button
            type="button"
            className={hasActiveSearch ? 'search-trigger active' : 'search-trigger'}
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
