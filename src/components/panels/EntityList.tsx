import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
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
  archivedEntities: EntityRecord[]
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
  archivedEntities,
  activeEntityId,
  templates,
  selectedTemplateId,
  onTemplateChange,
  onCreateEntity,
  onSelectEntity,
  onReorderEntities,
}: EntityListProps) {
  const [showComposer, setShowComposer] = useState(false)
  const [isSectionOpen, setIsSectionOpen] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const parentRef = useRef<HTMLDivElement | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)
      if (!over || active.id === over.id || !onReorderEntities) return
      const oldIndex = entities.findIndex((e) => e.id === active.id)
      const newIndex = entities.findIndex((e) => e.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(entities, oldIndex, newIndex)
      onReorderEntities(reordered.map((e) => e.id))
    },
    [entities, onReorderEntities],
  )

  // Medir el tamaño real de cada item después de renderizar
  const measureElement = useCallback((element: Element | null) => {
    if (!element) return 0
    return (element as HTMLElement).getBoundingClientRect().height
  }, [])

  const rowVirtualizer = useVirtualizer({
    count: entities.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 86,
    overscan: 3,
    measureElement,
  })

  useEffect(() => {
    if (!isSectionOpen) {
      return
    }
    // Recalcula las medidas al reabrir para evitar lista virtual vacia.
    const rafId = window.requestAnimationFrame(() => {
      rowVirtualizer.measure()
    })
    return () => window.cancelAnimationFrame(rafId)
  }, [isSectionOpen, entities.length, rowVirtualizer])

  return (
    <section className="entity-column">
      <PanelSection
        title={title}
        meta={`${count} entidades`}
        open={isSectionOpen}
        onOpenChange={setIsSectionOpen}
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={entities.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                <div ref={parentRef} className="entity-list-scrollable">
                  <div
                    style={{
                      height: `${rowVirtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const entity = entities[virtualRow.index]
                      if (!entity) return null
                      const isDragging = activeId === entity.id

                      return (
                        <div
                          key={entity.id}
                          data-index={virtualRow.index}
                          ref={rowVirtualizer.measureElement}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            transform: `translateY(${virtualRow.start}px)`,
                            zIndex: isDragging ? 999 : 'auto',
                            opacity: isDragging ? 0.5 : 1,
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
            <EmptyMiniState>Aún no hay entidades activas en esta colección.</EmptyMiniState>
          )}
        </div>
      </PanelSection>

      {/* Panel de Entidades Archivadas */}
      <PanelSection
        title="Bandeja de Archivo"
        meta={`${archivedEntities.length} entidades`}
        open={false}
        defaultOpen={false}
      >
        <div style={{ padding: '0.5rem 0' }}>
          {archivedEntities.length > 0 ? (
             archivedEntities.map((entity) => (
               <div key={entity.id} style={{ opacity: 0.7, marginBottom: '0.5rem' }}>
                 <SortableEntityCard
                   entity={entity}
                   isActive={entity.id === activeEntityId}
                   onSelect={() => onSelectEntity(entity.id, entity.tabId)}
                 />
               </div>
             ))
          ) : (
             <EmptyMiniState>No hay entidades archivadas.</EmptyMiniState>
          )}
        </div>
      </PanelSection>
    </section>
  )
})
