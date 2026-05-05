import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Field } from '../common/Field'
import { Button } from '../ui/Button'
import { FormStack } from '../common/FormStack'

type SettingsTab = 'account' | 'llm' | 'editor'

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeModel: string
  activeProjectName: string
  syncEndpoint: string
  onRotateKey: (key: string) => void
  onInvalidateKey: () => void
  onConfigureSync: () => void
  onActivateZenMode: () => void
}

export function SettingsDialog({
  open,
  onOpenChange,
  activeModel,
  activeProjectName,
  syncEndpoint,
  onRotateKey,
  onInvalidateKey,
  onConfigureSync,
  onActivateZenMode,
}: SettingsDialogProps) {
  const [tab, setTab] = useState<SettingsTab>('llm')
  const [providerKey, setProviderKey] = useState('')

  useEffect(() => {
    if (open) {
      setTab('llm')
      setProviderKey('')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Centro de Mando</DialogTitle></DialogHeader>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <Button type="button" variant={tab === 'llm' ? 'primary' : 'ghost'} size="sm" onClick={() => setTab('llm')}>Modelos LLM</Button>
          <Button type="button" variant={tab === 'account' ? 'primary' : 'ghost'} size="sm" onClick={() => setTab('account')}>Cuenta</Button>
          <Button type="button" variant={tab === 'editor' ? 'primary' : 'ghost'} size="sm" onClick={() => setTab('editor')}>Editor</Button>
        </div>

        {tab === 'llm' && (
          <FormStack>
            <Field label="Modelo activo">
              <input value={activeModel} readOnly placeholder="Modelo IA configurado" />
            </Field>
            <Field label="API Key del proveedor">
              <input value={providerKey} onChange={(e) => setProviderKey(e.target.value)} placeholder="Introduce tu API key" />
            </Field>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button type="button" variant="primary" className="primary-button" onClick={() => {
                onRotateKey(providerKey)
                setProviderKey('')
              }}>Guardar Key</Button>
              <Button type="button" variant="ghost" className="ghost-button" onClick={onInvalidateKey}>Invalidar Key</Button>
            </div>
          </FormStack>
        )}

        {tab === 'account' && (
          <FormStack>
            <Field label="Proyecto activo">
              <input value={activeProjectName} readOnly />
            </Field>
            <Field label="Sync remoto">
              <input value={syncEndpoint} readOnly />
            </Field>
            <Button type="button" variant="secondary" onClick={onConfigureSync}>Configurar Sync</Button>
          </FormStack>
        )}

        {tab === 'editor' && (
          <FormStack>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-0)' }}>Preferencias de edición. El tema se puede cambiar desde el icono de sol/luna en el header.</p>
            <Button type="button" variant="secondary" onClick={() => { onActivateZenMode(); onOpenChange(false) }}>Activar Modo Foco</Button>
          </FormStack>
        )}
      </DialogContent>
    </Dialog>
  )
}
