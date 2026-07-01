import type { GraphEdge, GraphNode } from '../../../types/workspace'

export type GraphCategory = 'chapters' | 'characters' | 'world' | 'other'

export type GraphCollectionMeta = {
  id: string
  name: string
  color: string
}

export type GraphViewSettings = {
  repulsionStrength: number
  gravityStrength: number
  linkWeightStrength: number
  collectionBoundaryRepulsionStrength: number
  textFontSize: number
  collectionVisibility: Record<string, boolean>
  searchTerm: string
}

export type GraphLayoutViewport = {
  width: number
  height: number
  padding: number
}

export type GraphLayoutContext = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  settings: GraphViewSettings
  viewport: GraphLayoutViewport
}

export type GraphLayoutEngine = {
  id: string
  applyLayout: (context: GraphLayoutContext) => GraphNode[]
}

export type GraphViewModel = {
  availableCollections: GraphCollectionMeta[]
  availableCollectionCounts: Record<string, number>
  renderedNodes: GraphNode[]
  filteredEdges: GraphEdge[]
  highlightedNodeId: string | null
  searchMatchCount: number
  nodeById: Map<string, GraphNode>
  degreeByNodeId: Map<string, number>
}
