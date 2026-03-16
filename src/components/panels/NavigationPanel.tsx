import { memo, useState } from 'react'

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
  activeEntityId?: string
  selectedTemplateId: string
  onTemplateChange: (value: string) => void
  onCreateEntity: () => void
  onSelectEntity: (entityId: string, tabId: string) => void
  onReorderEntities?: (entityIds: string[]) => void
  onCollapse: () => void
}

type NavigationPanelTab = 'workspace' | 'content'

const NAVIGATION_TAB_OPTIONS: ReadonlyArray<{ id: NavigationPanelTab; label: string }> = [
  { id: 'workspace', label: 'Proyecto' },
  { id: 'content', label: 'Colecciones' },
]

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
  activeEntityId,
  selectedTemplateId,
  onTemplateChange,
  onCreateEntity,
  onSelectEntity,
  onReorderEntities,
  onCollapse,
}: NavigationPanelProps) {
  const [activeNavigationTab, setActiveNavigationTab] = useState<NavigationPanelTab>('workspace')
  const showWorkspace = activeNavigationTab === 'workspace'
  const showContent = activeNavigationTab === 'content'

  return (
    <DockPanelScaffold
      side="left"
      eyebrow="Navegacion"
      collapseLabel="Ocultar navegacion"
      onCollapse={onCollapse}
      tabs={
        <label className="dock-panel-tab-select-wrap">
          <span className="visually-hidden">Secciones de navegación</span>
          <select
            className="dock-panel-tab-select"
            aria-label="Secciones de navegación"
            value={activeNavigationTab}
            onChange={(event) => setActiveNavigationTab(event.target.value as NavigationPanelTab)}
          >
            {NAVIGATION_TAB_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
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
