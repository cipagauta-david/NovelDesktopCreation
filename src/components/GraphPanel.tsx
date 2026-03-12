import { memo, useCallback, useMemo, useRef, useState, type PointerEvent } from 'react'
import type { GraphModel } from '../types/workspace'

type GraphPanelProps = {
  graphModel: GraphModel
  activeEntityId?: string
  onSelectEntity: (entityId: string, tabId: string) => void
  onNodePositionChange?: (entityId: string, x: number, y: number) => void
  onResetLayout?: () => void
}

export const GraphPanel = memo(function GraphPanel({ graphModel, activeEntityId, onSelectEntity, onNodePositionChange, onResetLayout }: GraphPanelProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [nodeOverrides, setNodeOverrides] = useState<Record<string, { x: number; y: number }>>({})
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)

  const nodesWithPosition = useMemo(
    () =>
      graphModel.nodes.map((node) => ({
        ...node,
        x: nodeOverrides[node.id]?.x ?? node.x,
        y: nodeOverrides[node.id]?.y ?? node.y,
      })),
    [graphModel.nodes, nodeOverrides],
  )

  const nodeById = useMemo(
    () => new Map(nodesWithPosition.map((node) => [node.id, node])),
    [nodesWithPosition],
  )

  function getSvgCoordinates(event: PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) {
      return null
    }
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const matrix = svg.getScreenCTM()
    if (!matrix) {
      return null
    }
    const transformed = point.matrixTransform(matrix.inverse())
    return { x: transformed.x, y: transformed.y }
  }

  const resetLayout = useCallback(() => {
    setNodeOverrides({})
    onResetLayout?.()
  }, [onResetLayout])

  const connectedNodeIds = useMemo(() => activeEntityId
    ? new Set(
        graphModel.edges.flatMap((edge) =>
          edge.source === activeEntityId || edge.target === activeEntityId
            ? [edge.source, edge.target]
            : [],
        ),
      )
    : null, [activeEntityId, graphModel.edges])

  return (
    <section className="panel surface-panel">
      <div className="panel-header">
        <div>
          <h3>Mapa narrativo</h3>
          <p>Explora conexiones y arrastra nodos para reorganizar el mapa en tiempo real.</p>
        </div>
        <div className="toolbar-group">
          <small>{graphModel.nodes.length} nodos</small>
          <button type="button" className="ghost-button compact-button" onClick={resetLayout}>
            Restablecer layout
          </button>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 520 440"
        role="img"
        aria-label="Mapa narrativo del proyecto"
        onPointerMove={(event) => {
          if (!draggingNodeId) {
            return
          }
          const position = getSvgCoordinates(event)
          if (!position) {
            return
          }
          setNodeOverrides((current) => ({
            ...current,
            [draggingNodeId]: {
              x: Math.max(20, Math.min(500, position.x)),
              y: Math.max(20, Math.min(420, position.y)),
            },
          }))
        }}
        onPointerUp={() => {
          if (draggingNodeId) {
            const pos = nodeOverrides[draggingNodeId]
            if (pos && onNodePositionChange) {
              onNodePositionChange(draggingNodeId, pos.x, pos.y)
            }
          }
          setDraggingNodeId(null)
        }}
        onPointerLeave={() => {
          if (draggingNodeId) {
            const pos = nodeOverrides[draggingNodeId]
            if (pos && onNodePositionChange) {
              onNodePositionChange(draggingNodeId, pos.x, pos.y)
            }
          }
          setDraggingNodeId(null)
        }}
      >
        {graphModel.edges.map((edge) => {
          const source = nodeById.get(edge.source)
          const target = nodeById.get(edge.target)
          if (!source || !target) return null
          const isRelated =
            !activeEntityId || edge.source === activeEntityId || edge.target === activeEntityId
          return (
            <line
              key={`${edge.source}-${edge.target}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={isRelated ? 'var(--border-focus)' : 'var(--border-subtle)'}
              strokeWidth={isRelated ? '2.4' : '1.2'}
            />
          )
        })}
        {nodesWithPosition.map((node) => {
          const isActive = node.id === activeEntityId
          const isConnected = connectedNodeIds?.has(node.id) ?? true

          return (
            <g
                key={node.id}
                className="graph-node"
                opacity={isActive || isConnected ? 1 : activeEntityId ? 0.22 : 1}
                onClick={() => onSelectEntity(node.id, node.tabId)}
                onPointerDown={() => setDraggingNodeId(node.id)}
              >
              <circle
                cx={node.x}
                cy={node.y}
                r={isActive ? 16 : 10}
                fill={isActive ? 'var(--brand-accent)' : 'var(--surface-base)'}
                stroke={isActive ? 'var(--brand-accent-hover)' : 'var(--border-focus)'}
                strokeWidth={isActive ? '2.4' : '1.4'}
              />
              <text x={node.x} y={node.y + 24} textAnchor="middle" fill="var(--text-primary)">
                {node.title.length > 18 ? `${node.title.slice(0, 18)}…` : node.title}
              </text>
            </g>
          )
        })}
      </svg>
    </section>
  )
})
