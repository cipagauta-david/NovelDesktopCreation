import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import type {
  CollectionTab,
  DraftState,
  EntityRecord,
  EntityTemplate,
  PersistedState,
  Project,
  WorkspaceView,
} from '../../../types/workspace'
import { createHistoryEvent, isoNow, uid } from '../../../utils/workspace'

type UseEntityCrudManagementArgs = {
  setData: Dispatch<SetStateAction<PersistedState>>
  activeProject: Project | undefined
  activeTab: CollectionTab | null
  activeEntity: EntityRecord | null
  activeDraft: DraftState | null
  activeTabEntities: EntityRecord[]
  setDraft: Dispatch<SetStateAction<DraftState | null>>
  setWorkspaceView: Dispatch<SetStateAction<WorkspaceView>>
  withProjectUpdate: (
    projectId: string,
    updater: (project: Project) => Project,
    change?: {
      label: string
      details: string
      actorType?: 'user' | 'ai' | 'system'
      tabId?: string
      entityId?: string
    },
  ) => void
  setToast: (msg: string) => void
}

export function useEntityCrudManagement({
  setData,
  activeProject,
  activeTab,
  activeEntity,
  activeDraft,
  activeTabEntities,
  setDraft,
  setWorkspaceView,
  withProjectUpdate,
  setToast,
}: UseEntityCrudManagementArgs) {
  const [newEntityTemplateId, setNewEntityTemplateId] = useState('')

  const selectedNewEntityTemplateId =
    activeProject?.templates.some((template) => template.id === newEntityTemplateId)
      ? newEntityTemplateId
      : (activeProject?.templates[0]?.id ?? '')

  function selectEntity(entityId: string, tabId?: string) {
    setData((current) => ({
      ...current,
      activeEntityId: entityId,
      activeTabId: tabId ?? current.activeTabId,
    }))
    setWorkspaceView('editor')
  }

  function createEntity() {
    if (!activeProject || !activeTab) return
    const template =
      activeProject.templates.find((entry) => entry.id === selectedNewEntityTemplateId) ??
      activeProject.templates[0]
    const now = isoNow()
    const newEntity: EntityRecord = {
      id: uid('entity'),
      tabId: activeTab.id,
      title: `Nueva entidad en ${activeTab.name}`,
      content: template?.defaultContent ?? 'Describe esta entidad y enlaza conocimiento con {{}}.',
      templateId: template?.id ?? '',
      tags: [],
      aliases: [],
      fields: (template?.fields ?? ['Resumen']).map((fieldName) => ({
        id: uid('field'),
        key: fieldName,
        value: '',
      })),
      assets: [],
      status: 'active',
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', `Entidad creada en ${activeTab.name}.`)],
    }

    withProjectUpdate(activeProject.id, (project) => ({
      ...project,
      entities: [newEntity, ...project.entities],
      updatedAt: now,
      history: [
        createHistoryEvent('Entidad creada', `${newEntity.title} lista para edición.`),
        ...project.history,
      ].slice(0, 40),
    }), {
      label: 'Entidad creada',
      details: `${newEntity.title} lista para edición.`,
      tabId: activeTab.id,
      entityId: newEntity.id,
    })
    setData((current) => ({ ...current, activeEntityId: newEntity.id }))
    setToast('Entidad lista para editar.')
  }

  function duplicateActiveEntity() {
    if (!activeProject || !activeEntity) return
    const now = isoNow()
    const duplicated: EntityRecord = {
      ...activeEntity,
      id: uid('entity'),
      title: `${activeEntity.title} (copia)`,
      fields: activeEntity.fields.map((field) => ({ ...field, id: uid('field') })),
      assets: activeEntity.assets.map((asset) => ({ ...asset, id: uid('asset') })),
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Duplicado', `Se duplicó desde ${activeEntity.title}.`)],
    }
    withProjectUpdate(activeProject.id, (project) => ({
      ...project,
      entities: [duplicated, ...project.entities],
      updatedAt: now,
      history: [
        createHistoryEvent('Entidad duplicada', `${duplicated.title} creada desde un original.`),
        ...project.history,
      ].slice(0, 40),
    }), {
      label: 'Entidad duplicada',
      details: `${duplicated.title} creada desde un original.`,
      tabId: duplicated.tabId,
      entityId: duplicated.id,
    })
    setData((current) => ({ ...current, activeEntityId: duplicated.id }))
  }

  function archiveActiveEntity() {
    if (!activeProject || !activeEntity) return
    const nextEntity = activeTabEntities.find((entity) => entity.id !== activeEntity.id)
    withProjectUpdate(activeProject.id, (project) => ({
      ...project,
      entities: project.entities.map((entity) =>
        entity.id !== activeEntity.id
          ? entity
          : {
              ...entity,
              status: 'archived',
              revision: entity.revision + 1,
              updatedAt: isoNow(),
              history: [
                createHistoryEvent('Archivado', `${entity.title} pasó a estado archivado.`),
                ...entity.history,
              ].slice(0, 20),
            },
      ),
      updatedAt: isoNow(),
    }), {
      label: 'Entidad archivada',
      details: `${activeEntity.title} pasó a estado archivado.`,
      tabId: activeEntity.tabId,
      entityId: activeEntity.id,
    })
    setData((current) => ({ ...current, activeEntityId: nextEntity?.id ?? '' }))
  }

  function deleteActiveEntity() {
    if (!activeProject || !activeEntity) return
    const remainingEntities = activeProject.entities.filter((entity) => entity.id !== activeEntity.id)
    const nextEntity = remainingEntities.find(
      (entity) => entity.tabId === activeTab?.id && entity.status === 'active',
    )
    withProjectUpdate(activeProject.id, (project) => ({
      ...project,
      entities: project.entities.filter((entity) => entity.id !== activeEntity.id),
      updatedAt: isoNow(),
      history: [
        createHistoryEvent('Entidad eliminada', `${activeEntity.title} fue eliminada.`),
        ...project.history,
      ].slice(0, 40),
    }), {
      label: 'Entidad eliminada',
      details: `${activeEntity.title} fue eliminada.`,
      tabId: activeEntity.tabId,
      entityId: activeEntity.id,
    })
    setData((current) => ({ ...current, activeEntityId: nextEntity?.id ?? '' }))
  }

  function applyActiveTemplate() {
    if (!activeProject || !activeDraft) return
    const template = activeProject.templates.find((entry) => entry.id === activeDraft.templateId)
    if (!template) return

    setDraft({
      ...activeDraft,
      content: template.defaultContent,
      fields: template.fields.map((fieldName) => ({
        id: uid('field'),
        key: fieldName,
        value: '',
      })),
    })
    setToast(`Template ${template.name} aplicado al draft.`)
  }

  function saveCurrentAsTemplate() {
    if (!activeProject || !activeDraft || !activeEntity) return
    const template: EntityTemplate = {
      id: uid('template'),
      name: `${activeDraft.title || activeEntity.title} — template`,
      description: 'Generado desde una entidad real del workspace.',
      fields: activeDraft.fields.map((field) => field.key || 'Campo'),
      defaultContent: activeDraft.content,
    }

    withProjectUpdate(activeProject.id, (project) => ({
      ...project,
      templates: [template, ...project.templates],
      updatedAt: isoNow(),
      history: [
        createHistoryEvent('Template guardado', `${template.name} listo para reutilizar.`),
        ...project.history,
      ].slice(0, 40),
    }), {
      label: 'Template guardado',
      details: `${template.name} listo para reutilizar.`,
      entityId: activeEntity.id,
      tabId: activeEntity.tabId,
    })
    setToast('Template guardado y listo para nuevas entidades.')
  }

  return {
    newEntityTemplateId,
    setNewEntityTemplateId,
    selectedNewEntityTemplateId,
    selectEntity,
    createEntity,
    duplicateActiveEntity,
    archiveActiveEntity,
    deleteActiveEntity,
    applyActiveTemplate,
    saveCurrentAsTemplate,
  }
}
