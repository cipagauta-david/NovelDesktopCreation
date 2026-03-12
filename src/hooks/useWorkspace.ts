import { useMemo, useState, useCallback, useEffect } from 'react'

import { providerModels } from '../data/constants'
import type { AppSettings, DraftState, OnboardingPayload, PanelKey, PanelVisibility, PersistedGraphLayouts, PersistedState, WorkspaceView } from '../types/workspace'
import { getReferenceTokens } from '../utils/references'
import { draftStateFromEntity } from '../utils/workspace'
import { downloadProjectAsJson, promptFileImport } from '../utils/exportImport'
import { createHistoryEvent, isoNow } from '../utils/workspace'

import { useProjectManagement } from './workspace/useProjectManagement'
import { useTabManagement } from './workspace/useTabManagement'
import { useEntityManagement } from './workspace/useEntityManagement'
import { useAiManagement } from './workspace/useAiManagement'
import { useSearchManagement } from './workspace/useSearchManagement'
import { usePersistenceManagement } from './workspace/usePersistenceManagement'
import * as Comlink from 'comlink'
import type { AppWorker } from '../data/worker'

const defaultPanels: PanelVisibility = { sidebar: true, entities: true, inspector: false }

export function useWorkspace(
  initialData: PersistedState, 
  worker: Comlink.Remote<AppWorker>
) {
  const [data, setData] = useState<PersistedState>(initialData)
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('editor')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [toast, setToast] = useState('')
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [referenceSuggestion, setReferenceSuggestion] = useState<{ start: number, end: number, query: string } | null>(null)
  const [panels, setPanels] = useState<PanelVisibility>(defaultPanels)
  const [graphLayouts, setGraphLayouts] = useState<PersistedGraphLayouts>(initialData.graphLayouts ?? {})

  const activeProject = useMemo(() => data.projects.find((p) => p.id === data.activeProjectId) ?? data.projects[0], [data.activeProjectId, data.projects])
  const activeTab = useMemo(() => activeProject?.tabs.find((t) => t.id === data.activeTabId) ?? activeProject?.tabs[0] ?? null, [activeProject, data.activeTabId])
  const projectEntities = useMemo(() => activeProject?.entities ?? [], [activeProject])
  const tabEntities = useMemo(() => projectEntities.filter((e) => e.tabId === activeTab?.id && e.status === 'active'), [activeTab?.id, projectEntities])
  
  const activeEntity = useMemo(() => {
    if (!activeTab) return projectEntities.find((e) => e.id === data.activeEntityId) ?? projectEntities[0] ?? null
    return tabEntities.find((e) => e.id === data.activeEntityId) ?? tabEntities[0] ?? null
  }, [activeTab, data.activeEntityId, projectEntities, tabEntities])

  const activeDraft = useMemo(() => {
    if (!activeEntity) return null
    return draft?.entityId === activeEntity.id ? draft : draftStateFromEntity(activeEntity)
  }, [activeEntity, draft])

  const projectManagement = useProjectManagement(data, setData, activeProject, setToast, () => {})
  const tabManagement = useTabManagement(setData, activeProject, activeTab, projectManagement.withProjectUpdate, setToast)
  
  // Delegamos el estado de busqueda a useSearchManagement (Off-main-thread)
  const { searchQuery, setSearchQuery, searchResults } = useSearchManagement(activeProject, worker)

  const entityManagement = useEntityManagement(setData, activeProject, activeTab, activeEntity, activeDraft, tabEntities, setDraft, referenceSuggestion, setReferenceSuggestion, setWorkspaceView, projectManagement.withProjectUpdate, setToast)
  const aiManagement = useAiManagement(
    activeProject,
    activeTab,
    activeEntity,
    data.settings,
    projectManagement.withProjectUpdate,
    setToast,
  )

  const setPendingProposal = aiManagement.setPendingProposal

  // Motor de persistencia optimista con el worker
  usePersistenceManagement(activeProject, activeEntity, draft, setData, setSaveStatus, saveStatus, worker)

  const graphModel = useMemo(() => {
    if (!activeProject) return { nodes: [], edges: [] }
    const layout = graphLayouts[activeProject.id] ?? {}
    const nodes = activeProject.entities.filter((e) => e.status === 'active').map((e, index, all) => {
      const savedPos = layout[e.id]
      const angle = (Math.PI * 2 * index) / Math.max(all.length, 1)
      return {
        id: e.id,
        title: e.title,
        x: savedPos?.x ?? 260 + Math.cos(angle) * 180,
        y: savedPos?.y ?? 220 + Math.sin(angle) * 160,
        tabId: e.tabId,
      }
    })
    const edges = activeProject.entities.flatMap((e) =>
      getReferenceTokens(e.content).filter((token) => activeProject.entities.some((t) => t.id === token.entityId)).map((token) => ({ source: e.id, target: token.entityId }))
    )
    return { nodes, edges }
  }, [activeProject, graphLayouts])

  const updateGraphNodePosition = useCallback((entityId: string, x: number, y: number) => {
    if (!activeProject) return
    setGraphLayouts((prev) => ({
      ...prev,
      [activeProject.id]: {
        ...(prev[activeProject.id] ?? {}),
        [entityId]: { x, y },
      },
    }))
  }, [activeProject])

  const resetGraphLayout = useCallback(() => {
    if (!activeProject) return
    setGraphLayouts((prev) => {
      const next = { ...prev }
      delete next[activeProject.id]
      return next
    })
  }, [activeProject])

  // Persist graph layouts alongside data
  useEffect(() => {
    queueMicrotask(() => {
      setData((current) => {
        if (JSON.stringify(current.graphLayouts ?? {}) === JSON.stringify(graphLayouts)) return current
        return { ...current, graphLayouts }
      })
    })
  }, [graphLayouts])

  const suggestionOptions = useMemo(() => {
    if (!referenceSuggestion || !activeProject) return []
    const qs = referenceSuggestion.query.trim().toLowerCase()
    return activeProject.entities.filter((e) => e.status === 'active').filter((e) => !qs ? true : e.title.toLowerCase().includes(qs) || e.aliases.some((a) => a.toLowerCase().includes(qs))).slice(0, 6)
  }, [activeProject, referenceSuggestion])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(id)
  }, [toast, setToast])

  const completeOnboarding = useCallback((payload: OnboardingPayload) => {
    const settings: AppSettings = {
      authorName: payload.authorName || 'Autor(a)',
      provider: payload.provider,
      model: payload.model,
      apiKeyHint: payload.apiKey ? `••••${payload.apiKey.slice(-4)}` : 'Modo local',
      apiKey: payload.apiKey || undefined,
    }
    setData((c) => ({ ...c, settings }))
    setToast('Workspace configurado. Todo listo para escribir.')
  }, [setData, setToast])

  const clearWorkspace = useCallback(() => {
    // TODO: delegate to worker reset
    setSearchQuery('')
    setPendingProposal(null)
    setPanels(defaultPanels)
    setToast('Workspace reiniciado.')
  }, [setSearchQuery, setPendingProposal, setToast])

  const togglePanel = useCallback((panel: PanelKey) => setPanels((c) => ({ ...c, [panel]: !c[panel] })), [])

  // ── Import / Export ─────────────────────────────────────
  const exportActiveProject = useCallback(() => {
    if (!activeProject) return
    downloadProjectAsJson(activeProject)
    setToast(`Proyecto "${activeProject.name}" exportado.`)
  }, [activeProject, setToast])

  const importProject = useCallback(async () => {
    const result = await promptFileImport()
    if (!result.ok) {
      if (result.error !== 'Importación cancelada.') {
        setToast(result.error)
      }
      return
    }
    setData((current) => ({
      ...current,
      projects: [result.project, ...current.projects],
      activeProjectId: result.project.id,
      activeTabId: result.project.tabs[0]?.id ?? '',
      activeEntityId: result.project.entities[0]?.id ?? '',
    }))
    setToast(`Proyecto "${result.project.name}" importado correctamente.`)
  }, [setData, setToast])

  // ── Entity reordering ───────────────────────────────────
  const reorderEntities = useCallback((entityIds: string[]) => {
    if (!activeProject || !activeTab) return
    const now = isoNow()
    projectManagement.withProjectUpdate(activeProject.id, (project) => {
      // Get entities for this tab in the new order, keeping others untouched
      const tabEntitiesMap = new Map(
        project.entities.filter((e) => e.tabId === activeTab.id).map((e) => [e.id, e])
      )
      const reorderedTabEntities = entityIds
        .map((id) => tabEntitiesMap.get(id))
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
      const otherEntities = project.entities.filter((e) => e.tabId !== activeTab.id)

      return {
        ...project,
        entities: [...reorderedTabEntities, ...otherEntities],
        updatedAt: now,
        history: [
          createHistoryEvent('Entidades reordenadas', `Reordenamiento en ${activeTab.name}.`),
          ...project.history,
        ].slice(0, 40),
      }
    })
  }, [activeProject, activeTab, projectManagement])

  // ── Tab reordering (drag & drop) ────────────────────────
  const reorderTabs = useCallback((tabIds: string[]) => {
    if (!activeProject) return
    const now = isoNow()
    projectManagement.withProjectUpdate(activeProject.id, (project) => {
      const tabMap = new Map(project.tabs.map((t) => [t.id, t]))
      const reordered = tabIds
        .map((id) => tabMap.get(id))
        .filter((t): t is NonNullable<typeof t> => Boolean(t))
      return {
        ...project,
        tabs: reordered,
        updatedAt: now,
        history: [
          createHistoryEvent('Tabs reordenadas', 'Reordenamiento por drag & drop.'),
          ...project.history,
        ].slice(0, 40),
      }
    })
  }, [activeProject, projectManagement])

  return {
    providerModels, data, toast, setToast, saveStatus, workspaceView, setWorkspaceView, searchQuery, setSearchQuery,
    newProjectName: projectManagement.newProjectName, setNewProjectName: projectManagement.setNewProjectName,
    newProjectDescription: projectManagement.newProjectDescription, setNewProjectDescription: projectManagement.setNewProjectDescription,
    newTabName: tabManagement.newTabName, setNewTabName: tabManagement.setNewTabName,
    newEntityTemplateId: entityManagement.newEntityTemplateId, setNewEntityTemplateId: entityManagement.setNewEntityTemplateId,
    activeProject, activeTab, activeEntity, activeDraft, activeTemplates: activeProject?.templates ?? [], activeTabEntities: tabEntities, selectedNewEntityTemplateId: entityManagement.selectedNewEntityTemplateId,
    searchResults, graphModel, suggestionOptions, referenceSuggestion, pendingProposal: aiManagement.pendingProposal, panels, editorViewRef: entityManagement.editorViewRef, onboardingReady: Boolean(data.settings), completeOnboarding,
    // AI streaming
    streamStatus: aiManagement.streamStatus, streamingText: aiManagement.streamingText, llmTraces: aiManagement.llmTraces, stopGeneration: aiManagement.stopGeneration,
    selectProject: projectManagement.selectProject, renameActiveProject: projectManagement.renameActiveProject, deleteActiveProject: projectManagement.deleteActiveProject, createProject: projectManagement.createProject, clearWorkspace,
    selectTab: tabManagement.selectTab, createTab: tabManagement.createTab, moveActiveTab: tabManagement.moveActiveTab, renameActiveTab: tabManagement.renameActiveTab, deleteActiveTab: tabManagement.deleteActiveTab, updateTabPrompt: tabManagement.updateTabPrompt,
    selectEntity: entityManagement.selectEntity, createEntity: entityManagement.createEntity, duplicateActiveEntity: entityManagement.duplicateActiveEntity, archiveActiveEntity: entityManagement.archiveActiveEntity, deleteActiveEntity: entityManagement.deleteActiveEntity,
    applyActiveTemplate: entityManagement.applyActiveTemplate, setDraft, addField: entityManagement.addField, updateField: entityManagement.updateField, removeField: entityManagement.removeField, attachImages: entityManagement.attachImages,
    insertReference: entityManagement.insertReference, handleEditorChange: entityManagement.handleEditorChange, navigateFromReference: entityManagement.navigateFromReference, saveCurrentAsTemplate: entityManagement.saveCurrentAsTemplate,
    generateAiProposal: aiManagement.generateAiProposal, confirmAiProposal: aiManagement.confirmAiProposal, dismissProposal: aiManagement.dismissProposal, togglePanel, worker,
    // New features
    exportActiveProject, importProject, reorderEntities, reorderTabs,
    updateGraphNodePosition, resetGraphLayout,
  }
}
