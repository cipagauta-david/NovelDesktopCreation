import { useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
  CommandGroup,
} from '@/components/ui/command'
import type { SearchResult } from '../../types/workspace'
import '../../styles/overlays/CommandPalette.css'

interface CommandPaletteProps {
  searchQuery: string
  searchResults: SearchResult[]
  onSearchChange: (query: string) => void
  onSelectResult: (entityId: string, tabId: string) => void
  onClose: () => void
}

const resolveResultIcon = (title: string, snippet: string) => {
  const bag = `${title} ${snippet}`.toLowerCase()
  if (bag.includes('personaje')) return '👤'
  if (bag.includes('capitulo') || bag.includes('escena')) return '📖'
  if (bag.includes('lugar') || bag.includes('ciudad')) return '📍'
  return '✦'
}

export function CommandPalette({ searchQuery, searchResults, onSearchChange, onSelectResult, onClose }: CommandPaletteProps) {
  const resultsRef = useRef<HTMLDivElement | null>(null)
  const rowVirtualizer = useVirtualizer({
    count: searchResults.length,
    getScrollElement: () => resultsRef.current,
    estimateSize: () => 92,
    overscan: 6,
  })

  // cmdk handles focus automatically when open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && searchResults[0]) {
        onSelectResult(searchResults[0].entityId, searchResults[0].tabId)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [searchResults, onSelectResult])

  return (
    <CommandDialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <CommandInput
        placeholder="Buscar personajes, lugares, escenas o texto"
        value={searchQuery}
        onValueChange={onSearchChange}
      />
      <CommandList>
        <CommandEmpty>No encontramos coincidencias.</CommandEmpty>
        {searchResults.length > 0 && (
          <CommandGroup>
            <div
              ref={resultsRef}
              style={{ overflowY: 'auto', maxHeight: 420, position: 'relative' }}
            >
              <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const result = searchResults[virtualRow.index]
                  if (!result) return null
                  return (
                    <CommandItem
                      key={result.entityId}
                      value={result.entityId}
                      onSelect={() => onSelectResult(result.entityId, result.tabId)}
                      className="grid grid-cols-[auto_1fr_auto] gap-3 items-center"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <span aria-hidden="true">{resolveResultIcon(result.title, result.snippet)}</span>
                      <div className="grid gap-0.5 text-left">
                        <strong>{result.title}</strong>
                        <span className="text-muted-foreground text-xs">{result.snippet}</span>
                      </div>
                      <small className="text-muted-foreground text-xs">Enter</small>
                    </CommandItem>
                  )
                })}
              </div>
            </div>
          </CommandGroup>
        )}
      </CommandList>
      <div className="command-palette-footer" aria-hidden="true">
        <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
        <span><kbd>↵</kbd> abrir</span>
        <span><kbd>esc</kbd> cerrar</span>
      </div>
    </CommandDialog>
  )
}
