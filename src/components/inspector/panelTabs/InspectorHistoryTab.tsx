import type { EntityRecord, Project } from '../../../types/workspace'
import { EmptyMiniState } from '../../common/EmptyMiniState'
import { PanelSection } from '../../common/PanelSection'
import { InspectorHistory } from '../InspectorHistory'

type InspectorHistoryTabProps = {
  activeEntity: EntityRecord | null
  activeProject?: Project
}

export function InspectorHistoryTab({ activeEntity, activeProject }: InspectorHistoryTabProps) {
  return (
    <>
      <PanelSection title="Historial de la entidad" meta={`${activeEntity?.history.length ?? 0} eventos`}>
        {activeEntity ? <InspectorHistory items={activeEntity.history} /> : <EmptyMiniState>Sin entidad activa.</EmptyMiniState>}
      </PanelSection>

      <PanelSection title="Actividad reciente del proyecto" meta={`${activeProject?.history.length ?? 0} eventos`}>
        {activeProject ? (
          <InspectorHistory items={activeProject.history.slice(0, 10)} />
        ) : (
          <EmptyMiniState>Sin proyecto activo.</EmptyMiniState>
        )}
      </PanelSection>
    </>
  )
}
