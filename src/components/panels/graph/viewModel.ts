import { useMemo } from 'react'

import type { CollectionTab, GraphModel, GraphNode } from '../../../types/workspace'
import { resolveCollectionColor } from '../../../utils/collectionColors'
import type { GraphLayoutEngine, GraphLayoutViewport, GraphViewModel, GraphViewSettings } from './contracts'

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export function useGraphViewModel({
  graphModel,
  collections,
  positionedNodes,
  settings,
  layoutEngine,
  viewport,
}: {
  graphModel: GraphModel
  collections: CollectionTab[]
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

  const availableCollections = useMemo(
    () =>
      collections.map((collection) => ({
        id: collection.id,
        name: collection.name,
        color: resolveCollectionColor(collection.id, collection.color),
      })),
    [collections],
  )

  const availableCollectionCounts = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(collections.map((collection) => [collection.id, 0]))

    for (const node of positionedNodes) {
      counts[node.tabId] = (counts[node.tabId] ?? 0) + 1
    }

    return counts
  }, [collections, positionedNodes])

  const filteredNodes = useMemo(
    () =>
      positionedNodes.filter((node) => {
        return settings.collectionVisibility[node.tabId] ?? true
      }),
    [positionedNodes, settings.collectionVisibility],
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

  const normalizedSearch = normalizeText(settings.searchTerm)
  const searchMatches = useMemo(() => {
    if (!normalizedSearch) {
      return [] as Array<{ id: string; score: number }>
    }

    const tokens = normalizedSearch.split(/\s+/).filter(Boolean)
    if (!tokens.length) {
      return [] as Array<{ id: string; score: number }>
    }

    const matches: Array<{ id: string; score: number }> = []
    for (const node of renderedNodes) {
      const title = normalizeText(node.title)
      const tabName = normalizeText(node.tabName)
      const haystack = `${title} ${tabName}`

      const matchesAllTokens = tokens.every((token) => haystack.includes(token))
      if (!matchesAllTokens) {
        continue
      }

      let score = 0
      if (title === normalizedSearch) score += 220
      if (tabName === normalizedSearch) score += 170
      if (title.startsWith(normalizedSearch)) score += 120
      if (tabName.startsWith(normalizedSearch)) score += 80
      if (title.includes(normalizedSearch)) score += 52
      if (tabName.includes(normalizedSearch)) score += 38
      score += Math.max(0, 36 - title.length)

      matches.push({ id: node.id, score })
    }

    matches.sort((a, b) => b.score - a.score)
    return matches
  }, [normalizedSearch, renderedNodes])

  const highlightedNodeId = searchMatches[0]?.id ?? null
  const searchMatchCount = searchMatches.length

  return {
    availableCollections,
    availableCollectionCounts,
    renderedNodes,
    filteredEdges,
    highlightedNodeId,
    searchMatchCount,
    nodeById,
    degreeByNodeId,
  }
}
