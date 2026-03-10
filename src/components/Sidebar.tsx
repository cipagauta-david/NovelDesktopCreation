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
    <aside className="sidebar">
      <div className="brand-card">
        <div className="eyebrow">NovelDesktopCreation</div>
        <h1>Workspace operativo</h1>
        <p>
          {settings.authorName} · {settings.provider}
        </p>
        <small>
          {settings.model} · clave {settings.apiKeyHint}
        </small>
      </div>

      <PanelSection
        title="Proyectos"
        meta={`${projects.length} workspace(s)`}
        actions={
          <ActionMenu
            label="Opciones de proyecto"
            items={[
              {
                label: showProjectForm ? 'Ocultar formulario' : 'Mostrar formulario',
                onSelect: () => setShowProjectForm((current) => !current),
              },
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
        }
      >
        <div className="project-list">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className={project.id === activeProjectId ? 'list-card active' : 'list-card'}
              onClick={() => onSelectProject(project.id)}
            >
              <strong>{project.name}</strong>
              <span>{project.description}</span>
            </button>
          ))}
        </div>

        {showProjectForm && (
          <div className="stacked-form">
            <input
              value={newProjectName}
              onChange={(event) => onProjectNameChange(event.target.value)}
              placeholder="Nuevo proyecto"
            />
            <textarea
              value={newProjectDescription}
              onChange={(event) => onProjectDescriptionChange(event.target.value)}
              placeholder="Qué universo quieres construir"
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
          <button type="button" className="ghost-button" onClick={onSaveTemplate}>
            Guardar actual
          </button>
        }
      >
        <div className="template-list">
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
