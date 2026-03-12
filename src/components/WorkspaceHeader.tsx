import { useEffect, useRef } from 'react'
import type { Project, WorkspaceView, SearchResult } from '../types/workspace'
import { Popover, PopoverTrigger, PopoverContent } from './ui/Popover'

type WorkspaceHeaderProps = {
  project: Project | undefined
  workspaceView: WorkspaceView
  leftPanelOpen: boolean
  inspectorOpen: boolean
  searchQuery: string
  searchResults: SearchResult[]
  searchOpen: boolean
  onSearchChange: (query: string) => void
  onSearchOpenChange: (open: boolean) => void
  onSelectSearchResult: (entityId: string, tabId: string) => void
  onViewChange: (view: WorkspaceView) => void
  onToggleLeftPanel: () => void
  onToggleInspector: () => void
}

export function WorkspaceHeader({
  project,
  workspaceView,
  leftPanelOpen,
  inspectorOpen,
  searchQuery,
  searchResults,
  searchOpen,
  onSearchChange,
  onSearchOpenChange,
  onSelectSearchResult,
  onViewChange,
  onToggleLeftPanel,
  onToggleInspector,
}: WorkspaceHeaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hasActiveSearch = searchQuery.trim().length > 0

  useEffect(() => {
    if (searchOpen) {
      // Pequeno timeout para que el Popover se rendere antes de tomar foco
      const frameId = window.requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
      return () => window.cancelAnimationFrame(frameId)
    }
  }, [searchOpen])

  return (
    <header className="workspace-header">
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
            ? `${searchResults.length} coincidencia${searchResults.length === 1 ? '' : 's'}`
            : project?.updatedAt
              ? 'Todo en contexto'
              : 'Listo para escribir'}
        </div>

        <Popover open={searchOpen} onOpenChange={onSearchOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={hasActiveSearch || searchOpen ? 'search-trigger active' : 'search-trigger'}
            >
              <span>Buscar…</span>
              <small>Ctrl+K</small>
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="center" style={{ width: '420px', padding: 0 }} onOpenAutoFocus={(e) => e.preventDefault()}>
            <div className="command-palette" onClick={(e) => e.stopPropagation()}>
              <div className="command-palette-header" style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <label className="command-palette-input-wrap">
                  <span className="visually-hidden">Buscar dentro del proyecto</span>
                  <input
                    ref={inputRef}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchResults[0]) {
                        e.preventDefault()
                        onSelectSearchResult(searchResults[0].entityId, searchResults[0].tabId)
                      }
                    }}
                    placeholder="Buscar personajes, lugares..."
                    style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', padding: 0, fontSize: '1rem', color: 'var(--text-primary)' }}
                  />
                </label>
              </div>

              <div className="command-palette-body" style={{ maxHeight: '300px', overflowY: 'auto', padding: '0.5rem' }}>
                {searchQuery.trim() ? (
                  searchResults.length > 0 ? (
                    <div className="command-palette-results" style={{ display: 'grid', gap: '4px' }}>
                      {searchResults.map((r) => (
                        <button 
                          key={r.entityId} 
                          type="button" 
                          className="search-result command-result" 
                          onClick={() => onSelectSearchResult(r.entityId, r.tabId)}
                          style={{ border: 'none', textAlign: 'left', padding: '0.75rem', borderRadius: '8px', background: 'transparent', transition: 'background 0.2s', width: '100%' }}
                        >
                          <strong style={{ display: 'block', marginBottom: '2px' }}>{r.title}</strong>
                          <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.snippet || 'Coincidencia'}</span>
                        </button>
                      ))}
                    </div>
                  ) : <div className="search-results-empty" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No encontramos coincidencias.</div>
                ) : (
                  <div className="command-palette-empty" style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Busca personajes, lugares, escenas o texto.</p>
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

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
