import type { CSSProperties } from 'react'
import { Skeleton, Spinner } from '@nextui-org/react'
import type {
  AiProposal,
  CollectionTab,
  EntityTemplate,
  EntityRecord,
  LlmStreamStatus,
  LlmTraceEntry,
} from '../../../types/workspace'
import { resolveCollectionColor } from '../../../utils/collectionColors'
import { buildSnippet } from '../../../utils/search'
import { getStableNumber } from '../../../utils/stableVisual'
import { formatTimestamp } from '../../../utils/workspace'
import { ActionRow } from '../../common/ActionRow'
import { EmptyMiniState } from '../../common/EmptyMiniState'
import { HistoryList } from '../../common/HistoryList'
import { PanelSection } from '../../common/PanelSection'
import { Button } from '../../ui/Button'

type InspectorContextTabProps = {
  activeTab: CollectionTab | null
  collections: CollectionTab[]
  activeTemplates: EntityTemplate[]
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
  collections,
  activeTemplates,
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
              <Button className="primary-button btn--default" type="button" onClick={onConfirmProposal}>
                Confirmar
              </Button>
              <Button type="button" className="ghost-button btn--ghost" onClick={onDismissProposal}>
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
              <Spinner
                size="sm"
                color="current"
                classNames={{ base: 'text-[var(--brand-accent)]', circle1: 'border-b-[var(--brand-accent)]', circle2: 'border-b-[var(--brand-accent)]' }}
              />
              <span>Recibiendo tokens...</span>
            </div>
            {streamingText ? (
              <p className="streaming-preview">{streamingText.slice(-400)}</p>
            ) : (
              <div className="streaming-skeleton" aria-hidden="true">
                <Skeleton className="rounded-full h-[0.7rem] w-full" />
                <Skeleton className="rounded-full h-[0.7rem] w-[86%]" />
                <Skeleton className="rounded-full h-[0.7rem] w-[68%]" />
              </div>
            )}
            <Button type="button" className="ghost-button destructive-text btn--ghost" onClick={onStopGeneration}>
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
            {referencedEntities.map((entity) => {
              const moduleCollection = collections.find((collection) => collection.id === entity.tabId)
              const moduleTemplate = activeTemplates.find((template) => template.id === entity.templateId)
              const moduleName = moduleCollection?.name ?? moduleTemplate?.name.split(/[\s/]+/)[0] ?? 'Entidad'
              const moduleColor = resolveCollectionColor(moduleCollection?.id ?? entity.tabId, moduleCollection?.color)

              return (
              <article
                key={entity.id}
                className="reference-card-mini"
                style={{
                  '--card-rot': `${getStableNumber(`ref-card-${entity.id}`, -0.24, 0.24, 2)}deg`,
                  '--tape-tilt': `${getStableNumber(`ref-tape-${entity.id}`, -9, 9, 1)}deg`,
                  '--reference-accent': moduleColor,
                } as CSSProperties}
              >
                <div className="reference-module-row" aria-label="Modulo al que pertenece">
                  <span className="reference-module-pill">{moduleName}</span>
                </div>
                <strong>{entity.title}</strong>
                <p>{buildSnippet(entity, entity.title)}</p>
                <div className="reference-badges" aria-label="Información del enlace">
                  {entity.fields.slice(0, 3).map((field) => (
                    <span key={field.id} className="reference-badge">
                      {field.key}
                    </span>
                  ))}
                  {entity.fields.length === 0 && <span className="reference-badge">Sin propiedades</span>}
                </div>
              </article>
              )
            })}
          </div>
        ) : (
          <EmptyMiniState>Todavia no has enlazado referencias desde el texto actual.</EmptyMiniState>
        )}
      </PanelSection>
    </>
  )
}
