import { useState, useRef } from 'react'
import type { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'

import type {
  PersistedState,
  Project,
  CollectionTab,
  EntityRecord,
  EntityTemplate,
  WorkspaceView,
  DraftState,
  FieldValue
} from '../../types/workspace'
import { buildStructuredReference } from '../../utils/references'
import { createHistoryEvent, isoNow, uid } from '../../utils/workspace'

export function useEntityManagement(
  setData: React.Dispatch<React.SetStateAction<PersistedState>>,
  activeProject: Project | undefined,
  activeTab: CollectionTab | null,
  activeEntity: EntityRecord | null,
  activeDraft: DraftState | null,
  activeTabEntities: EntityRecord[],
  setDraft: React.Dispatch<React.SetStateAction<DraftState | null>>,
  referenceSuggestion: { start: number; end: number; query: string } | null,
  setReferenceSuggestion: React.Dispatch<React.SetStateAction<{ start: number; end: number; query: string } | null>>,
  setWorkspaceView: React.Dispatch<React.SetStateAction<WorkspaceView>>,
  withProjectUpdate: (projectId: string, updater: (project: Project) => Project) => void,
  setToast: (msg: string) => void
) {
  const [newEntityTemplateId, setNewEntityTemplateId] = useState('')
  const editorViewRef = useRef<EditorView | null>(null)

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
    }))
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
    }))
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
    }))
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
    }))
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

  function addField() {
    if (!activeDraft) return
    setDraft({
      ...activeDraft,
      fields: [...activeDraft.fields, { id: uid('field'), key: 'Nuevo field', value: '' }],
    })
  }

  function updateField(fieldId: string, key: 'key' | 'value', value: string) {
    if (!activeDraft) return
    setDraft({
      ...activeDraft,
      fields: activeDraft.fields.map((field) =>
        field.id === fieldId ? { ...field, [key]: value } : field,
      ),
    })
  }

  function removeField(fieldId: string) {
    if (!activeDraft) return
    setDraft({
      ...activeDraft,
      fields: activeDraft.fields.filter((field) => field.id !== fieldId),
    })
  }

  async function attachImages(files: FileList | null) {
    if (!files || !activeProject) return
    if (!activeEntity) {
      setToast('Selecciona una entidad antes de soltar imágenes en el workspace.')
      return
    }
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))
    if (!imageFiles.length) {
      setToast('Solo se admiten archivos de imagen para assets.')
      return
    }

    const assets = await Promise.all(
      imageFiles.map(
        (file) =>
          new Promise<FieldValue>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () =>
              resolve({
                id: uid('asset'),
                key: file.name,
                value: reader.result as string,
              })
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(file)
          }),
      ),
    )

    withProjectUpdate(activeProject.id, (project) => ({
      ...project,
      updatedAt: isoNow(),
      entities: project.entities.map((entity) =>
        entity.id !== activeEntity.id
          ? entity
          : {
              ...entity,
              assets: [
                ...assets.map((asset) => ({
                  id: asset.id,
                  name: asset.key,
                  mimeType: 'image/*',
                  dataUrl: asset.value,
                })),
                ...entity.assets,
              ],
              revision: entity.revision + 1,
              updatedAt: isoNow(),
              history: [
                createHistoryEvent('Assets añadidos', `${assets.length} imagen(es) anexadas.`),
                ...entity.history,
              ].slice(0, 20),
            },
      ),
    }))
    setToast(`${assets.length} imagen(es) añadidas al proyecto.`)
  }

  function insertReference(entity: EntityRecord) {
    if (!activeDraft || !editorViewRef.current || !referenceSuggestion) return
    const replacement = buildStructuredReference(entity.id, entity.title)
    const nextContent = `${activeDraft.content.slice(0, referenceSuggestion.start)}${replacement}${activeDraft.content.slice(referenceSuggestion.end)}`
    setDraft({ ...activeDraft, content: nextContent })
    setReferenceSuggestion(null)

    requestAnimationFrame(() => {
      const nextPosition = referenceSuggestion.start + replacement.length
      const view = editorViewRef.current
      if (!view) {
        return
      }

      view.focus()
      view.dispatch({ selection: EditorSelection.cursor(nextPosition) })
    })
  }

  function handleEditorChange(value: string, selectionEnd: number | null) {
    if (!activeDraft) return
    setDraft({ ...activeDraft, content: value })
    if (selectionEnd == null) {
      setReferenceSuggestion(null)
      return
    }

    const priorText = value.slice(0, selectionEnd)
    const openIndex = priorText.lastIndexOf('{{')
    const closeIndex = priorText.lastIndexOf('}}')
    if (openIndex > closeIndex) {
      const query = priorText.slice(openIndex + 2)
      if (!query.includes('\n')) {
        setReferenceSuggestion({ start: openIndex, end: selectionEnd, query })
        return
      }
    }
    setReferenceSuggestion(null)
  }

  function navigateFromReference(entityId: string, ctrlKey: boolean) {
    if (!activeProject) return
    const entity = activeProject.entities.find((entry) => entry.id === entityId)
    if (!entity) return
    if (!ctrlKey) {
      setToast('Usa Ctrl + click para navegar y click normal para seguir editando.')
      return
    }
    selectEntity(entity.id, entity.tabId)
    setToast(`Navegaste a ${entity.title}.`)
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
    }))
    setToast('Template guardado y listo para nuevas entidades.')
  }

  return {
    editorViewRef,
    newEntityTemplateId,
    setNewEntityTemplateId,
    selectedNewEntityTemplateId,
    selectEntity,
    createEntity,
    duplicateActiveEntity,
    archiveActiveEntity,
    deleteActiveEntity,
    applyActiveTemplate,
    addField,
    updateField,
    removeField,
    attachImages,
    insertReference,
    handleEditorChange,
    navigateFromReference,
    saveCurrentAsTemplate,
  }
}
