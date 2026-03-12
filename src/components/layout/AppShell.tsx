import { useState, useEffect, useCallback, type DragEvent } from 'react'
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
import { useWorkspace } from '../../hooks/useWorkspace'
import type { PersistedState } from '../../types/workspace'
import * as Comlink from 'comlink'
import type { AppWorker } from '../../data/worker'

export function AppShell({ initialData, worker }: { initialData: PersistedState, worker: Comlink.Remote<AppWorker> }) {
  const workspace = useWorkspace(initialData, worker)
  const [zenMode, setZenMode] = useState(false)
  const [searchPaletteOpen, setSearchPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [globalDragging, setGlobalDragging] = useState(false)
  const hasLeftPanel = !zenMode && (workspace.panels.sidebar || workspace.panels.entities)
  const hasInspectorPanel = !zenMode && workspace.panels.inspector

  // Destructure stable callbacks to avoid re-running effect on every render
  const { togglePanel, panels, selectEntity, attachImages } = workspace

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const usesCommand = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()
      if (e.key === 'Escape' && zenMode) { e.preventDefault(); setZenMode(false); return }
      if (e.key === 'Escape' && searchPaletteOpen) { e.preventDefault(); setSearchPaletteOpen(false); return }
      if (e.key === 'Escape' && shortcutsOpen) { e.preventDefault(); setShortcutsOpen(false); return }
      if (e.key === 'F11' || (usesCommand && e.shiftKey && key === 'f')) { e.preventDefault(); setZenMode(c => !c); return }
      if (usesCommand && key === 'k') { e.preventDefault(); setSearchPaletteOpen(true); return }
      if (usesCommand && key === '\\') { e.preventDefault(); togglePanel('inspector') }
      // ? key (not inside an input / textarea / contenteditable)
      if (e.key === '?' && !usesCommand && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !(e.target as HTMLElement)?.isContentEditable) {
        e.preventDefault(); setShortcutsOpen(c => !c)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [searchPaletteOpen, shortcutsOpen, togglePanel, zenMode])

  const handleToggleNav = useCallback(() => {
    if (panels.sidebar || panels.entities) {
      if (panels.sidebar) togglePanel('sidebar')
      if (panels.entities) togglePanel('entities')
    } else { togglePanel('sidebar'); togglePanel('entities') }
  }, [panels.sidebar, panels.entities, togglePanel])

  const handleSelectResult = useCallback((entityId: string, tabId: string) => { selectEntity(entityId, tabId); setSearchPaletteOpen(false) }, [selectEntity])
  const handleGlobalDrop = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    setGlobalDragging(false)
    const files = event.dataTransfer.files
    if (!files || files.length === 0) {
      return
    }
    void attachImages(files)
  }, [attachImages])

  const handleGraphSelectEntity = useCallback((eId: string, tId: string) => {
    selectEntity(eId, tId)
    if (!zenMode && !panels.inspector) togglePanel('inspector')
  }, [selectEntity, zenMode, panels.inspector, togglePanel])

  if (!workspace.onboardingReady) return <OnboardingScreen onSubmit={workspace.completeOnboarding} />

  return (
    <main
      className={globalDragging ? 'app-shell global-dragging' : 'app-shell'}
      onDragOver={(event) => {
        if (!Array.from(event.dataTransfer.items).some((item) => item.kind === 'file')) {
          return
        }
        event.preventDefault()
        if (!globalDragging) {
          setGlobalDragging(true)
        }
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) {
          return
        }
        setGlobalDragging(false)
      }}
      onDrop={handleGlobalDrop}
    >
      <div className={zenMode ? 'workspace-header-shell is-hidden' : 'workspace-header-shell'}>
        <WorkspaceHeader project={workspace.activeProject} searchResultsCount={workspace.searchResults.length} workspaceView={workspace.workspaceView} leftPanelOpen={hasLeftPanel} inspectorOpen={hasInspectorPanel} hasActiveSearch={workspace.searchQuery.trim().length > 0} onOpenSearch={() => setSearchPaletteOpen(true)} onViewChange={workspace.setWorkspaceView} onToggleLeftPanel={handleToggleNav} onToggleInspector={() => workspace.togglePanel('inspector')} />
      </div>

      <section className={zenMode ? 'workspace-stage focus-mode' : 'workspace-stage'}>
        <section className="workspace-grid">
          {!zenMode && (
            <aside className={hasLeftPanel ? 'left-workspace-panel open' : 'left-workspace-panel'}>
              <div className="left-panel-topbar"><span className="eyebrow">Navegación</span><button type="button" className="panel-dock-toggle" aria-label="Ocultar" onClick={handleToggleNav}>‹</button></div>
              <div className="left-panel-layout">
                <div className="left-panel-upper">
                  {workspace.panels.sidebar && workspace.data.settings && <Sidebar settings={workspace.data.settings} projects={workspace.data.projects} activeProjectId={workspace.data.activeProjectId} activeTemplates={workspace.activeTemplates} newProjectName={workspace.newProjectName} newProjectDescription={workspace.newProjectDescription} onProjectNameChange={workspace.setNewProjectName} onProjectDescriptionChange={workspace.setNewProjectDescription} onCreateProject={workspace.createProject} onSelectProject={workspace.selectProject} onRenameProject={workspace.renameActiveProject} onDeleteProject={workspace.deleteActiveProject} onClearWorkspace={workspace.clearWorkspace} onSaveTemplate={workspace.saveCurrentAsTemplate} onExportProject={workspace.exportActiveProject} onImportProject={workspace.importProject} />}
                </div>
                <div className="left-panel-lower">
                  <TabBar tabs={workspace.activeProject?.tabs ?? []} activeTab={workspace.activeTab} newTabName={workspace.newTabName} onNewTabNameChange={workspace.setNewTabName} onSelectTab={workspace.selectTab} onCreateTab={workspace.createTab} onMoveTab={workspace.moveActiveTab} onRenameTab={workspace.renameActiveTab} onDeleteTab={workspace.deleteActiveTab} />
                  {workspace.panels.entities && <EntityList title={workspace.activeTab?.name ?? 'Entidades'} count={workspace.activeTabEntities.length} entities={workspace.activeTabEntities} activeEntityId={workspace.activeEntity?.id} templates={workspace.activeTemplates} selectedTemplateId={workspace.selectedNewEntityTemplateId} onTemplateChange={workspace.setNewEntityTemplateId} onCreateEntity={workspace.createEntity} onSelectEntity={workspace.selectEntity} onReorderEntities={workspace.reorderEntities} />}
                </div>
              </div>
            </aside>
          )}

          <div className={zenMode ? 'main-column focus-mode' : 'main-column'}>
            {workspace.workspaceView === 'graph' ? <GraphPanel graphModel={workspace.graphModel} activeEntityId={workspace.activeEntity?.id} onSelectEntity={handleGraphSelectEntity} onNodePositionChange={workspace.updateGraphNodePosition} onResetLayout={workspace.resetGraphLayout} /> : workspace.activeEntity && workspace.activeDraft ? <EditorPanel entity={workspace.activeEntity} draft={workspace.activeDraft} templates={workspace.activeTemplates} allEntities={workspace.activeProject?.entities ?? []} editorViewRef={workspace.editorViewRef} referenceSuggestionActive={Boolean(workspace.referenceSuggestion)} suggestionOptions={workspace.suggestionOptions} saveStatus={workspace.saveStatus} zenMode={zenMode} onOpenEntity={workspace.selectEntity} onDraftChange={workspace.setDraft} onHandleEditorChange={workspace.handleEditorChange} onInsertReference={workspace.insertReference} onAttachImages={workspace.attachImages} onAddField={workspace.addField} onUpdateField={workspace.updateField} onRemoveField={workspace.removeField} onApplyTemplate={workspace.applyActiveTemplate} onDuplicate={workspace.duplicateActiveEntity} onArchive={workspace.archiveActiveEntity} onDelete={workspace.deleteActiveEntity} onGenerateAiProposal={workspace.generateAiProposal} onToggleZenMode={() => setZenMode(c => !c)} /> : <div className="panel surface-panel empty-state">Vacio</div>}
          </div>

          {!zenMode && (
             <aside className={hasInspectorPanel ? 'inspector-panel-shell open' : 'inspector-panel-shell'}>
                {workspace.panels.inspector && <InspectorPanel activeTab={workspace.activeTab} activeEntity={workspace.activeEntity} activeDraft={workspace.activeDraft} activeProject={workspace.activeProject} activeTemplates={workspace.activeTemplates} pendingProposal={workspace.pendingProposal} streamStatus={workspace.streamStatus} streamingText={workspace.streamingText} llmTraces={workspace.llmTraces} onUpdateTabPrompt={workspace.updateTabPrompt} onConfirmProposal={workspace.confirmAiProposal} onDismissProposal={workspace.dismissProposal} onStopGeneration={workspace.stopGeneration} onCollapse={() => workspace.togglePanel('inspector')} />}
             </aside>
          )}
        </section>
      </section>

      {searchPaletteOpen && <CommandPalette searchQuery={workspace.searchQuery} searchResults={workspace.searchResults} onSearchChange={workspace.setSearchQuery} onSelectResult={handleSelectResult} onClose={() => setSearchPaletteOpen(false)} />}
      <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {workspace.toast && <div className="toast">{workspace.toast}</div>}
      {globalDragging && (
        <div className="global-drop-overlay" aria-live="polite">
          <strong>Suelta imágenes para anexarlas a la entidad activa</strong>
          <span>Funciona en cualquier vista del workspace.</span>
        </div>
      )}
    </main>
  )
}
