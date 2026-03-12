import { useState } from 'react'

import type { AppSettings, EntityTemplate, Project } from '../types/workspace'
import { ActionMenu } from './common/ActionMenu'
import { PanelSection } from './common/PanelSection'

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
}

export function Sidebar({
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
}: SidebarProps) {
  const [showProjectForm, setShowProjectForm] = useState(false)

  return (
    <aside className="sidebar sidebar-compact">
      <div className="sidebar-identity">
        <span className="eyebrow">Espacio narrativo</span>
        <strong>{settings.authorName}</strong>
        <small>
          IA activa · {settings.provider} · {settings.model}
        </small>
      </div>

      <PanelSection
        title="Proyecto activo"
        meta={`${projects.length} proyecto${projects.length === 1 ? '' : 's'}`}
        actions={
          <>
            <button
              type="button"
              className="ghost-button compact-button"
              onClick={() => setShowProjectForm((current) => !current)}
            >
              {showProjectForm ? 'Cerrar' : 'Nuevo'}
            </button>
            <ActionMenu
              label="Opciones de proyecto"
              items={[
                { label: 'Renombrar proyecto activo', onSelect: onRenameProject },
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
          <label className="compact-label">
            Selector de proyecto
            <select value={activeProjectId} onChange={(event) => onSelectProject(event.target.value)}>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <div className="project-switcher-summary">
            {projects
              .filter((project) => project.id === activeProjectId)
              .map((project) => (
                <div key={project.id}>
                  <strong>{project.name}</strong>
                  <span>{project.description}</span>
                </div>
              ))}
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
            <article key={template.id} className="template-card">
              <strong>{template.name}</strong>
              <span>{template.description}</span>
              <small>{template.fields.join(' · ')}</small>
            </article>
          ))}
        </div>
      </PanelSection>
    </aside>
  )
}
