import type {
  AiProposal,
  CollectionTab,
  EntityRecord,
  LlmStreamStatus,
  LlmTraceEntry,
} from '../../../types/workspace'
import { buildSnippet } from '../../../utils/search'
import { formatTimestamp } from '../../../utils/workspace'
import { ActionRow } from '../../common/ActionRow'
import { EmptyMiniState } from '../../common/EmptyMiniState'
import { HistoryList } from '../../common/HistoryList'
import { PanelSection } from '../../common/PanelSection'
import { Button } from '../../ui/Button'

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
            <ActionRow>
              <Button className="primary-button" variant="primary" type="button" onClick={onConfirmProposal}>
                Confirmar
              </Button>
              <Button type="button" variant="ghost" className="ghost-button" onClick={onDismissProposal}>
                Descartar
              </Button>
            </ActionRow>
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
            {streamingText ? (
              <p className="streaming-preview">{streamingText.slice(-400)}</p>
            ) : (
              <div className="streaming-skeleton" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            )}
            <Button type="button" variant="ghost" className="ghost-button destructive-text" onClick={onStopGeneration}>
              ■ Detener generacion
            </Button>
          </div>
        </PanelSection>
      )}

      {llmTraces.length > 0 && (
        <PanelSection title="Trazas de IA" meta={`${llmTraces.length} registros`} defaultOpen={false}>
          <HistoryList
            items={llmTraces.slice(0, 10)}
            getKey={(trace) => trace.id}
            renderItem={(trace) => (
              <>
                <strong>
                  {trace.provider} · {trace.model}
                </strong>
                <p>{trace.responseSnippet.slice(0, 120) || '(sin respuesta)'}</p>
                <small>
                  {trace.status} · {trace.durationMs}ms · ~{trace.tokenEstimate} tokens ·{' '}
                  {formatTimestamp(trace.timestamp)}
                </small>
              </>
            )}
          />
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
          <EmptyMiniState>Todavia no has enlazado referencias desde el texto actual.</EmptyMiniState>
        )}
      </PanelSection>
    </>
  )
}
