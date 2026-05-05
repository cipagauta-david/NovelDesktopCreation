import { memo } from 'react'
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

export const WorkspaceHeader = memo(function WorkspaceHeader({
  project,
  activeNodeLabel,
  activeNodeMeta,
  aiModelLabel,
  streamStatus,
  searchResultsCount,
  workspaceView,
  hasActiveSearch,
  onOpenSearch,
  onViewChange,
}: WorkspaceHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()

  const handleToggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="workspace-header">
      {/* ─── Breadcrumb ─── */}
      <div className="workspace-header-breadcrumb">
        <span className="breadcrumb-project" title={project?.name}>{project?.name ?? 'Proyecto'}</span>
        <span className="breadcrumb-separator" aria-hidden="true">›</span>
        <span className="breadcrumb-node" title={activeNodeLabel}>{activeNodeLabel}</span>
        <small className="breadcrumb-meta">{activeNodeMeta}</small>
      </div>

      {/* ─── Center: Minimal View Toggle ─── */}
      <div className="workspace-header-center">
        <div className="view-mode-toggle" role="tablist" aria-label="Modo de vista">
          <button
            type="button"
            className={workspaceView === 'editor' ? 'view-mode-button active' : 'view-mode-button'}
            aria-selected={workspaceView === 'editor'}
            onClick={() => onViewChange('editor')}
          >
            ✎ <span>Escribir</span>
          </button>
          <button
            type="button"
            className={workspaceView === 'graph' ? 'view-mode-button active' : 'view-mode-button'}
            aria-selected={workspaceView === 'graph'}
            onClick={() => onViewChange('graph')}
          >
            ◎ <span>Mapa</span>
          </button>
        </div>
      </div>

      {/* ─── Right utilities ─── */}
      <div className="workspace-header-actions">
        <button
          type="button"
          className={hasActiveSearch ? 'header-search-trigger active' : 'header-search-trigger'}
          onClick={onOpenSearch}
          aria-label="Buscar"
        >
          <span>Buscar…</span>
          <small>⌘K</small>
        </button>

        <button
          type="button"
          className="header-utility-button"
          onClick={handleToggleTheme}
          aria-label={resolvedTheme === 'dark' ? 'Modo día' : 'Modo noche'}
          title={resolvedTheme === 'dark' ? 'Zen Cream' : 'Obsidian Blue'}
        >
          <span aria-hidden="true">
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

        {hasActiveSearch && (
          <small className="workspace-status">
            {searchResultsCount} coincidencia{searchResultsCount === 1 ? '' : 's'}
          </small>
        )}
      </div>
    </header>
  )
})
