import { useState, useCallback } from 'react'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { EditorPanel } from '../panels/EditorPanel'
import { GraphPanel } from '../panels/GraphPanel'
import { InspectorPanel } from '../panels/InspectorPanel'
import { NavigationPanel } from '../panels/NavigationPanel'
import { CommandPalette } from '../overlays/CommandPalette'
import { WorkspaceHeader } from './WorkspaceHeader'
import { LeftIconRail, RightIconRail } from './IconRail'
import { FloatingAssistantFab } from './FloatingAssistantFab'
import { PanelOverlayBackdrop } from './PanelOverlayBackdrop'
import { ShortcutsOverlay } from '../overlays/ShortcutsOverlay'
import { RenameProjectDialog } from '../dialogs/RenameProjectDialog'
import { RenameTabDialog } from '../dialogs/RenameTabDialog'
import { SyncConfigDialog } from '../dialogs/SyncConfigDialog'
import { RotateKeyDialog } from '../dialogs/RotateKeyDialog'
import { InvalidateKeyConfirmDialog } from '../dialogs/InvalidateKeyConfirmDialog'
import { SettingsDialog } from '../dialogs/SettingsDialog'
import { useZenMode } from '../../hooks/ui/useZenMode'
import { useSpectralMode } from '../../hooks/ui/useSpectralMode'
import { useWritingMode } from '../../hooks/ui/useWritingMode'
import { useFusionVeil } from '../../hooks/ui/useFusionVeil'
import { useFloatingAssistant } from '../../hooks/ui/useFloatingAssistant'
import { useWorkspace } from '../../hooks/useWorkspace'
import { ResizeHandle } from '../common/ResizeHandle'
import type { PersistedState } from '../../types/workspace'
import * as Comlink from 'comlink'
import type { AppWorker } from '../../data/worker'
import '../../styles/layout/AppShell.css';



