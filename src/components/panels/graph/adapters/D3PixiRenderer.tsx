import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force'
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js'

import type { GraphEdge, GraphNode } from '../../../../types/workspace'
import { getNodeCategory } from '../category'
import { getCategoryPalette } from '../palette'

declare global {
  interface Window {
    __NDC_GRAPH_DEBUG__?: {
      dumpNodes: () => void
      dumpCamera: () => void
    }
  }
}

type D3PixiRendererProps = {
  width: number
  height: number
  padding: number
  nodes: GraphNode[]
  edges: GraphEdge[]
  activeEntityId?: string
  highlightedNodeId?: string | null
  repulsionStrength: number
  gravityStrength: number
  linkWeightStrength: number
  simulationPaused: boolean
  centerViewRequestId: number
  degreeByNodeId: Map<string, number>
  onNodeSelect: (node: GraphNode) => void
  onNodePositionChange?: (entityId: string, x: number, y: number) => void
  onAutoPauseAfterCenter?: () => void
}

type SimNode = SimulationNodeDatum & {
  id: string
  title: string
  tabId: string
  tabName: string
  degree: number
  x: number
  y: number
  fx: number | null
  fy: number | null
}

type SimLink = SimulationLinkDatum<SimNode>

const REVEAL_INTERVAL_MS = 36
const NODE_FADE_IN_MS = 240

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function hexToNumber(value: string) {
  const normalized = value.trim().replace('#', '')
  if (normalized.length !== 6) {
    return 0x94a3b8
  }
  const parsed = Number.parseInt(normalized, 16)
  return Number.isFinite(parsed) ? parsed : 0x94a3b8
}

