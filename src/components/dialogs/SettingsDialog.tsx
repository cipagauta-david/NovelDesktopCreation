import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { FormStack } from '../common/FormStack'
import { providerModels } from '../../data/constants'
import type { Provider } from '../../types/workspace'
import '../../styles/common/BentoFields.css'

type SettingsTab = 'account' | 'llm' | 'editor'

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeProvider: Provider
  activeModel: string
  streamEnabled: boolean
  activeProjectName: string
  syncEndpoint: string
  onUpdateProvider: (provider: string) => void
  onUpdateModel: (model: string) => void
  onUpdateStreamEnabled: (enabled: boolean) => void
  onRotateKey: (key: string) => void
  onInvalidateKey: () => void
  onConfigureSync: () => void
  onActivateZenMode: () => void
}

export function SettingsDialog({
  open,
  onOpenChange,
  activeProvider,
  activeModel,
  streamEnabled,
  activeProjectName,
  syncEndpoint,
  onUpdateProvider,
  onUpdateModel,
  onUpdateStreamEnabled,
  onRotateKey,
  onInvalidateKey,
  onConfigureSync,
  onActivateZenMode,
}: SettingsDialogProps) {
  const [tab, setTab] = useState<SettingsTab>('llm')
  const [providerKey, setProviderKey] = useState('')
  const [providerDraft, setProviderDraft] = useState<Provider>(activeProvider)
  const [modelDraft, setModelDraft] = useState(activeModel)

  useEffect(() => {
    if (open) {
      setTab('llm')
      setProviderKey('')
      setProviderDraft(activeProvider)
      setModelDraft(activeModel)
    }
  }, [open, activeProvider, activeModel])

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
                <label className="field-key-label" htmlFor="settings-provider">Proveedor IA</label>
                <select
                  id="settings-provider"
                  className="field-select-input"
                  value={providerDraft}
                  onChange={(e) => setProviderDraft(e.target.value as Provider)}
                >
                  {Object.keys(providerModels).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="field-bento-card">
                <label className="field-key-label" htmlFor="settings-model">Modelo</label>
                <select
                  id="settings-model"
                  className="field-select-input"
                  value={modelDraft}
                  onChange={(e) => setModelDraft(e.target.value)}
                >
                  {(providerModels[providerDraft] ?? []).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  {!((providerModels[providerDraft] ?? []).includes(modelDraft)) && modelDraft && (
                    <option value={modelDraft}>{modelDraft}</option>
                  )}
                </select>
              </div>

              <div className="field-bento-card">
                <label className="field-key-label" htmlFor="settings-provider-key">API key del proveedor</label>
                <input id="settings-provider-key" className="field-value-input" value={providerKey} onChange={(e) => setProviderKey(e.target.value)} placeholder="Introduce tu API key" />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.5rem 0', borderTop: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
              <span style={{ fontSize: 'var(--font-size-0)', color: 'var(--text-secondary)' }}>
                <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>Streaming</strong>
                Respuesta token a token conforme se genera
              </span>
              <input
                type="checkbox"
                style={{ width: '1rem', height: '1rem', accentColor: 'var(--accent-primary)', flexShrink: 0, cursor: 'pointer' }}
                checked={streamEnabled}
                onChange={(e) => onUpdateStreamEnabled(e.target.checked)}
              />
            </label>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button type="button" className="primary-button btn--default" onClick={() => {
                if (providerDraft !== activeProvider) onUpdateProvider(providerDraft)
                if (modelDraft !== activeModel) onUpdateModel(modelDraft)
                if (providerKey.trim()) {
                  onRotateKey(providerKey)
                  setProviderKey('')
                }
              }}>Guardar cambios</Button>
              <Button type="button" className="ghost-button btn--ghost" onClick={onInvalidateKey}>Eliminar Key</Button>
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
