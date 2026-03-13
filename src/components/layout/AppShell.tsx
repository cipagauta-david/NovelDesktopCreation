import { useState, useEffect, useCallback, useRef } from 'react'
import { EditorPanel } from '../panels/EditorPanel'
import { EntityList } from '../panels/EntityList'
import { GraphPanel } from '../panels/GraphPanel'
import { InspectorPanel } from '../panels/InspectorPanel'
import { OnboardingScreen } from '../onboarding/OnboardingScreen'
import { Sidebar } from './Sidebar'
import { TabBar } from './TabBar'
import { WorkspaceHeader } from './WorkspaceHeader'
import { CommandPalette } from '../overlays/CommandPalette'
import { ShortcutsOverlay } from '../overlays/ShortcutsOverlay'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog'
import { useWorkspace } from '../../hooks/useWorkspace'
import type { PersistedState } from '../../types/workspace'
import * as Comlink from 'comlink'
import type { AppWorker } from '../../data/worker'

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
  const [renameProjectValue, setRenameProjectValue] = useState('')
  const [renameTabValue, setRenameTabValue] = useState('')
  const [syncEndpoint, setSyncEndpoint] = useState('')
  const [syncWorkspaceId, setSyncWorkspaceId] = useState('')
  const [syncToken, setSyncToken] = useState('')
  const [nextProviderKey, setNextProviderKey] = useState('')
  const spectralTimerRef = useRef<number | null>(null)
  const godMode = workspace.workspaceView === 'graph'
  const hasLeftPanel = !zenMode && (workspace.panels.sidebar || workspace.panels.entities)
  const hasInspectorPanel = !zenMode && workspace.panels.inspector

  // Destructure stable callbacks to avoid re-running effect on every render
  const { togglePanel, panels, selectEntity, setWorkspaceView } = workspace

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
    if (!zenMode && !panels.inspector) togglePanel('inspector')
  }, [selectEntity, zenMode, panels.inspector, togglePanel])

  const handleMainColumnScroll = useCallback(() => {
    setSpectralMode(true)
    if (spectralTimerRef.current != null) {
      window.clearTimeout(spectralTimerRef.current)
    }
    spectralTimerRef.current = window.setTimeout(() => {
      setSpectralMode(false)
    }, 220)
  }, [])

  useEffect(() => () => {
    if (spectralTimerRef.current != null) {
      window.clearTimeout(spectralTimerRef.current)
    }
  }, [])

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

  return (
    <main
      className={['app-shell', godMode ? 'god-mode' : '', spectralMode ? 'is-spectral' : ''].filter(Boolean).join(' ')}
    >
    <div className={[zenMode ? 'workspace-header-shell is-hidden' : 'workspace-header-shell', spectralMode ? 'is-spectral' : ''].filter(Boolean).join(' ')}>
        <WorkspaceHeader project={workspace.activeProject} searchResultsCount={workspace.searchResults.length} workspaceView={workspace.workspaceView} godMode={godMode} leftPanelOpen={hasLeftPanel} inspectorOpen={hasInspectorPanel} hasActiveSearch={workspace.searchQuery.trim().length > 0} onOpenSearch={() => setSearchPaletteOpen(true)} onViewChange={workspace.setWorkspaceView} onToggleGodMode={() => { setZenMode(false); setWorkspaceView(godMode ? 'editor' : 'graph') }} onToggleLeftPanel={handleToggleNav} onToggleInspector={() => workspace.togglePanel('inspector')} />
      </div>

      <section className={[zenMode ? 'workspace-stage focus-mode' : 'workspace-stage', godMode ? 'god-mode' : ''].filter(Boolean).join(' ')}>
        <section className="workspace-grid">
          {!zenMode && (
            <aside className={hasLeftPanel ? 'left-workspace-panel open' : 'left-workspace-panel'}>
              <div className="left-panel-topbar"><span className="eyebrow">Navegación</span><button type="button" className="panel-dock-toggle" aria-label="Ocultar" onClick={handleToggleNav}>‹</button></div>
              <div className="left-panel-layout">
                <div className="left-panel-upper">
                  {workspace.panels.sidebar && workspace.data.settings && <Sidebar settings={workspace.data.settings} projects={workspace.data.projects} activeProjectId={workspace.data.activeProjectId} activeTemplates={workspace.activeTemplates} newProjectName={workspace.newProjectName} newProjectDescription={workspace.newProjectDescription} onProjectNameChange={workspace.setNewProjectName} onProjectDescriptionChange={workspace.setNewProjectDescription} onCreateProject={workspace.createProject} onSelectProject={workspace.selectProject} onRenameProject={openRenameProjectDialog} onDeleteProject={workspace.deleteActiveProject} onClearWorkspace={() => void workspace.clearWorkspace()} onSaveTemplate={workspace.saveCurrentAsTemplate} onExportProject={workspace.exportActiveProject} onImportProject={workspace.importProject} />}
                </div>
                <div className="left-panel-lower">
                  <TabBar tabs={workspace.activeProject?.tabs ?? []} activeTab={workspace.activeTab} newTabName={workspace.newTabName} onNewTabNameChange={workspace.setNewTabName} onSelectTab={workspace.selectTab} onCreateTab={workspace.createTab} onMoveTab={workspace.moveActiveTab} onRenameTab={openRenameTabDialog} onDeleteTab={workspace.deleteActiveTab} />
                  {workspace.panels.entities && <EntityList title={workspace.activeTab?.name ?? 'Entidades'} count={workspace.activeTabEntities.length} entities={workspace.activeTabEntities} activeEntityId={workspace.activeEntity?.id} templates={workspace.activeTemplates} selectedTemplateId={workspace.selectedNewEntityTemplateId} onTemplateChange={workspace.setNewEntityTemplateId} onCreateEntity={workspace.createEntity} onSelectEntity={workspace.selectEntity} onReorderEntities={workspace.reorderEntities} />}
                </div>
              </div>
            </aside>
          )}

          <div className={[zenMode ? 'main-column focus-mode' : 'main-column', godMode ? 'god-mode' : '', spectralMode ? 'is-spectral' : ''].filter(Boolean).join(' ')} onScroll={handleMainColumnScroll}>
            {workspace.workspaceView === 'graph' ? <GraphPanel graphModel={workspace.graphModel} activeEntityId={workspace.activeEntity?.id} onSelectEntity={handleGraphSelectEntity} onNodePositionChange={workspace.updateGraphNodePosition} onResetLayout={workspace.resetGraphLayout} onCreateRelation={(sourceEntityId, targetEntityId) => workspace.addRelation(sourceEntityId, targetEntityId, 'relates_to')} /> : workspace.activeEntity && workspace.activeDraft ? <EditorPanel entity={workspace.activeEntity} draft={workspace.activeDraft} templates={workspace.activeTemplates} allEntities={workspace.activeProject?.entities ?? []} editorViewRef={workspace.editorViewRef} referenceSuggestionActive={Boolean(workspace.referenceSuggestion)} suggestionOptions={workspace.suggestionOptions} saveStatus={workspace.saveStatus} streamStatus={workspace.streamStatus} zenMode={zenMode} onOpenEntity={workspace.selectEntity} onDraftChange={workspace.setDraft} onHandleEditorChange={workspace.handleEditorChange} onInsertReference={workspace.insertReference} onAttachImages={workspace.attachImages} onAddField={workspace.addField} onUpdateField={workspace.updateField} onRemoveField={workspace.removeField} onApplyTemplate={workspace.applyActiveTemplate} onDuplicate={workspace.duplicateActiveEntity} onArchive={workspace.archiveActiveEntity} onDelete={workspace.deleteActiveEntity} onGenerateAiProposal={workspace.generateAiProposal} onToggleZenMode={() => setZenMode(c => !c)} /> : <div className="panel surface-panel empty-state">Vacio</div>}
          </div>

          {!zenMode && (
             <aside className={hasInspectorPanel ? 'inspector-panel-shell open' : 'inspector-panel-shell'}>
                {workspace.panels.inspector && <InspectorPanel activeTab={workspace.activeTab} activeEntity={workspace.activeEntity} activeDraft={workspace.activeDraft} activeProject={workspace.activeProject} activeTemplates={workspace.activeTemplates} pendingProposal={workspace.pendingProposal} streamStatus={workspace.streamStatus} streamingText={workspace.streamingText} llmTraces={workspace.llmTraces} syncStatus={workspace.syncStatus} syncStats={workspace.syncStats} syncRemoteConfig={workspace.syncRemoteConfig} checkpoints={workspace.checkpoints} correlationReports={workspace.correlationReports} onUpdateTabPrompt={workspace.updateTabPrompt} onConfirmProposal={workspace.confirmAiProposal} onDismissProposal={workspace.dismissProposal} onStopGeneration={workspace.stopGeneration} onFlushRemoteSync={workspace.flushRemoteSync} onConfigureRemoteSync={async () => openSyncDialog()} onClearRemoteSyncCredential={workspace.clearRemoteSyncCredential} onRestoreCheckpoint={workspace.restoreCheckpoint} onRotateProviderCredential={async () => openRotateDialog()} onInvalidateProviderCredential={async () => setInvalidateKeyOpen(true)} onRefreshVaultMetadata={workspace.refreshVaultMetadata} onAddRelation={workspace.addRelation} onRemoveRelation={workspace.removeRelation} onCollapse={() => workspace.togglePanel('inspector')} />}
             </aside>
          )}
        </section>
      </section>

      {searchPaletteOpen && <CommandPalette searchQuery={workspace.searchQuery} searchResults={workspace.searchResults} onSearchChange={workspace.setSearchQuery} onSelectResult={handleSelectResult} onClose={() => setSearchPaletteOpen(false)} />}
      <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {workspace.toast && <div className="toast">{workspace.toast}</div>}
      <Dialog open={renameProjectOpen} onOpenChange={setRenameProjectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Renombrar proyecto</DialogTitle></DialogHeader>
          <div className="stacked-form">
            <input value={renameProjectValue} onChange={(event) => setRenameProjectValue(event.target.value)} placeholder="Nombre del proyecto" />
            <button type="button" className="primary-button" onClick={() => {
              workspace.renameActiveProject(renameProjectValue)
              setRenameProjectOpen(false)
            }}>Guardar</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={renameTabOpen} onOpenChange={setRenameTabOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Renombrar colección</DialogTitle></DialogHeader>
          <div className="stacked-form">
            <input value={renameTabValue} onChange={(event) => setRenameTabValue(event.target.value)} placeholder="Nombre de la colección" />
            <button type="button" className="primary-button" onClick={() => {
              workspace.renameActiveTab(renameTabValue)
              setRenameTabOpen(false)
            }}>Guardar</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={syncConfigOpen} onOpenChange={setSyncConfigOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Configurar sync remoto</DialogTitle></DialogHeader>
          <div className="stacked-form">
            <input value={syncEndpoint} onChange={(event) => setSyncEndpoint(event.target.value)} placeholder="https://api.example.com" />
            <input value={syncWorkspaceId} onChange={(event) => setSyncWorkspaceId(event.target.value)} placeholder="workspace-id" />
            <input value={syncToken} onChange={(event) => setSyncToken(event.target.value)} placeholder="Bearer token (opcional para rotación)" />
            <button type="button" className="primary-button" onClick={() => {
              void workspace.configureRemoteSync({ endpoint: syncEndpoint, workspaceId: syncWorkspaceId, token: syncToken })
              setSyncConfigOpen(false)
            }}>Guardar configuración</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={rotateKeyOpen} onOpenChange={setRotateKeyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rotar API key del proveedor</DialogTitle></DialogHeader>
          <div className="stacked-form">
            <input value={nextProviderKey} onChange={(event) => setNextProviderKey(event.target.value)} placeholder="Nueva API key" />
            <button type="button" className="primary-button" onClick={() => {
              void workspace.rotateProviderCredential(nextProviderKey)
              setRotateKeyOpen(false)
            }}>Rotar key</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={invalidateKeyOpen} onOpenChange={setInvalidateKeyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invalidar API key</DialogTitle></DialogHeader>
          <div className="stacked-form">
            <p>Esta acción elimina la key del vault del proveedor activo.</p>
            <button type="button" className="ghost-button" onClick={() => setInvalidateKeyOpen(false)}>Cancelar</button>
            <button type="button" className="primary-button" onClick={() => {
              void workspace.invalidateProviderCredential()
              setInvalidateKeyOpen(false)
            }}>Confirmar invalidación</button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
