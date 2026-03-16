import type { DraftState, EntityRecord, EntityTemplate, Project } from '../../../types/workspace'
import { formatTimestamp } from '../../../utils/workspace'
import { PanelSection } from '../../common/PanelSection'

type InspectorMetaTabProps = {
  activeEntity: EntityRecord | null
  activeDraft: DraftState | null
  activeProject?: Project
  activeTemplate?: EntityTemplate
  activeEntityRelations: Project['relations']
  relationTargetId: string
  relationType: string
  relationLabel: string
  onRelationTargetIdChange: (value: string) => void
  onRelationTypeChange: (value: string) => void
  onRelationLabelChange: (value: string) => void
  onAddRelation: (sourceEntityId: string, targetEntityId: string, relationType: string, label?: string) => void
  onRemoveRelation: (relationId: string) => void
}

export function InspectorMetaTab({
  activeEntity,
  activeDraft,
  activeProject,
  activeTemplate,
  activeEntityRelations,
  relationTargetId,
  relationType,
  relationLabel,
  onRelationTargetIdChange,
  onRelationTypeChange,
  onRelationLabelChange,
  onAddRelation,
  onRemoveRelation,
}: InspectorMetaTabProps) {
  const relations = activeEntityRelations ?? []

  return (
    <PanelSection title="Metadatos de la entidad" meta={activeEntity?.title ?? 'Sin entidad activa'}>
      {activeDraft && activeEntity ? (
        <>
          <div className="meta-summary-list">
            <div className="meta-summary-item">
              <span>Plantilla</span>
              <strong>{activeTemplate?.name ?? 'Sin plantilla'}</strong>
            </div>
            <div className="meta-summary-item">
              <span>Etiquetas</span>
              <strong>{activeDraft.tagsText || 'Sin etiquetas'}</strong>
            </div>
            <div className="meta-summary-item">
              <span>Alias</span>
              <strong>{activeDraft.aliasesText || 'Sin alias'}</strong>
            </div>
            <div className="meta-summary-item">
              <span>Ultima edicion</span>
              <strong>{formatTimestamp(activeEntity.updatedAt)}</strong>
            </div>
            <div className="meta-summary-item">
              <span>Propiedades</span>
              <strong>{activeDraft.fields.length}</strong>
            </div>
            <div className="meta-summary-item">
              <span>Assets visuales</span>
              <strong>{activeEntity.assets.length}</strong>
            </div>
          </div>

          <PanelSection title="Relaciones de dominio" meta={`${relations.length} salientes`} defaultOpen={false}>
            <div className="stacked-form">
              <select value={relationTargetId} onChange={(event) => onRelationTargetIdChange(event.target.value)}>
                <option value="">Selecciona entidad destino</option>
                {(activeProject?.entities ?? [])
                  .filter((entity) => entity.id !== activeEntity.id && entity.status === 'active')
                  .map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.title}
                    </option>
                  ))}
              </select>
              <input
                value={relationType}
                onChange={(event) => onRelationTypeChange(event.target.value)}
                placeholder="Tipo (ej. mentor_de)"
              />
              <input
                value={relationLabel}
                onChange={(event) => onRelationLabelChange(event.target.value)}
                placeholder="Etiqueta opcional"
              />
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  if (!relationTargetId.trim() || !relationType.trim()) {
                    return
                  }
                  onAddRelation(activeEntity.id, relationTargetId, relationType, relationLabel)
                  onRelationLabelChange('')
                }}
              >
                Crear relacion
              </button>
            </div>

            {relations.length > 0 ? (
              <div className="history-list">
                {relations.map((relation) => {
                  const target = activeProject?.entities.find((entity) => entity.id === relation.targetEntityId)
                  return (
                    <article key={relation.id} className="history-item">
                      <strong>
                        {relation.relationType} → {target?.title ?? relation.targetEntityId}
                      </strong>
                      <p>{relation.label ?? 'Sin etiqueta'}</p>
                      <button
                        type="button"
                        className="ghost-button compact-button"
                        onClick={() => onRemoveRelation(relation.id)}
                      >
                        Eliminar
                      </button>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="empty-mini-state">No hay relaciones formales para esta entidad.</div>
            )}
          </PanelSection>
        </>
      ) : (
        <div className="empty-mini-state">Abre una entidad para ver sus metadatos.</div>
      )}
    </PanelSection>
  )
}
