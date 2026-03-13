import { useState } from 'react'
import type { PersistedState, Project, CollectionTab } from '../../types/workspace'
import { createHistoryEvent, isoNow, uid } from '../../utils/workspace'

type ChangeDescriptor = {
  label: string
  details: string
  actorType?: 'user' | 'ai' | 'system'
  tabId?: string
  entityId?: string
}

export function useTabManagement(
  setData: React.Dispatch<React.SetStateAction<PersistedState>>,
  activeProject: Project | undefined,
  activeTab: CollectionTab | null,
  withProjectUpdate: (projectId: string, updater: (project: Project) => Project, change?: ChangeDescriptor) => void,
  setToast: (msg: string) => void
) {
  const [newTabName, setNewTabName] = useState('')

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
    }), {
      label: 'Tab creada',
      details: `${newTab.name} ya forma parte del proyecto.`,
      tabId: newTab.id,
    })
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
    }), {
      label: 'Tabs reordenadas',
      details: `${activeTab.name} cambió de posición.`,
      tabId: activeTab.id,
    })
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
    }), {
      label: 'Tab renombrada',
      details: `${activeTab.name} ahora es ${nextName.trim()}.`,
      tabId: activeTab.id,
    })
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
    }), {
      label: 'Tab eliminada',
      details: `${activeTab.name} y sus entidades fueron retiradas.`,
      tabId: activeTab.id,
    })
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
    }), {
      label: 'Prompt de tab actualizado',
      details: `Se actualizó el prompt de ${activeTab.name}.`,
      tabId: activeTab.id,
    })
  }

  return {
    newTabName,
    setNewTabName,
    selectTab,
    createTab,
    moveActiveTab,
    renameActiveTab,
    deleteActiveTab,
    updateTabPrompt,
  }
}
