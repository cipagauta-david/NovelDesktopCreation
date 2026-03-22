import { memo } from 'react'

import type { AppSettings, CollectionTab, EntityRecord, EntityTemplate, Project } from '../../types/workspace'
import { DockPanelScaffold } from '../common/DockPanelScaffold'
import { Sidebar } from '../layout/Sidebar'
import { TabBar } from '../layout/TabBar'
import { EntityList } from './EntityList'
import '../../styles/panels/NavigationPanel.css'

type NavigationPanelProps = {
  settings: AppSettings
  projects: Project[]
  activeProjectId: string
  activeTemplates: EntityTemplate[]
  newProjectName: string
  newProjectDescription: string
  onProjectNameChange: (value: string) => void
  onProjectDescriptionChange: (value: string) => void
  onCreateProject: () => void
  onSelectProject: (projectId: string) => void
  onRenameProject: () => void
  onDeleteProject: () => void
  onClearWorkspace: () => void
  onSaveTemplate: () => void
  onExportProject: () => void
  onImportProject: () => void
  tabs: CollectionTab[]
  activeTab: CollectionTab | null
  newTabName: string
  onNewTabNameChange: (value: string) => void
  onSelectTab: (tabId: string) => void
  onCreateTab: () => void
  onMoveTab: (direction: -1 | 1) => void
  onRenameTab: () => void
  onDeleteTab: () => void
  onUpdateActiveTabColor: (color: string) => void
  entitiesEnabled: boolean
  entities: EntityRecord[]
  archivedEntities: EntityRecord[]
  activeEntityId?: string
  selectedTemplateId: string
  onTemplateChange: (value: string) => void
  onCreateEntity: () => void
  onSelectEntity: (entityId: string, tabId: string) => void
  onReorderEntities?: (entityIds: string[]) => void
  activeNavigationTab: 'workspace' | 'content'
  onActiveNavigationTabChange: (tab: 'workspace' | 'content') => void
  onCollapse: () => void
}

export const NavigationPanel = memo(function NavigationPanel({
  settings,
  projects,
  activeProjectId,
  activeTemplates,
  newProjectName,
  newProjectDescription,
  onProjectNameChange,
  onProjectDescriptionChange,
  onCreateProject,
  onSelectProject,
  onRenameProject,
  onDeleteProject,
  onClearWorkspace,
  onSaveTemplate,
  onExportProject,
  onImportProject,
  tabs,
  activeTab,
  newTabName,
  onNewTabNameChange,
  onSelectTab,
  onCreateTab,
  onMoveTab,
  onRenameTab,
  onDeleteTab,
  onUpdateActiveTabColor,
  entitiesEnabled,
  entities,
  archivedEntities,
  activeEntityId,
  selectedTemplateId,
  onTemplateChange,
  onCreateEntity,
  onSelectEntity,
  onReorderEntities,
  activeNavigationTab,
  onActiveNavigationTabChange,
  onCollapse,
}: NavigationPanelProps) {
  const showWorkspace = activeNavigationTab === 'workspace'
  const showContent = activeNavigationTab === 'content'

  return (
    <DockPanelScaffold
      side="left"
      eyebrow="Navegacion"
      collapseLabel="Ocultar navegacion"
      onCollapse={onCollapse}
      showHeader={false}
      tabs={
        <div className="dock-panel-icon-tabs" role="tablist" aria-label="Secciones de navegación">
          <button
            type="button"
            className={activeNavigationTab === 'workspace' ? 'dock-panel-icon-tab active' : 'dock-panel-icon-tab'}
            role="tab"
            aria-selected={activeNavigationTab === 'workspace'}
            title="Proyecto"
            onClick={() => onActiveNavigationTabChange('workspace')}
          >
            ⌂
          </button>
          <button
            type="button"
            className={activeNavigationTab === 'content' ? 'dock-panel-icon-tab active' : 'dock-panel-icon-tab'}
            role="tab"
            aria-selected={activeNavigationTab === 'content'}
            title="Colecciones"
            onClick={() => onActiveNavigationTabChange('content')}
          >
            ☷
          </button>
        </div>
      }
    >
      <div className="navigation-panel-layout">
        {showWorkspace ? (
          <div className="navigation-panel-upper">
            <Sidebar
              settings={settings}
              projects={projects}
              activeProjectId={activeProjectId}
              activeTemplates={activeTemplates}
              newProjectName={newProjectName}
              newProjectDescription={newProjectDescription}
              onProjectNameChange={onProjectNameChange}
              onProjectDescriptionChange={onProjectDescriptionChange}
              onCreateProject={onCreateProject}
              onSelectProject={onSelectProject}
              onRenameProject={onRenameProject}
              onDeleteProject={onDeleteProject}
              onClearWorkspace={onClearWorkspace}
              onSaveTemplate={onSaveTemplate}
              onExportProject={onExportProject}
              onImportProject={onImportProject}
            />
          </div>
        ) : null}

        {showContent ? (
          <div className="navigation-panel-lower">
            <TabBar
              tabs={tabs}
              activeTab={activeTab}
              newTabName={newTabName}
              onNewTabNameChange={onNewTabNameChange}
              onSelectTab={onSelectTab}
              onCreateTab={onCreateTab}
              onMoveTab={onMoveTab}
              onRenameTab={onRenameTab}
              onDeleteTab={onDeleteTab}
              onUpdateActiveTabColor={onUpdateActiveTabColor}
            />
            {entitiesEnabled ? (
              <EntityList
                title={activeTab?.name ?? 'Entidades'}
                count={entities.length}
                entities={entities}
                archivedEntities={archivedEntities}
                activeEntityId={activeEntityId}
                templates={activeTemplates}
                selectedTemplateId={selectedTemplateId}
                onTemplateChange={onTemplateChange}
                onCreateEntity={onCreateEntity}
                onSelectEntity={onSelectEntity}
                onReorderEntities={onReorderEntities}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </DockPanelScaffold>
  )
})
