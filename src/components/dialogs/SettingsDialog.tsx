import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/Button'
import { FormStack } from '../common/FormStack'
import '../../styles/common/BentoFields.css'

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
          <Button type="button" className={tab === 'llm' ? 'btn--default' : 'btn--ghost'} onClick={() => setTab('llm')}>Modelos LLM</Button>
          <Button type="button" className={tab === 'account' ? 'btn--default' : 'btn--ghost'} onClick={() => setTab('account')}>Cuenta</Button>
          <Button type="button" className={tab === 'editor' ? 'btn--default' : 'btn--ghost'} onClick={() => setTab('editor')}>Editor</Button>
        </div>

        {tab === 'llm' && (
          <FormStack>
            <div className="field-bento-grid">
              <div className="field-bento-card">
                <label className="field-key-label" htmlFor="settings-active-model">Modelo activo</label>
                <input id="settings-active-model" className="field-value-input" value={activeModel} readOnly placeholder="Modelo IA configurado" />
              </div>

              <div className="field-bento-card">
                <label className="field-key-label" htmlFor="settings-provider-key">API key del proveedor</label>
                <input id="settings-provider-key" className="field-value-input" value={providerKey} onChange={(e) => setProviderKey(e.target.value)} placeholder="Introduce tu API key" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button type="button" className="primary-button btn--default" onClick={() => {
                onRotateKey(providerKey)
                setProviderKey('')
              }}>Guardar Key</Button>
              <Button type="button" className="ghost-button btn--ghost" onClick={onInvalidateKey}>Invalidar Key</Button>
            </div>
          </FormStack>
        )}

        {tab === 'account' && (
          <FormStack>
            <div className="field-bento-grid">
              <div className="field-bento-card">
                <label className="field-key-label" htmlFor="settings-active-project">Proyecto activo</label>
                <input id="settings-active-project" className="field-value-input" value={activeProjectName} readOnly />
              </div>

              <div className="field-bento-card">
                <label className="field-key-label" htmlFor="settings-sync-endpoint">Sync remoto</label>
                <input id="settings-sync-endpoint" className="field-value-input" value={syncEndpoint} readOnly />
              </div>
            </div>
            <Button type="button" className="btn--secondary" onClick={onConfigureSync}>Configurar Sync</Button>
          </FormStack>
        )}

        {tab === 'editor' && (
          <FormStack>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-0)' }}>Preferencias de edición. El tema se puede cambiar desde el icono de sol/luna en el header.</p>
            <Button type="button" className="btn--secondary" onClick={() => { onActivateZenMode(); onOpenChange(false) }}>Activar Modo Foco</Button>
          </FormStack>
        )}
      </DialogContent>
    </Dialog>
  )
}
