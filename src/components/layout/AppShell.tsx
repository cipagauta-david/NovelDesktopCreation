import { useState, useEffect, useCallback, useRef, type FormEvent, type ReactNode } from 'react'
import { EditorPanel } from '../panels/EditorPanel'
import { GraphPanel } from '../panels/GraphPanel'
import { InspectorPanel } from '../panels/InspectorPanel'
import { NavigationPanel } from '../panels/NavigationPanel'
import { OnboardingScreen } from '../onboarding/OnboardingScreen'
import { WorkspaceHeader } from './WorkspaceHeader'
import { CommandPalette } from '../overlays/CommandPalette'
import { ShortcutsOverlay } from '../overlays/ShortcutsOverlay'
import { InspectorAssistantComposer } from '../inspector/InspectorAssistantComposer'
import { Field } from '../common/Field'
import { Button } from '../ui/Button'
import { FormStack } from '../common/FormStack'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog'
import { useWorkspace } from '../../hooks/useWorkspace'
import { ResizeHandle } from '../../hooks/workspace/usePanelWidths'
import type { PersistedState, Provider } from '../../types/workspace'
import { providerModels } from '../../data/constants'
import * as Comlink from 'comlink'
import type { AppWorker } from '../../data/worker'
import '../../styles/layout/AppShell.css';

type StackedDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
}

function StackedDialog({ open, onOpenChange, title, children }: StackedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <FormStack>{children}</FormStack>
      </DialogContent>
    </Dialog>
  )
}




