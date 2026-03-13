import { useMemo, useState, useCallback, useEffect } from 'react'

import { providerModels } from '../data/constants'
import type { AppSettings, DraftState, OnboardingPayload, PanelKey, PanelVisibility, PersistedGraphLayouts, PersistedState, WorkspaceView } from '../types/workspace'
import { draftStateFromEntity } from '../utils/workspace'

import { useProjectManagement } from './workspace/useProjectManagement'
import { useTabManagement } from './workspace/useTabManagement'
import { useEntityManagement } from './workspace/useEntityManagement'
import { useAiManagement } from './workspace/useAiManagement'
import { useSearchManagement } from './workspace/useSearchManagement'
import { usePersistenceManagement } from './workspace/usePersistenceManagement'
import { useGraphManagement } from './workspace/workspaceCore/useGraphManagement'
import { useWorkspaceOrdering } from './workspace/workspaceCore/useWorkspaceOrdering'
import { useWorkspaceTransfer } from './workspace/workspaceCore/useWorkspaceTransfer'
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

  const graphManagement = useGraphManagement({ activeProject, graphLayouts, setGraphLayouts })

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
    return activeProject.entities
      .filter((e) => e.status === 'active')
      .filter((e) => !qs ? true : e.title.toLowerCase().includes(qs) || e.aliases.some((a) => a.toLowerCase().includes(qs)))
      .slice(0, 80)
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

  const transfer = useWorkspaceTransfer({ activeProject, setData, setToast })
  const ordering = useWorkspaceOrdering({
    activeProject,
    activeTab,
    withProjectUpdate: projectManagement.withProjectUpdate,
  })

  return {
    providerModels, data, toast, setToast, saveStatus, workspaceView, setWorkspaceView, searchQuery, setSearchQuery,
    newProjectName: projectManagement.newProjectName, setNewProjectName: projectManagement.setNewProjectName,
    newProjectDescription: projectManagement.newProjectDescription, setNewProjectDescription: projectManagement.setNewProjectDescription,
    newTabName: tabManagement.newTabName, setNewTabName: tabManagement.setNewTabName,
    newEntityTemplateId: entityManagement.newEntityTemplateId, setNewEntityTemplateId: entityManagement.setNewEntityTemplateId,
    activeProject, activeTab, activeEntity, activeDraft, activeTemplates: activeProject?.templates ?? [], activeTabEntities: tabEntities, selectedNewEntityTemplateId: entityManagement.selectedNewEntityTemplateId,
    searchResults, graphModel: graphManagement.graphModel, suggestionOptions, referenceSuggestion, pendingProposal: aiManagement.pendingProposal, panels, editorViewRef: entityManagement.editorViewRef, onboardingReady: Boolean(data.settings), completeOnboarding,
    // AI streaming
    streamStatus: aiManagement.streamStatus, streamingText: aiManagement.streamingText, llmTraces: aiManagement.llmTraces, stopGeneration: aiManagement.stopGeneration,
    selectProject: projectManagement.selectProject, renameActiveProject: projectManagement.renameActiveProject, deleteActiveProject: projectManagement.deleteActiveProject, createProject: projectManagement.createProject, clearWorkspace,
    selectTab: tabManagement.selectTab, createTab: tabManagement.createTab, moveActiveTab: tabManagement.moveActiveTab, renameActiveTab: tabManagement.renameActiveTab, deleteActiveTab: tabManagement.deleteActiveTab, updateTabPrompt: tabManagement.updateTabPrompt,
    selectEntity: entityManagement.selectEntity, createEntity: entityManagement.createEntity, duplicateActiveEntity: entityManagement.duplicateActiveEntity, archiveActiveEntity: entityManagement.archiveActiveEntity, deleteActiveEntity: entityManagement.deleteActiveEntity,
    applyActiveTemplate: entityManagement.applyActiveTemplate, setDraft, addField: entityManagement.addField, updateField: entityManagement.updateField, removeField: entityManagement.removeField, attachImages: entityManagement.attachImages,
    insertReference: entityManagement.insertReference, handleEditorChange: entityManagement.handleEditorChange, navigateFromReference: entityManagement.navigateFromReference, saveCurrentAsTemplate: entityManagement.saveCurrentAsTemplate,
    generateAiProposal: aiManagement.generateAiProposal, confirmAiProposal: aiManagement.confirmAiProposal, dismissProposal: aiManagement.dismissProposal, togglePanel, worker,
    // New features
    exportActiveProject: transfer.exportActiveProject, importProject: transfer.importProject, reorderEntities: ordering.reorderEntities, reorderTabs: ordering.reorderTabs,
    updateGraphNodePosition: graphManagement.updateGraphNodePosition, resetGraphLayout: graphManagement.resetGraphLayout,
  }
}
