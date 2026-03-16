import { memo, useState } from 'react'

import type { AppSettings, EntityTemplate, Project } from '../../types/workspace'
import { ActionMenu } from '../common/ActionMenu'
import { PanelSection } from '../common/PanelSection'
import '../../styles/layout/Sidebar.css';



type SidebarProps = {
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
}

export const Sidebar = memo(function Sidebar({
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
}: SidebarProps) {
  const [showProjectForm, setShowProjectForm] = useState(false)
  const activeProject = projects.find((project) => project.id === activeProjectId)

  return (
    <section className="sidebar sidebar-compact">
      <div className="sidebar-identity">
        <span className="eyebrow">Espacio narrativo</span>
        <strong>{settings.authorName}</strong>
        <small>Explora y orquesta tu universo narrativo.</small>
      </div>

      <PanelSection
        title="Proyecto activo"
        meta={`${projects.length} proyecto${projects.length === 1 ? '' : 's'}`}
        actions={
          <>
            <button
              type="button"
              className="secondary-button compact-button"
              onClick={() => setShowProjectForm((current) => !current)}
            >
              {showProjectForm ? 'Cerrar' : 'Nuevo'}
            </button>
            <ActionMenu
              label="Opciones de proyecto"
              items={[
                { label: 'Renombrar proyecto activo', onSelect: onRenameProject },
                { label: 'Exportar proyecto (JSON)', onSelect: onExportProject },
                { label: 'Importar proyecto (JSON)', onSelect: onImportProject },
                {
                  label: 'Eliminar proyecto activo',
                  onSelect: onDeleteProject,
                  destructive: true,
                  disabled: projects.length === 1,
                },
                { label: 'Reiniciar demo', onSelect: onClearWorkspace, destructive: true },
              ]}
            />
          </>
        }
      >
        <div className="project-switcher-stack">
          <div className="project-switcher-inline" aria-label="Selector de proyecto">
            <div className="project-switcher-trigger" role="status" aria-live="polite">
              <span>{activeProject?.name ?? 'Proyecto narrativo'}</span>
            </div>
            <ActionMenu
              label="Seleccionar proyecto"
              icon="⌄"
              items={projects.map((project) => ({
                label: project.id === activeProjectId ? `✓ ${project.name}` : project.name,
                onSelect: () => onSelectProject(project.id),
              }))}
            />
          </div>

          <div className="project-switcher-summary">
            {activeProject && (
              <div key={activeProject.id}>
                <strong>{activeProject.name}</strong>
                <span>{activeProject.description}</span>
              </div>
            )}
          </div>
        </div>

        {showProjectForm && (
          <div className="stacked-form compact-project-form">
            <input
              value={newProjectName}
              onChange={(event) => onProjectNameChange(event.target.value)}
              placeholder="Nombre del proyecto"
            />
            <textarea
              value={newProjectDescription}
              onChange={(event) => onProjectDescriptionChange(event.target.value)}
              placeholder="Describe el mundo, tono o premisa que quieres construir"
            />
            <button className="primary-button" type="button" onClick={onCreateProject}>
              Crear proyecto
            </button>
          </div>
        )}
      </PanelSection>

      <PanelSection
        title="Templates"
        meta={`${activeTemplates.length} disponibles`}
        defaultOpen={false}
        actions={
          <button type="button" className="ghost-button compact-button" onClick={onSaveTemplate}>
            Guardar plantilla actual
          </button>
        }
      >
        <div className="template-list template-list-compact">
          {activeTemplates.map((template) => (
            <article key={template.id} className="template-card template-row">
              <span className="template-row-icon" aria-hidden="true">◦</span>
              <div>
                <strong>{template.name}</strong>
                <span>{template.description}</span>
                <small>{template.fields.join(' · ')}</small>
              </div>
            </article>
          ))}
        </div>
      </PanelSection>
    </section>
  )
})