export function AppShell({ initialData, worker }: { initialData: PersistedState, worker: Comlink.Remote<AppWorker> }) {
  const workspace = useWorkspace(initialData, worker)
  const { zenMode, setZenMode } = useZenMode()
  const { spectralMode, handleMainColumnScroll } = useSpectralMode()
  const { isWriting, handleWritingActivity } = useWritingMode()
  const { fusionVeilActive } = useFusionVeil(workspace.activeEntity?.id)
  const { assistantFabOpen, setAssistantFabOpen, floatingAssistantDraft, setFloatingAssistantDraft, handleFloatingAssistantSubmit } = useFloatingAssistant({
    activeTabPrompt: workspace.activeTab?.prompt,
    updateTabPrompt: workspace.updateTabPrompt,
  })
  const [searchPaletteOpen, setSearchPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [renameProjectOpen, setRenameProjectOpen] = useState(false)
  const [renameTabOpen, setRenameTabOpen] = useState(false)
  const [syncConfigOpen, setSyncConfigOpen] = useState(false)
  const [rotateKeyOpen, setRotateKeyOpen] = useState(false)
  const [invalidateKeyOpen, setInvalidateKeyOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [navigationTab, setNavigationTab] = useState<'workspace' | 'content'>('workspace')
  const [inspectorTab, setInspectorTab] = useState<'context' | 'meta' | 'history' | 'metrics'>('context')
  const godMode = workspace.workspaceView === 'graph'
  const hasLeftPanel = !zenMode && (workspace.panels.sidebar || workspace.panels.entities)
  const hasInspectorPanel = !zenMode && workspace.panels.inspector
  const activeNodeLabel = workspace.activeEntity?.title ?? workspace.activeTab?.name ?? 'Sin nodo activo'
  const activeNodeMeta = workspace.workspaceView === 'graph'
    ? 'Vista mapa narrativa'
    : workspace.activeProject?.name ?? 'Proyecto narrativo'
  const providerModel = workspace.data.settings?.model ?? 'IA sin configurar'
  const aiModelLabel = providerModel
    .split('/')
    .pop()
    ?.replace(/-/g, ' ')
    .replace(/\\b\w/g, (letter) => letter.toUpperCase()) ?? providerModel

  const { togglePanel, panels, selectEntity, setWorkspaceView } = workspace

  useKeyboardShortcuts({
    zenMode,
    searchPaletteOpen,
    shortcutsOpen,
    godMode,
    setZenMode,
    setSearchPaletteOpen,
    setShortcutsOpen,
    setWorkspaceView,
    togglePanel,
  })

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

  const hasSuggestion = workspace.streamStatus === 'streaming' || Boolean(workspace.pendingProposal)

  const openRenameProjectDialog = useCallback(() => setRenameProjectOpen(true), [])
  const openRenameTabDialog = useCallback(() => setRenameTabOpen(true), [])
  const openSettingsDialog = useCallback(() => setSettingsOpen(true), [])
  const openSyncConfigDialog = useCallback(async () => { setSyncConfigOpen(true) }, [])
  const openRotateKeyDialog = useCallback(async () => { setRotateKeyOpen(true) }, [])
  const openInvalidateKeyDialog = useCallback(async () => { setInvalidateKeyOpen(true) }, [])
  const handleOpenSyncFromSettings = useCallback(() => { setSettingsOpen(false); setSyncConfigOpen(true) }, [])
  const handleClosePanels = useCallback(() => {
    if (workspace.panels.sidebar) workspace.togglePanel('sidebar')
    if (workspace.panels.entities) workspace.togglePanel('entities')
    if (workspace.panels.inspector) workspace.togglePanel('inspector')
  }, [workspace.panels.sidebar, workspace.panels.entities, workspace.panels.inspector, workspace.togglePanel])

  return (
    <div
      className={[
        'app-shell',
        zenMode ? 'is-focus-mode' : '',
        godMode ? 'god-mode' : '',
        spectralMode ? 'is-spectral' : '',
        isWriting ? 'is-writing' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className={[zenMode ? 'workspace-header-shell is-hidden' : 'workspace-header-shell', spectralMode ? 'is-spectral' : ''].filter(Boolean).join(' ')}>
        <WorkspaceHeader project={workspace.activeProject} activeNodeLabel={activeNodeLabel} activeNodeMeta={activeNodeMeta} aiModelLabel={aiModelLabel} streamStatus={workspace.streamStatus} searchResultsCount={workspace.searchResults.length} workspaceView={workspace.workspaceView} leftPanelOpen={hasLeftPanel} inspectorOpen={hasInspectorPanel} hasActiveSearch={workspace.searchQuery.trim().length > 0} onOpenSearch={() => setSearchPaletteOpen(true)} onViewChange={workspace.setWorkspaceView} onToggleLeftPanel={handleToggleNav} onToggleInspector={() => workspace.togglePanel('inspector')} />
      </div>


      <LeftIconRail
        navigationTab={navigationTab}
        hasLeftPanel={hasLeftPanel}
        panels={workspace.panels}
        settingsOpen={settingsOpen}
        onNavigationTabChange={setNavigationTab}
        onTogglePanel={workspace.togglePanel}
        onOpenSettings={openSettingsDialog}
      />


      <RightIconRail
        inspectorTab={inspectorTab}
        inspectorOpen={workspace.panels.inspector}
        onInspectorTabChange={setInspectorTab}
        onToggleInspector={() => workspace.togglePanel('inspector')}
      />


      <section className={[zenMode ? 'workspace-stage focus-mode' : 'workspace-stage', godMode ? 'god-mode' : ''].filter(Boolean).join(' ')}>
        <section className="workspace-grid">
          <PanelOverlayBackdrop
            visible={hasLeftPanel || hasInspectorPanel}
            onClose={handleClosePanels}
          />

          <aside className={hasLeftPanel ? 'left-workspace-panel open' : 'left-workspace-panel'} style={{ width: `${workspace.panelWidths.sidebar}px` }}>
            {hasLeftPanel && (
              <ResizeHandle
                side="left"
                onResize={(delta) => workspace.adjustSidebarWidth(delta)}
                onResizeEnd={() => { }}
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
          ].filter(Boolean).join(' ')} onScroll={handleMainColumnScroll} onKeyDown={handleWritingActivity}>
            {workspace.workspaceView === 'graph' ? <GraphPanel graphModel={workspace.graphModel} collections={workspace.activeProject?.tabs ?? []} activeEntityId={workspace.activeEntity?.id} onSelectEntity={handleGraphSelectEntity} onNodePositionChange={workspace.updateGraphNodePosition} onUpdateCollectionColor={workspace.updateTabColor} onCreateRelation={(sourceEntityId, targetEntityId) => workspace.addRelation(sourceEntityId, targetEntityId, 'relates_to')} /> : workspace.activeEntity && workspace.activeDraft ? <EditorPanel entity={workspace.activeEntity} draft={workspace.activeDraft} templates={workspace.activeTemplates} collections={workspace.activeProject?.tabs ?? []} allEntities={workspace.activeProject?.entities ?? []} editorViewRef={workspace.editorViewRef} referenceSuggestionActive={Boolean(workspace.referenceSuggestion)} suggestionOptions={workspace.suggestionOptions} saveStatus={workspace.saveStatus} streamStatus={workspace.streamStatus} zenMode={zenMode} onOpenEntity={workspace.selectEntity} onDraftChange={workspace.setDraft} onHandleEditorChange={workspace.handleEditorChange} onInsertReference={workspace.insertReference} onAttachImages={workspace.attachImages} onAddField={workspace.addField} onUpdateField={workspace.updateField} onRemoveField={workspace.removeField} onSaveAsTemplate={workspace.saveCurrentAsTemplate} onApplyTemplate={workspace.applyActiveTemplate} onDuplicate={workspace.duplicateActiveEntity} onArchive={workspace.archiveActiveEntity} onDelete={workspace.deleteActiveEntity} onGenerateAiProposal={workspace.generateAiProposal} onToggleZenMode={() => setZenMode(c => !c)} /> : <div className="panel surface-panel empty-state">Vacio</div>}
          </div>


          <aside className={hasInspectorPanel ? 'inspector-panel-shell open' : 'inspector-panel-shell'} style={{ width: `${workspace.panelWidths.inspector}px` }}>
            {hasInspectorPanel && (
              <ResizeHandle
                side="right"
                onResize={(delta) => workspace.adjustInspectorWidth(delta)}
                onResizeEnd={() => { }}
              />
            )}
            {!zenMode && workspace.panels.inspector && <InspectorPanel side="right" activeTab={workspace.activeTab} activeEntity={workspace.activeEntity} activeDraft={workspace.activeDraft} activeProject={workspace.activeProject} activeTemplates={workspace.activeTemplates} pendingProposal={workspace.pendingProposal} streamStatus={workspace.streamStatus} streamingText={workspace.streamingText} llmTraces={workspace.llmTraces} syncStatus={workspace.syncStatus} syncStats={workspace.syncStats} syncRemoteConfig={workspace.syncRemoteConfig} checkpoints={workspace.checkpoints} correlationReports={workspace.correlationReports} activePanelTab={inspectorTab} onActivePanelTabChange={setInspectorTab} onUpdateTabPrompt={workspace.updateTabPrompt} onConfirmProposal={workspace.confirmAiProposal} onDismissProposal={workspace.dismissProposal} onStopGeneration={workspace.stopGeneration} onFlushRemoteSync={workspace.flushRemoteSync} onConfigureRemoteSync={openSyncConfigDialog} onClearRemoteSyncCredential={workspace.clearRemoteSyncCredential} onRestoreCheckpoint={workspace.restoreCheckpoint} onRotateProviderCredential={openRotateKeyDialog} onInvalidateProviderCredential={openInvalidateKeyDialog} onRefreshVaultMetadata={workspace.refreshVaultMetadata} onAddRelation={workspace.addRelation} onRemoveRelation={workspace.removeRelation} onCollapse={() => workspace.togglePanel('inspector')} />}
          </aside>

        </section>
      </section>


      {searchPaletteOpen && <CommandPalette searchQuery={workspace.searchQuery} searchResults={workspace.searchResults} onSearchChange={workspace.setSearchQuery} onSelectResult={handleSelectResult} onClose={() => setSearchPaletteOpen(false)} />}
      <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <FloatingAssistantFab
        isOpen={assistantFabOpen}
        hasSuggestion={hasSuggestion}
        draft={floatingAssistantDraft}
        streamStatus={workspace.streamStatus}
        onToggle={() => setAssistantFabOpen((c) => !c)}
        onClose={() => setAssistantFabOpen(false)}
        onDraftChange={setFloatingAssistantDraft}
        onSubmit={handleFloatingAssistantSubmit}
        onStopGeneration={workspace.stopGeneration}
      />
      {workspace.toast && <div className="toast">{workspace.toast}</div>}
      {fusionVeilActive && <div className="theme-fusion-veil" aria-hidden="true" />}
      <RenameProjectDialog
        open={renameProjectOpen}
        onOpenChange={setRenameProjectOpen}
        currentName={workspace.activeProject?.name ?? ''}
        onRename={workspace.renameActiveProject}
      />

      <RenameTabDialog
        open={renameTabOpen}
        onOpenChange={setRenameTabOpen}
        currentName={workspace.activeTab?.name ?? ''}
        onRename={workspace.renameActiveTab}
      />

      <SyncConfigDialog
        open={syncConfigOpen}
        onOpenChange={setSyncConfigOpen}
        syncRemoteConfig={workspace.syncRemoteConfig}
        defaultWorkspaceId={workspace.activeProject?.id ?? ''}
        onSave={(config) => void workspace.configureRemoteSync(config)}
      />

      <RotateKeyDialog
        open={rotateKeyOpen}
        onOpenChange={setRotateKeyOpen}
        onRotate={(key) => void workspace.rotateProviderCredential(key)}
      />

      <InvalidateKeyConfirmDialog
        open={invalidateKeyOpen}
        onOpenChange={setInvalidateKeyOpen}
        onConfirm={() => void workspace.invalidateProviderCredential()}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        activeModel={workspace.data.settings?.model ?? ''}
        activeProjectName={workspace.activeProject?.name ?? ''}
        syncEndpoint={workspace.syncRemoteConfig?.endpoint ?? 'No configurado'}
        onRotateKey={(key) => void workspace.rotateProviderCredential(key)}
        onInvalidateKey={() => void workspace.invalidateProviderCredential()}
        onConfigureSync={handleOpenSyncFromSettings}
        onActivateZenMode={() => { setZenMode(true); setSettingsOpen(false) }}
      />

    </div>
  )
}

