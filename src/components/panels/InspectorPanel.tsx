import { memo, useMemo, useState, type FormEvent } from 'react'

import type {
  AiProposal,
  CollectionTab,
  CorrelationReport,
  DraftState,
  EntityRecord,
  EntityTemplate,
  HistoryEvent,
  LlmStreamStatus,
  LlmTraceEntry,
  Project,
  StateCheckpoint,
  SyncQueueStats,
  SyncRemoteConfig,
} from '../../types/workspace'
import { getReferenceTokens } from '../../utils/references'
import { buildSnippet } from '../../utils/search'
import { formatTimestamp } from '../../utils/workspace'
import { PanelSection } from '../common/PanelSection'
import { InspectorAssistantComposer } from '../inspector/InspectorAssistantComposer'
import { InspectorHistory } from '../inspector/InspectorHistory'
import { InspectorMetricsDashboard } from '../inspector/InspectorMetricsDashboard'
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
  syncStatus: string
  syncStats?: SyncQueueStats
  syncRemoteConfig?: SyncRemoteConfig
  checkpoints: StateCheckpoint[]
  correlationReports: CorrelationReport[]
  onUpdateTabPrompt: (prompt: string) => void
  onConfirmProposal: () => void
  onDismissProposal: () => void
  onStopGeneration: () => void
  onFlushRemoteSync: () => Promise<unknown>
  onConfigureRemoteSync: () => Promise<void>
  onClearRemoteSyncCredential: () => Promise<void>
  onRestoreCheckpoint: (checkpointId: string) => void
  onRotateProviderCredential: () => Promise<void>
  onInvalidateProviderCredential: () => Promise<void>
  onRefreshVaultMetadata: () => Promise<void>
  onAddRelation: (sourceEntityId: string, targetEntityId: string, relationType: string, label?: string) => void
  onRemoveRelation: (relationId: string) => void
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
  syncStatus,
  syncStats,
  syncRemoteConfig,
  checkpoints,
  correlationReports,
  onUpdateTabPrompt,
  onConfirmProposal,
  onDismissProposal,
  onStopGeneration,
  onFlushRemoteSync,
  onConfigureRemoteSync,
  onClearRemoteSyncCredential,
  onRestoreCheckpoint,
  onRotateProviderCredential,
  onInvalidateProviderCredential,
  onRefreshVaultMetadata,
  onAddRelation,
  onRemoveRelation,
  onCollapse,
}: InspectorPanelProps) {
  const [activePanelTab, setActivePanelTab] = useState<'context' | 'meta' | 'history' | 'metrics'>('context')
  const [assistantDraft, setAssistantDraft] = useState('')
  const [relationTargetId, setRelationTargetId] = useState('')
  const [relationType, setRelationType] = useState('relates_to')
  const [relationLabel, setRelationLabel] = useState('')
  const activeTemplate = activeTemplates.find((template) => template.id === activeDraft?.templateId)
  const projectRelations = activeProject?.relations ?? []
  const activeEntityRelations = activeEntity
    ? projectRelations.filter((relation) => relation.sourceEntityId === activeEntity.id)
    : []
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

                <PanelSection title="Relaciones de dominio" meta={`${activeEntityRelations.length} salientes`} defaultOpen={false}>
                  <div className="stacked-form">
                    <select value={relationTargetId} onChange={(event) => setRelationTargetId(event.target.value)}>
                      <option value="">Selecciona entidad destino</option>
                      {(activeProject?.entities ?? [])
                        .filter((entity) => entity.id !== activeEntity.id && entity.status === 'active')
                        .map((entity) => (
                          <option key={entity.id} value={entity.id}>{entity.title}</option>
                        ))}
                    </select>
                    <input value={relationType} onChange={(event) => setRelationType(event.target.value)} placeholder="Tipo (ej. mentor_de)" />
                    <input value={relationLabel} onChange={(event) => setRelationLabel(event.target.value)} placeholder="Etiqueta opcional" />
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => {
                        if (!relationTargetId.trim() || !relationType.trim()) return
                        onAddRelation(activeEntity.id, relationTargetId, relationType, relationLabel)
                        setRelationLabel('')
                      }}
                    >
                      Crear relación
                    </button>
                  </div>

                  {activeEntityRelations.length > 0 ? (
                    <div className="history-list">
                      {activeEntityRelations.map((relation) => {
                        const target = activeProject?.entities.find((entity) => entity.id === relation.targetEntityId)
                        return (
                          <article key={relation.id} className="history-item">
                            <strong>{relation.relationType} → {target?.title ?? relation.targetEntityId}</strong>
                            <p>{relation.label ?? 'Sin etiqueta'}</p>
                            <button type="button" className="ghost-button compact-button" onClick={() => onRemoveRelation(relation.id)}>
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

        {activePanelTab === 'metrics' && (
          <>
            <PanelSection title="Métricas operativas" meta={`${llmTraces.length} trazas`}>
              <InspectorMetricsDashboard traces={llmTraces} />
            </PanelSection>

            <PanelSection title="Sync remoto" meta={syncStatus} defaultOpen={false}>
              <div className="toolbar-group">
                <button type="button" className="primary-button" onClick={() => void onFlushRemoteSync()}>
                  Flush remoto
                </button>
                <button type="button" className="ghost-button" onClick={() => void onConfigureRemoteSync()}>
                  Configurar
                </button>
                <button type="button" className="ghost-button" onClick={() => void onClearRemoteSyncCredential()}>
                  Borrar token
                </button>
              </div>
              <div className="meta-summary-list">
                <div className="meta-summary-item"><span>Endpoint</span><strong>{syncRemoteConfig?.endpoint ?? 'No configurado'}</strong></div>
                <div className="meta-summary-item"><span>Workspace</span><strong>{syncRemoteConfig?.workspaceId ?? '-'}</strong></div>
                <div className="meta-summary-item"><span>Token</span><strong>{syncRemoteConfig?.authTokenHint ?? '-'}</strong></div>
                <div className="meta-summary-item"><span>Pendientes</span><strong>{syncStats?.pending ?? 0}</strong></div>
                <div className="meta-summary-item"><span>Retries</span><strong>{syncStats?.retries ?? 0}</strong></div>
                <div className="meta-summary-item"><span>Poison</span><strong>{syncStats?.poisoned ?? 0}</strong></div>
                <div className="meta-summary-item"><span>Conflictos</span><strong>{syncStats?.conflictsResolved ?? 0}</strong></div>
              </div>
            </PanelSection>

            <PanelSection title="Vault IA" meta="Operaciones" defaultOpen={false}>
              <div className="toolbar-group">
                <button type="button" className="ghost-button" onClick={() => void onRotateProviderCredential()}>Rotar key</button>
                <button type="button" className="ghost-button" onClick={() => void onInvalidateProviderCredential()}>Invalidar key</button>
                <button type="button" className="ghost-button" onClick={() => void onRefreshVaultMetadata()}>Ver metadata</button>
              </div>
            </PanelSection>

            <PanelSection title="Correlation reports" meta={`${correlationReports.length} registros`} defaultOpen={false}>
              {correlationReports.slice(0, 10).map((report) => (
                <article key={report.correlationId} className="history-item">
                  <strong>{report.intent} · {report.status}</strong>
                  <small>{report.correlationId}</small>
                </article>
              ))}
            </PanelSection>

            <PanelSection title="Checkpoints" meta={`${checkpoints.length} disponibles`} defaultOpen={false}>
              {checkpoints.slice(0, 10).map((checkpoint) => (
                <article key={checkpoint.id} className="history-item">
                  <strong>{checkpoint.label}</strong>
                  <small>{formatTimestamp(checkpoint.createdAt)}</small>
                  <button type="button" className="ghost-button compact-button" onClick={() => onRestoreCheckpoint(checkpoint.id)}>
                    Restaurar
                  </button>
                </article>
              ))}
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