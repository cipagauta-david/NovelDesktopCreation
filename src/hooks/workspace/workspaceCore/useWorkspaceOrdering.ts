import { useCallback } from 'react'

import type { CollectionTab, Project } from '../../../types/workspace'
import { createHistoryEvent, isoNow } from '../../../utils/workspace'

type UseWorkspaceOrderingArgs = {
  activeProject: Project | undefined
  activeTab: CollectionTab | null
  withProjectUpdate: (projectId: string, updater: (project: Project) => Project) => void
}

export function useWorkspaceOrdering({
  activeProject,
  activeTab,
  withProjectUpdate,
}: UseWorkspaceOrderingArgs) {
  const reorderEntities = useCallback((entityIds: string[]) => {
    if (!activeProject || !activeTab) return
    const now = isoNow()
    withProjectUpdate(activeProject.id, (project) => {
      const tabEntitiesMap = new Map(project.entities.filter((e) => e.tabId === activeTab.id).map((e) => [e.id, e]))
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
  }, [activeProject, activeTab, withProjectUpdate])

  const reorderTabs = useCallback((tabIds: string[]) => {
    if (!activeProject) return
    const now = isoNow()
    withProjectUpdate(activeProject.id, (project) => {
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
  }, [activeProject, withProjectUpdate])

  return {
    reorderEntities,
    reorderTabs,
  }
}
