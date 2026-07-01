import type {
  CorrelationReport,
  LlmTraceEntry,
  StateCheckpoint,
  SyncQueueStats,
  SyncRemoteConfig,
} from '../../../types/workspace'
import { formatTimestamp } from '../../../utils/workspace'
import { ActionRow } from '../../common/ActionRow'
import { HistoryList } from '../../common/HistoryList'
import { PanelSection } from '../../common/PanelSection'
import { SummaryGrid } from '../../common/SummaryGrid'
import { Button } from '../../ui/Button'
import { InspectorMetricsDashboard } from '../InspectorMetricsDashboard'

type InspectorMetricsTabProps = {
  llmTraces: LlmTraceEntry[]
  syncStatus: string
  syncStats?: SyncQueueStats
  syncRemoteConfig?: SyncRemoteConfig
  checkpoints: StateCheckpoint[]
  correlationReports: CorrelationReport[]
  onFlushRemoteSync: () => Promise<unknown>
  onConfigureRemoteSync: () => Promise<void>
  onClearRemoteSyncCredential: () => Promise<void>
  onRotateProviderCredential: () => Promise<void>
  onInvalidateProviderCredential: () => Promise<void>
  onRefreshVaultMetadata: () => Promise<void>
  onRestoreCheckpoint: (checkpointId: string) => void
}

export function InspectorMetricsTab({
  llmTraces,
  syncStatus,
  syncStats,
  syncRemoteConfig,
  checkpoints,
  correlationReports,
  onFlushRemoteSync,
  onConfigureRemoteSync,
  onClearRemoteSyncCredential,
  onRotateProviderCredential,
  onInvalidateProviderCredential,
  onRefreshVaultMetadata,
  onRestoreCheckpoint,
}: InspectorMetricsTabProps) {
  const remoteSummaryItems = [
    { label: 'Endpoint', value: syncRemoteConfig?.endpoint ?? 'No configurado' },
    { label: 'Workspace', value: syncRemoteConfig?.workspaceId ?? '-' },
    { label: 'Token', value: syncRemoteConfig?.authTokenHint ?? '-' },
    { label: 'Pendientes', value: syncStats?.pending ?? 0 },
    { label: 'Retries', value: syncStats?.retries ?? 0 },
    { label: 'Poison', value: syncStats?.poisoned ?? 0 },
    { label: 'Conflictos', value: syncStats?.conflictsResolved ?? 0 },
  ]

  return (
    <>
      <PanelSection title="Metricas operativas" meta={`${llmTraces.length} trazas`}>
        <InspectorMetricsDashboard traces={llmTraces} />
      </PanelSection>

      <PanelSection title="Sync remoto" meta={syncStatus} defaultOpen={false}>
        <ActionRow>
          <Button type="button" variant="primary" className="primary-button" onClick={() => void onFlushRemoteSync()}>
            Flush remoto
          </Button>
          <Button type="button" variant="ghost" className="ghost-button" onClick={() => void onConfigureRemoteSync()}>
            Configurar
          </Button>
          <Button type="button" variant="ghost" className="ghost-button" onClick={() => void onClearRemoteSyncCredential()}>
            Borrar token
          </Button>
        </ActionRow>
        <SummaryGrid items={remoteSummaryItems} />
      </PanelSection>

      <PanelSection title="Vault IA" meta="Operaciones" defaultOpen={false}>
        <ActionRow>
          <Button type="button" variant="ghost" className="ghost-button" onClick={() => void onRotateProviderCredential()}>
            Rotar key
          </Button>
          <Button type="button" variant="ghost" className="ghost-button" onClick={() => void onInvalidateProviderCredential()}>
            Borrar key local
          </Button>
          <Button type="button" variant="ghost" className="ghost-button" onClick={() => void onRefreshVaultMetadata()}>
            Ver metadata
          </Button>
        </ActionRow>
      </PanelSection>

      <PanelSection title="Correlation reports" meta={`${correlationReports.length} registros`} defaultOpen={false}>
        <HistoryList
          items={correlationReports.slice(0, 10)}
          getKey={(report) => report.correlationId}
          renderItem={(report) => (
            <>
              <strong>
                {report.intent} · {report.status}
              </strong>
              <small>{report.correlationId}</small>
            </>
          )}
        />
      </PanelSection>

      <PanelSection title="Checkpoints" meta={`${checkpoints.length} disponibles`} defaultOpen={false}>
        <HistoryList
          items={checkpoints.slice(0, 10)}
          getKey={(checkpoint) => checkpoint.id}
          renderItem={(checkpoint) => (
            <>
              <strong>{checkpoint.label}</strong>
              <small>{formatTimestamp(checkpoint.createdAt)}</small>
              <Button
                type="button"
                variant="ghost"
                className="ghost-button compact-button"
                onClick={() => onRestoreCheckpoint(checkpoint.id)}
              >
                Restaurar
              </Button>
            </>
          )}
        />
      </PanelSection>
    </>
  )
}
