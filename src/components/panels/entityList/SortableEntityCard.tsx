import type { CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { EntityRecord } from '../../../types/workspace'
import { ActionMenu } from '../../common/ActionMenu'

type SortableEntityCardProps = {
  entity: EntityRecord
  isActive: boolean
  onSelect: () => void
  onArchive?: () => void
  onDelete?: () => void
  onCreateTemplate?: () => void
}

export function SortableEntityCard({
  entity,
  isActive,
  onSelect,
  onArchive,
  onDelete,
  onCreateTemplate,
}: SortableEntityCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entity.id })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="sortable-entity-wrapper">
      <div className={isActive ? 'list-card-row active' : 'list-card-row'}>
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
        <ActionMenu
          label={`Opciones para ${entity.title}`}
          items={[
            { label: 'Crear template', onSelect: () => onCreateTemplate?.(), disabled: !onCreateTemplate },
            { label: 'Archivar entidad', onSelect: () => onArchive?.(), disabled: !onArchive || entity.status === 'archived' },
            { label: 'Eliminar entidad', onSelect: () => onDelete?.(), disabled: !onDelete, destructive: true },
          ]}
        />
      </div>
    </div>
  )
}
