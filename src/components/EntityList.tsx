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
  const [showComposer, setShowComposer] = useState(true)

  return (
    <aside className="entity-column">
      <PanelSection
        title={title}
        meta={`${count} entidades`}
        actions={
          <button type="button" className="ghost-button" onClick={() => setShowComposer((current) => !current)}>
            {showComposer ? 'Ocultar alta' : 'Mostrar alta'}
          </button>
        }
      >
        {showComposer && (
          <div className="stacked-form">
            <label className="compact-label">
              Template base
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
            <button className="primary-button" type="button" onClick={onCreateEntity}>
              Nueva entidad
            </button>
          </div>
        )}

        <div className="entity-list">
          {entities.map((entity) => (
            <button
              key={entity.id}
              type="button"
              className={entity.id === activeEntityId ? 'list-card active' : 'list-card'}
              onClick={() => onSelectEntity(entity.id, entity.tabId)}
            >
              <strong>{entity.title}</strong>
              <span>{entity.fields.map((field) => field.key).slice(0, 3).join(' · ') || 'Sin fields aún'}</span>
              <small>rev {entity.revision}</small>
            </button>
          ))}
        </div>
      </PanelSection>
    </aside>
  )
}
