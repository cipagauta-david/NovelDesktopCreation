import { memo, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'

import { ENABLE_INCREMENTAL_GRAPH_HUD, GRAPH_RENDERER_KIND } from '../../data/constants'
import { useTheme } from '../../hooks/useTheme'
import type { CollectionTab, GraphModel, GraphNode } from '../../types/workspace'
import { hexToRgba, resolveCollectionColor } from '../../utils/collectionColors'
import { getGraphThemePalette } from './graph/palette'
import { resolveGraphRendererAdapter } from './graph/adapters'
import { D3PixiRenderer } from './graph/adapters/D3PixiRenderer'
import { GraphFloatingToolbar } from './graph/components/GraphFloatingToolbar'
import { GraphPanelHeader } from './graph/components/GraphPanelHeader'
import type { GraphViewSettings } from './graph/contracts'
import { GraphHud } from './graph/GraphHud'
import { radialRepulsionLayoutEngine } from './graph/layoutEngine'
import { useGraphViewModel } from './graph/viewModel'
import '../../styles/panels/GraphPanel.css';

const VIEW_WIDTH = 520
const VIEW_HEIGHT = 440
const VIEW_PADDING = 20
const CANVAS_NODE_THRESHOLD = 140

type GraphPanelProps = {
  graphModel: GraphModel
  collections: CollectionTab[]
  activeEntityId?: string
  onSelectEntity: (entityId: string, tabId: string) => void
  onNodePositionChange?: (entityId: string, x: number, y: number) => void
  onUpdateCollectionColor?: (collectionId: string, color: string) => void
  onCreateRelation?: (sourceEntityId: string, targetEntityId: string) => void
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export const GraphPanel = memo(function GraphPanel({
  graphModel,
  collections,
  activeEntityId,
  onSelectEntity,
  onNodePositionChange,
  onUpdateCollectionColor,
  onCreateRelation,
}: GraphPanelProps) {
  const { resolvedTheme } = useTheme()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const graphShellRef = useRef<HTMLDivElement | null>(null)

  const [nodeOverrides, setNodeOverrides] = useState<Record<string, { x: number; y: number }>>({})
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [relationSourceId, setRelationSourceId] = useState<string | null>(null)
  const [simulationPaused, setSimulationPaused] = useState(false)
  const [orbitAroundCenter, setOrbitAroundCenter] = useState(false)
  const [centerViewRequestId, setCenterViewRequestId] = useState(0)
  const [hudPosition, setHudPosition] = useState({ x: 0, y: 0 })
  const [graphViewport, setGraphViewport] = useState({ width: VIEW_WIDTH, height: VIEW_HEIGHT })
  const [viewSettings, setViewSettings] = useState<GraphViewSettings>({
    repulsionStrength: 78,
    gravityStrength: 38,
    linkWeightStrength: 34,
    linkAttractionStrength: 52,
    collectionCohesionStrength: 36,
    collectionBoundaryRepulsionStrength: 128,
    searchTerm: '',
    collectionVisibility: {},
  })
  const rendererAdapter = resolveGraphRendererAdapter(GRAPH_RENDERER_KIND)
  const rendererStatus = rendererAdapter.getStatus()
  const useD3PixiRenderer = rendererAdapter.kind === 'd3-pixi' && rendererStatus.ready
  const useSimulationRenderer = useD3PixiRenderer

  const positionedNodes = useMemo(
    () =>
      graphModel.nodes.map((node) => ({
        ...node,
        x: nodeOverrides[node.id]?.x ?? node.x,
        y: nodeOverrides[node.id]?.y ?? node.y,
      })),
    [graphModel.nodes, nodeOverrides],
  )

  const graphViewModel = useGraphViewModel({
    graphModel,
    collections,
    positionedNodes,
    settings: viewSettings,
    layoutEngine: radialRepulsionLayoutEngine,
    viewport: {
      width: graphViewport.width,
      height: graphViewport.height,
      padding: VIEW_PADDING,
    },
  })

  useEffect(() => {
    setViewSettings((current) => {
      const nextVisibility = { ...current.collectionVisibility }
      let changed = false

      for (const collection of collections) {
        if (nextVisibility[collection.id] === undefined) {
          nextVisibility[collection.id] = true
          changed = true
        }
      }

      for (const id of Object.keys(nextVisibility)) {
        if (!collections.some((collection) => collection.id === id)) {
          delete nextVisibility[id]
          changed = true
        }
      }

      if (!changed) {
        return current
      }

      return {
        ...current,
        collectionVisibility: nextVisibility,
      }
    })
  }, [collections])

  const connectedNodeIds = useMemo(
    () =>
      activeEntityId
        ? new Set(
            graphViewModel.filteredEdges.flatMap((edge) =>
              edge.source === activeEntityId || edge.target === activeEntityId ? [edge.source, edge.target] : [],
            ),
          )
        : null,
    [activeEntityId, graphViewModel.filteredEdges],
  )

  const useCanvasRenderer = !useSimulationRenderer && graphViewModel.renderedNodes.length >= CANVAS_NODE_THRESHOLD
  const activeRendererKind = useD3PixiRenderer ? 'd3-pixi' : useCanvasRenderer ? 'native-canvas' : 'native-svg'

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }

    console.info('[GraphPanel][renderer-debug]', {
      requestedRenderer: GRAPH_RENDERER_KIND,
      adapterKind: rendererAdapter.kind,
      adapterReady: rendererStatus.ready,
      adapterReason: rendererStatus.reason,
      activeRendererKind,
      nodes: graphViewModel.renderedNodes.length,
      edges: graphViewModel.filteredEdges.length,
    })
  }, [
    activeRendererKind,
    graphViewModel.filteredEdges.length,
    graphViewModel.renderedNodes.length,
    rendererAdapter.kind,
    rendererStatus.ready,
    rendererStatus.reason,
  ])

  const getNodeRadius = useCallback(
    (nodeId: string, isActive: boolean) => {
      const degree = graphViewModel.degreeByNodeId.get(nodeId) ?? 0
      const baseRadius = 7 + Math.min(9, Math.sqrt(degree) * 1.75)
      return isActive ? baseRadius + 4 : baseRadius
    },
    [graphViewModel.degreeByNodeId],
  )

  const getSvgCoordinates = useCallback((event: PointerEvent<SVGSVGElement>) => {
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
  }, [])

  const getCanvasCoordinates = useCallback((event: PointerEvent<HTMLCanvasElement> | MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) {
      return null
    }
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) {
      return null
    }
    return {
      x: ((event.clientX - rect.left) / rect.width) * graphViewport.width,
      y: ((event.clientY - rect.top) / rect.height) * graphViewport.height,
    }
  }, [graphViewport.height, graphViewport.width])

  const getClosestNodeId = useCallback((position: { x: number; y: number }) => {
    let bestId: string | null = null
    let bestDistance = Number.POSITIVE_INFINITY

    for (const node of graphViewModel.renderedNodes) {
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
  }, [activeEntityId, getNodeRadius, graphViewModel.renderedNodes])

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
  }, [])

  const centerGraphView = useCallback(() => {
    if (useD3PixiRenderer) {
      setCenterViewRequestId((current) => current + 1)
      return
    }
    resetLayout()
  }, [resetLayout, useD3PixiRenderer])

  const submitSearchSelection = useCallback(() => {
    if (!graphViewModel.highlightedNodeId) {
      return
    }
    const node = graphViewModel.nodeById.get(graphViewModel.highlightedNodeId)
    if (node) {
      handleNodeSelection(node)
    }
  }, [graphViewModel.highlightedNodeId, graphViewModel.nodeById, handleNodeSelection])

  useEffect(() => {
    const shell = graphShellRef.current
    if (!shell) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) {
        return
      }

      const nextWidth = Math.max(320, Math.floor(entry.contentRect.width))
      const nextHeight = Math.max(300, Math.floor(entry.contentRect.height))
      setGraphViewport((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight },
      )
    })

    observer.observe(shell)
    return () => {
      observer.disconnect()
    }
  }, [])

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
    const palette = getGraphThemePalette(isDarkTheme ? 'dark' : 'light')

    context.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT)
    context.lineCap = 'round'
    context.lineJoin = 'round'

    for (const edge of graphViewModel.filteredEdges) {
      const source = graphViewModel.nodeById.get(edge.source)
      const target = graphViewModel.nodeById.get(edge.target)
      if (!source || !target) {
        continue
      }

      const isRelated = !activeEntityId || edge.source === activeEntityId || edge.target === activeEntityId
      context.strokeStyle = isRelated ? hexToRgba(palette.edgeRelated, 1) : hexToRgba(palette.edgeMuted, 0.3)
      context.lineWidth = isRelated ? 2.1 : 1
      context.beginPath()
      context.moveTo(source.x, source.y)
      context.lineTo(target.x, target.y)
      context.stroke()
    }

    for (const node of graphViewModel.renderedNodes) {
      const isActive = node.id === activeEntityId
      const isConnected = connectedNodeIds?.has(node.id) ?? true
      const isHighlighted = graphViewModel.highlightedNodeId === node.id
      const dimmed = !isActive && !isConnected && Boolean(activeEntityId)
      const alpha = dimmed ? 0.22 : 1
      const collectionColor = resolveCollectionColor(node.tabId, node.tabColor)
      const radius = getNodeRadius(node.id, isActive)

      if (isActive || isConnected || isHighlighted) {
        context.save()
        context.globalAlpha = alpha * (isActive ? 0.26 : 0.16)
        context.fillStyle = hexToRgba(collectionColor, isDarkTheme ? 0.34 : 0.24)
        context.beginPath()
        context.arc(node.x, node.y, radius + (isActive ? 9 : 6), 0, Math.PI * 2)
        context.fill()
        context.restore()
      }

      context.save()
      context.globalAlpha = alpha
      context.fillStyle = isHighlighted ? hexToRgba(palette.nodeHighlight, 0.96) : hexToRgba(collectionColor, isDarkTheme ? 0.84 : 0.92)
      context.strokeStyle = isHighlighted ? hexToRgba(palette.nodeHighlight, 0.96) : hexToRgba(collectionColor, isDarkTheme ? 0.98 : 1)
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
    getNodeRadius,
    graphViewModel.filteredEdges,
    graphViewModel.highlightedNodeId,
    graphViewModel.nodeById,
    graphViewModel.renderedNodes,
    useCanvasRenderer,
  ])

  return (
    <section className="panel surface-panel graph-panel">
      <GraphPanelHeader rendererReady={rendererStatus.ready} rendererReason={rendererStatus.reason} />

      <div
        className="graph-canvas-shell"
        ref={graphShellRef}
        data-renderer-kind={activeRendererKind}
        data-renderer-adapter={rendererAdapter.kind}
      >
        {ENABLE_INCREMENTAL_GRAPH_HUD && (
          <GraphHud
            availableCollections={graphViewModel.availableCollections}
            availableCollectionCounts={graphViewModel.availableCollectionCounts}
            collectionVisibility={viewSettings.collectionVisibility}
            searchTerm={viewSettings.searchTerm}
            searchMatchCount={graphViewModel.searchMatchCount}
            repulsionStrength={viewSettings.repulsionStrength}
            gravityStrength={viewSettings.gravityStrength}
            linkWeightStrength={viewSettings.linkWeightStrength}
            linkAttractionStrength={viewSettings.linkAttractionStrength}
            collectionCohesionStrength={viewSettings.collectionCohesionStrength}
            collectionBoundaryRepulsionStrength={viewSettings.collectionBoundaryRepulsionStrength}
            simulationPaused={simulationPaused}
            position={hudPosition}
            disableSimulationToggle={!useSimulationRenderer}
            onToggleCollection={(collectionId: string) => {
              setViewSettings((current) => ({
                ...current,
                collectionVisibility: {
                  ...current.collectionVisibility,
                  [collectionId]: !current.collectionVisibility[collectionId],
                },
              }))
            }}
            onCollectionColorChange={(collectionId, color) => onUpdateCollectionColor?.(collectionId, color)}
            onSearchTermChange={(value) => setViewSettings((current) => ({ ...current, searchTerm: value }))}
            onClearSearch={() => setViewSettings((current) => ({ ...current, searchTerm: '' }))}
            onSubmitSearch={submitSearchSelection}
            onRepulsionStrengthChange={(value) =>
              setViewSettings((current) => ({
                ...current,
                repulsionStrength: value,
              }))
            }
            onGravityStrengthChange={(value) =>
              setViewSettings((current) => ({
                ...current,
                gravityStrength: value,
              }))
            }
            onLinkWeightStrengthChange={(value) =>
              setViewSettings((current) => ({
                ...current,
                linkWeightStrength: value,
              }))
            }
            onLinkAttractionStrengthChange={(value) =>
              setViewSettings((current) => ({
                ...current,
                linkAttractionStrength: value,
              }))
            }
            onCollectionCohesionStrengthChange={(value) =>
              setViewSettings((current) => ({
                ...current,
                collectionCohesionStrength: value,
              }))
            }
            onCollectionBoundaryRepulsionStrengthChange={(value) =>
              setViewSettings((current) => ({
                ...current,
                collectionBoundaryRepulsionStrength: value,
              }))
            }
            onCenterView={centerGraphView}
            onToggleSimulation={() => setSimulationPaused((current) => !current)}
            onPositionChange={(nextPosition) => {
              const maxX = Math.max(0, graphViewport.width - 360)
              const maxY = Math.max(0, graphViewport.height - 280)
              setHudPosition({
                x: clamp(nextPosition.x, 0, maxX),
                y: clamp(nextPosition.y, 0, maxY),
              })
            }}
          />
        )}

        {useD3PixiRenderer ? (
          <D3PixiRenderer
            themeMode={resolvedTheme}
            width={graphViewport.width}
            height={graphViewport.height}
            padding={VIEW_PADDING}
            nodes={graphViewModel.renderedNodes}
            edges={graphViewModel.filteredEdges}
            activeEntityId={activeEntityId}
            highlightedNodeId={graphViewModel.highlightedNodeId}
            repulsionStrength={viewSettings.repulsionStrength}
            gravityStrength={viewSettings.gravityStrength}
            linkWeightStrength={viewSettings.linkWeightStrength}
            linkAttractionStrength={viewSettings.linkAttractionStrength}
            collectionCohesionStrength={viewSettings.collectionCohesionStrength}
            collectionBoundaryRepulsionStrength={viewSettings.collectionBoundaryRepulsionStrength}
            simulationPaused={simulationPaused}
            centerViewRequestId={centerViewRequestId}
            orbitAroundCenter={orbitAroundCenter}
            degreeByNodeId={graphViewModel.degreeByNodeId}
            onNodeSelect={handleNodeSelection}
            onNodePositionChange={onNodePositionChange}
          />
        ) : useCanvasRenderer ? (
          <canvas
            ref={canvasRef}
            className="graph-canvas"
            width={graphViewport.width}
            height={graphViewport.height}
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
                  x: clamp(position.x, VIEW_PADDING, graphViewport.width - VIEW_PADDING),
                  y: clamp(position.y, VIEW_PADDING, graphViewport.height - VIEW_PADDING),
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
                const selected = graphViewModel.nodeById.get(selectedNodeId)
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
            viewBox={`0 0 ${graphViewport.width} ${graphViewport.height}`}
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
                  x: clamp(position.x, VIEW_PADDING, graphViewport.width - VIEW_PADDING),
                  y: clamp(position.y, VIEW_PADDING, graphViewport.height - VIEW_PADDING),
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
            {graphViewModel.filteredEdges.map((edge) => {
              const source = graphViewModel.nodeById.get(edge.source)
              const target = graphViewModel.nodeById.get(edge.target)
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

            {graphViewModel.renderedNodes.map((node) => {
              const isActive = node.id === activeEntityId
              const isConnected = connectedNodeIds?.has(node.id) ?? true
              const isHighlighted = graphViewModel.highlightedNodeId === node.id
              const collectionColor = resolveCollectionColor(node.tabId, node.tabColor)
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
                      stroke={hexToRgba(collectionColor, 0.44)}
                      strokeWidth={isActive ? '1.6' : '1.1'}
                      className="graph-node-halo"
                    />
                  )}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius}
                    className="graph-node-circle"
                    fill={isHighlighted ? 'var(--brand-accent)' : hexToRgba(collectionColor, 0.9)}
                    stroke={isHighlighted ? 'var(--brand-accent)' : hexToRgba(collectionColor, 1)}
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

        <GraphFloatingToolbar
          nodeCount={graphViewModel.renderedNodes.length}
          useD3PixiRenderer={useD3PixiRenderer}
          orbitAroundCenter={orbitAroundCenter}
          relationSourceId={relationSourceId}
          activeEntityId={activeEntityId}
          onToggleOrbit={() => setOrbitAroundCenter((current) => !current)}
          onToggleRelationMode={(nextSourceId) => setRelationSourceId(nextSourceId)}
        />
      </div>
    </section>
  )
})
