import { useState, useEffect } from 'react'
import { EditorPanel } from './EditorPanel'
import { EntityList } from './EntityList'
import { GraphPanel } from './GraphPanel'
import { InspectorPanel } from './InspectorPanel'
import { OnboardingScreen } from './OnboardingScreen'
import { Sidebar } from './Sidebar'
import { TabBar } from './TabBar'
import { WorkspaceHeader } from './WorkspaceHeader'
import { useWorkspace } from '../hooks/useWorkspace'
import type { PersistedState } from '../types/workspace'
import * as Comlink from 'comlink'
import type { AppWorker } from '../data/worker'

export function AppShell({ initialData, worker }: { initialData: PersistedState, worker: Comlink.Remote<AppWorker> }) {
  const workspace = useWorkspace(initialData, worker)
  const [zenMode, setZenMode] = useState(false)
  const [searchPaletteOpen, setSearchPaletteOpen] = useState(false)
  const hasLeftPanel = !zenMode && (workspace.panels.sidebar || workspace.panels.entities)
  const hasInspectorPanel = !zenMode && workspace.panels.inspector

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const usesCommand = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()
      if (e.key === 'Escape' && zenMode) { e.preventDefault(); setZenMode(false); return }
      if (e.key === 'Escape' && searchPaletteOpen) { e.preventDefault(); setSearchPaletteOpen(false); return }
      if (e.key === 'F11' || (usesCommand && e.shiftKey && key === 'f')) { e.preventDefault(); setZenMode(c => !c); return }
      if (usesCommand && key === 'k') { e.preventDefault(); setSearchPaletteOpen(true); return }
      if (usesCommand && key === '\\') { e.preventDefault(); workspace.togglePanel('inspector') }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [searchPaletteOpen, workspace, zenMode])

  if (!workspace.onboardingReady) return <OnboardingScreen onSubmit={workspace.completeOnboarding} />

  const handleToggleNav = () => {
    if (workspace.panels.sidebar || workspace.panels.entities) {
      if (workspace.panels.sidebar) workspace.togglePanel('sidebar')
      if (workspace.panels.entities) workspace.togglePanel('entities')
    } else { workspace.togglePanel('sidebar'); workspace.togglePanel('entities') }
  }

  const handleSelectResult = (entityId: string, tabId: string) => { workspace.selectEntity(entityId, tabId); setSearchPaletteOpen(false) }

  return (
    <main className="app-shell">
      <div className={zenMode ? 'workspace-header-shell is-hidden' : 'workspace-header-shell'}>
        <WorkspaceHeader 
          project={workspace.activeProject} 
          workspaceView={workspace.workspaceView} 
          leftPanelOpen={hasLeftPanel} 
          inspectorOpen={hasInspectorPanel} 
          searchQuery={workspace.searchQuery}
          searchResults={workspace.searchResults}
          searchOpen={searchPaletteOpen}
          onSearchChange={workspace.setSearchQuery}
          onSearchOpenChange={setSearchPaletteOpen}
          onSelectSearchResult={handleSelectResult}
          onViewChange={workspace.setWorkspaceView} 
          onToggleLeftPanel={handleToggleNav} 
          onToggleInspector={() => workspace.togglePanel('inspector')} 
        />
      </div>

      <section className={zenMode ? 'workspace-stage focus-mode' : 'workspace-stage'}>
        <section className="workspace-grid">
          {!zenMode && (
            <aside className={hasLeftPanel ? 'left-workspace-panel open' : 'left-workspace-panel'}>
              <div className="left-panel-topbar"><span className="eyebrow">Navegación</span><button type="button" className="panel-dock-toggle" aria-label="Ocultar" onClick={handleToggleNav}>‹</button></div>
              <div className="left-panel-layout">
                <div className="left-panel-upper">
                  {workspace.panels.sidebar && workspace.data.settings && <Sidebar settings={workspace.data.settings} projects={workspace.data.projects} activeProjectId={workspace.data.activeProjectId} activeTemplates={workspace.activeTemplates} newProjectName={workspace.newProjectName} newProjectDescription={workspace.newProjectDescription} onProjectNameChange={workspace.setNewProjectName} onProjectDescriptionChange={workspace.setNewProjectDescription} onCreateProject={workspace.createProject} onSelectProject={workspace.selectProject} onRenameProject={workspace.renameActiveProject} onDeleteProject={workspace.deleteActiveProject} onClearWorkspace={workspace.clearWorkspace} onSaveTemplate={workspace.saveCurrentAsTemplate} />}
                  <TabBar tabs={workspace.activeProject?.tabs ?? []} activeTab={workspace.activeTab} newTabName={workspace.newTabName} onNewTabNameChange={workspace.setNewTabName} onSelectTab={workspace.selectTab} onCreateTab={workspace.createTab} onMoveTab={workspace.moveActiveTab} onRenameTab={workspace.renameActiveTab} onDeleteTab={workspace.deleteActiveTab} />
                </div>
                <div className="left-panel-lower">
                  {workspace.panels.entities && <EntityList title={workspace.activeTab?.name ?? 'Entidades'} count={workspace.activeTabEntities.length} entities={workspace.activeTabEntities} activeEntityId={workspace.activeEntity?.id} templates={workspace.activeTemplates} selectedTemplateId={workspace.selectedNewEntityTemplateId} onTemplateChange={workspace.setNewEntityTemplateId} onCreateEntity={workspace.createEntity} onSelectEntity={workspace.selectEntity} />}
                </div>
              </div>
            </aside>
          )}

          <div className={zenMode ? 'main-column focus-mode' : 'main-column'}>
            {workspace.workspaceView === 'graph' ? <GraphPanel graphModel={workspace.graphModel} activeEntityId={workspace.activeEntity?.id} onSelectEntity={(eId, tId) => { workspace.selectEntity(eId, tId); if (!zenMode && !workspace.panels.inspector) workspace.togglePanel('inspector') }} /> : workspace.activeEntity && workspace.activeDraft ? <EditorPanel entity={workspace.activeEntity} draft={workspace.activeDraft} templates={workspace.activeTemplates} allEntities={workspace.activeProject?.entities ?? []} editorViewRef={workspace.editorViewRef} referenceSuggestionActive={Boolean(workspace.referenceSuggestion)} suggestionOptions={workspace.suggestionOptions} saveStatus={workspace.saveStatus} zenMode={zenMode} onOpenEntity={workspace.selectEntity} onDraftChange={workspace.setDraft} onHandleEditorChange={workspace.handleEditorChange} onInsertReference={workspace.insertReference} onAttachImages={workspace.attachImages} onAddField={workspace.addField} onUpdateField={workspace.updateField} onRemoveField={workspace.removeField} onApplyTemplate={workspace.applyActiveTemplate} onDuplicate={workspace.duplicateActiveEntity} onArchive={workspace.archiveActiveEntity} onDelete={workspace.deleteActiveEntity} onGenerateAiProposal={workspace.generateAiProposal} onToggleZenMode={() => setZenMode(c => !c)} /> : <div className="panel surface-panel empty-state">Vacio</div>}
          </div>

          {!zenMode && (
             <aside className={hasInspectorPanel ? 'inspector-panel-shell open' : 'inspector-panel-shell'}>
                {workspace.panels.inspector && <InspectorPanel activeTab={workspace.activeTab} activeEntity={workspace.activeEntity} activeDraft={workspace.activeDraft} activeProject={workspace.activeProject} activeTemplates={workspace.activeTemplates} pendingProposal={workspace.pendingProposal} onUpdateTabPrompt={workspace.updateTabPrompt} onConfirmProposal={workspace.confirmAiProposal} onDismissProposal={workspace.dismissProposal} onCollapse={() => workspace.togglePanel('inspector')} />}
             </aside>
          )}
        </section>
      </section>


      {workspace.toast && <div className="toast">{workspace.toast}</div>}
    </main>
  )
}
