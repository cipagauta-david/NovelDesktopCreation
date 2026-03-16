import type { CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { EntityRecord } from '../../../types/workspace'

type SortableEntityCardProps = {
  entity: EntityRecord
  isActive: boolean
  onSelect: () => void
}

export function SortableEntityCard({ entity, isActive, onSelect }: SortableEntityCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entity.id })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="sortable-entity-wrapper">
      <button type="button" className={isActive ? 'list-card active' : 'list-card'} onClick={onSelect}>
        <span className="drag-handle" {...attributes} {...listeners} title="Arrastra para reordenar">
          ⠿
        </span>
        <div className="list-card-content">
          <strong>{entity.title}</strong>
          <span>{entity.fields.map((field) => field.key).slice(0, 3).join(' · ') || 'Sin propiedades todavia'}</span>
          <small>Version {entity.revision}</small>
        </div>
      </button>
    </div>
  )
}
