import type { LlmStreamStatus, Project, WorkspaceView } from '../../types/workspace'
import { useTheme } from '../../hooks/useTheme'
import '../../styles/layout/WorkspaceHeader.css';



type WorkspaceHeaderProps = {
  project: Project | undefined
  activeNodeLabel: string
  activeNodeMeta: string
  aiModelLabel: string
  streamStatus: LlmStreamStatus
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
  project,
  activeNodeLabel,
  activeNodeMeta,
  aiModelLabel,
  streamStatus,
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
  const { resolvedTheme, setTheme } = useTheme()

  const handleToggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const utilityItems: Array<{
    key: string
    label: string
    active: boolean
    onClick: () => void
  }> = [
    {
      key: 'navigation',
      label: 'Paneles',
      active: leftPanelOpen,
      onClick: onToggleLeftPanel,
    },
    {
      key: 'context',
      label: 'Inspector',
      active: inspectorOpen,
      onClick: onToggleInspector,
    },
  ]

  return (
    <header className="workspace-header">
      <div className="workspace-header-context">
        <div className="workspace-project-meta">
          <span className="eyebrow">Nodo activo</span>
          <strong title={activeNodeLabel}>{activeNodeLabel}</strong>
          <small title={activeNodeMeta}>{activeNodeMeta}</small>
        </div>
      </div>

      <div className="workspace-header-command-center">
        <div className="view-mode-toggle command-segmented" role="tablist" aria-label="Modo de vista">
          <button
            type="button"
            className={workspaceView === 'editor' ? 'view-mode-button active' : 'view-mode-button'}
            aria-selected={workspaceView === 'editor'}
            onClick={() => onViewChange('editor')}
          >
            Escritura
          </button>
          <button
            type="button"
            className={workspaceView === 'graph' ? 'view-mode-button active' : 'view-mode-button'}
            aria-selected={workspaceView === 'graph'}
            onClick={() => onViewChange('graph')}
          >
            Mapa
          </button>
          {utilityItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.active ? 'workspace-nav-item active' : 'workspace-nav-item'}
              onClick={item.onClick}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="workspace-header-actions">
        <div className="workspace-header-primary-actions minimal-header-actions">
          <button
            type="button"
            className={hasActiveSearch ? 'header-search-trigger active' : 'header-search-trigger'}
            onClick={onOpenSearch}
            aria-label="Abrir búsqueda global"
          >
            <span>Buscar…</span>
            <small>Ctrl+K</small>
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

          <div className="ai-status-pill" title={`${project?.name ?? 'Proyecto'} · ${aiModelLabel}`}>
            <span
              className={streamStatus === 'streaming' ? 'status-dot is-streaming' : 'status-dot'}
              aria-hidden="true"
            />
            <span>{aiModelLabel}</span>
          </div>
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
