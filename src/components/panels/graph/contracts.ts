import type { GraphEdge, GraphNode } from '../../../types/workspace'

export type GraphCategory = 'chapters' | 'characters' | 'world' | 'other'

export type GraphViewSettings = {
  repulsionStrength: number
  gravityStrength: number
  linkWeightStrength: number
  categoryVisibility: Record<GraphCategory, boolean>
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
  availableCategories: GraphCategory[]
  renderedNodes: GraphNode[]
  filteredEdges: GraphEdge[]
  highlightedNodeId: string | null
  nodeById: Map<string, GraphNode>
  degreeByNodeId: Map<string, number>
}
