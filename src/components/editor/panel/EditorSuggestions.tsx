import { useRef, type CSSProperties } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

import type { EntityRecord } from '../../../types/workspace'

type EditorSuggestionsProps = {
  active: boolean
  options: EntityRecord[]
  style?: CSSProperties
  onInsertReference: (entity: EntityRecord) => void
}

export function EditorSuggestions({ active, options, style, onInsertReference }: EditorSuggestionsProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const rowVirtualizer = useVirtualizer({
    count: options.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 58,
    overscan: 5,
  })

  if (!active || options.length === 0) {
    return null
  }

  return (
    <div className="suggestions-popover floating-suggestions-popover surface-glass shadow-glow" style={style} role="listbox" aria-label="Sugerencias de referencias">
      <div className="suggestions-popover-title suggestions-popover-title-neural">Variables Neurales / Sugerencias</div>
      <div ref={parentRef} style={{ maxHeight: 320, overflowY: 'auto' }}>
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const option = options[virtualRow.index]
            if (!option) {
              return null
            }

            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={virtualRow.index === 0}
                className={virtualRow.index === 0 ? 'suggestion-item active' : 'suggestion-item'}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onInsertReference(option)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <strong>{option.title}</strong>
                <span>{option.aliases.join(', ') || 'Sin aliases'}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
