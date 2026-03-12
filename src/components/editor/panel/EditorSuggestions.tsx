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
    <div className="suggestions-popover floating-suggestions-popover" style={style}>
      {options.map((option) => (
        <button key={option.id} type="button" onClick={() => onInsertReference(option)}>
          <strong>{option.title}</strong>
          <span>{option.aliases.join(', ') || 'Sin aliases'}</span>
        </button>
      ))}
    </div>
  )
}
