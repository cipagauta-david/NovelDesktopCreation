import { useEffect, useMemo, useRef, useState } from 'react'

import { providerModels, STORAGE_KEY } from '../data/constants'
import { getDefaultPersistedState, loadPersistedState } from '../data/seed'
import type {
  AiProposal,
  AppSettings,
  CollectionTab,
  DraftState,
  EntityRecord,
  EntityTemplate,
  FieldValue,
  OnboardingPayload,
  PanelKey,
  PanelVisibility,
  PersistedState,
  Project,
  SearchResult,
  WorkspaceView,
} from '../types/workspace'
import { buildStructuredReference, getReferenceTokens } from '../utils/references'
import { buildSnippet, scoreEntity } from '../utils/search'
import {
  createHistoryEvent,
  draftFromEntity,
  draftPayload,
  draftStateFromEntity,
  isoNow,
  parseCommaSeparated,
  uid,
} from '../utils/workspace'

const defaultPanels: PanelVisibility = {
  sidebar: true,
  entities: true,
  inspector: false,
}

export function useWorkspace() {
  const [data, setData] = useState<PersistedState>(() => loadPersistedState())
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('editor')
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [newTabName, setNewTabName] = useState('')
  const [newEntityTemplateId, setNewEntityTemplateId] = useState('')
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [referenceSuggestion, setReferenceSuggestion] = useState<{
    start: number
    end: number
    query: string
  } | null>(null)
  const [pendingProposal, setPendingProposal] = useState<AiProposal | null>(null)
  const [panels, setPanels] = useState<PanelVisibility>(defaultPanels)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const activeProject = useMemo(
    () => data.projects.find((project) => project.id === data.activeProjectId) ?? data.projects[0],
    [data.activeProjectId, data.projects],
  )
  const activeTab = useMemo(
    () => activeProject?.tabs.find((tab) => tab.id === data.activeTabId) ?? activeProject?.tabs[0] ?? null,
    [activeProject, data.activeTabId],
  )
  const projectEntities = useMemo(() => activeProject?.entities ?? [], [activeProject])
  const tabEntities = useMemo(
    () => projectEntities.filter((entity) => entity.tabId === activeTab?.id && entity.status === 'active'),
    [activeTab?.id, projectEntities],
  )
  const activeEntity = useMemo(
    () => {
      if (!activeTab) {
        return projectEntities.find((entity) => entity.id === data.activeEntityId) ?? projectEntities[0] ?? null
      }

      return (
        tabEntities.find((entity) => entity.id === data.activeEntityId) ??
        tabEntities[0] ??
        null
      )
    },
    [activeTab, data.activeEntityId, projectEntities, tabEntities],
  )
  const activeDraft = useMemo(() => {
    if (!activeEntity) {
      return null
    }
    return draft?.entityId === activeEntity.id ? draft : draftStateFromEntity(activeEntity)
  }, [activeEntity, draft])

  const activeTemplates = activeProject?.templates ?? []
  const selectedNewEntityTemplateId =
    activeProject?.templates.some((template) => template.id === newEntityTemplateId)
      ? newEntityTemplateId
      : (activeProject?.templates[0]?.id ?? '')

  const activeTabEntities = tabEntities

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!activeProject || !searchQuery.trim()) {
      return []
    }

    return activeProject.entities
      .filter((entity) => entity.status === 'active')
      .map((entity) => ({
        entityId: entity.id,
        tabId: entity.tabId,
        title: entity.title,
        snippet: buildSnippet(entity, searchQuery),
        score: scoreEntity(entity, searchQuery),
      }))
      .filter((result) => result.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 8)
  }, [activeProject, searchQuery])

  const graphModel = useMemo(() => {
    if (!activeProject) {
      return { nodes: [], edges: [] }
    }

    const nodes = activeProject.entities
      .filter((entity) => entity.status === 'active')
      .map((entity, index, all) => {
        const angle = (Math.PI * 2 * index) / Math.max(all.length, 1)
        return {
          id: entity.id,
          title: entity.title,
          x: 260 + Math.cos(angle) * 180,
          y: 220 + Math.sin(angle) * 160,
          tabId: entity.tabId,
        }
      })

    const edges = activeProject.entities.flatMap((entity) =>
      getReferenceTokens(entity.content)
        .filter((token) => activeProject.entities.some((target) => target.id === token.entityId))
        .map((token) => ({ source: entity.id, target: token.entityId })),
    )

    return { nodes, edges }
  }, [activeProject])

  const suggestionOptions = useMemo(() => {
    if (!referenceSuggestion || !activeProject) {
      return []
    }
    const normalizedQuery = referenceSuggestion.query.trim().toLowerCase()
    return activeProject.entities
      .filter((entity) => entity.status === 'active')
      .filter((entity) =>
        !normalizedQuery
          ? true
          : entity.title.toLowerCase().includes(normalizedQuery) ||
            entity.aliases.some((alias) => alias.toLowerCase().includes(normalizedQuery)),
      )
      .slice(0, 6)
  }, [activeProject, referenceSuggestion])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    if (!toast) {
      return undefined
    }
    const timeoutId = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  useEffect(() => {
    if (!draft || !activeEntity || !activeProject || draft.entityId !== activeEntity.id) {
      return undefined
    }

    const hasChanges =
      JSON.stringify(draftPayload(draft)) !== JSON.stringify(draftFromEntity(activeEntity))
    if (!hasChanges) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setData((current) => ({
        ...current,
        projects: current.projects.map((project) => {
          if (project.id !== activeProject.id) {
            return project
          }

          const entities = project.entities.map((entity) => {
            if (entity.id !== activeEntity.id) {
              return entity
            }

            const updatedEntity: EntityRecord = {
              ...entity,
              title: draft.title || entity.title,
              content: draft.content,
              templateId: draft.templateId,
              tags: parseCommaSeparated(draft.tagsText),
              aliases: parseCommaSeparated(draft.aliasesText),
              fields: draft.fields,
              revision: entity.revision + 1,
              updatedAt: isoNow(),
            }

            return {
              ...updatedEntity,
              history: [
                createHistoryEvent(
                  'Edición rápida',
                  `Revisión ${updatedEntity.revision} guardada para ${updatedEntity.title}.`,
                ),
                ...entity.history,
              ].slice(0, 20),
            }
          })

          const savedEntity = entities.find((entity) => entity.id === activeEntity.id)
          if (!savedEntity) {
            return project
          }

          return {
            ...project,
            updatedAt: isoNow(),
            entities,
            history: [
              createHistoryEvent('Autosave', `Se guardó ${savedEntity.title} automáticamente.`),
              ...project.history,
            ].slice(0, 40),
          }
        }),
      }))
    }, 700)

    return () => window.clearTimeout(timeoutId)
  }, [activeEntity, activeProject, draft])

  function withProjectUpdate(projectId: string, updater: (project: Project) => Project) {
    setData((current) => ({
      ...current,
      projects: current.projects.map((project) => (project.id === projectId ? updater(project) : project)),
    }))
  }

  function completeOnboarding(payload: OnboardingPayload) {
    const settings: AppSettings = {
      authorName: payload.authorName || 'Autora/Autor principal',
      provider: payload.provider,
      model: payload.model,
      apiKeyHint: payload.apiKey ? `••••${payload.apiKey.slice(-4)}` : 'modo local sin clave',
    }
    setData((current) => ({ ...current, settings }))
    setToast('Workspace configurado. Todo listo para escribir.')
  }

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
    }))
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
    }))
    setNewProjectName('')
    setNewProjectDescription('')
    setToast(`Proyecto ${projectName} listo.`)
  }

  function clearWorkspace() {
    localStorage.removeItem(STORAGE_KEY)
    setData(getDefaultPersistedState())
    setSearchQuery('')
    setPendingProposal(null)
    setPanels(defaultPanels)
    setToast('Workspace reiniciado con un proyecto base limpio.')
  }

  function selectTab(tabId: string) {
    if (!activeProject) return
    const entityId =
      activeProject.entities.find((entity) => entity.tabId === tabId && entity.status === 'active')?.id ??
      activeProject.entities[0]?.id ??
      ''
    setData((current) => ({
      ...current,
      activeTabId: tabId,
      activeEntityId: entityId,
    }))
  }

  function createTab() {
    if (!activeProject || !newTabName.trim()) return
    const newTab: CollectionTab = {
      id: uid('tab'),
      name: newTabName.trim(),
      icon: '✨',
      prompt: 'Especializa el comportamiento de IA para esta colección.',
    }

    withProjectUpdate(activeProject.id, (project) => ({
      ...project,
      updatedAt: isoNow(),
      tabs: [...project.tabs, newTab],
      history: [
        createHistoryEvent('Tab creada', `${newTab.name} ya forma parte del proyecto.`),
        ...project.history,
      ].slice(0, 40),
    }))
    setData((current) => ({ ...current, activeTabId: newTab.id, activeEntityId: '' }))
    setNewTabName('')
    setToast(`Tab ${newTab.name} creada.`)
  }

  function moveActiveTab(direction: -1 | 1) {
    if (!activeProject || !activeTab) return
    const index = activeProject.tabs.findIndex((tab) => tab.id === activeTab.id)
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= activeProject.tabs.length) return

    const tabs = [...activeProject.tabs]
    const [tab] = tabs.splice(index, 1)
    tabs.splice(targetIndex, 0, tab)
    withProjectUpdate(activeProject.id, (project) => ({
      ...project,
      tabs,
      updatedAt: isoNow(),
      history: [
        createHistoryEvent('Tabs reordenadas', `${activeTab.name} cambió de posición.`),
        ...project.history,
      ].slice(0, 40),
    }))
  }

  function renameActiveTab() {
    if (!activeProject || !activeTab) return
    const nextName = window.prompt('Renombra la tab activa', activeTab.name)
    if (!nextName?.trim()) return
    withProjectUpdate(activeProject.id, (project) => ({
      ...project,
      tabs: project.tabs.map((tab) =>
        tab.id === activeTab.id ? { ...tab, name: nextName.trim() } : tab,
      ),
      updatedAt: isoNow(),
      history: [
        createHistoryEvent('Tab renombrada', `${activeTab.name} ahora es ${nextName.trim()}.`),
        ...project.history,
      ].slice(0, 40),
    }))
  }

  function deleteActiveTab() {
    if (!activeProject || !activeTab || activeProject.tabs.length === 1) return
    const remainingTabs = activeProject.tabs.filter((tab) => tab.id !== activeTab.id)
    const remainingEntities = activeProject.entities.filter((entity) => entity.tabId !== activeTab.id)
    const nextTab = remainingTabs[0]
    const nextEntity = remainingEntities.find((entity) => entity.tabId === nextTab.id) ?? remainingEntities[0]

    withProjectUpdate(activeProject.id, (project) => ({
      ...project,
      tabs: remainingTabs,
      entities: remainingEntities,
      updatedAt: isoNow(),
      history: [
        createHistoryEvent('Tab eliminada', `${activeTab.name} y sus entidades fueron retiradas.`),
        ...project.history,
      ].slice(0, 40),
    }))
    setData((current) => ({
      ...current,
      activeTabId: nextTab.id,
      activeEntityId: nextEntity?.id ?? '',
    }))
  }

  function updateTabPrompt(prompt: string) {
    if (!activeProject || !activeTab) return
    withProjectUpdate(activeProject.id, (project) => ({
      ...project,
      tabs: project.tabs.map((tab) => (tab.id === activeTab.id ? { ...tab, prompt } : tab)),
    }))
  }

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
    if (!files || !activeProject || !activeEntity) return
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))
    if (!imageFiles.length) return

    const assets = await Promise.all(
      imageFiles.map(
        (file) =>
          new Promise<FieldValue | never>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () =>
              resolve({
                id: uid('asset'),
                key: file.name,
                value: String(reader.result),
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
    if (!activeDraft || !textareaRef.current || !referenceSuggestion) return
    const replacement = buildStructuredReference(entity.id, entity.title)
    const nextContent = `${activeDraft.content.slice(0, referenceSuggestion.start)}${replacement}${activeDraft.content.slice(referenceSuggestion.end)}`
    setDraft({ ...activeDraft, content: nextContent })
    setReferenceSuggestion(null)

    requestAnimationFrame(() => {
      const nextPosition = referenceSuggestion.start + replacement.length
      textareaRef.current?.focus()
      if (textareaRef.current) {
        textareaRef.current.selectionStart = nextPosition
        textareaRef.current.selectionEnd = nextPosition
      }
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

  function generateAiProposal() {
    if (!activeEntity || !activeTab) return
    const missingField = activeEntity.fields.some((field) => field.key === 'Pregunta dramática')
      ? null
      : { id: uid('field'), key: 'Pregunta dramática', value: '¿Qué verdad teme descubrir?' }
    setPendingProposal({
      id: uid('proposal'),
      title: `Propuesta contextual para ${activeEntity.title}`,
      summary:
        'La IA sugiere reforzar claridad dramática, continuidad y una nota derivada preparada para confirmación humana.',
      entityId: activeEntity.id,
      contentAppend:
        `\n\n## Sugerencia IA\n- Aumenta la fricción en el siguiente beat.\n- Conecta el conflicto con el prompt de la tab: "${activeTab.prompt}".\n- Refuerza una referencia cruzada que haga visible el costo narrativo.`,
      createEntityTitle: `${activeEntity.title} — Nota de continuidad`,
      createEntityContent:
        `Resumen operativo derivado desde ${buildStructuredReference(
          activeEntity.id,
          activeEntity.title,
        )}.\n\n- Riesgo narrativo inmediato\n- Pregunta pendiente\n- Próxima escena candidata`,
      fieldToAdd: missingField,
    })
  }

  function confirmAiProposal() {
    if (!pendingProposal || !activeProject || !activeTab) return
    const now = isoNow()
    const followUpEntity: EntityRecord = {
      id: uid('entity'),
      tabId: activeTab.id,
      title: pendingProposal.createEntityTitle,
      content: pendingProposal.createEntityContent,
      templateId: activeProject.templates[1]?.id ?? activeProject.templates[0]?.id ?? '',
      tags: ['ia', 'continuidad'],
      aliases: [],
      fields: [],
      assets: [],
      status: 'active',
      revision: 1,
      updatedAt: now,
      history: [
        createHistoryEvent('Creación IA confirmada', 'Nota derivada desde propuesta contextual.', 'ai'),
      ],
    }

    withProjectUpdate(activeProject.id, (project) => ({
      ...project,
      updatedAt: now,
      entities: [
        followUpEntity,
        ...project.entities.map((entity) =>
          entity.id !== pendingProposal.entityId
            ? entity
            : {
                ...entity,
                content: `${entity.content}${pendingProposal.contentAppend}`,
                fields: pendingProposal.fieldToAdd
                  ? [...entity.fields, pendingProposal.fieldToAdd]
                  : entity.fields,
                revision: entity.revision + 1,
                updatedAt: now,
                history: [
                  createHistoryEvent('Propuesta IA aplicada', 'Se confirmó una mejora contextual.', 'ai'),
                  ...entity.history,
                ].slice(0, 20),
              },
        ),
      ],
      history: [
        createHistoryEvent('IA confirmada', `Se aplicó una propuesta sobre ${followUpEntity.title}.`, 'ai'),
        ...project.history,
      ].slice(0, 40),
    }))

    setPendingProposal(null)
    setToast('Propuesta IA confirmada y aplicada con trazabilidad.')
  }

  function togglePanel(panel: PanelKey) {
    setPanels((current) => ({ ...current, [panel]: !current[panel] }))
  }

  return {
    providerModels,
    data,
    toast,
    setToast,
    workspaceView,
    setWorkspaceView,
    searchQuery,
    setSearchQuery,
    newProjectName,
    setNewProjectName,
    newProjectDescription,
    setNewProjectDescription,
    newTabName,
    setNewTabName,
    newEntityTemplateId,
    setNewEntityTemplateId,
    activeProject,
    activeTab,
    activeEntity,
    activeDraft,
    activeTemplates,
    activeTabEntities,
    selectedNewEntityTemplateId,
    searchResults,
    graphModel,
    suggestionOptions,
    referenceSuggestion,
    pendingProposal,
    panels,
    textareaRef,
    onboardingReady: Boolean(data.settings),
    completeOnboarding,
    selectProject,
    renameActiveProject,
    deleteActiveProject,
    createProject,
    clearWorkspace,
    selectTab,
    createTab,
    moveActiveTab,
    renameActiveTab,
    deleteActiveTab,
    updateTabPrompt,
    selectEntity,
    createEntity,
    duplicateActiveEntity,
    archiveActiveEntity,
    deleteActiveEntity,
    applyActiveTemplate,
    setDraft,
    addField,
    updateField,
    removeField,
    attachImages,
    insertReference,
    handleEditorChange,
    navigateFromReference,
    saveCurrentAsTemplate,
    generateAiProposal,
    confirmAiProposal,
    dismissProposal: () => setPendingProposal(null),
    togglePanel,
  }
}
