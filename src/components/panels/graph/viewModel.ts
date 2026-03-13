import { useMemo } from 'react'

import type { GraphModel, GraphNode } from '../../../types/workspace'
import { GRAPH_CATEGORY_LABEL, getNodeCategory } from './category'
import type { GraphLayoutEngine, GraphLayoutViewport, GraphViewModel, GraphViewSettings } from './contracts'

export function useGraphViewModel({
  graphModel,
  positionedNodes,
  settings,
  layoutEngine,
  viewport,
}: {
  graphModel: GraphModel
  positionedNodes: GraphNode[]
  settings: GraphViewSettings
  layoutEngine: GraphLayoutEngine
  viewport: GraphLayoutViewport
}): GraphViewModel {
  const degreeByNodeId = useMemo(() => {
    const degrees = new Map<string, number>()
    for (const node of graphModel.nodes) {
      degrees.set(node.id, 0)
    }
    for (const edge of graphModel.edges) {
      degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1)
      degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1)
    }
    return degrees
  }, [graphModel.edges, graphModel.nodes])

  const availableCategories = useMemo(() => {
    const entries = new Set<ReturnType<typeof getNodeCategory>>()
    for (const node of positionedNodes) {
      entries.add(getNodeCategory(node.tabName))
    }
    return Array.from(entries)
  }, [positionedNodes])

  const filteredNodes = useMemo(
    () =>
      positionedNodes.filter((node) => {
        const category = getNodeCategory(node.tabName)
        return settings.categoryVisibility[category]
      }),
    [positionedNodes, settings.categoryVisibility],
  )

  const renderedNodes = useMemo(
    () => layoutEngine.applyLayout({ nodes: filteredNodes, edges: graphModel.edges, settings, viewport }),
    [filteredNodes, graphModel.edges, layoutEngine, settings, viewport],
  )

  const visibleNodeIds = useMemo(() => new Set(renderedNodes.map((node) => node.id)), [renderedNodes])

  const filteredEdges = useMemo(
    () => graphModel.edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)),
    [graphModel.edges, visibleNodeIds],
  )

  const nodeById = useMemo(() => new Map(renderedNodes.map((node) => [node.id, node])), [renderedNodes])

  const normalizedSearch = settings.searchTerm.trim().toLowerCase()
  const highlightedNodeId = useMemo(() => {
    if (!normalizedSearch) {
      return null
    }

    return (
      renderedNodes.find((node) => {
        const titleMatch = node.title.toLowerCase().includes(normalizedSearch)
        const categoryMatch = GRAPH_CATEGORY_LABEL[getNodeCategory(node.tabName)].toLowerCase().includes(normalizedSearch)
        return titleMatch || categoryMatch
      })?.id ?? null
    )
  }, [normalizedSearch, renderedNodes])

  return {
    availableCategories,
    renderedNodes,
    filteredEdges,
    highlightedNodeId,
    nodeById,
    degreeByNodeId,
  }
}
