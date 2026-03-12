import type { CSSProperties } from 'react'

import type { EntityRecord } from '../../../types/workspace'

type EditorSuggestionsProps = {
  active: boolean
  options: EntityRecord[]
  style?: CSSProperties
  onInsertReference: (entity: EntityRecord) => void
}

export function EditorSuggestions({ active, options, style, onInsertReference }: EditorSuggestionsProps) {
  if (!active || options.length === 0) {
    return null
  }

  return (
    <div className="suggestions-popover floating-suggestions-popover surface-glass shadow-glow" style={style} role="listbox" aria-label="Sugerencias de referencias">
      <div className="suggestions-popover-title" style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-ghost)', fontSize: '0.85em', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid var(--border-divider)' }}>Variables Neurales / Sugerencias</div>
      {options.map((option, index) => (
        <button
          key={option.id}
          type="button"
          role="option"
          aria-selected={index === 0}
          className={index === 0 ? 'suggestion-item active' : 'suggestion-item'}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onInsertReference(option)}
        >
          <strong>{option.title}</strong>
          <span>{option.aliases.join(', ') || 'Sin aliases'}</span>
        </button>
      ))}
    </div>
  )
}
