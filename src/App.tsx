import { useEffect, useRef, useState } from 'react'

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
  const [zenMode, setZenMode] = useState(false)
  const [searchPaletteOpen, setSearchPaletteOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const hasLeftPanel = !zenMode && (workspace.panels.sidebar || workspace.panels.entities)
  const hasInspectorPanel = !zenMode && workspace.panels.inspector

  useEffect(() => {
    if (!searchPaletteOpen) {
      return
    }

    const frameId = window.requestAnimationFrame(() => searchInputRef.current?.focus())
    return () => window.cancelAnimationFrame(frameId)
  }, [searchPaletteOpen])

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      const usesCommand = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      if (event.key === 'Escape' && zenMode) {
        event.preventDefault()
        setZenMode(false)
        return
      }

      if (event.key === 'Escape' && searchPaletteOpen) {
        event.preventDefault()
        setSearchPaletteOpen(false)
        return
      }

      if (event.key === 'F11' || (usesCommand && event.shiftKey && key === 'f')) {
        event.preventDefault()
        setZenMode((current) => !current)
        return
      }

      if (usesCommand && key === 'k') {
        event.preventDefault()
        setSearchPaletteOpen(true)
        return
      }

      if (usesCommand && key === '\\') {
        event.preventDefault()
        workspace.togglePanel('inspector')
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [searchPaletteOpen, workspace, zenMode])

  if (!workspace.onboardingReady) {
    return <OnboardingScreen onSubmit={workspace.completeOnboarding} />
  }

  function handleToggleNavigation() {
    if (workspace.panels.sidebar || workspace.panels.entities) {
      if (workspace.panels.sidebar) {
        workspace.togglePanel('sidebar')
      }
      if (workspace.panels.entities) {
        workspace.togglePanel('entities')
      }
      return
    }

    workspace.togglePanel('sidebar')
    workspace.togglePanel('entities')
  }

  function handleGraphSelect(entityId: string, tabId: string) {
    workspace.selectEntity(entityId, tabId)
    if (!zenMode && !workspace.panels.inspector) {
      workspace.togglePanel('inspector')
    }
  }

  function handleSelectSearchResult(entityId: string, tabId: string) {
    workspace.selectEntity(entityId, tabId)
    setSearchPaletteOpen(false)
  }

  return (
    <main className="app-shell">
      {!zenMode && (
        <WorkspaceHeader
          project={workspace.activeProject}
          searchResultsCount={workspace.searchResults.length}
          workspaceView={workspace.workspaceView}
          leftPanelOpen={hasLeftPanel}
          inspectorOpen={hasInspectorPanel}
          hasActiveSearch={workspace.searchQuery.trim().length > 0}
          onOpenSearch={() => setSearchPaletteOpen(true)}
          onViewChange={workspace.setWorkspaceView}
          onToggleLeftPanel={handleToggleNavigation}
          onToggleInspector={() => workspace.togglePanel('inspector')}
        />
      )}

      <section className={zenMode ? 'workspace-stage focus-mode' : 'workspace-stage'}>
        <section className="workspace-grid">
          {!zenMode && (
            <aside className={hasLeftPanel ? 'left-workspace-panel open' : 'left-workspace-panel'}>
              <div className="left-panel-topbar">
                <span className="eyebrow">Navegación</span>
                <button
                  type="button"
                  className="panel-dock-toggle"
                  aria-label="Ocultar navegación"
                  onClick={handleToggleNavigation}
                >
                  ‹
                </button>
              </div>

              <div className="left-panel-layout">
                <div className="left-panel-upper">
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
                </div>

                <div className="left-panel-lower">
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
                </div>
              </div>
            </aside>
          )}

          <div className={zenMode ? 'main-column focus-mode' : 'main-column'}>
            {workspace.workspaceView === 'graph' ? (
              <GraphPanel
                graphModel={workspace.graphModel}
                activeEntityId={workspace.activeEntity?.id}
                onSelectEntity={handleGraphSelect}
              />
            ) : workspace.activeEntity && workspace.activeDraft ? (
              <EditorPanel
                entity={workspace.activeEntity}
                draft={workspace.activeDraft}
                templates={workspace.activeTemplates}
                editorViewRef={workspace.editorViewRef}
                referenceSuggestionActive={Boolean(workspace.referenceSuggestion)}
                suggestionOptions={workspace.suggestionOptions}
                saveStatus={workspace.saveStatus}
                zenMode={zenMode}
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
                onToggleZenMode={() => setZenMode((current) => !current)}
              />
            ) : (
              <section className="panel surface-panel empty-state">
                <div className="empty-state-content">
                  <span className="eyebrow">Sin documento abierto</span>
                  <h3>Empieza creando una entidad en esta colección</h3>
                  <p>
                    Selecciona una entidad existente o crea una nueva desde la columna izquierda para
                    empezar a escribir, relacionar ideas y guardar contexto.
                  </p>
                  <ul className="empty-state-list">
                    <li>Usa una plantilla para crear personajes, lugares o escenas más rápido.</li>
                    <li>Escribe con referencias <strong>{'{{}}'}</strong> para enlazar conocimiento.</li>
                    <li>Cambia a vista de mapa cuando quieras revisar relaciones entre entidades.</li>
                  </ul>
                </div>
              </section>
            )}
          </div>

          {!zenMode && (
            <aside className={hasInspectorPanel ? 'inspector-panel-shell open' : 'inspector-panel-shell'}>
              {workspace.panels.inspector && (
                <InspectorPanel
                  activeTab={workspace.activeTab}
                  activeEntity={workspace.activeEntity}
                  activeDraft={workspace.activeDraft}
                  activeProject={workspace.activeProject}
                  activeTemplates={workspace.activeTemplates}
                  pendingProposal={workspace.pendingProposal}
                  onUpdateTabPrompt={workspace.updateTabPrompt}
                  onConfirmProposal={workspace.confirmAiProposal}
                  onDismissProposal={workspace.dismissProposal}
                  onCollapse={() => workspace.togglePanel('inspector')}
                />
              )}
            </aside>
          )}
        </section>
      </section>

      {searchPaletteOpen && (
        <div className="command-palette-backdrop" onClick={() => setSearchPaletteOpen(false)}>
          <section
            className="command-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Buscar dentro del proyecto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="command-palette-header">
              <label className="command-palette-input-wrap">
                <span className="visually-hidden">Buscar dentro del proyecto</span>
                <input
                  ref={searchInputRef}
                  value={workspace.searchQuery}
                  onChange={(event) => workspace.setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && workspace.searchResults[0]) {
                      event.preventDefault()
                      handleSelectSearchResult(
                        workspace.searchResults[0].entityId,
                        workspace.searchResults[0].tabId,
                      )
                    }
                  }}
                  placeholder="Buscar personajes, lugares, escenas o texto"
                  aria-label="Buscar dentro del proyecto"
                />
              </label>

              <button type="button" className="toggle-chip" onClick={() => setSearchPaletteOpen(false)}>
                Esc
              </button>
            </div>

            <div className="command-palette-body">
              {workspace.searchQuery.trim() ? (
                workspace.searchResults.length > 0 ? (
                  <div className="command-palette-results">
                    {workspace.searchResults.map((result) => (
                      <button
                        key={result.entityId}
                        type="button"
                        className="search-result command-result"
                        onClick={() => handleSelectSearchResult(result.entityId, result.tabId)}
                      >
                        <strong>{result.title}</strong>
                        <span>{result.snippet}</span>
                        <small>Abrir entidad</small>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="search-results-empty">
                    No encontramos coincidencias dentro del proyecto actual.
                  </div>
                )
              ) : (
                <div className="command-palette-empty">
                  <strong>Buscar sin robar espacio vertical</strong>
                  <p>Usa Ctrl+K o Cmd+K para abrir esta paleta y saltar directo a escenas, personajes o fragmentos.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {workspace.toast && <div className="toast">{workspace.toast}</div>}
    </main>
  )
}

export default App
