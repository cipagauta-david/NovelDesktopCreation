import { memo } from 'react'
import type { EntityRecord } from '../../../types/workspace'
import { formatTimestamp } from '../../../utils/workspace'
import { resolveCollectionColor } from '../../../utils/collectionColors'
import '../../../styles/editor/panel/EntityHover.css';



type HoverPosition = {
  left: number
  top: number
}

type EntityHoverProps = {
  position: HoverPosition | null
  entity: EntityRecord | null
}

// V0ID_NOTE: memo is critical here — this popover is inside the document section and
// re-renders on every mousemove otherwise, since hoveredReference position updates frequently.
export const EntityHover = memo(function EntityHover({ position, entity }: EntityHoverProps) {
  if (!position || !entity) {
    return null
  }

  const preview = entity.content.trim()

  return (
    <aside
      className="entity-hover-popover"
      style={{
        ['--hover-x' as string]: `${position.left}px`,
        ['--hover-y' as string]: `${position.top}px`,
        ['--entity-pill-accent' as string]: resolveCollectionColor(entity.id),
      }}
      aria-live="polite"
    >
      <span className="entity-hover-avatar" aria-hidden="true">◉</span>
      <span className="eyebrow">Entidad referenciada</span>
      <strong>{entity.title}</strong>
      <p>
        {preview
          ? `${preview.slice(0, 170)}${preview.length > 170 ? '…' : ''}`
          : 'Sin contenido descriptivo.'}
      </p>
      <div className="entity-hover-meta">
        <span>rev {entity.revision}</span>
        <span>{formatTimestamp(entity.updatedAt)}</span>
      </div>
      {entity.tags.length > 0 && <small>{entity.tags.slice(0, 4).map((tag) => `#${tag}`).join(' ')}</small>}
    </aside>
  )
})
