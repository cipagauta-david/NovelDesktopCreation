import type {
  AiProposal,
  CollectionTab,
  EntityRecord,
  LlmStreamStatus,
  LlmTraceEntry,
} from '../../../types/workspace'
import { buildSnippet } from '../../../utils/search'
import { formatTimestamp } from '../../../utils/workspace'
import { PanelSection } from '../../common/PanelSection'

type InspectorContextTabProps = {
  activeTab: CollectionTab | null
  pendingProposal: AiProposal | null
  streamStatus: LlmStreamStatus
  streamingText: string
  llmTraces: LlmTraceEntry[]
  referencedEntities: EntityRecord[]
  onUpdateTabPrompt: (prompt: string) => void
  onConfirmProposal: () => void
  onDismissProposal: () => void
  onStopGeneration: () => void
}

export function InspectorContextTab({
  activeTab,
  pendingProposal,
  streamStatus,
  streamingText,
  llmTraces,
  referencedEntities,
  onUpdateTabPrompt,
  onConfirmProposal,
  onDismissProposal,
  onStopGeneration,
}: InspectorContextTabProps) {
  return (
    <>
      <PanelSection
        title="Instrucciones de la coleccion"
        meta={
          <small>
            {activeTab?.icon} {activeTab?.name}
          </small>
        }
        defaultOpen={false}
      >
        <textarea value={activeTab?.prompt ?? ''} onChange={(event) => onUpdateTabPrompt(event.target.value)} />
      </PanelSection>

      {pendingProposal && (
        <PanelSection title="Sugerencia pendiente" meta="Necesita tu confirmacion antes de aplicarse">
          <div className="proposal-card proposal-card-staged">
            <h4>{pendingProposal.title}</h4>
            <p>{pendingProposal.summary}</p>
            <ul>
              <li>Append editorial listo para aplicar</li>
              <li>Nueva nota derivada con continuidad</li>
              <li>
                {pendingProposal.fieldToAdd
                  ? `Nueva propiedad: ${pendingProposal.fieldToAdd.key}`
                  : 'No requiere propiedad extra'}
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

      {streamStatus === 'streaming' && (
        <PanelSection title="Generando con IA..." meta="Streaming activo">
          <div className="proposal-card streaming-card">
            <div className="streaming-indicator">
              <span className="streaming-dot" />
              <span>Recibiendo tokens...</span>
            </div>
            {streamingText && <p className="streaming-preview">{streamingText.slice(-400)}</p>}
            <button type="button" className="ghost-button destructive-text" onClick={onStopGeneration}>
              ■ Detener generacion
            </button>
          </div>
        </PanelSection>
      )}

      {llmTraces.length > 0 && (
        <PanelSection title="Trazas de IA" meta={`${llmTraces.length} registros`} defaultOpen={false}>
          <div className="history-list">
            {llmTraces.slice(0, 10).map((trace) => (
              <article key={trace.id} className="history-item">
                <strong>
                  {trace.provider} · {trace.model}
                </strong>
                <p>{trace.responseSnippet.slice(0, 120) || '(sin respuesta)'}</p>
                <small>
                  {trace.status} · {trace.durationMs}ms · ~{trace.tokenEstimate} tokens ·{' '}
                  {formatTimestamp(trace.timestamp)}
                </small>
              </article>
            ))}
          </div>
        </PanelSection>
      )}

      <PanelSection title="Referencias en este documento" meta={`${referencedEntities.length} enlazadas`}>
        {referencedEntities.length > 0 ? (
          <div className="reference-card-list">
            {referencedEntities.map((entity) => (
              <article key={entity.id} className="reference-card-mini">
                <strong>{entity.title}</strong>
                <p>{buildSnippet(entity, entity.title)}</p>
                <div className="reference-badges" aria-label="Metadatos de referencia">
                  {entity.fields.slice(0, 3).map((field) => (
                    <span key={field.id} className="reference-badge">
                      {field.key}
                    </span>
                  ))}
                  {entity.fields.length === 0 && <span className="reference-badge">Sin propiedades</span>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-mini-state">Todavia no has enlazado referencias desde el texto actual.</div>
        )}
      </PanelSection>
    </>
  )
}
