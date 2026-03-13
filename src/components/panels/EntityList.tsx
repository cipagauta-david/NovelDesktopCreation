import { memo, useState, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { EntityRecord, EntityTemplate } from '../../types/workspace'
import { PanelSection } from '../common/PanelSection'

// ── Sortable entity card ──────────────────────────────────

function SortableEntityCard({
  entity,
  isActive,
  onSelect,
}: {
  entity: EntityRecord
  isActive: boolean
  onSelect: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entity.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="sortable-entity-wrapper">
      <button
        type="button"
        className={isActive ? 'list-card active' : 'list-card'}
        onClick={onSelect}
      >
        <span className="drag-handle" {...attributes} {...listeners} title="Arrastra para reordenar">⠿</span>
        <div className="list-card-content">
          <strong>{entity.title}</strong>
          <span>
            {entity.fields.map((field) => field.key).slice(0, 3).join(' · ') || 'Sin propiedades todavía'}
          </span>
          <small>Versión {entity.revision}</small>
        </div>
      </button>
    </div>
  )
}

// ── EntityList with dnd-kit sortable ──────────────────────

type EntityListProps = {
  title: string
  count: number
  entities: EntityRecord[]
  activeEntityId?: string
  templates: EntityTemplate[]
  selectedTemplateId: string
  onTemplateChange: (value: string) => void
  onCreateEntity: () => void
  onSelectEntity: (entityId: string, tabId: string) => void
  onReorderEntities?: (entityIds: string[]) => void
}

export const EntityList = memo(function EntityList({
  title,
  count,
  entities,
  activeEntityId,
  templates,
  selectedTemplateId,
  onTemplateChange,
  onCreateEntity,
  onSelectEntity,
  onReorderEntities,
}: EntityListProps) {
  const [showComposer, setShowComposer] = useState(false)
  const parentRef = useRef<HTMLDivElement | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id || !onReorderEntities) return
      const oldIndex = entities.findIndex((e) => e.id === active.id)
      const newIndex = entities.findIndex((e) => e.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(entities, oldIndex, newIndex)
      onReorderEntities(reordered.map((e) => e.id))
    },
    [entities, onReorderEntities],
  )

  const rowVirtualizer = useVirtualizer({
    count: entities.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 86,
    overscan: 8,
  })

  return (
    <aside className="entity-column">
      <PanelSection
        title={title}
        meta={`${count} entidades`}
        actions={
          <button type="button" className="ghost-button compact-button" onClick={() => setShowComposer((current) => !current)}>
            {showComposer ? 'Cerrar' : 'Crear entidad'}
          </button>
        }
      >
        <div className="entity-list-layout">
          {showComposer && (
            <div className="stacked-form entity-composer">
              <label className="compact-label">
                Plantilla base
                <select
                  value={selectedTemplateId}
                  onChange={(event) => onTemplateChange(event.target.value)}
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="ghost-button create-entity-button" type="button" onClick={onCreateEntity}>
                Crear entidad
              </button>
            </div>
          )}

          {entities.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={entities.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                <div ref={parentRef} className="entity-list entity-list-scrollable">
                  <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const entity = entities[virtualRow.index]
                      if (!entity) {
                        return null
                      }

                      return (
                        <div
                          key={entity.id}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          <SortableEntityCard
                            entity={entity}
                            isActive={entity.id === activeEntityId}
                            onSelect={() => onSelectEntity(entity.id, entity.tabId)}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="empty-mini-state">
              Aún no hay entidades en esta colección. Crea la primera para empezar a escribir.
            </div>
          )}
        </div>
      </PanelSection>
    </aside>
  )
})
