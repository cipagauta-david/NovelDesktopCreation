import type {
  CorrelationReport,
  LlmTraceEntry,
  StateCheckpoint,
  SyncQueueStats,
  SyncRemoteConfig,
} from '../../../types/workspace'
import { formatTimestamp } from '../../../utils/workspace'
import { PanelSection } from '../../common/PanelSection'
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
  return (
    <>
      <PanelSection title="Metricas operativas" meta={`${llmTraces.length} trazas`}>
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
          <div className="meta-summary-item">
            <span>Endpoint</span>
            <strong>{syncRemoteConfig?.endpoint ?? 'No configurado'}</strong>
          </div>
          <div className="meta-summary-item">
            <span>Workspace</span>
            <strong>{syncRemoteConfig?.workspaceId ?? '-'}</strong>
          </div>
          <div className="meta-summary-item">
            <span>Token</span>
            <strong>{syncRemoteConfig?.authTokenHint ?? '-'}</strong>
          </div>
          <div className="meta-summary-item">
            <span>Pendientes</span>
            <strong>{syncStats?.pending ?? 0}</strong>
          </div>
          <div className="meta-summary-item">
            <span>Retries</span>
            <strong>{syncStats?.retries ?? 0}</strong>
          </div>
          <div className="meta-summary-item">
            <span>Poison</span>
            <strong>{syncStats?.poisoned ?? 0}</strong>
          </div>
          <div className="meta-summary-item">
            <span>Conflictos</span>
            <strong>{syncStats?.conflictsResolved ?? 0}</strong>
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Vault IA" meta="Operaciones" defaultOpen={false}>
        <div className="toolbar-group">
          <button type="button" className="ghost-button" onClick={() => void onRotateProviderCredential()}>
            Rotar key
          </button>
          <button type="button" className="ghost-button" onClick={() => void onInvalidateProviderCredential()}>
            Invalidar key
          </button>
          <button type="button" className="ghost-button" onClick={() => void onRefreshVaultMetadata()}>
            Ver metadata
          </button>
        </div>
      </PanelSection>

      <PanelSection title="Correlation reports" meta={`${correlationReports.length} registros`} defaultOpen={false}>
        {correlationReports.slice(0, 10).map((report) => (
          <article key={report.correlationId} className="history-item">
            <strong>
              {report.intent} · {report.status}
            </strong>
            <small>{report.correlationId}</small>
          </article>
        ))}
      </PanelSection>

      <PanelSection title="Checkpoints" meta={`${checkpoints.length} disponibles`} defaultOpen={false}>
        {checkpoints.slice(0, 10).map((checkpoint) => (
          <article key={checkpoint.id} className="history-item">
            <strong>{checkpoint.label}</strong>
            <small>{formatTimestamp(checkpoint.createdAt)}</small>
            <button
              type="button"
              className="ghost-button compact-button"
              onClick={() => onRestoreCheckpoint(checkpoint.id)}
            >
              Restaurar
            </button>
          </article>
        ))}
      </PanelSection>
    </>
  )
}
