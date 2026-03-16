import type { DraftState, EntityRecord, EntityTemplate, Project } from '../../../types/workspace'
import { formatTimestamp } from '../../../utils/workspace'
import { EmptyMiniState } from '../../common/EmptyMiniState'
import { Field } from '../../common/Field'
import { FormStack } from '../../common/FormStack'
import { HistoryList } from '../../common/HistoryList'
import { PanelSection } from '../../common/PanelSection'
import { SummaryGrid } from '../../common/SummaryGrid'
import { Button } from '../../ui/Button'

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
  const summaryItems = [
    { label: 'Plantilla', value: activeTemplate?.name ?? 'Sin plantilla' },
    { label: 'Etiquetas', value: activeDraft?.tagsText || 'Sin etiquetas' },
    { label: 'Alias', value: activeDraft?.aliasesText || 'Sin alias' },
    { label: 'Ultima edicion', value: activeEntity ? formatTimestamp(activeEntity.updatedAt) : '-' },
    { label: 'Propiedades', value: activeDraft?.fields.length ?? 0 },
    { label: 'Assets visuales', value: activeEntity?.assets.length ?? 0 },
  ]

  return (
    <PanelSection title="Metadatos de la entidad" meta={activeEntity?.title ?? 'Sin entidad activa'}>
      {activeDraft && activeEntity ? (
        <>
          <SummaryGrid items={summaryItems} />

          <PanelSection title="Relaciones de dominio" meta={`${relations.length} salientes`} defaultOpen={false}>
            <FormStack>
              <Field label={<span className="visually-hidden">Entidad destino</span>}>
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
              </Field>
              <Field label={<span className="visually-hidden">Tipo de relación</span>}>
                <input
                  value={relationType}
                  onChange={(event) => onRelationTypeChange(event.target.value)}
                  placeholder="Tipo (ej. mentor_de)"
                />
              </Field>
              <Field label={<span className="visually-hidden">Etiqueta de relación</span>}>
                <input
                  value={relationLabel}
                  onChange={(event) => onRelationLabelChange(event.target.value)}
                  placeholder="Etiqueta opcional"
                />
              </Field>
              <Button
                type="button"
                variant="primary"
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
              </Button>
            </FormStack>

            {relations.length > 0 ? (
              <HistoryList
                items={relations}
                getKey={(relation) => relation.id}
                renderItem={(relation) => {
                  const target = activeProject?.entities.find((entity) => entity.id === relation.targetEntityId)

                  return (
                    <>
                      <strong>
                        {relation.relationType} → {target?.title ?? relation.targetEntityId}
                      </strong>
                      <p>{relation.label ?? 'Sin etiqueta'}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        className="ghost-button compact-button"
                        onClick={() => onRemoveRelation(relation.id)}
                      >
                        Eliminar
                      </Button>
                    </>
                  )
                }}
              />
            ) : (
              <EmptyMiniState>No hay relaciones formales para esta entidad.</EmptyMiniState>
            )}
          </PanelSection>
        </>
      ) : (
        <EmptyMiniState>Abre una entidad para ver sus metadatos.</EmptyMiniState>
      )}
    </PanelSection>
  )
}
