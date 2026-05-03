import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

import type { EntityRecord } from '../../../types/workspace'
import { cn } from '@/lib/utils'
import '../../../styles/editor/panel/EditorSuggestions.css';



type EditorSuggestionsProps = {
  active: boolean
  options: EntityRecord[]
  style?: CSSProperties
  onInsertReference: (entity: EntityRecord) => void
}

export const EditorSuggestions = memo(function EditorSuggestions({ active, options, style, onInsertReference }: EditorSuggestionsProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const rowVirtualizer = useVirtualizer({
    count: options.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 58,
    overscan: 5,
  })

  const [activeIndex, setActiveIndex] = useState(0)
  const activeIndexRef = useRef(activeIndex)
  // V0ID_NOTE: sync ref during render, not in a useEffect — avoids the one-frame stale window
  // that would cause Enter to fire the wrong item when the state update hasn't flushed yet.
  activeIndexRef.current = activeIndex

  useEffect(() => {
    setActiveIndex(0)
  }, [options])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!active || options.length === 0) return
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault()
        // V0ID_NOTE: read from ref (not state closure) to avoid stale index; scrollToIndex
        // keeps the virtualizer in sync with keyboard navigation — without it, the user
        // navigates blind into off-screen items.
        const next = (activeIndexRef.current + 1) % options.length
        setActiveIndex(next)
        rowVirtualizer.scrollToIndex(next, { align: 'auto' })
        break
      }
      case 'ArrowUp': {
        event.preventDefault()
        const prev = (activeIndexRef.current - 1 + options.length) % options.length
        setActiveIndex(prev)
        rowVirtualizer.scrollToIndex(prev, { align: 'auto' })
        break
      }
      case 'Enter': {
        event.preventDefault()
        const selected = options[activeIndexRef.current]
        if (selected) onInsertReference(selected)
        break
      }
    }
  }, [active, options, onInsertReference, rowVirtualizer])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!active || options.length === 0) {
    return null
  }

  return (
    <div className="suggestions-popover floating-suggestions-popover surface-glass shadow-glow" style={style} role="listbox" aria-label="Sugerencias de referencias">
      <div className="suggestions-popover-title suggestions-popover-title-neural">Variables Neurales / Sugerencias</div>
      <div ref={parentRef} className="suggestions-scroll-container">
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
                aria-selected={virtualRow.index === activeIndex}
                className={cn('suggestion-item', { active: virtualRow.index === activeIndex })}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onInsertReference(option)}
                onMouseEnter={() => setActiveIndex(virtualRow.index)}
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
})
