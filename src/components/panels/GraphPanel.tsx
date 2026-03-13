import { memo, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'

import { ENABLE_INCREMENTAL_GRAPH_HUD } from '../../data/constants'
import type { GraphModel, GraphNode } from '../../types/workspace'
import '../../styles/panels/GraphPanel.css';

const VIEW_WIDTH = 520
const VIEW_HEIGHT = 440
const CANVAS_NODE_THRESHOLD = 140

type GraphPanelProps = {
  graphModel: GraphModel
  activeEntityId?: string
  onSelectEntity: (entityId: string, tabId: string) => void
  onNodePositionChange?: (entityId: string, x: number, y: number) => void
  onResetLayout?: () => void
  onCreateRelation?: (sourceEntityId: string, targetEntityId: string) => void
}

type GraphCategory = 'chapters' | 'characters' | 'world' | 'other'

type Palette = {
  fill: string
  stroke: string
  halo: string
}

const GRAPH_CATEGORY_LABEL: Record<GraphCategory, string> = {
  chapters: 'Capítulos',
  characters: 'Personajes',
  world: 'Mundo',
  other: 'Otros',
}

function getNodeCategory(tabName: string): GraphCategory {
  const normalized = tabName.toLowerCase()
  if (normalized.includes('cap') || normalized.includes('escena') || normalized.includes('historia')) {
    return 'chapters'
  }
  if (normalized.includes('person')) {
    return 'characters'
  }
  if (normalized.includes('mundo') || normalized.includes('lógica') || normalized.includes('escenario') || normalized.includes('lugar')) {
    return 'world'
  }
  return 'other'
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function applyRepulsion(nodes: GraphNode[], repulsionStrength: number): GraphNode[] {
  if (repulsionStrength === 50 || nodes.length === 0) {
    return nodes
  }

  const centerX = VIEW_WIDTH / 2
  const centerY = VIEW_HEIGHT / 2
  const factor = 0.72 + (repulsionStrength / 100) * 1.05

  return nodes.map((node) => {
    const dx = node.x - centerX
    const dy = node.y - centerY
    return {
      ...node,
      x: clamp(centerX + dx * factor, 20, VIEW_WIDTH - 20),
      y: clamp(centerY + dy * factor, 20, VIEW_HEIGHT - 20),
    }
  })
}

function getCategoryPalette(category: GraphCategory, isDarkTheme: boolean): Palette {
  if (category === 'chapters') {
    return {
      fill: isDarkTheme ? 'rgba(59, 130, 246, 0.82)' : 'rgba(37, 99, 235, 0.92)',
      stroke: isDarkTheme ? 'rgba(147, 197, 253, 0.96)' : 'rgba(30, 64, 175, 0.96)',
      halo: isDarkTheme ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.28)',
    }
  }

  if (category === 'characters') {
    return {
      fill: isDarkTheme ? 'rgba(249, 115, 22, 0.82)' : 'rgba(234, 88, 12, 0.9)',
      stroke: isDarkTheme ? 'rgba(253, 186, 116, 0.96)' : 'rgba(194, 65, 12, 0.96)',
      halo: isDarkTheme ? 'rgba(249, 115, 22, 0.34)' : 'rgba(249, 115, 22, 0.25)',
    }
  }

  if (category === 'world') {
    return {
      fill: isDarkTheme ? 'rgba(20, 184, 166, 0.8)' : 'rgba(13, 148, 136, 0.9)',
      stroke: isDarkTheme ? 'rgba(94, 234, 212, 0.92)' : 'rgba(15, 118, 110, 0.96)',
      halo: isDarkTheme ? 'rgba(20, 184, 166, 0.3)' : 'rgba(20, 184, 166, 0.22)',
    }
  }

  return {
    fill: isDarkTheme ? 'rgba(148, 163, 184, 0.74)' : 'rgba(100, 116, 139, 0.84)',
    stroke: isDarkTheme ? 'rgba(226, 232, 240, 0.88)' : 'rgba(51, 65, 85, 0.9)',
    halo: isDarkTheme ? 'rgba(148, 163, 184, 0.25)' : 'rgba(148, 163, 184, 0.18)',
  }
}

export const GraphPanel = memo(function GraphPanel({
  graphModel,
  activeEntityId,
  onSelectEntity,
  onNodePositionChange,
  onResetLayout,
  onCreateRelation,
}: GraphPanelProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [nodeOverrides, setNodeOverrides] = useState<Record<string, { x: number; y: number }>>({})
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [relationSourceId, setRelationSourceId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [repulsionStrength, setRepulsionStrength] = useState(50)
  const [categoryVisibility, setCategoryVisibility] = useState<Record<GraphCategory, boolean>>({
    chapters: true,
    characters: true,
    world: true,
    other: true,
  })

  const nodesWithPosition = useMemo(
    () =>
      graphModel.nodes.map((node) => ({
        ...node,
        x: nodeOverrides[node.id]?.x ?? node.x,
        y: nodeOverrides[node.id]?.y ?? node.y,
      })),
    [graphModel.nodes, nodeOverrides],
  )

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
    const entries = new Set<GraphCategory>()
    for (const node of nodesWithPosition) {
      entries.add(getNodeCategory(node.tabName))
    }
    return Array.from(entries)
  }, [nodesWithPosition])

  const filteredNodes = useMemo(
    () =>
      nodesWithPosition.filter((node) => {
        const category = getNodeCategory(node.tabName)
        return categoryVisibility[category]
      }),
    [categoryVisibility, nodesWithPosition],
  )

  const renderedNodes = useMemo(
    () => applyRepulsion(filteredNodes, repulsionStrength),
    [filteredNodes, repulsionStrength],
  )

  const visibleNodeIds = useMemo(
    () => new Set(renderedNodes.map((node) => node.id)),
    [renderedNodes],
  )

  const filteredEdges = useMemo(
    () => graphModel.edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)),
    [graphModel.edges, visibleNodeIds],
  )

  const nodeById = useMemo(
    () => new Map(renderedNodes.map((node) => [node.id, node])),
    [renderedNodes],
  )

  const normalizedSearch = searchTerm.trim().toLowerCase()
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

  const connectedNodeIds = useMemo(
    () =>
      activeEntityId
        ? new Set(
            filteredEdges.flatMap((edge) =>
              edge.source === activeEntityId || edge.target === activeEntityId
                ? [edge.source, edge.target]
                : [],
            ),
          )
        : null,
    [activeEntityId, filteredEdges],
  )

  const useCanvasRenderer = renderedNodes.length >= CANVAS_NODE_THRESHOLD

  const getNodeRadius = useCallback(
    (nodeId: string, isActive: boolean) => {
      const degree = degreeByNodeId.get(nodeId) ?? 0
      const baseRadius = 7 + Math.min(9, Math.sqrt(degree) * 1.75)
      return isActive ? baseRadius + 4 : baseRadius
    },
    [degreeByNodeId],
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

  function getCanvasCoordinates(event: PointerEvent<HTMLCanvasElement> | MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) {
      return null
    }
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) {
      return null
    }
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT,
    }
  }

  function getClosestNodeId(position: { x: number; y: number }): string | null {
    let bestId: string | null = null
    let bestDistance = Number.POSITIVE_INFINITY

    for (const node of renderedNodes) {
      const radius = getNodeRadius(node.id, node.id === activeEntityId)
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

  const commitNodePosition = useCallback(
    (nodeId: string) => {
      const pos = nodeOverrides[nodeId]
      if (pos && onNodePositionChange) {
        onNodePositionChange(nodeId, pos.x, pos.y)
      }
    },
    [nodeOverrides, onNodePositionChange],
  )

  const handleNodeSelection = useCallback(
    (node: GraphNode) => {
      if (relationSourceId && relationSourceId !== node.id && onCreateRelation) {
        onCreateRelation(relationSourceId, node.id)
        setRelationSourceId(null)
        return
      }
      onSelectEntity(node.id, node.tabId)
    },
    [onCreateRelation, onSelectEntity, relationSourceId],
  )

  const resetLayout = useCallback(() => {
    setNodeOverrides({})
    setRelationSourceId(null)
    onResetLayout?.()
  }, [onResetLayout])

  useEffect(() => {
    if (!useCanvasRenderer) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    const root = document.documentElement
    const isDarkTheme = root.classList.contains('dark') || root.getAttribute('data-theme') === 'dark'

    context.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT)
    context.lineCap = 'round'
    context.lineJoin = 'round'

    for (const edge of filteredEdges) {
      const source = nodeById.get(edge.source)
      const target = nodeById.get(edge.target)
      if (!source || !target) {
        continue
      }

      const isRelated = !activeEntityId || edge.source === activeEntityId || edge.target === activeEntityId
      context.strokeStyle = isRelated ? 'rgba(125, 166, 255, 0.8)' : 'rgba(127, 135, 160, 0.28)'
      context.lineWidth = isRelated ? 2.1 : 1
      context.beginPath()
      context.moveTo(source.x, source.y)
      context.lineTo(target.x, target.y)
      context.stroke()
    }

    for (const node of renderedNodes) {
      const isActive = node.id === activeEntityId
      const isConnected = connectedNodeIds?.has(node.id) ?? true
      const isHighlighted = highlightedNodeId === node.id
      const dimmed = !isActive && !isConnected && Boolean(activeEntityId)
      const alpha = dimmed ? 0.22 : 1
      const category = getNodeCategory(node.tabName)
      const palette = getCategoryPalette(category, isDarkTheme)
      const radius = getNodeRadius(node.id, isActive)

      if (isActive || isConnected || isHighlighted) {
        context.save()
        context.globalAlpha = alpha * (isActive ? 0.26 : 0.16)
        context.fillStyle = palette.halo
        context.beginPath()
        context.arc(node.x, node.y, radius + (isActive ? 9 : 6), 0, Math.PI * 2)
        context.fill()
        context.restore()
      }

      context.save()
      context.globalAlpha = alpha
      context.fillStyle = palette.fill
      context.strokeStyle = isHighlighted ? 'rgba(0, 212, 238, 0.96)' : palette.stroke
      context.lineWidth = isActive || isHighlighted ? 2.5 : 1.35
      context.beginPath()
      context.arc(node.x, node.y, radius, 0, Math.PI * 2)
      context.fill()
      context.stroke()

      if (isActive || isHighlighted) {
        context.strokeStyle = 'rgba(0, 212, 238, 0.9)'
        context.lineWidth = 2
        context.beginPath()
        context.arc(node.x, node.y, radius + 4, 0, Math.PI * 2)
        context.stroke()
      }
      context.restore()

      context.save()
      context.globalAlpha = alpha
      const label = node.title.length > 18 ? `${node.title.slice(0, 18)}…` : node.title
      const textWidth = context.measureText(label).width
      const labelWidth = textWidth + 16
      const labelHeight = 20
      const labelX = node.x - labelWidth / 2
      const labelY = node.y + radius + 8

      context.fillStyle = isDarkTheme ? 'rgba(8, 17, 31, 0.78)' : 'rgba(255, 255, 255, 0.9)'
      context.strokeStyle = isDarkTheme ? 'rgba(148, 163, 184, 0.22)' : 'rgba(15, 23, 42, 0.1)'
      context.lineWidth = 1
      context.beginPath()
      context.roundRect(labelX, labelY, labelWidth, labelHeight, 8)
      context.fill()
      context.stroke()

      context.fillStyle = isDarkTheme ? 'rgba(226, 232, 255, 0.95)' : 'rgba(15, 23, 42, 0.92)'
      context.font = '12px Inter, sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'top'
      context.fillText(label, node.x, node.y + radius + 12)
      context.restore()
    }
  }, [
    activeEntityId,
    connectedNodeIds,
    filteredEdges,
    getNodeRadius,
    highlightedNodeId,
    nodeById,
    renderedNodes,
    useCanvasRenderer,
  ])

  return (
    <section className="panel surface-panel graph-panel">
      <div className="panel-header">
        <div>
          <h3>Mapa narrativo</h3>
          <p>Explora conexiones y arrastra nodos para reorganizar el mapa en tiempo real.</p>
        </div>
      </div>

      <div className="graph-canvas-shell">
        {ENABLE_INCREMENTAL_GRAPH_HUD && (
          <div className="graph-hud" aria-label="Controles del grafo">
            <div className="graph-hud-row graph-hud-filters">
              {availableCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={categoryVisibility[category] ? 'graph-hud-toggle active' : 'graph-hud-toggle'}
                  onClick={() => {
                    setCategoryVisibility((current) => ({
                      ...current,
                      [category]: !current[category],
                    }))
                  }}
                >
                  {GRAPH_CATEGORY_LABEL[category]}
                </button>
              ))}
            </div>

            <div className="graph-hud-row graph-hud-search-row">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar nodo..."
                aria-label="Buscar nodo"
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' || !highlightedNodeId) {
                    return
                  }
                  const node = nodeById.get(highlightedNodeId)
                  if (node) {
                    handleNodeSelection(node)
                  }
                }}
              />
              {searchTerm && (
                <button type="button" className="graph-hud-clear" onClick={() => setSearchTerm('')}>
                  Limpiar
                </button>
              )}
            </div>

            <label className="graph-hud-slider">
              <span>Repulsión</span>
              <input
                type="range"
                min={0}
                max={100}
                value={repulsionStrength}
                onChange={(event) => setRepulsionStrength(Number(event.target.value))}
                aria-label="Repulsión de nodos"
              />
              <small>{repulsionStrength}%</small>
            </label>
          </div>
        )}

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
              if (!position) {
                return
              }
              const nodeId = getClosestNodeId(position)
              if (!nodeId) {
                return
              }
              setDraggingNodeId(nodeId)
            }}
            onPointerMove={(event) => {
              if (!draggingNodeId) {
                return
              }
              const position = getCanvasCoordinates(event)
              if (!position) {
                return
              }
              setNodeOverrides((current) => ({
                ...current,
                [draggingNodeId]: {
                  x: clamp(position.x, 20, VIEW_WIDTH - 20),
                  y: clamp(position.y, 20, VIEW_HEIGHT - 20),
                },
              }))
            }}
            onPointerUp={(event) => {
              const position = getCanvasCoordinates(event)
              const selectedNodeId = position ? getClosestNodeId(position) : null

              if (draggingNodeId) {
                commitNodePosition(draggingNodeId)
              }

              if (selectedNodeId) {
                const selected = nodeById.get(selectedNodeId)
                if (selected) {
                  handleNodeSelection(selected)
                }
              }
              setDraggingNodeId(null)
            }}
            onPointerLeave={() => {
              if (draggingNodeId) {
                commitNodePosition(draggingNodeId)
              }
              setDraggingNodeId(null)
            }}
          />
        ) : (
          <svg
            className="graph-canvas"
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
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
                  x: clamp(position.x, 20, VIEW_WIDTH - 20),
                  y: clamp(position.y, 20, VIEW_HEIGHT - 20),
                },
              }))
            }}
            onPointerUp={() => {
              if (draggingNodeId) {
                commitNodePosition(draggingNodeId)
              }
              setDraggingNodeId(null)
            }}
            onPointerLeave={() => {
              if (draggingNodeId) {
                commitNodePosition(draggingNodeId)
              }
              setDraggingNodeId(null)
            }}
          >
            {filteredEdges.map((edge) => {
              const source = nodeById.get(edge.source)
              const target = nodeById.get(edge.target)
              if (!source || !target) {
                return null
              }
              const isRelated = !activeEntityId || edge.source === activeEntityId || edge.target === activeEntityId
              return (
                <line
                  key={`${edge.source}-${edge.target}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={isRelated ? 'var(--border-focus)' : 'var(--border-subtle)'}
                  strokeWidth={isRelated ? '2.2' : '1.1'}
                />
              )
            })}

            {renderedNodes.map((node) => {
              const isActive = node.id === activeEntityId
              const isConnected = connectedNodeIds?.has(node.id) ?? true
              const isHighlighted = highlightedNodeId === node.id
              const category = getNodeCategory(node.tabName)
              const palette = getCategoryPalette(category, true)
              const radius = getNodeRadius(node.id, isActive)

              return (
                <g
                  key={node.id}
                  className={isActive ? 'graph-node active' : isConnected ? 'graph-node related' : 'graph-node'}
                  opacity={isActive || isConnected || isHighlighted ? 1 : activeEntityId ? 0.22 : 1}
                  onClick={() => handleNodeSelection(node)}
                  onPointerDown={() => setDraggingNodeId(node.id)}
                >
                  {(isActive || isConnected || isHighlighted) && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={radius + (isActive ? 9 : 6)}
                      fill="none"
                      stroke={palette.halo}
                      strokeWidth={isActive ? '1.6' : '1.1'}
                      className="graph-node-halo"
                    />
                  )}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius}
                    className="graph-node-circle"
                    fill={palette.fill}
                    stroke={isHighlighted ? 'var(--brand-accent)' : palette.stroke}
                    strokeWidth={isActive || isHighlighted ? '2.4' : '1.3'}
                  />
                  {(isActive || isHighlighted) && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={radius + 4}
                      fill="none"
                      stroke="var(--brand-accent)"
                      strokeWidth="2"
                      className="graph-node-ring"
                    />
                  )}
                  {(() => {
                    const label = node.title.length > 18 ? `${node.title.slice(0, 18)}…` : node.title
                    const labelWidth = Math.max(70, label.length * 6.8 + 16)
                    return (
                      <g className="graph-node-label">
                        <rect x={node.x - labelWidth / 2} y={node.y + radius + 6} width={labelWidth} height={20} rx={8} />
                        <text className="graph-node-text" x={node.x} y={node.y + radius + 20} textAnchor="middle">
                          {label}
                        </text>
                      </g>
                    )
                  })()}
                </g>
              )
            })}
          </svg>
        )}

        <div className="graph-floating-toolbar" role="toolbar" aria-label="Acciones del mapa narrativo">
          <small>{renderedNodes.length} nodos</small>
          <button
            type="button"
            className={relationSourceId ? 'ghost-button compact-button active' : 'ghost-button compact-button'}
            onClick={() => setRelationSourceId((current) => (current ? null : activeEntityId ?? null))}
          >
            {relationSourceId ? '✕ Cancelar enlace' : '+ Crear enlace'}
          </button>
          <button type="button" className="ghost-button compact-button" onClick={resetLayout}>
            ↺ Restablecer layout
          </button>
        </div>
      </div>
    </section>
  )
})