export function D3PixiRenderer({
  width,
  height,
  padding,
  nodes,
  edges,
  activeEntityId,
  highlightedNodeId,
  repulsionStrength,
  gravityStrength,
  linkWeightStrength,
  simulationPaused,
  centerViewRequestId,
  degreeByNodeId,
  onNodeSelect,
  onNodePositionChange,
  onAutoPauseAfterCenter,
}: D3PixiRendererProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const lastCenterRequestIdRef = useRef(0)
  const appRef = useRef<Application | null>(null)
  const edgeLayerRef = useRef<Graphics | null>(null)
  const nodeLayerRef = useRef<Graphics | null>(null)
  const labelLayerRef = useRef<Container | null>(null)
  const labelByNodeIdRef = useRef<Map<string, Text>>(new Map())
  const revealTimerRef = useRef<number | null>(null)
  const simulationRef = useRef<Simulation<SimNode, SimLink> | null>(null)
  const nodesRef = useRef<SimNode[]>([])
  const graphNodeMapRef = useRef<Map<string, GraphNode>>(new Map())
  const livePositionByIdRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const spawnTimeByIdRef = useRef<Map<string, number>>(new Map())
  const cameraRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 })
  const activeEntityIdRef = useRef<string | undefined>(activeEntityId)
  const highlightedNodeIdRef = useRef<string | null | undefined>(highlightedNodeId)
  const [revealedCount, setRevealedCount] = useState(0)
  const [viewport, setViewport] = useState({ width, height })
  const renderGraphRef = useRef<(() => void) | null>(null)

  const viewportWidth = viewport.width
  const viewportHeight = viewport.height

  const nodeIdsSignature = useMemo(() => nodes.map((node) => node.id).join('|'), [nodes])
  const revealBatchSize = useMemo(() => {
    if (nodes.length <= 120) {
      return 1
    }
    return Math.min(8, Math.max(2, Math.floor(nodes.length / 80)))
  }, [nodes.length])
  const revealOrder = useMemo(() => nodes.map((node) => node.id), [nodes])
  const centerX = viewportWidth / 2
  const centerY = viewportHeight / 2

  const fitCameraToPoints = useCallback(
    (points: Array<{ x: number; y: number }>) => {
      if (!points.length) {
        return
      }

      let minX = Number.POSITIVE_INFINITY
      let minY = Number.POSITIVE_INFINITY
      let maxX = Number.NEGATIVE_INFINITY
      let maxY = Number.NEGATIVE_INFINITY

      for (const point of points) {
        minX = Math.min(minX, point.x)
        minY = Math.min(minY, point.y)
        maxX = Math.max(maxX, point.x)
        maxY = Math.max(maxY, point.y)
      }

      const boundsWidth = Math.max(24, maxX - minX)
      const boundsHeight = Math.max(24, maxY - minY)
      const availableWidth = Math.max(20, viewportWidth - padding * 2)
      const availableHeight = Math.max(20, viewportHeight - padding * 2)
      const fitScale = clamp(
        Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight) * 0.92,
        0.35,
        3.2,
      )

      const centerWorldX = minX + boundsWidth / 2
      const centerWorldY = minY + boundsHeight / 2
      cameraRef.current = {
        scale: fitScale,
        offsetX: viewportWidth / 2 - centerWorldX * fitScale,
        offsetY: viewportHeight / 2 - centerWorldY * fitScale,
      }
    },
    [padding, viewportHeight, viewportWidth],
  )

  useEffect(() => {
    const points = nodes.map((node) => {
      const live = livePositionByIdRef.current.get(node.id)
      return { x: live?.x ?? node.x, y: live?.y ?? node.y }
    })
    fitCameraToPoints(points)
  }, [fitCameraToPoints, nodeIdsSignature, nodes])

  useEffect(() => {
    setRevealedCount(0)
    livePositionByIdRef.current.clear()
    spawnTimeByIdRef.current.clear()

    if (!nodes.length) {
      return
    }

    revealTimerRef.current = window.setInterval(() => {
      setRevealedCount((current) => {
        const next = Math.min(nodes.length, current + revealBatchSize)
        if (next >= nodes.length && revealTimerRef.current) {
          window.clearInterval(revealTimerRef.current)
          revealTimerRef.current = null
        }
        return next
      })
    }, REVEAL_INTERVAL_MS)

    return () => {
      if (revealTimerRef.current) {
        window.clearInterval(revealTimerRef.current)
        revealTimerRef.current = null
      }
    }
  }, [nodeIdsSignature, nodes.length, revealBatchSize])

  const revealedNodeIds = useMemo(() => {
    const ids = revealOrder.slice(0, revealedCount)
    return new Set(ids)
  }, [revealOrder, revealedCount])

  const visibleNodes = useMemo(
    () => nodes.filter((node) => revealedNodeIds.has(node.id)),
    [nodes, revealedNodeIds],
  )

  const visibleEdges = useMemo(
    () =>
      edges.filter(
        (edge) => revealedNodeIds.has(edge.source) && revealedNodeIds.has(edge.target),
      ),
    [edges, revealedNodeIds],
  )

  const getNodeRadius = useCallback((node: SimNode) => {
    const baseRadius = 7 + Math.min(9, Math.sqrt(node.degree) * 1.75)
    return node.id === activeEntityIdRef.current ? baseRadius + 4 : baseRadius
  }, [])

  const renderGraph = useCallback(() => {
    const edgeLayer = edgeLayerRef.current
    const nodeLayer = nodeLayerRef.current
    const labelLayer = labelLayerRef.current
    if (!edgeLayer || !nodeLayer || !labelLayer) {
      return
    }

    const isDarkTheme =
      document.documentElement.classList.contains('dark') ||
      document.documentElement.getAttribute('data-theme') === 'dark'
    const { scale, offsetX, offsetY } = cameraRef.current
    const toScreen = (x: number, y: number) => ({
      x: x * scale + offsetX,
      y: y * scale + offsetY,
    })
    const labelStyle = new TextStyle({
      fontFamily: 'Inter, sans-serif',
      fontSize: 11,
      fill: isDarkTheme ? 0xe2e8ff : 0x0f172a,
      stroke: {
        color: isDarkTheme ? 0x08111f : 0xffffff,
        width: 2,
      },
    })
    const nodeById = new Map(nodesRef.current.map((node) => [node.id, node]))

    const alphaForNode = (nodeId: string) => {
      const bornAt = spawnTimeByIdRef.current.get(nodeId)
      if (!bornAt) {
        return 1
      }
      return clamp((performance.now() - bornAt) / NODE_FADE_IN_MS, 0.12, 1)
    }

    edgeLayer.clear()
    for (const edge of visibleEdges) {
      const source = nodeById.get(edge.source)
      const target = nodeById.get(edge.target)
      if (!source || !target) {
        continue
      }
      const isRelated =
        !activeEntityIdRef.current ||
        edge.source === activeEntityIdRef.current ||
        edge.target === activeEntityIdRef.current

      const edgeAlpha = Math.min(alphaForNode(source.id), alphaForNode(target.id))
      const sourceScreen = toScreen(source.x, source.y)
      const targetScreen = toScreen(target.x, target.y)
      edgeLayer.moveTo(sourceScreen.x, sourceScreen.y)
      edgeLayer.lineTo(targetScreen.x, targetScreen.y)
      edgeLayer.stroke({
        width: (isRelated ? 2.1 : 1) * Math.max(0.7, scale),
        color: isRelated ? 0x7da6ff : 0x7f87a0,
        alpha: (isRelated ? 0.8 : 0.34) * edgeAlpha,
      })
    }

    nodeLayer.clear()
    for (const node of nodesRef.current) {
      const alpha = alphaForNode(node.id)
      const isActive = node.id === activeEntityIdRef.current
      const isHighlighted = node.id === highlightedNodeIdRef.current
      const category = getNodeCategory(node.tabName)
      const palette = getCategoryPalette(category, isDarkTheme)
      const radius = getNodeRadius(node) * clamp(scale, 0.65, 2.3)
      const fill = hexToNumber(palette.fill)
      const stroke = isHighlighted ? 0x00d4ee : hexToNumber(palette.stroke)
      const halo = hexToNumber(palette.halo)
      const screen = toScreen(node.x, node.y)

      if (isActive || isHighlighted) {
        nodeLayer.circle(screen.x, screen.y, radius + (isActive ? 9 : 6))
        nodeLayer.fill({ color: halo, alpha: (isActive ? 0.26 : 0.16) * alpha })
      }

      nodeLayer.circle(screen.x, screen.y, radius)
      nodeLayer.fill({ color: fill, alpha })
      nodeLayer.stroke({ color: stroke, alpha, width: isActive || isHighlighted ? 2.4 : 1.3 })

      if (isActive || isHighlighted) {
        nodeLayer.circle(screen.x, screen.y, radius + 4)
        nodeLayer.stroke({ color: 0x00d4ee, alpha: 0.9 * alpha, width: 2 })
      }

      const shouldShowLabel = scale >= 0.72 || isActive || isHighlighted
      const currentText = node.title.length > 20 ? `${node.title.slice(0, 20)}…` : node.title
      let label = labelByNodeIdRef.current.get(node.id)
      if (shouldShowLabel) {
        if (!label) {
          label = new Text({ text: currentText, style: labelStyle })
          label.anchor.set(0.5, 0)
          labelByNodeIdRef.current.set(node.id, label)
          labelLayer.addChild(label)
        } else {
          if (label.text !== currentText) {
            label.text = currentText
          }
          label.style = labelStyle
        }

        label.alpha = alpha
        label.visible = true
        label.x = screen.x
        label.y = screen.y + radius + 7
      } else if (label) {
        label.visible = false
      }
    }

    const visibleIdSet = new Set(nodesRef.current.map((node) => node.id))
    for (const [nodeId, label] of labelByNodeIdRef.current.entries()) {
      if (!visibleIdSet.has(nodeId)) {
        labelLayer.removeChild(label)
        label.destroy()
        labelByNodeIdRef.current.delete(nodeId)
      }
    }
  }, [getNodeRadius, visibleEdges])

  useEffect(() => {
    renderGraphRef.current = renderGraph
  }, [renderGraph])

  useEffect(() => {
    activeEntityIdRef.current = activeEntityId
    highlightedNodeIdRef.current = highlightedNodeId
    renderGraph()
  }, [activeEntityId, highlightedNodeId, renderGraph])

  useEffect(() => {
    let disposed = false

    async function setupPixi() {
      if (!hostRef.current || appRef.current) {
        return
      }

      const app = new Application()
      const hostWidth = Math.max(1, Math.floor(hostRef.current.clientWidth || width))
      const hostHeight = Math.max(1, Math.floor(hostRef.current.clientHeight || height))
      await app.init({
        width: hostWidth,
        height: hostHeight,
        antialias: true,
        backgroundAlpha: 0,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      })

      setViewport({ width: hostWidth, height: hostHeight })

      if (disposed) {
        app.destroy(true)
        return
      }

      app.canvas.className = 'graph-pixi-canvas'
      app.canvas.setAttribute('role', 'img')
      app.canvas.setAttribute('aria-label', 'Mapa narrativo del proyecto')
      app.canvas.style.touchAction = 'none'
      hostRef.current.appendChild(app.canvas)

      const edgeLayer = new Graphics()
      const nodeLayer = new Graphics()
      const labelLayer = new Container()
      app.stage.addChild(edgeLayer)
      app.stage.addChild(nodeLayer)
      app.stage.addChild(labelLayer)

      appRef.current = app
      edgeLayerRef.current = edgeLayer
      nodeLayerRef.current = nodeLayer
      labelLayerRef.current = labelLayer

      renderGraphRef.current?.()
    }

    setupPixi()

    return () => {
      disposed = true
      simulationRef.current?.stop()
      simulationRef.current = null
      edgeLayerRef.current?.destroy()
      edgeLayerRef.current = null
      nodeLayerRef.current?.destroy()
      nodeLayerRef.current = null
      for (const label of labelByNodeIdRef.current.values()) {
        label.destroy()
      }
      labelByNodeIdRef.current.clear()
      labelLayerRef.current?.destroy({ children: true })
      labelLayerRef.current = null
      appRef.current?.destroy(true, { children: true })
      appRef.current = null
    }
  }, [height, width])

  useEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) {
        return
      }
      const nextWidth = Math.max(1, Math.floor(entry.contentRect.width))
      const nextHeight = Math.max(1, Math.floor(entry.contentRect.height))
      setViewport((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight },
      )
    })
    observer.observe(host)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    appRef.current?.renderer.resize(viewportWidth, viewportHeight)
    renderGraph()
  }, [renderGraph, viewportHeight, viewportWidth])

  useEffect(() => {
    window.__NDC_GRAPH_DEBUG__ = {
      dumpNodes: () => {
        const snapshot = nodesRef.current.map((node) => ({
          id: node.id,
          title: node.title,
          x: Number(node.x.toFixed(2)),
          y: Number(node.y.toFixed(2)),
          degree: node.degree,
        }))
        console.table(snapshot)
      },
      dumpCamera: () => {
        const { scale, offsetX, offsetY } = cameraRef.current
        console.log('[GraphCamera]', {
          scale: Number(scale.toFixed(3)),
          offsetX: Number(offsetX.toFixed(2)),
          offsetY: Number(offsetY.toFixed(2)),
          revealedCount,
          totalNodes: nodes.length,
        })
      },
    }

    return () => {
      delete window.__NDC_GRAPH_DEBUG__
    }
  }, [nodes.length, revealedCount])

  useEffect(() => {
    const canvas = appRef.current?.canvas
    if (!canvas) {
      return
    }
    canvas.style.cursor = 'grab'

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) {
        return
      }

      const screenX = ((event.clientX - rect.left) / rect.width) * viewportWidth
      const screenY = ((event.clientY - rect.top) / rect.height) * viewportHeight

      const camera = cameraRef.current
      const worldX = (screenX - camera.offsetX) / camera.scale
      const worldY = (screenY - camera.offsetY) / camera.scale

      const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9
      const nextScale = clamp(camera.scale * zoomFactor, 0.35, 3.2)

      camera.scale = nextScale
      camera.offsetX = screenX - worldX * nextScale
      camera.offsetY = screenY - worldY * nextScale
      renderGraph()
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [renderGraph, viewportHeight, viewportWidth])

  const graphNodeById = useMemo(() => new Map(visibleNodes.map((node) => [node.id, node])), [visibleNodes])

  useEffect(() => {
    graphNodeMapRef.current = graphNodeById
  }, [graphNodeById])

  useEffect(() => {
    const linkDistance = clamp(120 - linkWeightStrength * 0.9, 26, 140)
    const linkStrength = 0.05 + (linkWeightStrength / 100) * 0.75
    const chargeStrength = -(30 + repulsionStrength * 9.5)
    const gravityFactor = 0.006 + (gravityStrength / 100) * 0.08

    const simulationNodes: SimNode[] = visibleNodes.map((node, index) => {
      const saved = livePositionByIdRef.current.get(node.id)
      if (!spawnTimeByIdRef.current.has(node.id)) {
        spawnTimeByIdRef.current.set(node.id, performance.now())
      }

      if (!saved) {
        const jitterAngle = ((index + 1) * Math.PI * 2) / Math.max(visibleNodes.length, 1)
        const jitterRadius = 4 + (index % 7) * 1.1
        const startX = centerX + Math.cos(jitterAngle) * jitterRadius
        const startY = centerY + Math.sin(jitterAngle) * jitterRadius
        const point = { x: startX, y: startY }
        livePositionByIdRef.current.set(node.id, point)
      }

      const position = livePositionByIdRef.current.get(node.id) ?? { x: centerX, y: centerY }
      return {
        id: node.id,
        title: node.title,
        tabId: node.tabId,
        tabName: node.tabName,
        degree: degreeByNodeId.get(node.id) ?? 0,
        x: position.x,
        y: position.y,
        fx: null,
        fy: null,
      }
    })

    const simulationLinks: SimLink[] = visibleEdges.map((edge) => ({
      source: edge.source,
      target: edge.target,
    }))

    nodesRef.current = simulationNodes

    simulationRef.current?.stop()
    const simulation = forceSimulation<SimNode>(simulationNodes)
      .force('charge', forceManyBody<SimNode>().strength(chargeStrength))
      .force('link', forceLink<SimNode, SimLink>(simulationLinks).id((node) => node.id).distance(linkDistance).strength(linkStrength))
      .force('x', forceX<SimNode>(viewportWidth / 2).strength(gravityFactor))
      .force('y', forceY<SimNode>(viewportHeight / 2).strength(gravityFactor))
      .alphaDecay(0.05)
      .velocityDecay(0.24)
      .on('tick', () => {
        for (const node of simulationNodes) {
          node.x = clamp(node.x, padding, viewportWidth - padding)
          node.y = clamp(node.y, padding, viewportHeight - padding)
          livePositionByIdRef.current.set(node.id, { x: node.x, y: node.y })
        }
        renderGraph()
      })

    simulationRef.current = simulation

    if (simulationPaused) {
      simulation.stop()
    } else {
      simulation.alpha(0.9).restart()
    }

    renderGraph()

    return () => {
      simulation.stop()
    }
  }, [
    degreeByNodeId,
    centerX,
    centerY,
    gravityStrength,
    viewportHeight,
    linkWeightStrength,
    visibleEdges,
    visibleNodes,
    padding,
    renderGraph,
    repulsionStrength,
    simulationPaused,
    viewportWidth,
  ])

  useEffect(() => {
    const simulation = simulationRef.current
    if (!simulation) {
      return
    }

    if (simulationPaused) {
      simulation.stop()
      renderGraph()
      return
    }

    simulation.alpha(0.42).restart()
  }, [renderGraph, simulationPaused])

  useEffect(() => {
    if (!centerViewRequestId || centerViewRequestId === lastCenterRequestIdRef.current) {
      return
    }
    lastCenterRequestIdRef.current = centerViewRequestId

    setRevealedCount(nodes.length)
    if (revealTimerRef.current) {
      window.clearInterval(revealTimerRef.current)
      revealTimerRef.current = null
    }

    const localNodes = nodes.map((node) => {
      const live = livePositionByIdRef.current.get(node.id)
      return {
        x: live?.x ?? node.x,
        y: live?.y ?? node.y,
      }
    })
    if (!localNodes.length) {
      return
    }

    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    for (const node of localNodes) {
      minX = Math.min(minX, node.x)
      minY = Math.min(minY, node.y)
      maxX = Math.max(maxX, node.x)
      maxY = Math.max(maxY, node.y)
    }

    fitCameraToPoints(localNodes)

    renderGraph()

    simulationRef.current?.stop()
    onAutoPauseAfterCenter?.()
  }, [centerViewRequestId, fitCameraToPoints, nodes, onAutoPauseAfterCenter, renderGraph])

  useEffect(() => {
    const canvas = appRef.current?.canvas
    if (!canvas) {
      return
    }

    let draggingNode: SimNode | null = null
    let isPanning = false
    let lastPointer = { x: 0, y: 0 }
    let hasMoved = false

    const getCanvasCoordinates = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) {
        return null
      }
      return {
        x: ((event.clientX - rect.left) / rect.width) * viewportWidth,
        y: ((event.clientY - rect.top) / rect.height) * viewportHeight,
      }
    }

    const toWorldCoordinates = (point: { x: number; y: number }) => {
      const camera = cameraRef.current
      return {
        x: (point.x - camera.offsetX) / camera.scale,
        y: (point.y - camera.offsetY) / camera.scale,
      }
    }

    const getClosestNode = (point: { x: number; y: number }) => {
      const simulation = simulationRef.current
      const nearest = simulation?.find(point.x, point.y, 24)
      if (nearest) {
        return nearest as SimNode
      }

      let best: SimNode | null = null
      let bestDistance = Number.POSITIVE_INFINITY
      for (const node of nodesRef.current) {
        const radius = getNodeRadius(node)
        const dx = node.x - point.x
        const dy = node.y - point.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance <= radius + 8 && distance < bestDistance) {
          best = node
          bestDistance = distance
        }
      }
      return best
    }

    const handlePointerDown = (event: PointerEvent) => {
      const screenPoint = getCanvasCoordinates(event)
      if (!screenPoint) {
        return
      }

      const worldPoint = toWorldCoordinates(screenPoint)
      const node = getClosestNode(worldPoint)
      if (!node) {
        isPanning = true
        lastPointer = screenPoint
        canvas.style.cursor = 'grabbing'
        canvas.setPointerCapture(event.pointerId)
        return
      }

      hasMoved = false
      draggingNode = node
      draggingNode.fx = draggingNode.x
      draggingNode.fy = draggingNode.y
      canvas.style.cursor = 'grabbing'
      canvas.setPointerCapture(event.pointerId)
    }

    const handlePointerMove = (event: PointerEvent) => {
      const screenPoint = getCanvasCoordinates(event)
      if (!screenPoint) {
        return
      }

      if (isPanning) {
        const dx = screenPoint.x - lastPointer.x
        const dy = screenPoint.y - lastPointer.y
        cameraRef.current.offsetX += dx
        cameraRef.current.offsetY += dy
        lastPointer = screenPoint
        renderGraph()
        return
      }

      if (!draggingNode) {
        return
      }
      const point = toWorldCoordinates(screenPoint)

      hasMoved = true
      draggingNode.fx = clamp(point.x, padding, viewportWidth - padding)
      draggingNode.fy = clamp(point.y, padding, viewportHeight - padding)

      const simulation = simulationRef.current
      if (simulation && !simulationPaused) {
        simulation.alphaTarget(0.18).restart()
      }
      renderGraph()
    }

    const handlePointerUp = (event: PointerEvent) => {
      if (isPanning) {
        isPanning = false
        canvas.style.cursor = 'grab'
        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId)
        }
        return
      }

      if (!draggingNode) {
        return
      }

      draggingNode.x = clamp(draggingNode.fx ?? draggingNode.x, padding, viewportWidth - padding)
      draggingNode.y = clamp(draggingNode.fy ?? draggingNode.y, padding, viewportHeight - padding)
      livePositionByIdRef.current.set(draggingNode.id, { x: draggingNode.x, y: draggingNode.y })
      draggingNode.fx = null
      draggingNode.fy = null

      if (onNodePositionChange) {
        onNodePositionChange(draggingNode.id, draggingNode.x, draggingNode.y)
      }

      if (!hasMoved) {
        const selected = graphNodeMapRef.current.get(draggingNode.id)
        if (selected) {
          onNodeSelect(selected)
        }
      }

      const simulation = simulationRef.current
      if (simulation && !simulationPaused) {
        simulation.alphaTarget(0)
      }

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }
      canvas.style.cursor = 'grab'
      draggingNode = null
      renderGraph()
    }

    const finishInteraction = () => {
      if (isPanning) {
        isPanning = false
        canvas.style.cursor = 'grab'
      }

      if (!draggingNode) {
        return
      }

      draggingNode.x = clamp(draggingNode.fx ?? draggingNode.x, padding, viewportWidth - padding)
      draggingNode.y = clamp(draggingNode.fy ?? draggingNode.y, padding, viewportHeight - padding)
      livePositionByIdRef.current.set(draggingNode.id, { x: draggingNode.x, y: draggingNode.y })
      draggingNode.fx = null
      draggingNode.fy = null

      if (onNodePositionChange) {
        onNodePositionChange(draggingNode.id, draggingNode.x, draggingNode.y)
      }

      const simulation = simulationRef.current
      if (simulation && !simulationPaused) {
        simulation.alphaTarget(0)
      }

      draggingNode = null
      canvas.style.cursor = 'grab'
      renderGraph()
    }

    const handlePointerLeave = () => {
      finishInteraction()
    }

    const handlePointerCancel = () => {
      finishInteraction()
    }

    const handleLostPointerCapture = () => {
      finishInteraction()
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointerleave', handlePointerLeave)
    canvas.addEventListener('pointercancel', handlePointerCancel)
    canvas.addEventListener('lostpointercapture', handleLostPointerCapture)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointerleave', handlePointerLeave)
      canvas.removeEventListener('pointercancel', handlePointerCancel)
      canvas.removeEventListener('lostpointercapture', handleLostPointerCapture)
    }
  }, [getNodeRadius, onNodePositionChange, onNodeSelect, padding, renderGraph, simulationPaused, viewportHeight, viewportWidth])

  return <div ref={hostRef} className="graph-canvas graph-pixi" />
}
