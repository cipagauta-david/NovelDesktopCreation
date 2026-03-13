import type { GraphEdge, GraphNode } from '../../../../types/workspace'

export type GraphRendererKind = 'native' | 'cosmograph' | 'd3-pixi'

export type GraphRendererContext = {
  width: number
  height: number
  nodes: GraphNode[]
  edges: GraphEdge[]
  activeEntityId?: string
  highlightedNodeId?: string | null
}

export type GraphRendererAdapterStatus = {
  ready: boolean
  reason?: string
}

export type GraphRendererAdapter = {
  kind: GraphRendererKind
  getStatus: () => GraphRendererAdapterStatus
}
