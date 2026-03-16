import { memo, useMemo, useState, type FormEvent } from 'react'

import type {
  AiProposal,
  CollectionTab,
  CorrelationReport,
  DraftState,
  EntityRecord,
  EntityTemplate,
  LlmStreamStatus,
  LlmTraceEntry,
  Project,
  StateCheckpoint,
  SyncQueueStats,
  SyncRemoteConfig,
} from '../../types/workspace'
import { getReferenceTokens } from '../../utils/references'
import { InspectorAssistantComposer } from '../inspector/InspectorAssistantComposer'
import { InspectorContextTab } from '../inspector/panelTabs/InspectorContextTab'
import { InspectorHistoryTab } from '../inspector/panelTabs/InspectorHistoryTab'
import { InspectorMetaTab } from '../inspector/panelTabs/InspectorMetaTab'
import { InspectorMetricsTab } from '../inspector/panelTabs/InspectorMetricsTab'
import { InspectorTabs } from '../inspector/InspectorTabs'
import '../../styles/panels/InspectorPanel.css';



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
          <InspectorContextTab
            activeTab={activeTab}
            pendingProposal={pendingProposal}
            streamStatus={streamStatus}
            streamingText={streamingText}
            llmTraces={llmTraces}
            referencedEntities={referencedEntities}
            onUpdateTabPrompt={onUpdateTabPrompt}
            onConfirmProposal={onConfirmProposal}
            onDismissProposal={onDismissProposal}
            onStopGeneration={onStopGeneration}
          />
        )}

        {activePanelTab === 'meta' && (
          <InspectorMetaTab
            activeEntity={activeEntity}
            activeDraft={activeDraft}
            activeProject={activeProject}
            activeTemplate={activeTemplate}
            activeEntityRelations={activeEntityRelations}
            relationTargetId={relationTargetId}
            relationType={relationType}
            relationLabel={relationLabel}
            onRelationTargetIdChange={setRelationTargetId}
            onRelationTypeChange={setRelationType}
            onRelationLabelChange={setRelationLabel}
            onAddRelation={onAddRelation}
            onRemoveRelation={onRemoveRelation}
          />
        )}

        {activePanelTab === 'history' && (
          <InspectorHistoryTab activeEntity={activeEntity} activeProject={activeProject} />
        )}

        {activePanelTab === 'metrics' && (
          <InspectorMetricsTab
            llmTraces={llmTraces}
            syncStatus={syncStatus}
            syncStats={syncStats}
            syncRemoteConfig={syncRemoteConfig}
            checkpoints={checkpoints}
            correlationReports={correlationReports}
            onFlushRemoteSync={onFlushRemoteSync}
            onConfigureRemoteSync={onConfigureRemoteSync}
            onClearRemoteSyncCredential={onClearRemoteSyncCredential}
            onRotateProviderCredential={onRotateProviderCredential}
            onInvalidateProviderCredential={onInvalidateProviderCredential}
            onRefreshVaultMetadata={onRefreshVaultMetadata}
            onRestoreCheckpoint={onRestoreCheckpoint}
          />
        )}
      </div>

      {activePanelTab === 'context' && (
        <div className="inspector-composer-dock">
          <InspectorAssistantComposer
            value={assistantDraft}
            streamStatus={streamStatus}
            onChange={setAssistantDraft}
            onSubmit={handleAssistantSubmit}
            onStopGeneration={onStopGeneration}
          />
        </div>
      )}
    </aside>
  )
})