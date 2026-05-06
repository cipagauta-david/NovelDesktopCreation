import type { CSSProperties } from 'react'
import type { RefToken } from '../../types/workspace'
import '../../styles/editor/sketchVariable.css'

interface SketchVariableProps {
  token: RefToken
  accentColor?: string
}

/**
 * Atom — renders a `{{entity:id|label}}` reference token as an organic
 * "sketch marker" inline element.  The visual effect is achieved with:
 *   • a parallelogram clip-path (`--sketch-wobble`) for the highlight
 *   • a wavy underline in `--sketch-underline-color`
 *   • idle opacity (`--sketch-opacity`) that resolves to 1 on hover/focus
 */
export function SketchVariable({ token, accentColor }: SketchVariableProps) {
  return (
    <span
      className="sketch-variable"
      contentEditable={false}
      spellCheck={false}
      data-entity-id={token.entityId}
      style={accentColor ? ({
        '--reference-accent': accentColor,
        '--reference-accent-hover': accentColor,
      } as CSSProperties) : undefined}
      title={`Referencia: ${token.label}`}
    >
      {token.label}
    </span>
  )
}
