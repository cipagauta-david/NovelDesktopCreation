import { useEffect, useMemo, useState } from 'react'

import { providerModels, STORAGE_KEY } from '../data/constants'
import { getDefaultPersistedState, loadPersistedState } from '../data/seed'
import type {
  AppSettings,
  DraftState,
  EntityRecord,
  OnboardingPayload,
  PanelKey,
  PanelVisibility,
  PersistedState,
  SearchResult,
  WorkspaceView,
} from '../types/workspace'
import { getReferenceTokens } from '../utils/references'
import { buildSnippet, scoreEntity } from '../utils/search'
import {
  createHistoryEvent,
  draftFromEntity,
  draftPayload,
  draftStateFromEntity,
  isoNow,
  parseCommaSeparated,
} from '../utils/workspace'

import { useProjectManagement } from './workspace/useProjectManagement'
import { useTabManagement } from './workspace/useTabManagement'
import { useEntityManagement } from './workspace/useEntityManagement'
import { useAiManagement } from './workspace/useAiManagement'

const defaultPanels: PanelVisibility = {
  sidebar: true,
  entities: true,
  inspector: false,
}

export function useWorkspace() {
  const [data, setData] = useState<PersistedState>(() => loadPersistedState())
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('editor')
  const [searchQuery, setSearchQuery] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [toast, setToast] = useState('')
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [referenceSuggestion, setReferenceSuggestion] = useState<{
    start: number
    end: number
    query: string
  } | null>(null)
  const [panels, setPanels] = useState<PanelVisibility>(defaultPanels)

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

  const activeTabEntities = tabEntities

  const projectManagement = useProjectManagement(data, setData, activeProject, setToast, setSearchQuery)
  const tabManagement = useTabManagement(setData, activeProject, activeTab, projectManagement.withProjectUpdate, setToast)
  const entityManagement = useEntityManagement(setData, activeProject, activeTab, activeEntity, activeDraft, activeTabEntities, setDraft, referenceSuggestion, setReferenceSuggestion, setWorkspaceView, projectManagement.withProjectUpdate, setToast)
  const aiManagement = useAiManagement(activeProject, activeTab, activeEntity, projectManagement.withProjectUpdate, setToast)

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
      const frameId = window.requestAnimationFrame(() => setSaveStatus('idle'))
      return () => window.cancelAnimationFrame(frameId)
    }

    const hasChanges =
      JSON.stringify(draftPayload(draft)) !== JSON.stringify(draftFromEntity(activeEntity))
    if (!hasChanges) {
      const frameId = window.requestAnimationFrame(() => setSaveStatus('saved'))
      return () => window.cancelAnimationFrame(frameId)
    }

    const frameId = window.requestAnimationFrame(() => setSaveStatus('saving'))

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
      setSaveStatus('saved')
    }, 700)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(timeoutId)
    }
  }, [activeEntity, activeProject, draft])

  useEffect(() => {
    if (saveStatus !== 'saved') {
      return undefined
    }

    const timeoutId = window.setTimeout(() => setSaveStatus('idle'), 1600)
    return () => window.clearTimeout(timeoutId)
  }, [saveStatus])

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

  function clearWorkspace() {
    localStorage.removeItem(STORAGE_KEY)
    setData(getDefaultPersistedState())
    setSearchQuery('')
    aiManagement.setPendingProposal(null)
    setPanels(defaultPanels)
    setToast('Workspace reiniciado con un proyecto base limpio.')
  }

  function togglePanel(panel: PanelKey) {
    setPanels((current) => ({ ...current, [panel]: !current[panel] }))
  }

  return {
    providerModels,
    data,
    toast,
    setToast,
    saveStatus,
    workspaceView,
    setWorkspaceView,
    searchQuery,
    setSearchQuery,
    newProjectName: projectManagement.newProjectName,
    setNewProjectName: projectManagement.setNewProjectName,
    newProjectDescription: projectManagement.newProjectDescription,
    setNewProjectDescription: projectManagement.setNewProjectDescription,
    newTabName: tabManagement.newTabName,
    setNewTabName: tabManagement.setNewTabName,
    newEntityTemplateId: entityManagement.newEntityTemplateId,
    setNewEntityTemplateId: entityManagement.setNewEntityTemplateId,
    activeProject,
    activeTab,
    activeEntity,
    activeDraft,
    activeTemplates: activeProject?.templates ?? [],
    activeTabEntities,
    selectedNewEntityTemplateId: entityManagement.selectedNewEntityTemplateId,
    searchResults,
    graphModel,
    suggestionOptions,
    referenceSuggestion,
    pendingProposal: aiManagement.pendingProposal,
    panels,
    editorViewRef: entityManagement.editorViewRef,
    onboardingReady: Boolean(data.settings),
    completeOnboarding,
    selectProject: projectManagement.selectProject,
    renameActiveProject: projectManagement.renameActiveProject,
    deleteActiveProject: projectManagement.deleteActiveProject,
    createProject: projectManagement.createProject,
    clearWorkspace,
    selectTab: tabManagement.selectTab,
    createTab: tabManagement.createTab,
    moveActiveTab: tabManagement.moveActiveTab,
    renameActiveTab: tabManagement.renameActiveTab,
    deleteActiveTab: tabManagement.deleteActiveTab,
    updateTabPrompt: tabManagement.updateTabPrompt,
    selectEntity: entityManagement.selectEntity,
    createEntity: entityManagement.createEntity,
    duplicateActiveEntity: entityManagement.duplicateActiveEntity,
    archiveActiveEntity: entityManagement.archiveActiveEntity,
    deleteActiveEntity: entityManagement.deleteActiveEntity,
    applyActiveTemplate: entityManagement.applyActiveTemplate,
    setDraft,
    addField: entityManagement.addField,
    updateField: entityManagement.updateField,
    removeField: entityManagement.removeField,
    attachImages: entityManagement.attachImages,
    insertReference: entityManagement.insertReference,
    handleEditorChange: entityManagement.handleEditorChange,
    navigateFromReference: entityManagement.navigateFromReference,
    saveCurrentAsTemplate: entityManagement.saveCurrentAsTemplate,
    generateAiProposal: aiManagement.generateAiProposal,
    confirmAiProposal: aiManagement.confirmAiProposal,
    dismissProposal: aiManagement.dismissProposal,
    togglePanel,
  }
}

