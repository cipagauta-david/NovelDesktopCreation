import { useCallback, useMemo } from 'react'

import type { Dispatch, SetStateAction } from 'react'
import type { PersistedGraphLayouts, Project } from '../../../types/workspace'
import { getReferenceTokens } from '../../../utils/references'
import { createHistoryEvent, isoNow, uid } from '../../../utils/workspace'

type UseGraphManagementArgs = {
  activeProject: Project | undefined
  graphLayouts: PersistedGraphLayouts
  setGraphLayouts: Dispatch<SetStateAction<PersistedGraphLayouts>>
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
}

export function useGraphManagement({ activeProject, graphLayouts, setGraphLayouts, withProjectUpdate }: UseGraphManagementArgs) {
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
    const referencedEdges = activeProject.entities.flatMap((e) =>
      getReferenceTokens(e.content)
        .filter((token) => activeProject.entities.some((t) => t.id === token.entityId))
        .map((token) => ({ source: e.id, target: token.entityId })),
    )
    const relationEdges = (activeProject.relations ?? []).map((relation) => ({
      source: relation.sourceEntityId,
      target: relation.targetEntityId,
    }))

    const edgeMap = new Map<string, { source: string; target: string }>()
    for (const edge of [...referencedEdges, ...relationEdges]) {
      edgeMap.set(`${edge.source}->${edge.target}`, edge)
    }

    return { nodes, edges: Array.from(edgeMap.values()) }
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

  const addRelation = useCallback((sourceEntityId: string, targetEntityId: string, relationType: string, label?: string) => {
    if (!activeProject || !relationType.trim()) return
    const now = isoNow()
    withProjectUpdate(activeProject.id, (project) => {
      const relations = project.relations ?? []
      const existing = relations.find((relation) =>
        relation.sourceEntityId === sourceEntityId &&
        relation.targetEntityId === targetEntityId &&
        relation.relationType === relationType.trim(),
      )
      if (existing) {
        return project
      }

      return {
        ...project,
        relations: [
          {
            id: uid('rel'),
            sourceEntityId,
            targetEntityId,
            relationType: relationType.trim(),
            label: label?.trim() || undefined,
            createdAt: now,
            updatedAt: now,
          },
          ...relations,
        ],
        updatedAt: now,
        history: [
          createHistoryEvent('Relación creada', `Nueva relación ${relationType.trim()} entre entidades.`),
          ...project.history,
        ].slice(0, 40),
      }
    }, {
      label: 'Relación creada',
      details: `${relationType.trim()} entre entidades.`,
      entityId: sourceEntityId,
    })
  }, [activeProject, withProjectUpdate])

  const removeRelation = useCallback((relationId: string) => {
    if (!activeProject) return
    withProjectUpdate(activeProject.id, (project) => ({
      ...project,
      relations: (project.relations ?? []).filter((relation) => relation.id !== relationId),
      updatedAt: isoNow(),
      history: [
        createHistoryEvent('Relación eliminada', 'Se eliminó una relación de dominio.'),
        ...project.history,
      ].slice(0, 40),
    }), {
      label: 'Relación eliminada',
      details: 'Se eliminó una relación de dominio.',
    })
  }, [activeProject, withProjectUpdate])

  return {
    graphModel,
    updateGraphNodePosition,
    resetGraphLayout,
    addRelation,
    removeRelation,
  }
}
