import { useEffect, useState } from 'react'
import { StackedDialog } from './StackedDialog'
import { Field } from '../common/Field'
import { Button } from '../ui/Button'
import type { SyncRemoteConfig } from '../../types/workspace'

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
      <Field label={<span className="visually-hidden">Endpoint remoto</span>}>
        <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://api.example.com" />
      </Field>
      <Field label={<span className="visually-hidden">Workspace ID remoto</span>}>
        <input value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} placeholder="workspace-id" />
      </Field>
      <Field label={<span className="visually-hidden">Token bearer remoto</span>}>
        <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Bearer token (opcional para rotación)" />
      </Field>
      <Button
        type="button"
        variant="primary"
        className="primary-button"
        onClick={() => { onSave({ endpoint, workspaceId, token }); onOpenChange(false) }}
      >Guardar configuración</Button>
    </StackedDialog>
  )
}
