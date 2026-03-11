import type { Project, WorkspaceView } from '../types/workspace'

type WorkspaceHeaderProps = {
  className?: string
  project: Project | undefined
  searchResultsCount: number
  workspaceView: WorkspaceView
  leftPanelOpen: boolean
  inspectorOpen: boolean
  hasActiveSearch: boolean
  onOpenSearch: () => void
  onViewChange: (view: WorkspaceView) => void
  onToggleLeftPanel: () => void
  onToggleInspector: () => void
}

export function WorkspaceHeader({
  className,
  project,
  searchResultsCount,
  workspaceView,
  leftPanelOpen,
  inspectorOpen,
  hasActiveSearch,
  onOpenSearch,
  onViewChange,
  onToggleLeftPanel,
  onToggleInspector,
}: WorkspaceHeaderProps) {
  return (
    <header className={className ? `workspace-header ${className}` : 'workspace-header'}>
      <div className="workspace-header-title">
        <button
          type="button"
          className={leftPanelOpen ? 'toggle-chip active' : 'toggle-chip'}
          onClick={onToggleLeftPanel}
        >
          Navegación
        </button>

        <div className="workspace-project-meta">
          <span className="eyebrow">Proyecto</span>
          <strong>{project?.name ?? 'Proyecto narrativo'}</strong>
          <small>{project?.description ?? 'Escribe y conecta escenas, personajes y lugares.'}</small>
        </div>
      </div>

      <div className="workspace-header-actions">
        <div className="workspace-status">
          {hasActiveSearch
            ? `${searchResultsCount} coincidencia${searchResultsCount === 1 ? '' : 's'}`
            : project?.updatedAt
              ? 'Todo en contexto'
              : 'Listo para escribir'}
        </div>

        <button
          type="button"
          className={hasActiveSearch ? 'search-trigger active' : 'search-trigger'}
          onClick={onOpenSearch}
        >
          <span>Buscar…</span>
          <small>Ctrl+K</small>
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
      </div>
    </header>
  )
}
