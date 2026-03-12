import { useEffect, useRef } from 'react'
import type { SearchResult } from '../types/workspace'

interface CommandPaletteProps {
  searchQuery: string
  searchResults: SearchResult[]
  onSearchChange: (query: string) => void
  onSelectResult: (entityId: string, tabId: string) => void
  onClose: () => void
}

export function CommandPalette({ searchQuery, searchResults, onSearchChange, onSelectResult, onClose }: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frameId)
  }, [])

  return (
    <div className="command-palette-backdrop" onClick={onClose}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-label="Buscar dentro del proyecto" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette-header">
          <label className="command-palette-input-wrap">
            <span className="visually-hidden">Buscar dentro del proyecto</span>
            <input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchResults[0]) {
                  e.preventDefault()
                  onSelectResult(searchResults[0].entityId, searchResults[0].tabId)
                }
              }}
              placeholder="Buscar personajes, lugares, escenas o texto"
            />
          </label>
          <button type="button" className="toggle-chip" onClick={onClose}>Esc</button>
        </div>

        <div className="command-palette-body">
          {searchQuery.trim() ? (
            searchResults.length > 0 ? (
              <div className="command-palette-results">
                {searchResults.map((r) => (
                  <button key={r.entityId} type="button" className="search-result command-result" onClick={() => onSelectResult(r.entityId, r.tabId)}>
                    <strong>{r.title}</strong>
                    <span>{r.snippet}</span>
                    <small>Abrir entidad</small>
                  </button>
                ))}
              </div>
            ) : <div className="search-results-empty">No encontramos coincidencias.</div>
          ) : (
            <div className="command-palette-empty">
              <strong>Buscar sin robar espacio vertical</strong>
              <p>Usa Ctrl+K o Cmd+K para abrir esta paleta.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
