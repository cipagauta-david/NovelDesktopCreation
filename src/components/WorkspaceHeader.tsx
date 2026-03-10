import type { PanelKey, Project, WorkspaceView } from '../types/workspace'

type WorkspaceHeaderProps = {
  project: Project | undefined
  searchQuery: string
  workspaceView: WorkspaceView
  panels: Record<PanelKey, boolean>
  onSearchChange: (value: string) => void
  onViewChange: (view: WorkspaceView) => void
  onTogglePanel: (panel: PanelKey) => void
}

export function WorkspaceHeader({
  project,
  searchQuery,
  workspaceView,
  panels,
  onSearchChange,
  onViewChange,
  onTogglePanel,
}: WorkspaceHeaderProps) {
  return (
    <header className="workspace-header">
      <div className="workspace-title">
        <span className="eyebrow">Proyecto activo</span>
        <h2>{project?.name}</h2>
        <p>{project?.description}</p>
      </div>

      <div className="workspace-tools">
        <div className="toolbar-group">
          <button
            type="button"
            className={panels.sidebar ? 'icon-button active' : 'icon-button'}
            aria-label="Mostrar u ocultar sidebar"
            onClick={() => onTogglePanel('sidebar')}
          >
            ☰
          </button>
          <button
            type="button"
            className={panels.entities ? 'icon-button active' : 'icon-button'}
            aria-label="Mostrar u ocultar panel de entidades"
            onClick={() => onTogglePanel('entities')}
          >
            ≣
          </button>
          <button
            type="button"
            className={panels.inspector ? 'icon-button active' : 'icon-button'}
            aria-label="Mostrar u ocultar inspector"
            onClick={() => onTogglePanel('inspector')}
          >
            ⋮
          </button>
        </div>

        <label className="search-box">
          <span>Buscar</span>
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Título, tag, alias, field o contenido"
          />
        </label>

        <div className="segmented-control">
          <button
            type="button"
            className={workspaceView === 'editor' ? 'active' : ''}
            onClick={() => onViewChange('editor')}
          >
            Editor
          </button>
          <button
            type="button"
            className={workspaceView === 'graph' ? 'active' : ''}
            onClick={() => onViewChange('graph')}
          >
            Grafo
          </button>
        </div>
      </div>
    </header>
  )
}
