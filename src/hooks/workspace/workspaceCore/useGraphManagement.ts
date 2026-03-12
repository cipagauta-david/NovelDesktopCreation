import { useCallback, useMemo } from 'react'

import type { Dispatch, SetStateAction } from 'react'
import type { PersistedGraphLayouts, Project } from '../../../types/workspace'
import { getReferenceTokens } from '../../../utils/references'

type UseGraphManagementArgs = {
  activeProject: Project | undefined
  graphLayouts: PersistedGraphLayouts
  setGraphLayouts: Dispatch<SetStateAction<PersistedGraphLayouts>>
}

export function useGraphManagement({ activeProject, graphLayouts, setGraphLayouts }: UseGraphManagementArgs) {
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
      getReferenceTokens(e.content)
        .filter((token) => activeProject.entities.some((t) => t.id === token.entityId))
        .map((token) => ({ source: e.id, target: token.entityId })),
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
  }, [activeProject, setGraphLayouts])

  const resetGraphLayout = useCallback(() => {
    if (!activeProject) return
    setGraphLayouts((prev) => {
      const next = { ...prev }
      delete next[activeProject.id]
      return next
    })
  }, [activeProject, setGraphLayouts])

  return {
    graphModel,
    updateGraphNodePosition,
    resetGraphLayout,
  }
}