export function AppShell({ initialData, worker }: { initialData: PersistedState, worker: Comlink.Remote<AppWorker> }) {
  const workspace = useWorkspace(initialData, worker)
  const [zenMode, setZenMode] = useState(false)
  const [searchPaletteOpen, setSearchPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [spectralMode, setSpectralMode] = useState(false)
  const [renameProjectOpen, setRenameProjectOpen] = useState(false)
  const [renameTabOpen, setRenameTabOpen] = useState(false)
  const [syncConfigOpen, setSyncConfigOpen] = useState(false)
  const [rotateKeyOpen, setRotateKeyOpen] = useState(false)
  const [invalidateKeyOpen, setInvalidateKeyOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'account' | 'llm' | 'editor'>('llm')
  const [navigationTab, setNavigationTab] = useState<'workspace' | 'content'>('workspace')
  const [inspectorTab, setInspectorTab] = useState<'context' | 'meta' | 'history' | 'metrics'>('context')
  const [assistantFabOpen, setAssistantFabOpen] = useState(false)
  const [floatingAssistantDraft, setFloatingAssistantDraft] = useState('')
  const [renameProjectValue, setRenameProjectValue] = useState('')
  const [renameTabValue, setRenameTabValue] = useState('')
  const [syncEndpoint, setSyncEndpoint] = useState('')
  const [syncWorkspaceId, setSyncWorkspaceId] = useState('')
  const [syncToken, setSyncToken] = useState('')
  const [nextProviderKey, setNextProviderKey] = useState('')
  const [llmProviderDraft, setLlmProviderDraft] = useState<Provider | ''>('')
  const [llmModelDraft, setLlmModelDraft] = useState('')
  const spectralTimerRef = useRef<number | null>(null)
  const godMode = workspace.workspaceView === 'graph'
  const hasLeftPanel = !zenMode && (workspace.panels.sidebar || workspace.panels.entities)
  const hasInspectorPanel = !zenMode && workspace.panels.inspector
  const activeNodeLabel = workspace.activeEntity?.title ?? workspace.activeTab?.name ?? 'Sin nodo activo'
  const activeNodeMeta = workspace.workspaceView === 'graph'
    ? 'Vista mapa narrativa'
    : workspace.activeProject?.name ?? 'Proyecto narrativo'
  const providerModel = workspace.data.settings?.model ?? 'IA sin configurar'
  const provider = workspace.data.settings?.provider
  const availableModels = provider ? providerModels[provider] : []
  const aiModelLabel = providerModel
    .split('/')
    .pop()
    ?.replace(/-/g, ' ')
    .replace(/\\b\w/g, (letter) => letter.toUpperCase()) ?? providerModel

  // Destructure stable callbacks to avoid re-running effect on every render
  const { togglePanel, panels, selectEntity, setWorkspaceView } = workspace

  useEffect(() => {
    setLlmProviderDraft(workspace.data.settings?.provider ?? '')
  }, [workspace.data.settings?.provider])

  useEffect(() => {
    setLlmModelDraft(workspace.data.settings?.model ?? '')
  }, [workspace.data.settings?.model])

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const usesCommand = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()
      if (e.key === 'Escape' && zenMode) { e.preventDefault(); setZenMode(false); return }
      if (e.key === 'Escape' && searchPaletteOpen) { e.preventDefault(); setSearchPaletteOpen(false); return }
      if (e.key === 'Escape' && shortcutsOpen) { e.preventDefault(); setShortcutsOpen(false); return }
      if (e.key === 'F11' || (usesCommand && e.shiftKey && key === 'f')) { e.preventDefault(); setZenMode(c => !c); return }
      if (usesCommand && key === 'm') {
        e.preventDefault()
        setZenMode(false)
        setWorkspaceView(godMode ? 'editor' : 'graph')
        return
      }
      if (usesCommand && key === 'k') { e.preventDefault(); setSearchPaletteOpen(true); return }
      if (usesCommand && key === '\\') { e.preventDefault(); togglePanel('inspector') }
      // ? key (not inside an input / textarea / contenteditable)
      if (e.key === '?' && !usesCommand && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !(e.target as HTMLElement)?.isContentEditable) {
        e.preventDefault(); setShortcutsOpen(c => !c)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [godMode, searchPaletteOpen, setWorkspaceView, shortcutsOpen, togglePanel, zenMode])

  const handleToggleNav = useCallback(() => {
    if (panels.sidebar || panels.entities) {
      if (panels.sidebar) togglePanel('sidebar')
      if (panels.entities) togglePanel('entities')
    } else { togglePanel('sidebar'); togglePanel('entities') }
  }, [panels.sidebar, panels.entities, togglePanel])

  const handleSelectResult = useCallback((entityId: string, tabId: string) => { selectEntity(entityId, tabId); setSearchPaletteOpen(false) }, [selectEntity])
  const handleGraphSelectEntity = useCallback((eId: string, tId: string) => {
    selectEntity(eId, tId)
    setWorkspaceView('graph')
  }, [selectEntity, setWorkspaceView])

  const handleMainColumnScroll = useCallback(() => {
    setSpectralMode(true)
    if (spectralTimerRef.current != null) {
      window.clearTimeout(spectralTimerRef.current)
    }
    spectralTimerRef.current = window.setTimeout(() => {
      setSpectralMode(false)
    }, 220)
  }, [])

  // Restore UI when mouse moves anywhere in the shell
  useEffect(() => {
    function handleMouseMove() {
      if (spectralMode) {
        setSpectralMode(false)
        if (spectralTimerRef.current != null) {
          window.clearTimeout(spectralTimerRef.current)
          spectralTimerRef.current = null
        }
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [spectralMode])

  useEffect(() => () => {
    if (spectralTimerRef.current != null) {
      window.clearTimeout(spectralTimerRef.current)
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-focus-mode', zenMode ? 'true' : 'false')
    return () => {
      document.documentElement.setAttribute('data-focus-mode', 'false')
    }
  }, [zenMode])

  if (!workspace.onboardingReady) return <OnboardingScreen onSubmit={workspace.completeOnboarding} />

  const openRenameProjectDialog = () => {
    setRenameProjectValue(workspace.activeProject?.name ?? '')
    setRenameProjectOpen(true)
  }

  const openRenameTabDialog = () => {
    setRenameTabValue(workspace.activeTab?.name ?? '')
    setRenameTabOpen(true)
  }

  const openSyncDialog = () => {
    setSyncEndpoint(workspace.syncRemoteConfig?.endpoint ?? '')
    setSyncWorkspaceId(workspace.syncRemoteConfig?.workspaceId ?? workspace.activeProject?.id ?? '')
    setSyncToken('')
    setSyncConfigOpen(true)
  }

  const openRotateDialog = () => {
    setNextProviderKey('')
    setRotateKeyOpen(true)
  }

  const handleFloatingAssistantSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextPrompt = floatingAssistantDraft.trim()
    if (!nextPrompt) {
      return
    }
    const basePrompt = workspace.activeTab?.prompt?.trim() ?? ''
    const mergedPrompt = `${basePrompt}${basePrompt ? '\n\n' : ''}Solicitud reciente del autor:\n${nextPrompt}`
    workspace.updateTabPrompt(mergedPrompt)
    setFloatingAssistantDraft('')
    void workspace.generateAiProposal(mergedPrompt)
  }

  return (
    <div
      className={[
        'app-shell',
        zenMode ? 'is-focus-mode' : '',
        godMode ? 'god-mode' : '',
        spectralMode ? 'is-spectral' : '',
      ].filter(Boolean).join(' ')}
    >
    <div className={[zenMode ? 'workspace-header-shell is-hidden' : 'workspace-header-shell', spectralMode ? 'is-spectral' : ''].filter(Boolean).join(' ')}>
        <WorkspaceHeader project={workspace.activeProject} activeNodeLabel={activeNodeLabel} activeNodeMeta={activeNodeMeta} aiModelLabel={aiModelLabel} streamStatus={workspace.streamStatus} searchResultsCount={workspace.searchResults.length} workspaceView={workspace.workspaceView} leftPanelOpen={hasLeftPanel} inspectorOpen={hasInspectorPanel} hasActiveSearch={workspace.searchQuery.trim().length > 0} onOpenSearch={() => setSearchPaletteOpen(true)} onViewChange={workspace.setWorkspaceView} onToggleLeftPanel={handleToggleNav} onToggleInspector={() => workspace.togglePanel('inspector')} />
      </div>


      {/* ─── Left Icon Rail ─── */}
      <nav className="icon-rail icon-rail-left" aria-label="Paneles izquierda">
        <button
          type="button"
          className={hasLeftPanel && navigationTab === 'workspace' ? 'icon-rail-button active' : 'icon-rail-button'}
          onClick={() => {
            setNavigationTab('workspace')
            if (!workspace.panels.sidebar) workspace.togglePanel('sidebar')
            if (!workspace.panels.entities) workspace.togglePanel('entities')
          }}
          aria-label="Proyecto"
          title="Proyecto"
        >⌂</button>
        <button
          type="button"
          className={hasLeftPanel && navigationTab === 'content' ? 'icon-rail-button active' : 'icon-rail-button'}
          onClick={() => {
            setNavigationTab('content')
            if (!workspace.panels.sidebar) workspace.togglePanel('sidebar')
            if (!workspace.panels.entities) workspace.togglePanel('entities')
          }}
          aria-label="Colecciones"
          title="Colecciones"
        >☷</button>
        <span className="icon-rail-spacer" aria-hidden="true" />
        <button
          type="button"
          className={settingsOpen ? 'icon-rail-button active' : 'icon-rail-button'}
          onClick={() => setSettingsOpen(true)}
          aria-label="Configuración"
          title="Configuración"
        >⚙</button>
      </nav>


      {/* ─── Right Icon Rail ─── */}
      <nav className="icon-rail icon-rail-right" aria-label="Paneles derecha">
        <button
          type="button"
          className={workspace.panels.inspector && inspectorTab === 'context' ? 'icon-rail-button active' : 'icon-rail-button'}
          onClick={() => {
            setInspectorTab('context')
            if (!workspace.panels.inspector) workspace.togglePanel('inspector')
          }}
          aria-label="Contexto"
          title="Contexto"
        >◧</button>
        <button
          type="button"
          className={workspace.panels.inspector && inspectorTab === 'meta' ? 'icon-rail-button active' : 'icon-rail-button'}
          onClick={() => {
            setInspectorTab('meta')
            if (!workspace.panels.inspector) workspace.togglePanel('inspector')
          }}
          aria-label="Metadatos"
          title="Metadatos"
        >◨</button>
        <button
          type="button"
          className={workspace.panels.inspector && inspectorTab === 'history' ? 'icon-rail-button active' : 'icon-rail-button'}
          onClick={() => {
            setInspectorTab('history')
            if (!workspace.panels.inspector) workspace.togglePanel('inspector')
          }}
          aria-label="Historial"
          title="Historial"
        >⟲</button>
        <button
          type="button"
          className={workspace.panels.inspector && inspectorTab === 'metrics' ? 'icon-rail-button active' : 'icon-rail-button'}
          onClick={() => {
            setInspectorTab('metrics')
            if (!workspace.panels.inspector) workspace.togglePanel('inspector')
          }}
          aria-label="Métricas"
          title="Métricas"
        >◫</button>
      </nav>


      <section className={[zenMode ? 'workspace-stage focus-mode' : 'workspace-stage', godMode ? 'god-mode' : ''].filter(Boolean).join(' ')}>
        <section className="workspace-grid">
          {/* Panel overlay backdrop */}
          <button
            type="button"
            className={(hasLeftPanel || hasInspectorPanel) ? 'panel-overlay-backdrop visible' : 'panel-overlay-backdrop'}
            aria-label="Cerrar paneles"
            onClick={() => { if (workspace.panels.sidebar) workspace.togglePanel('sidebar'); if (workspace.panels.entities) workspace.togglePanel('entities'); if (workspace.panels.inspector) workspace.togglePanel('inspector') }}
          />

          <aside className={hasLeftPanel ? 'left-workspace-panel open' : 'left-workspace-panel'} style={{ width: `${workspace.panelWidths.sidebar}px` }}>
            {hasLeftPanel && (
              <ResizeHandle
                side="left"
                onResize={(delta) => workspace.adjustSidebarWidth(delta)}
                onResizeEnd={() => {}}
              />
            )}
            {!zenMode && workspace.panels.sidebar && workspace.data.settings && (
              <NavigationPanel
                  settings={workspace.data.settings}
                  projects={workspace.data.projects}
                  activeProjectId={workspace.data.activeProjectId}
                  activeTemplates={workspace.activeTemplates}
                  newProjectName={workspace.newProjectName}
                  newProjectDescription={workspace.newProjectDescription}
                  onProjectNameChange={workspace.setNewProjectName}
                  onProjectDescriptionChange={workspace.setNewProjectDescription}
                  onCreateProject={workspace.createProject}
                  onSelectProject={workspace.selectProject}
                  onRenameProject={openRenameProjectDialog}
                  onDeleteProject={workspace.deleteActiveProject}
                  onClearWorkspace={() => void workspace.clearWorkspace()}
                  onSaveTemplate={workspace.saveCurrentAsTemplate}
                  onExportProject={workspace.exportActiveProject}
                  onImportProject={workspace.importProject}
                  tabs={workspace.activeProject?.tabs ?? []}
                  activeTab={workspace.activeTab}
                  newTabName={workspace.newTabName}
                  onNewTabNameChange={workspace.setNewTabName}
                  onSelectTab={workspace.selectTab}
                  onCreateTab={workspace.createTab}
                  onMoveTab={workspace.moveActiveTab}
                  onRenameTab={openRenameTabDialog}
                  onDeleteTab={workspace.deleteActiveTab}
                  onUpdateActiveTabColor={workspace.updateActiveTabColor}
                  entitiesEnabled={workspace.panels.entities}
                  entities={workspace.activeTabEntities}
                  archivedEntities={workspace.archivedTabEntities}
                  activeEntityId={workspace.activeEntity?.id}
                  selectedTemplateId={workspace.selectedNewEntityTemplateId}
                  onTemplateChange={workspace.setNewEntityTemplateId}
                  onCreateEntity={workspace.createEntity}
                  onSelectEntity={workspace.selectEntity}
                  onReorderEntities={workspace.reorderEntities}
                    onArchiveEntity={workspace.archiveEntity}
                    onDeleteEntity={workspace.deleteEntity}
                    onCreateTemplateFromEntity={workspace.saveEntityAsTemplate}
                  activeNavigationTab={navigationTab}
                  onActiveNavigationTabChange={setNavigationTab}
                  onCollapse={handleToggleNav}
              />
            )}
          </aside>


          <div className={[
            zenMode ? 'main-column focus-mode' : 'main-column',
            godMode ? 'god-mode' : '',
            spectralMode ? 'is-spectral' : '',
          ].filter(Boolean).join(' ')} onScroll={handleMainColumnScroll}>
            {workspace.workspaceView === 'graph' ? <GraphPanel graphModel={workspace.graphModel} collections={workspace.activeProject?.tabs ?? []} activeEntityId={workspace.activeEntity?.id} onSelectEntity={handleGraphSelectEntity} onNodePositionChange={workspace.updateGraphNodePosition} onUpdateCollectionColor={workspace.updateTabColor} onCreateRelation={(sourceEntityId, targetEntityId) => workspace.addRelation(sourceEntityId, targetEntityId, 'relates_to')} /> : workspace.activeEntity && workspace.activeDraft ? <EditorPanel entity={workspace.activeEntity} draft={workspace.activeDraft} templates={workspace.activeTemplates} allEntities={workspace.activeProject?.entities ?? []} editorViewRef={workspace.editorViewRef} referenceSuggestionActive={Boolean(workspace.referenceSuggestion)} suggestionOptions={workspace.suggestionOptions} saveStatus={workspace.saveStatus} streamStatus={workspace.streamStatus} zenMode={zenMode} onOpenEntity={workspace.selectEntity} onDraftChange={workspace.setDraft} onHandleEditorChange={workspace.handleEditorChange} onInsertReference={workspace.insertReference} onAttachImages={workspace.attachImages} onAddField={workspace.addField} onUpdateField={workspace.updateField} onRemoveField={workspace.removeField} onApplyTemplate={workspace.applyActiveTemplate} onDuplicate={workspace.duplicateActiveEntity} onArchive={workspace.archiveActiveEntity} onDelete={workspace.deleteActiveEntity} onGenerateAiProposal={workspace.generateAiProposal} onToggleZenMode={() => setZenMode(c => !c)} /> : <div className="panel surface-panel empty-state">Vacio</div>}
          </div>


          <aside className={hasInspectorPanel ? 'inspector-panel-shell open' : 'inspector-panel-shell'} style={{ width: `${workspace.panelWidths.inspector}px` }}>
            {hasInspectorPanel && (
              <ResizeHandle
                side="right"
                onResize={(delta) => workspace.adjustInspectorWidth(delta)}
                onResizeEnd={() => {}}
              />
            )}
            {!zenMode && workspace.panels.inspector && <InspectorPanel side="right" activeTab={workspace.activeTab} activeEntity={workspace.activeEntity} activeDraft={workspace.activeDraft} activeProject={workspace.activeProject} activeTemplates={workspace.activeTemplates} pendingProposal={workspace.pendingProposal} streamStatus={workspace.streamStatus} streamingText={workspace.streamingText} llmTraces={workspace.llmTraces} syncStatus={workspace.syncStatus} syncStats={workspace.syncStats} syncRemoteConfig={workspace.syncRemoteConfig} checkpoints={workspace.checkpoints} correlationReports={workspace.correlationReports} activePanelTab={inspectorTab} onActivePanelTabChange={setInspectorTab} onUpdateTabPrompt={workspace.updateTabPrompt} onConfirmProposal={workspace.confirmAiProposal} onDismissProposal={workspace.dismissProposal} onStopGeneration={workspace.stopGeneration} onFlushRemoteSync={workspace.flushRemoteSync} onConfigureRemoteSync={async () => openSyncDialog()} onClearRemoteSyncCredential={workspace.clearRemoteSyncCredential} onRestoreCheckpoint={workspace.restoreCheckpoint} onRotateProviderCredential={async () => openRotateDialog()} onInvalidateProviderCredential={async () => setInvalidateKeyOpen(true)} onRefreshVaultMetadata={workspace.refreshVaultMetadata} onAddRelation={workspace.addRelation} onRemoveRelation={workspace.removeRelation} onCollapse={() => workspace.togglePanel('inspector')} />}
          </aside>

        </section>
      </section>


      {searchPaletteOpen && <CommandPalette searchQuery={workspace.searchQuery} searchResults={workspace.searchResults} onSearchChange={workspace.setSearchQuery} onSelectResult={handleSelectResult} onClose={() => setSearchPaletteOpen(false)} />}
      <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {assistantFabOpen && (
        <section className="ai-fab-panel" aria-label="Asistente rápido">
          <header className="ai-fab-panel-head">
            <strong>Asistente IA</strong>
            <button type="button" className="icon-button" onClick={() => setAssistantFabOpen(false)} aria-label="Cerrar asistente">
              ✕
            </button>

          </header>

          <InspectorAssistantComposer
            value={floatingAssistantDraft}
            streamStatus={workspace.streamStatus}
            streamingText={workspace.streamingText}
            onChange={setFloatingAssistantDraft}
            onSubmit={handleFloatingAssistantSubmit}
            onStopGeneration={workspace.stopGeneration}
          />
        </section>

      )}
      <button
        type="button"
        className={assistantFabOpen ? 'ai-fab-button active' : 'ai-fab-button'}
        onClick={() => setAssistantFabOpen((current) => !current)}
        aria-label="Abrir asistente IA"
      >
        💬 IA
      </button>
      {workspace.toast && <div className="toast">{workspace.toast}</div>}
      <StackedDialog open={renameProjectOpen} onOpenChange={setRenameProjectOpen} title="Renombrar proyecto">
        <Field label={<span className="visually-hidden">Nombre del proyecto</span>}>
          <input value={renameProjectValue} onChange={(event) => setRenameProjectValue(event.target.value)} placeholder="Nombre del proyecto" />
        </Field>

        <Button type="button" variant="primary" className="primary-button" onClick={() => {
          workspace.renameActiveProject(renameProjectValue)
          setRenameProjectOpen(false)
        }}>Guardar</Button>
      </StackedDialog>


      <StackedDialog open={renameTabOpen} onOpenChange={setRenameTabOpen} title="Renombrar colección">
        <Field label={<span className="visually-hidden">Nombre de la colección</span>}>
          <input value={renameTabValue} onChange={(event) => setRenameTabValue(event.target.value)} placeholder="Nombre de la colección" />
        </Field>

        <Button type="button" variant="primary" className="primary-button" onClick={() => {
          workspace.renameActiveTab(renameTabValue)
          setRenameTabOpen(false)
        }}>Guardar</Button>
      </StackedDialog>


      <StackedDialog open={syncConfigOpen} onOpenChange={setSyncConfigOpen} title="Configurar sync remoto">
        <Field label={<span className="visually-hidden">Endpoint remoto</span>}>
          <input value={syncEndpoint} onChange={(event) => setSyncEndpoint(event.target.value)} placeholder="https://api.example.com" />
        </Field>

        <Field label={<span className="visually-hidden">Workspace ID remoto</span>}>
          <input value={syncWorkspaceId} onChange={(event) => setSyncWorkspaceId(event.target.value)} placeholder="workspace-id" />
        </Field>

        <Field label={<span className="visually-hidden">Token bearer remoto</span>}>
          <input value={syncToken} onChange={(event) => setSyncToken(event.target.value)} placeholder="Bearer token (opcional para rotación)" />
        </Field>

        <Button type="button" variant="primary" className="primary-button" onClick={() => {
          void workspace.configureRemoteSync({ endpoint: syncEndpoint, workspaceId: syncWorkspaceId, token: syncToken })
          setSyncConfigOpen(false)
        }}>Guardar configuración</Button>
      </StackedDialog>


      <StackedDialog open={rotateKeyOpen} onOpenChange={setRotateKeyOpen} title="Rotar API key del proveedor">
        <Field label={<span className="visually-hidden">Nueva API key del proveedor</span>}>
          <input value={nextProviderKey} onChange={(event) => setNextProviderKey(event.target.value)} placeholder="Nueva API key" />
        </Field>

        <Button type="button" variant="primary" className="primary-button" onClick={() => {
          void workspace.rotateProviderCredential(nextProviderKey)
          setRotateKeyOpen(false)
        }}>Rotar key</Button>
      </StackedDialog>


      <StackedDialog open={invalidateKeyOpen} onOpenChange={setInvalidateKeyOpen} title="Eliminar key guardada">
        <p>Esta acción borra la key guardada localmente para el proveedor activo. No revoca la key en el servicio remoto; solo la quita de esta app.</p>
        <Button type="button" variant="ghost" className="ghost-button" onClick={() => setInvalidateKeyOpen(false)}>Cancelar</Button>
        <Button type="button" variant="primary" className="primary-button" onClick={() => {
          void workspace.invalidateProviderCredential()
          setInvalidateKeyOpen(false)
        }}>Confirmar invalidación</Button>
      </StackedDialog>


      {/* ─── Settings / Command Center Dialog ─── */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Centro de Mando</DialogTitle></DialogHeader>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <Button type="button" variant={settingsTab === 'llm' ? 'primary' : 'ghost'} size="sm" onClick={() => setSettingsTab('llm')}>Modelos LLM</Button>
            <Button type="button" variant={settingsTab === 'account' ? 'primary' : 'ghost'} size="sm" onClick={() => setSettingsTab('account')}>Cuenta</Button>
            <Button type="button" variant={settingsTab === 'editor' ? 'primary' : 'ghost'} size="sm" onClick={() => setSettingsTab('editor')}>Editor</Button>
          </div>

          {settingsTab === 'llm' && (
            <FormStack>
              <Field label="Proveedor">
                <select value={llmProviderDraft} onChange={(event) => setLlmProviderDraft(event.target.value as Provider)}>
                  {Object.keys(providerModels).map((providerOption) => (
                    <option key={providerOption} value={providerOption}>{providerOption}</option>
                  ))}
                </select>
              </Field>

              <Field label="Modelo activo">
                {provider ? (
                  <select value={llmModelDraft} onChange={(event) => setLlmModelDraft(event.target.value)}>
                    {availableModels.map((modelOption) => (
                      <option key={modelOption} value={modelOption}>{modelOption}</option>
                    ))}
                    {!availableModels.includes(llmModelDraft) && llmModelDraft ? (
                      <option value={llmModelDraft}>{llmModelDraft}</option>
                    ) : null}
                  </select>
                ) : (
                  <input value={llmModelDraft} onChange={(event) => setLlmModelDraft(event.target.value)} placeholder="Modelo IA configurado" />
                )}
              </Field>

              <Field label="API Key del proveedor">
                <input value={nextProviderKey} onChange={(event) => setNextProviderKey(event.target.value)} placeholder="Introduce tu API key" />
              </Field>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button type="button" variant="primary" className="primary-button" onClick={() => {
                  if (llmProviderDraft && llmProviderDraft !== provider) {
                    void workspace.updateProvider(llmProviderDraft)
                  }
                  if (llmModelDraft.trim()) {
                    void workspace.updateProviderModel(llmModelDraft)
                  }
                  if (nextProviderKey.trim()) {
                    void workspace.rotateProviderCredential(nextProviderKey)
                  }
                  setNextProviderKey('')
                }}>Guardar cambios</Button>
                <Button type="button" variant="ghost" className="ghost-button" onClick={() => {
                  void workspace.invalidateProviderCredential()
                }}>Eliminar Key</Button>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.5rem 0', borderTop: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                <span style={{ fontSize: 'var(--font-size-0)', color: 'var(--text-secondary)' }}>
                  <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>Streaming</strong>
                  Respuesta token a token conforme se genera
                </span>
                <input
                  type="checkbox"
                  style={{ width: '1rem', height: '1rem', accentColor: 'var(--accent-primary)', flexShrink: 0, cursor: 'pointer' }}
                  checked={workspace.data.settings?.streamEnabled ?? true}
                  onChange={(e) => workspace.updateStreamEnabled(e.target.checked)}
                />
              </label>

            </FormStack>

          )}
          {settingsTab === 'account' && (
            <FormStack>
              <Field label="Proyecto activo">
                <input value={workspace.activeProject?.name ?? ''} readOnly />
              </Field>

              <Field label="Sync remoto">
                <input value={workspace.syncRemoteConfig?.endpoint ?? 'No configurado'} readOnly />
              </Field>

              <Button type="button" variant="secondary" onClick={() => { setSettingsOpen(false); openSyncDialog() }}>Configurar Sync</Button>
            </FormStack>

          )}
          {settingsTab === 'editor' && (
            <FormStack>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-0)' }}>Preferencias de edición. El tema se puede cambiar desde el icono de sol/luna en el header.</p>
              <Button type="button" variant="secondary" onClick={() => { setZenMode(true); setSettingsOpen(false) }}>Activar Modo Foco</Button>
            </FormStack>

          )}

        </DialogContent>

      </Dialog>

    </div>
  )
}

