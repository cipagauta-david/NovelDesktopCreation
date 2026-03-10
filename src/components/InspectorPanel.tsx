import type { AiProposal, CollectionTab, EntityRecord, HistoryEvent, Project } from '../types/workspace'
import { formatTimestamp } from '../utils/workspace'
import { PanelSection } from './common/PanelSection'

type InspectorPanelProps = {
  activeTab: CollectionTab | null
  activeEntity: EntityRecord | null
  activeProject?: Project
  pendingProposal: AiProposal | null
  onUpdateTabPrompt: (prompt: string) => void
  onConfirmProposal: () => void
  onDismissProposal: () => void
}

function renderHistory(items: HistoryEvent[]) {
  return (
    <div className="history-list">
      {items.map((event) => (
        <article key={event.id} className="history-item">
          <strong>{event.label}</strong>
          <p>{event.details}</p>
          <small>
            {event.actorType} · {formatTimestamp(event.timestamp)}
          </small>
        </article>
      ))}
    </div>
  )
}

export function InspectorPanel({
  activeTab,
  activeEntity,
  activeProject,
  pendingProposal,
  onUpdateTabPrompt,
  onConfirmProposal,
  onDismissProposal,
}: InspectorPanelProps) {
  return (
    <aside className="inspector-column">
      <PanelSection
        title="Prompt por tab"
        meta={
          <small>
            {activeTab?.icon} {activeTab?.name}
          </small>
        }
      >
        <textarea
          value={activeTab?.prompt ?? ''}
          onChange={(event) => onUpdateTabPrompt(event.target.value)}
        />
      </PanelSection>

      {pendingProposal && (
        <PanelSection title="Acción IA pendiente" meta="Requiere confirmación explícita">
          <div className="proposal-card">
            <h4>{pendingProposal.title}</h4>
            <p>{pendingProposal.summary}</p>
            <ul>
              <li>Append editorial listo para aplicar</li>
              <li>Nueva nota derivada con continuidad</li>
              <li>
                {pendingProposal.fieldToAdd
                  ? `Nuevo field: ${pendingProposal.fieldToAdd.key}`
                  : 'No requiere field extra'}
              </li>
            </ul>
            <div className="toolbar-group">
              <button className="primary-button" type="button" onClick={onConfirmProposal}>
                Confirmar
              </button>
              <button type="button" className="ghost-button" onClick={onDismissProposal}>
                Descartar
              </button>
            </div>
          </div>
        </PanelSection>
      )}

      <PanelSection
        title="Historial visible"
        meta={`${activeEntity?.history.length ?? 0} eventos`}
        defaultOpen={false}
      >
        {activeEntity ? renderHistory(activeEntity.history) : <div className="empty-mini-state">Sin entidad activa.</div>}
      </PanelSection>

      <PanelSection
        title="Actividad del proyecto"
        meta={`${activeProject?.history.length ?? 0} eventos`}
        defaultOpen={false}
      >
        {activeProject ? renderHistory(activeProject.history.slice(0, 10)) : null}
      </PanelSection>
    </aside>
  )
}
