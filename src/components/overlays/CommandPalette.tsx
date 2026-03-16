import { useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { SearchResult } from '../../types/workspace'
import '../../styles/overlays/CommandPalette.css';



interface CommandPaletteProps {
  searchQuery: string
  searchResults: SearchResult[]
  onSearchChange: (query: string) => void
  onSelectResult: (entityId: string, tabId: string) => void
  onClose: () => void
}

export function CommandPalette({ searchQuery, searchResults, onSearchChange, onSelectResult, onClose }: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const resultsRef = useRef<HTMLDivElement | null>(null)
  const rowVirtualizer = useVirtualizer({
    count: searchResults.length,
    getScrollElement: () => resultsRef.current,
    estimateSize: () => 92,
    overscan: 6,
  })

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frameId)
  }, [])

  const resolveResultIcon = (title: string, snippet: string) => {
    const bag = `${title} ${snippet}`.toLowerCase()
    if (bag.includes('personaje')) return '👤'
    if (bag.includes('capitulo') || bag.includes('escena')) return '📖'
    if (bag.includes('lugar') || bag.includes('ciudad')) return '📍'
    return '✦'
  }

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
              <div ref={resultsRef} className="command-palette-results" style={{ overflowY: 'auto', maxHeight: 420 }}>
                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const result = searchResults[virtualRow.index]
                    if (!result) {
                      return null
                    }

                    return (
                      <button
                        key={result.entityId}
                        type="button"
                        className="search-result command-result"
                        onClick={() => onSelectResult(result.entityId, result.tabId)}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <span className="command-result-icon" aria-hidden="true">{resolveResultIcon(result.title, result.snippet)}</span>
                        <div className="command-result-copy">
                          <strong>{result.title}</strong>
                          <span>{result.snippet}</span>
                        </div>
                        <small className="command-result-shortcut">Enter</small>
                      </button>
                    )
                  })}
                </div>
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
