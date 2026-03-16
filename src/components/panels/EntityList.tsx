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
  arrayMove,
} from '@dnd-kit/sortable'

import type { EntityRecord, EntityTemplate } from '../../types/workspace'
import { EmptyMiniState } from '../common/EmptyMiniState'
import { PanelSection } from '../common/PanelSection'
import { Button } from '../ui/Button'
import { EntityComposer } from './entityList/EntityComposer'
import { SortableEntityCard } from './entityList/SortableEntityCard'
import '../../styles/panels/EntityList.css';

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
    <section className="entity-column">
      <PanelSection
        title={title}
        meta={`${count} entidades`}
        actions={
          <Button type="button" variant="ghost" className="ghost-button compact-button" onClick={() => setShowComposer((current) => !current)}>
            {showComposer ? 'Cerrar' : 'Crear entidad'}
          </Button>
        }
      >
        <div className="entity-list-layout">
          {showComposer && (
            <EntityComposer
              templates={templates}
              selectedTemplateId={selectedTemplateId}
              onTemplateChange={onTemplateChange}
              onCreateEntity={onCreateEntity}
            />
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
            <EmptyMiniState>Aún no hay entidades en esta colección. Crea la primera para empezar a escribir.</EmptyMiniState>
          )}
        </div>
      </PanelSection>
    </section>
  )
})
