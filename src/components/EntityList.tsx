import { useState } from 'react'

import type { EntityRecord, EntityTemplate } from '../types/workspace'
import { PanelSection } from './common/PanelSection'

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
}

export function EntityList({
  title,
  count,
  entities,
  activeEntityId,
  templates,
  selectedTemplateId,
  onTemplateChange,
  onCreateEntity,
  onSelectEntity,
}: EntityListProps) {
  const [showComposer, setShowComposer] = useState(false)

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
            <div className="entity-list entity-list-scrollable">
              {entities.map((entity) => (
                <button
                  key={entity.id}
                  type="button"
                  className={entity.id === activeEntityId ? 'list-card active' : 'list-card'}
                  onClick={() => onSelectEntity(entity.id, entity.tabId)}
                >
                  <strong>{entity.title}</strong>
                  <span>
                    {entity.fields.map((field) => field.key).slice(0, 3).join(' · ') || 'Sin propiedades todavía'}
                  </span>
                  <small>Versión {entity.revision}</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-mini-state">
              Aún no hay entidades en esta colección. Crea la primera para empezar a escribir.
            </div>
          )}
        </div>
      </PanelSection>
    </aside>
  )
}
