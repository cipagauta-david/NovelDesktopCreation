import { useMemo, useState, useCallback, useEffect } from 'react'

import { providerModels } from '../data/constants'
import type { AppSettings, DraftState, OnboardingPayload, PanelKey, PanelVisibility, PersistedGraphLayouts, PersistedState, WorkspaceView } from '../types/workspace'
import { usePanelWidths } from './workspace/usePanelWidths'
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
import {
  deleteProviderApiKey,
  rotateProviderApiKey,
  saveProviderApiKey,
  saveWorkspaceSyncToken,
  deleteWorkspaceSyncToken,
  readProviderVaultMetadata,
} from '../services/security/apiKeyVault'
import { useSyncManagement } from './workspace/useSyncManagement'
import { createPluginManager } from '../services/plugins/manager'
import { getDefaultPersistedState } from '../data/seed/project'
import { clearSyncStoragePersistence } from '../platform/syncStorageAdapter'

const defaultPanels: PanelVisibility = { sidebar: false, entities: false, inspector: false }

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
  // Ensure panels ALWAYS start closed on mount to prevent flash of open panels
  const [panels, setPanels] = useState<PanelVisibility>(() => ({
    sidebar: false,
    entities: false,
    inspector: false,
  }))

  // Panel widths with resize and persistence
  const { widths: panelWidths, setSidebarWidth, adjustSidebarWidth, setInspectorWidth, adjustInspectorWidth, resetWidths } = usePanelWidths(initialData.panelWidths)
  const [graphLayouts, setGraphLayouts] = useState<PersistedGraphLayouts>(initialData.graphLayouts ?? {})
  const pluginManager = useMemo(() => createPluginManager(), [])

  const activeProject = useMemo(() => data.projects.find((p) => p.id === data.activeProjectId) ?? data.projects[0], [data.activeProjectId, data.projects])
  const activeTab = useMemo(() => activeProject?.tabs.find((t) => t.id === data.activeTabId) ?? activeProject?.tabs[0] ?? null, [activeProject, data.activeTabId])
  const projectEntities = useMemo(() => activeProject?.entities ?? [], [activeProject])
  const tabEntities = useMemo(() => projectEntities.filter((e) => e.tabId === activeTab?.id && e.status === 'active'), [activeTab?.id, projectEntities])
  const archivedTabEntities = useMemo(() => projectEntities.filter((e) => e.tabId === activeTab?.id && e.status === 'archived'), [activeTab?.id, projectEntities])

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
    data,
    setData,
    activeProject,
    activeTab,
    activeEntity,
    data.settings,
    projectManagement.withProjectUpdate,
    setToast,
  )

  const setPendingProposal = aiManagement.setPendingProposal

  // Motor de persistencia optimista con el worker
  usePersistenceManagement(data, activeProject, activeEntity, draft, setData, setSaveStatus, saveStatus, worker)

  const graphManagement = useGraphManagement({
    activeProject,
    graphLayouts,
    setGraphLayouts,
    withProjectUpdate: projectManagement.withProjectUpdate,
  })

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
    }

    void saveProviderApiKey(payload.provider, payload.apiKey).catch((error) => {
      console.error('[Vault] No se pudo guardar API key', error)
    })
    setData((c) => ({ ...c, settings }))
    setToast('Workspace configurado. Todo listo para escribir.')
  }, [setData, setToast])

  const clearWorkspace = useCallback(async () => {
    await worker.resetWorkspace()
    await clearSyncStoragePersistence()
    setData(getDefaultPersistedState())
    setDraft(null)
    setSearchQuery('')
    setPendingProposal(null)
    setPanels(defaultPanels)
    setWorkspaceView('editor')
    setToast('Workspace reiniciado desde almacenamiento persistente.')
  }, [setData, setDraft, setSearchQuery, setPendingProposal, setToast, setWorkspaceView, worker])

  const togglePanel = useCallback((panel: PanelKey) => setPanels((c) => ({ ...c, [panel]: !c[panel] })), [])

  const transfer = useWorkspaceTransfer({ activeProject, setData, setToast })
  const ordering = useWorkspaceOrdering({
    activeProject,
    activeTab,
    withProjectUpdate: projectManagement.withProjectUpdate,
  })
  const syncManagement = useSyncManagement(data, setData)

  const restoreCheckpoint = useCallback((checkpointId: string) => {
    setData((current) => {
      const checkpoint = (current.checkpoints ?? []).find((entry) => entry.id === checkpointId)
      if (!checkpoint) return current
      return {
        ...structuredClone(checkpoint.state),
        checkpoints: current.checkpoints,
      }
    })
    setToast('Checkpoint restaurado.')
  }, [setData, setToast])

  const rotateProviderCredential = useCallback(async (nextApiKey: string) => {
    const provider = data.settings?.provider
    if (!provider) return
    if (!nextApiKey.trim()) return
    await rotateProviderApiKey(provider, nextApiKey)
    setData((current) => ({
      ...current,
      settings: current.settings
        ? {
            ...current.settings,
            apiKeyHint: `••••${nextApiKey.trim().slice(-4)}`,
          }
        : current.settings,
    }))
    setToast(`Key de ${provider} rotada.`)
  }, [data.settings?.provider, setData, setToast])

  const invalidateProviderCredential = useCallback(async () => {
    const provider = data.settings?.provider
    if (!provider) return
    await deleteProviderApiKey(provider)
    setData((current) => ({
      ...current,
      settings: current.settings
        ? {
            ...current.settings,
            apiKeyHint: 'Sin key guardada',
          }
        : current.settings,
    }))
    setToast(`Key de ${provider} invalidada.`)
  }, [data.settings?.provider, setData, setToast])

  const configureRemoteSync = useCallback(async (input: { endpoint: string; workspaceId: string; token?: string }) => {
    if (!activeProject) return
    const endpoint = input.endpoint
    if (!endpoint.trim()) return
    const workspaceId = input.workspaceId || activeProject.id
    const token = input.token ?? ''

    if (token.trim()) {
      await saveWorkspaceSyncToken(workspaceId, token)
    }

    setData((current) => ({
      ...current,
      syncRemoteConfig: {
        endpoint: endpoint.trim(),
        workspaceId: workspaceId.trim() || activeProject.id,
        authTokenHint: token.trim() ? `••••${token.trim().slice(-4)}` : (current.syncRemoteConfig?.authTokenHint ?? 'sin token'),
        contractVersion: '2026-03-sync-v2',
        authMode: 'bearer',
      },
    }))
    setToast('Sync remoto configurado.')
  }, [activeProject, data.syncRemoteConfig?.authTokenHint, data.syncRemoteConfig?.endpoint, data.syncRemoteConfig?.workspaceId, setData, setToast])

  const clearRemoteSyncCredential = useCallback(async () => {
    const workspaceId = data.syncRemoteConfig?.workspaceId
    if (!workspaceId) return
    await deleteWorkspaceSyncToken(workspaceId)
    setData((current) => ({
      ...current,
      syncRemoteConfig: current.syncRemoteConfig
        ? {
            ...current.syncRemoteConfig,
            authTokenHint: 'sin token',
          }
        : current.syncRemoteConfig,
    }))
    setToast('Token de sync remoto eliminado del vault.')
  }, [data.syncRemoteConfig?.workspaceId, setData, setToast])

  const refreshVaultMetadata = useCallback(async () => {
    const provider = data.settings?.provider
    if (!provider) return
    const metadata = await readProviderVaultMetadata(provider)
    if (!metadata) {
      setToast('No hay metadata de vault para el proveedor activo.')
      return
    }
    setToast(`Key ${provider} rotada: ${new Date(metadata.rotatedAt).toLocaleString()}`)
  }, [data.settings?.provider, setToast])

  const runPluginCommand = useCallback(async (pluginId: string, commandName: string, payload?: unknown) => {
    await pluginManager.runCommand(pluginId, { name: commandName, payload }, {
      workspace: data,
      applyWorkspaceUpdate: (updater) => setData((current) => updater(current)),
    })
  }, [data, pluginManager, setData])

  return {
    providerModels, data, toast, setToast, saveStatus, workspaceView, setWorkspaceView, searchQuery, setSearchQuery,
    newProjectName: projectManagement.newProjectName, setNewProjectName: projectManagement.setNewProjectName,
    newProjectDescription: projectManagement.newProjectDescription, setNewProjectDescription: projectManagement.setNewProjectDescription,
    newTabName: tabManagement.newTabName, setNewTabName: tabManagement.setNewTabName,
    newEntityTemplateId: entityManagement.newEntityTemplateId, setNewEntityTemplateId: entityManagement.setNewEntityTemplateId,
    activeProject, activeTab, activeEntity, activeDraft, activeTemplates: activeProject?.templates ?? [], activeTabEntities: tabEntities, archivedTabEntities, selectedNewEntityTemplateId: entityManagement.selectedNewEntityTemplateId,
    searchResults, graphModel: graphManagement.graphModel, suggestionOptions, referenceSuggestion, pendingProposal: aiManagement.pendingProposal, panels, editorViewRef: entityManagement.editorViewRef, onboardingReady: Boolean(data.settings), completeOnboarding,
    // AI streaming
    streamStatus: aiManagement.streamStatus, streamingText: aiManagement.streamingText, llmTraces: aiManagement.llmTraces, stopGeneration: aiManagement.stopGeneration,
    selectProject: projectManagement.selectProject, renameActiveProject: projectManagement.renameActiveProject, deleteActiveProject: projectManagement.deleteActiveProject, createProject: projectManagement.createProject, clearWorkspace,
    selectTab: tabManagement.selectTab, createTab: tabManagement.createTab, moveActiveTab: tabManagement.moveActiveTab, renameActiveTab: tabManagement.renameActiveTab, deleteActiveTab: tabManagement.deleteActiveTab, updateTabPrompt: tabManagement.updateTabPrompt, updateTabColor: tabManagement.updateTabColor, updateActiveTabColor: tabManagement.updateActiveTabColor,
    selectEntity: entityManagement.selectEntity, createEntity: entityManagement.createEntity, duplicateActiveEntity: entityManagement.duplicateActiveEntity, archiveActiveEntity: entityManagement.archiveActiveEntity, deleteActiveEntity: entityManagement.deleteActiveEntity,
    archiveEntity: entityManagement.archiveEntity, deleteEntity: entityManagement.deleteEntity, saveEntityAsTemplate: entityManagement.saveEntityAsTemplate,
    applyActiveTemplate: entityManagement.applyActiveTemplate, setDraft, addField: entityManagement.addField, updateField: entityManagement.updateField, removeField: entityManagement.removeField, attachImages: entityManagement.attachImages,
    insertReference: entityManagement.insertReference, handleEditorChange: entityManagement.handleEditorChange, navigateFromReference: entityManagement.navigateFromReference, saveCurrentAsTemplate: entityManagement.saveCurrentAsTemplate,
    generateAiProposal: aiManagement.generateAiProposal, confirmAiProposal: aiManagement.confirmAiProposal, dismissProposal: aiManagement.dismissProposal, togglePanel, worker,
    // Panel resize
    panelWidths, setSidebarWidth, adjustSidebarWidth, setInspectorWidth, adjustInspectorWidth, resetPanelWidths: resetWidths,
    // New features
    exportActiveProject: transfer.exportActiveProject, importProject: transfer.importProject, reorderEntities: ordering.reorderEntities, reorderTabs: ordering.reorderTabs,
    updateGraphNodePosition: graphManagement.updateGraphNodePosition, resetGraphLayout: graphManagement.resetGraphLayout,
    addRelation: graphManagement.addRelation, removeRelation: graphManagement.removeRelation,
    syncStatus: syncManagement.syncStatus, inspectPendingSync: syncManagement.inspectPendingSync, clearPendingSync: syncManagement.clearPendingSync, flushRemoteSync: syncManagement.flushRemoteSync,
    syncStats: data.syncStats, syncRemoteConfig: data.syncRemoteConfig, configureRemoteSync, clearRemoteSyncCredential,
    checkpoints: data.checkpoints ?? [], restoreCheckpoint,
    correlationReports: data.correlationReports ?? [],
    rotateProviderCredential, invalidateProviderCredential, refreshVaultMetadata,
    registerPlugin: pluginManager.register, listPlugins: pluginManager.list, runPluginCommand,
  }
}
