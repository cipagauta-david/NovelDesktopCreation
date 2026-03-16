import type { GraphEdge, GraphNode } from '../../../../types/workspace'

type SharedRendererProps = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  activeEntityId?: string
  highlightedNodeId?: string | null
  repulsionStrength: number
  gravityStrength: number
  linkWeightStrength: number
  linkAttractionStrength: number
  collectionCohesionStrength: number
  collectionBoundaryRepulsionStrength: number
  simulationPaused: boolean
  centerViewRequestId: number
  orbitAroundCenter: boolean
  degreeByNodeId: Map<string, number>
  onNodeSelect: (node: GraphNode) => void
  onNodePositionChange?: (entityId: string, x: number, y: number) => void
}

export type D3PixiRendererProps = SharedRendererProps & {
  width: number
  height: number
  padding: number
}
