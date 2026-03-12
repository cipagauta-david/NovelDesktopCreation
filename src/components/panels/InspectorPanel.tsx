import { memo, useMemo, useState, type FormEvent } from 'react'

import type {
  AiProposal,
  CollectionTab,
  DraftState,
  EntityRecord,
  EntityTemplate,
  HistoryEvent,
  LlmStreamStatus,
  LlmTraceEntry,
  Project,
} from '../../types/workspace'
import { getReferenceTokens } from '../../utils/references'
import { buildSnippet } from '../../utils/search'
import { formatTimestamp } from '../../utils/workspace'
import { PanelSection } from '../common/PanelSection'
import { InspectorAssistantComposer } from '../inspector/InspectorAssistantComposer'
import { InspectorHistory } from '../inspector/InspectorHistory'
import { InspectorTabs } from '../inspector/InspectorTabs'

type InspectorPanelProps = {
  activeTab: CollectionTab | null
  activeEntity: EntityRecord | null
  activeDraft: DraftState | null
  activeProject?: Project
  activeTemplates: EntityTemplate[]
  pendingProposal: AiProposal | null
  streamStatus: LlmStreamStatus
  streamingText: string
  llmTraces: LlmTraceEntry[]
  onUpdateTabPrompt: (prompt: string) => void
  onConfirmProposal: () => void
  onDismissProposal: () => void
  onStopGeneration: () => void
  onCollapse: () => void
}

function renderHistory(items: HistoryEvent[]) {
  return <InspectorHistory items={items} />
}

export const InspectorPanel = memo(function InspectorPanel({
  activeTab,
  activeEntity,
  activeDraft,
  activeProject,
  activeTemplates,
  pendingProposal,
  streamStatus,
  streamingText,
  llmTraces,
  onUpdateTabPrompt,
  onConfirmProposal,
  onDismissProposal,
  onStopGeneration,
  onCollapse,
}: InspectorPanelProps) {
  const [activePanelTab, setActivePanelTab] = useState<'context' | 'meta' | 'history'>('context')
  const [assistantDraft, setAssistantDraft] = useState('')
  const activeTemplate = activeTemplates.find((template) => template.id === activeDraft?.templateId)
  const referencedEntities = useMemo(() => {
    if (!activeDraft || !activeProject) {
      return []
    }

    const uniqueIds = Array.from(new Set(getReferenceTokens(activeDraft.content).map((token) => token.entityId)))
    return uniqueIds
      .map((entityId) => activeProject.entities.find((entity) => entity.id === entityId))
      .filter((entity): entity is EntityRecord => Boolean(entity))
  }, [activeDraft, activeProject])

  function handleAssistantSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextPrompt = assistantDraft.trim()
    if (!nextPrompt) {
      return
    }

    const basePrompt = activeTab?.prompt?.trim() ?? ''
    const mergedPrompt = `${basePrompt}${basePrompt ? '\n\n' : ''}Solicitud reciente del autor:\n${nextPrompt}`
    onUpdateTabPrompt(mergedPrompt)
    setAssistantDraft('')
  }

  return (
    <aside className="inspector-column ghosting-panel">
      <div className="inspector-sticky-head">
        <div className="panel-dock-header panel-dock-header-right">
          <button type="button" className="panel-dock-toggle" aria-label="Ocultar contexto" onClick={onCollapse}>
            ›
          </button>
          <span className="eyebrow">Contexto</span>
        </div>

        <InspectorTabs activeTab={activePanelTab} onChange={setActivePanelTab} />
      </div>

      <div className="inspector-scroll-area">
        {activePanelTab === 'context' && (
          <>
            <PanelSection
              title="Instrucciones de la colección"
              meta={
                <small>
                  {activeTab?.icon} {activeTab?.name}
                </small>
              }
              defaultOpen={false}
            >
              <textarea
                value={activeTab?.prompt ?? ''}
                onChange={(event) => onUpdateTabPrompt(event.target.value)}
              />
            </PanelSection>

            {pendingProposal && (
              <PanelSection title="Sugerencia pendiente" meta="Necesita tu confirmación antes de aplicarse">
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
              <PanelSection title="Generando con IA…" meta="Streaming activo">
                <div className="proposal-card streaming-card">
                  <div className="streaming-indicator">
                    <span className="streaming-dot" />
                    <span>Recibiendo tokens…</span>
                  </div>
                  {streamingText && (
                    <p className="streaming-preview">{streamingText.slice(-400)}</p>
                  )}
                  <button type="button" className="ghost-button destructive-text" onClick={onStopGeneration}>
                    ■ Detener generación
                  </button>
                </div>
              </PanelSection>
            )}

            {llmTraces.length > 0 && (
              <PanelSection title="Trazas de IA" meta={`${llmTraces.length} registros`} defaultOpen={false}>
                <div className="history-list">
                  {llmTraces.slice(0, 10).map((trace) => (
                    <article key={trace.id} className="history-item">
                      <strong>{trace.provider} · {trace.model}</strong>
                      <p>{trace.responseSnippet.slice(0, 120) || '(sin respuesta)'}</p>
                      <small>
                        {trace.status} · {trace.durationMs}ms · ~{trace.tokenEstimate} tokens · {formatTimestamp(trace.timestamp)}
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
                      <small>{entity.fields.map((field) => field.key).slice(0, 3).join(' · ') || 'Sin propiedades'}</small>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-mini-state">Todavía no has enlazado referencias desde el texto actual.</div>
              )}
            </PanelSection>
          </>
        )}

        {activePanelTab === 'meta' && (
          <PanelSection title="Metadatos de la entidad" meta={activeEntity?.title ?? 'Sin entidad activa'}>
            {activeDraft && activeEntity ? (
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
                  <span>Última edición</span>
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
            ) : (
              <div className="empty-mini-state">Abre una entidad para ver sus metadatos.</div>
            )}
          </PanelSection>
        )}

        {activePanelTab === 'history' && (
          <>
            <PanelSection title="Historial de la entidad" meta={`${activeEntity?.history.length ?? 0} eventos`}>
              {activeEntity ? renderHistory(activeEntity.history) : <div className="empty-mini-state">Sin entidad activa.</div>}
            </PanelSection>

            <PanelSection title="Actividad reciente del proyecto" meta={`${activeProject?.history.length ?? 0} eventos`}>
              {activeProject ? renderHistory(activeProject.history.slice(0, 10)) : <div className="empty-mini-state">Sin proyecto activo.</div>}
            </PanelSection>
          </>
        )}
      </div>

      {activePanelTab === 'context' && (
        <InspectorAssistantComposer
          value={assistantDraft}
          streamStatus={streamStatus}
          onChange={setAssistantDraft}
          onSubmit={handleAssistantSubmit}
          onStopGeneration={onStopGeneration}
        />
      )}
    </aside>
  )
})