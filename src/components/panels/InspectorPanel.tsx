import { memo, useMemo, useState } from 'react'

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
import { DockPanelScaffold } from '../common/DockPanelScaffold'
import { InspectorContextTab } from '../inspector/panelTabs/InspectorContextTab'
import { InspectorHistoryTab } from '../inspector/panelTabs/InspectorHistoryTab'
import { InspectorMetaTab } from '../inspector/panelTabs/InspectorMetaTab'
import { InspectorMetricsTab } from '../inspector/panelTabs/InspectorMetricsTab'
import '../../styles/panels/InspectorPanel.css';



type InspectorPanelProps = {
  side?: 'left' | 'right'
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

type InspectorPanelTab = 'context' | 'meta' | 'history' | 'metrics'

const INSPECTOR_TAB_OPTIONS: ReadonlyArray<{ id: InspectorPanelTab; label: string }> = [
  { id: 'context', label: 'Contexto' },
  { id: 'meta', label: 'Metadatos' },
  { id: 'history', label: 'Historial' },
  { id: 'metrics', label: 'Metricas' },
]

export const InspectorPanel = memo(function InspectorPanel({
  side = 'right',
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
  const [activePanelTab, setActivePanelTab] = useState<InspectorPanelTab>('context')
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

  return (
    <DockPanelScaffold
      side={side}
      eyebrow="Contexto"
      collapseLabel="Ocultar contexto"
      onCollapse={onCollapse}
      tabs={
        <label className="dock-panel-tab-select-wrap">
          <span className="visually-hidden">Secciones del inspector</span>
          <select
            className="dock-panel-tab-select"
            aria-label="Secciones del inspector"
            value={activePanelTab}
            onChange={(event) => setActivePanelTab(event.target.value as InspectorPanelTab)}
          >
            {INSPECTOR_TAB_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
      }
      className="inspector-panel-root"
    >
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
    </DockPanelScaffold>
  )
})