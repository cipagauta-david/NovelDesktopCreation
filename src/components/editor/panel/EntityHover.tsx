import type { EntityRecord } from '../../../types/workspace'
import { formatTimestamp } from '../../../utils/workspace'

type HoverPosition = {
  left: number
  top: number
}

type EntityHoverProps = {
  position: HoverPosition | null
  entity: EntityRecord | null
}

export function EntityHover({ position, entity }: EntityHoverProps) {
  if (!position || !entity) {
    return null
  }

  return (
    <aside className="entity-hover-popover" style={{ left: position.left, top: position.top }} aria-live="polite">
      <span className="eyebrow">Entidad referenciada</span>
      <strong>{entity.title}</strong>
      <p>
        {entity.content.trim().slice(0, 170) || 'Sin contenido descriptivo.'}
        {entity.content.trim().length > 170 ? '…' : ''}
      </p>
      <div className="entity-hover-meta">
        <span>rev {entity.revision}</span>
        <span>{formatTimestamp(entity.updatedAt)}</span>
      </div>
      {entity.tags.length > 0 && <small>{entity.tags.slice(0, 4).map((tag) => `#${tag}`).join(' ')}</small>}
    </aside>
  )
}
