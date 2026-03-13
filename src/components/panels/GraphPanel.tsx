import { memo, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import type { GraphModel } from '../../types/workspace'

const VIEW_WIDTH = 520
const VIEW_HEIGHT = 440
const CANVAS_NODE_THRESHOLD = 140

type GraphPanelProps = {
  graphModel: GraphModel
  activeEntityId?: string
  onSelectEntity: (entityId: string, tabId: string) => void
  onNodePositionChange?: (entityId: string, x: number, y: number) => void
  onResetLayout?: () => void
}

export const GraphPanel = memo(function GraphPanel({ graphModel, activeEntityId, onSelectEntity, onNodePositionChange, onResetLayout }: GraphPanelProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
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

  const useCanvasRenderer = graphModel.nodes.length >= CANVAS_NODE_THRESHOLD

  function getCanvasCoordinates(event: PointerEvent<HTMLCanvasElement> | MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT,
    }
  }

  function getClosestNodeId(position: { x: number; y: number }): string | null {
    let bestId: string | null = null
    let bestDistance = Number.POSITIVE_INFINITY

    for (const node of nodesWithPosition) {
      const radius = node.id === activeEntityId ? 16 : 10
      const dx = node.x - position.x
      const dy = node.y - position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance <= radius + 6 && distance < bestDistance) {
        bestDistance = distance
        bestId = node.id
      }
    }

    return bestId
  }

  useEffect(() => {
    if (!useCanvasRenderer) return
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT)
    context.lineCap = 'round'
    context.lineJoin = 'round'

    for (const edge of graphModel.edges) {
      const source = nodeById.get(edge.source)
      const target = nodeById.get(edge.target)
      if (!source || !target) continue
      const isRelated =
        !activeEntityId || edge.source === activeEntityId || edge.target === activeEntityId
      context.strokeStyle = isRelated ? 'rgba(125, 166, 255, 0.8)' : 'rgba(127, 135, 160, 0.32)'
      context.lineWidth = isRelated ? 2.1 : 1.0
      context.beginPath()
      context.moveTo(source.x, source.y)
      context.lineTo(target.x, target.y)
      context.stroke()
    }

    for (const node of nodesWithPosition) {
      const isActive = node.id === activeEntityId
      const isConnected = connectedNodeIds?.has(node.id) ?? true
      const dimmed = !isActive && !isConnected && Boolean(activeEntityId)
      const alpha = dimmed ? 0.24 : 1

      if (isActive || isConnected) {
        context.save()
        context.globalAlpha = alpha * (isActive ? 0.22 : 0.13)
        context.fillStyle = 'rgba(139, 176, 255, 1)'
        context.beginPath()
        context.arc(node.x, node.y, isActive ? 24 : 17, 0, Math.PI * 2)
        context.fill()
        context.restore()
      }

      context.save()
      context.globalAlpha = alpha
      context.fillStyle = isActive ? 'rgba(120, 168, 255, 1)' : 'rgba(20, 24, 36, 0.95)'
      context.strokeStyle = isActive ? 'rgba(153, 190, 255, 1)' : 'rgba(145, 162, 210, 0.88)'
      context.lineWidth = isActive ? 2.4 : 1.2
      context.beginPath()
      context.arc(node.x, node.y, isActive ? 16 : 10, 0, Math.PI * 2)
      context.fill()
      context.stroke()
      context.restore()

      context.save()
      context.globalAlpha = alpha
      context.fillStyle = 'rgba(226, 232, 255, 0.95)'
      context.font = '12px Inter, sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'top'
      const label = node.title.length > 18 ? `${node.title.slice(0, 18)}…` : node.title
      context.fillText(label, node.x, node.y + 24)
      context.restore()
    }
  }, [activeEntityId, connectedNodeIds, graphModel.edges, nodeById, nodesWithPosition, useCanvasRenderer])

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

      {useCanvasRenderer ? (
        <canvas
          ref={canvasRef}
          className="graph-canvas"
          width={VIEW_WIDTH}
          height={VIEW_HEIGHT}
          role="img"
          aria-label="Mapa narrativo del proyecto"
          onPointerDown={(event) => {
            const position = getCanvasCoordinates(event)
            if (!position) return
            const nodeId = getClosestNodeId(position)
            if (!nodeId) return
            setDraggingNodeId(nodeId)
          }}
          onPointerMove={(event) => {
            if (!draggingNodeId) return
            const position = getCanvasCoordinates(event)
            if (!position) return
            setNodeOverrides((current) => ({
              ...current,
              [draggingNodeId]: {
                x: Math.max(20, Math.min(500, position.x)),
                y: Math.max(20, Math.min(420, position.y)),
              },
            }))
          }}
          onPointerUp={(event) => {
            const position = getCanvasCoordinates(event)
            const selectedNodeId = position ? getClosestNodeId(position) : null

            if (draggingNodeId) {
              const pos = nodeOverrides[draggingNodeId]
              if (pos && onNodePositionChange) {
                onNodePositionChange(draggingNodeId, pos.x, pos.y)
              }
            }

            if (!draggingNodeId && selectedNodeId) {
              const selected = nodeById.get(selectedNodeId)
              if (selected) {
                onSelectEntity(selected.id, selected.tabId)
              }
            }
            setDraggingNodeId(null)
          }}
          onClick={(event) => {
            const position = getCanvasCoordinates(event)
            if (!position) return
            const nodeId = getClosestNodeId(position)
            if (!nodeId) return
            const node = nodeById.get(nodeId)
            if (!node) return
            onSelectEntity(node.id, node.tabId)
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
        />
      ) : (
      <svg
        className="graph-canvas"
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
        {/* SVG Defs: glow filters for stellar map effect */}
        <defs>
          <filter id="glow-active" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-related" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="halo-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-primary-glow)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-primary-glow)" stopOpacity="0" />
          </radialGradient>
        </defs>
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
                className={isActive ? 'graph-node active' : isConnected ? 'graph-node related' : 'graph-node'}
                opacity={isActive || isConnected ? 1 : activeEntityId ? 0.22 : 1}
                filter={isActive ? 'url(#glow-active)' : isConnected ? 'url(#glow-related)' : undefined}
                onClick={() => onSelectEntity(node.id, node.tabId)}
                onPointerDown={() => setDraggingNodeId(node.id)}
              >
              {(isActive || isConnected) && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isActive ? 24 : 17}
                  fill="none"
                  stroke="var(--color-primary-glow)"
                  strokeWidth={isActive ? '1.6' : '1.1'}
                  className="graph-node-halo"
                />
              )}
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
      )}
    </section>
  )
})
