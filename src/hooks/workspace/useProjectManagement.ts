import { useState, useCallback } from 'react'
import type { PersistedState, Project } from '../../types/workspace'
import { appendChangeEvent, createChangeEvent, createHistoryEvent, isoNow, uid } from '../../utils/workspace'
import { getDefaultPersistedState } from '../../data/seed/project'

type ChangeDescriptor = {
  label: string
  details: string
  actorType?: 'user' | 'ai' | 'system'
  tabId?: string
  entityId?: string
}

export function useProjectManagement(
  data: PersistedState,
  setData: React.Dispatch<React.SetStateAction<PersistedState>>,
  activeProject: Project | undefined,
  setToast: (msg: string) => void,
  setSearchQuery: (msg: string) => void
) {
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')

  const withProjectUpdate = useCallback(
    (projectId: string, updater: (project: Project) => Project, change?: ChangeDescriptor) => {
      setData((current) => {
        const nextState = {
        ...current,
        projects: current.projects.map((project) => (project.id === projectId ? updater(project) : project)),
        }

        if (!change) {
          return nextState
        }

        return appendChangeEvent(nextState, createChangeEvent({
          label: change.label,
          details: change.details,
          actorType: change.actorType,
          projectId,
          tabId: change.tabId,
          entityId: change.entityId,
        }))
      })
    },
    [setData],
  )

  function selectProject(projectId: string) {
    const project = data.projects.find((entry) => entry.id === projectId)
    if (!project) return
    const tabId = project.tabs[0]?.id ?? ''
    const entityId =
      project.entities.find((entity) => entity.tabId === tabId)?.id ?? project.entities[0]?.id ?? ''
    setData((current) => ({
      ...current,
      activeProjectId: project.id,
      activeTabId: tabId,
      activeEntityId: entityId,
    }))
    setSearchQuery('')
  }

  function renameActiveProject() {
    if (!activeProject) return
    const nextName = window.prompt('Renombra el proyecto activo', activeProject.name)
    if (!nextName?.trim()) return
    withProjectUpdate(activeProject.id, (project) => ({
      ...project,
      name: nextName.trim(),
      updatedAt: isoNow(),
      history: [
        createHistoryEvent('Proyecto renombrado', `Ahora se llama ${nextName.trim()}.`),
        ...project.history,
      ].slice(0, 40),
    }), {
      label: 'Proyecto renombrado',
      details: `Ahora se llama ${nextName.trim()}.`,
    })
    setToast(`Proyecto renombrado a ${nextName.trim()}.`)
  }

  function deleteActiveProject() {
    if (!activeProject || data.projects.length === 1) return
    const remainingProjects = data.projects.filter((project) => project.id !== activeProject.id)
    const nextProject = remainingProjects[0]
    setData((current) => ({
      ...current,
      projects: remainingProjects,
      activeProjectId: nextProject.id,
      activeTabId: nextProject.tabs[0]?.id ?? '',
      activeEntityId: nextProject.entities[0]?.id ?? '',
      changeLog: [
        ...current.changeLog,
        createChangeEvent({
          label: 'Proyecto eliminado',
          details: `Se eliminó ${activeProject.name}.`,
          actorType: 'user',
          projectId: activeProject.id,
        }),
      ],
    }))
    setToast(`Proyecto ${activeProject.name} eliminado.`)
  }

  function createProject() {
    const projectName = newProjectName.trim()
    if (!projectName) return
    const project: Project = {
      ...getDefaultPersistedState().projects[0],
      id: uid('project'),
      name: projectName,
      description: newProjectDescription.trim() || 'Nuevo proyecto narrativo local-first.',
      history: [createHistoryEvent('Proyecto creado', `Se creó ${projectName}.`)],
    }

    setData((current) => ({
      ...current,
      projects: [project, ...current.projects],
      activeProjectId: project.id,
      activeTabId: project.tabs[0]?.id ?? '',
      activeEntityId: project.entities[0]?.id ?? '',
      changeLog: [
        ...current.changeLog,
        createChangeEvent({
          label: 'Proyecto creado',
          details: `Se creó ${projectName}.`,
          actorType: 'user',
          projectId: project.id,
        }),
      ],
    }))
    setNewProjectName('')
    setNewProjectDescription('')
    setToast(`Proyecto ${projectName} listo.`)
  }

  return {
    newProjectName,
    setNewProjectName,
    newProjectDescription,
    setNewProjectDescription,
    withProjectUpdate,
    selectProject,
    renameActiveProject,
    deleteActiveProject,
    createProject,
  }
}
