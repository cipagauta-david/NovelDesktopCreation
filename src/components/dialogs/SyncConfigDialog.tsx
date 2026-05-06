import { useEffect, useState } from 'react'
import { StackedDialog } from './StackedDialog'
import { Button } from '../ui/Button'
import type { SyncRemoteConfig } from '../../types/workspace'
import '../../styles/common/BentoFields.css'

type SyncConfigDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  syncRemoteConfig: SyncRemoteConfig | undefined
  defaultWorkspaceId: string
  onSave: (config: { endpoint: string; workspaceId: string; token: string }) => void
}

export function SyncConfigDialog({
  open,
  onOpenChange,
  syncRemoteConfig,
  defaultWorkspaceId,
  onSave,
}: SyncConfigDialogProps) {
  const [endpoint, setEndpoint] = useState('')
  const [workspaceId, setWorkspaceId] = useState('')
  const [token, setToken] = useState('')

  useEffect(() => {
    if (open) {
      setEndpoint(syncRemoteConfig?.endpoint ?? '')
      setWorkspaceId(syncRemoteConfig?.workspaceId ?? defaultWorkspaceId)
      setToken('') // always clear token on open for security
    }
  }, [open, syncRemoteConfig, defaultWorkspaceId])

  return (
    <StackedDialog open={open} onOpenChange={onOpenChange} title="Configurar sync remoto">
      <div className="field-bento-grid">
        <div className="field-bento-card">
          <label className="field-key-label" htmlFor="sync-endpoint-input">Endpoint remoto</label>
          <input id="sync-endpoint-input" className="field-value-input" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://api.example.com" />
        </div>
        <div className="field-bento-card">
          <label className="field-key-label" htmlFor="sync-workspace-id-input">Workspace ID remoto</label>
          <input id="sync-workspace-id-input" className="field-value-input" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} placeholder="workspace-id" />
        </div>
        <div className="field-bento-card">
          <label className="field-key-label" htmlFor="sync-token-input">Token bearer remoto</label>
          <input id="sync-token-input" className="field-value-input" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Bearer token (opcional para rotación)" />
        </div>
      </div>
      <Button
        type="button"
        className="primary-button btn--default"
        onClick={() => { onSave({ endpoint, workspaceId, token }); onOpenChange(false) }}
      >Guardar configuración</Button>
    </StackedDialog>
  )
}
