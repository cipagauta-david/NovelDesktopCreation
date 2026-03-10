import { EditorPanel } from './components/EditorPanel'
import { EntityList } from './components/EntityList'
import { GraphPanel } from './components/GraphPanel'
import { InspectorPanel } from './components/InspectorPanel'
import { OnboardingScreen } from './components/OnboardingScreen'
import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { WorkspaceHeader } from './components/WorkspaceHeader'
import { useWorkspace } from './hooks/useWorkspace'

function App() {
  const workspace = useWorkspace()

  if (!workspace.onboardingReady) {
    return <OnboardingScreen onSubmit={workspace.completeOnboarding} />
  }

  const layoutColumns = [
    workspace.panels.sidebar ? '320px' : null,
    workspace.panels.entities ? '280px' : null,
    'minmax(0, 1fr)',
    workspace.panels.inspector ? '320px' : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <main className="app-shell">
      <WorkspaceHeader
        project={workspace.activeProject}
        searchQuery={workspace.searchQuery}
        workspaceView={workspace.workspaceView}
        panels={workspace.panels}
        onSearchChange={workspace.setSearchQuery}
        onViewChange={workspace.setWorkspaceView}
        onTogglePanel={workspace.togglePanel}
      />

      {workspace.searchResults.length > 0 && (
        <section className="search-results-bar">
          {workspace.searchResults.map((result) => (
            <button
              key={result.entityId}
              type="button"
              className="search-result"
              onClick={() => workspace.selectEntity(result.entityId, result.tabId)}
            >
              <strong>{result.title}</strong>
              <span>{result.snippet}</span>
              <small>Score {result.score}</small>
            </button>
          ))}
        </section>
      )}

      <TabBar
        tabs={workspace.activeProject?.tabs ?? []}
        activeTab={workspace.activeTab}
        newTabName={workspace.newTabName}
        onNewTabNameChange={workspace.setNewTabName}
        onSelectTab={workspace.selectTab}
        onCreateTab={workspace.createTab}
        onMoveTab={workspace.moveActiveTab}
        onRenameTab={workspace.renameActiveTab}
        onDeleteTab={workspace.deleteActiveTab}
      />

      <section className="workspace-grid" style={{ gridTemplateColumns: layoutColumns }}>
        {workspace.panels.sidebar && workspace.data.settings && (
          <Sidebar
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
            onRenameProject={workspace.renameActiveProject}
            onDeleteProject={workspace.deleteActiveProject}
            onClearWorkspace={workspace.clearWorkspace}
            onSaveTemplate={workspace.saveCurrentAsTemplate}
          />
        )}

        {workspace.panels.entities && (
          <EntityList
            title={workspace.activeTab?.name ?? 'Entidades'}
            count={workspace.activeTabEntities.length}
            entities={workspace.activeTabEntities}
            activeEntityId={workspace.activeEntity?.id}
            templates={workspace.activeTemplates}
            selectedTemplateId={workspace.selectedNewEntityTemplateId}
            onTemplateChange={workspace.setNewEntityTemplateId}
            onCreateEntity={workspace.createEntity}
            onSelectEntity={workspace.selectEntity}
          />
        )}

        <div className="main-column">
          {workspace.workspaceView === 'graph' ? (
            <GraphPanel
              graphModel={workspace.graphModel}
              activeEntityId={workspace.activeEntity?.id}
              onSelectEntity={workspace.selectEntity}
            />
          ) : workspace.activeEntity && workspace.activeDraft ? (
            <EditorPanel
              project={workspace.activeProject}
              entity={workspace.activeEntity}
              draft={workspace.activeDraft}
              templates={workspace.activeTemplates}
              textareaRef={workspace.textareaRef}
              referenceSuggestionActive={Boolean(workspace.referenceSuggestion)}
              suggestionOptions={workspace.suggestionOptions}
              onDraftChange={workspace.setDraft}
              onHandleEditorChange={workspace.handleEditorChange}
              onInsertReference={workspace.insertReference}
              onAttachImages={workspace.attachImages}
              onAddField={workspace.addField}
              onUpdateField={workspace.updateField}
              onRemoveField={workspace.removeField}
              onApplyTemplate={workspace.applyActiveTemplate}
              onDuplicate={workspace.duplicateActiveEntity}
              onArchive={workspace.archiveActiveEntity}
              onDelete={workspace.deleteActiveEntity}
              onGenerateAiProposal={workspace.generateAiProposal}
              onNavigateFromReference={workspace.navigateFromReference}
            />
          ) : (
            <section className="panel surface-panel empty-state">
              <h3>Selecciona o crea una entidad</h3>
              <p>La tab activa aún no tiene contenido vivo. Crea una entidad para empezar.</p>
            </section>
          )}
        </div>

        {workspace.panels.inspector && (
          <InspectorPanel
            activeTab={workspace.activeTab}
            activeEntity={workspace.activeEntity}
            activeProject={workspace.activeProject}
            pendingProposal={workspace.pendingProposal}
            onUpdateTabPrompt={workspace.updateTabPrompt}
            onConfirmProposal={workspace.confirmAiProposal}
            onDismissProposal={workspace.dismissProposal}
          />
        )}
      </section>

      {workspace.toast && <div className="toast">{workspace.toast}</div>}
    </main>
  )
}

export default App
