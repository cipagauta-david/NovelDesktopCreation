import { useEffect, useMemo, useRef, useState } from 'react'
import { hierarchy, tree } from 'd3-hierarchy'

import { hexToRgba, resolveCollectionColor } from '../../../../utils/collectionColors'
import { getGraphThemePalette } from '../palette'
import { createDefaultCamera, fitCameraToPoints, toScreen } from './d3Camera'
import { useD3CanvasInteractions } from './d3CanvasInteractions'
import type { D3PixiRendererProps } from './rendererProps'

interface TreeNode {
  id: string
  title: string
  ref: D3PixiRendererProps['nodes'][number]
  degree: number
  children: TreeNode[]
  parent?: TreeNode
}

const TAU = Math.PI * 2

function normalizeAngle(angle: number): number {
  return ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI
}

function buildLabelLines(text: string, maxCharsPerLine = 18, maxLines = 2): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ['']

  const lines: string[] = []
  let wordIndex = 0
  let hardCutOccurred = false

  while (wordIndex < words.length && lines.length < maxLines) {
    let line = ''

    while (wordIndex < words.length) {
      const word = words[wordIndex]
      const candidate = line ? `${line} ${word}` : word

      if (candidate.length <= maxCharsPerLine) {
        line = candidate
        wordIndex += 1
        continue
      }

      if (!line) {
        line = word.slice(0, maxCharsPerLine)
        if (word.length > maxCharsPerLine) hardCutOccurred = true
        wordIndex += 1
      }

      break
    }

    if (!line) break
    lines.push(line)
  }

  const hasOverflow = wordIndex < words.length || hardCutOccurred
  if (hasOverflow) {
    const lastLineIndex = Math.min(lines.length, maxLines) - 1
    const lastLine = lines[lastLineIndex] || ''
    lines[lastLineIndex] = lastLine.length >= maxCharsPerLine
      ? `${lastLine.slice(0, Math.max(0, maxCharsPerLine - 1))}…`
      : `${lastLine}…`
  }

  return lines.slice(0, maxLines)
}

export function D3PixiRenderer({
  themeMode,
  width,
  height,
  padding,
  nodes,
  edges,
  activeEntityId,
  highlightedNodeId,
  simulationPaused,
  centerViewRequestId,
  orbitAroundCenter,
  degreeByNodeId,
  onNodeSelect,
  // Mapping panel forces to Radial Engine
  repulsionStrength, // Amplitud Angular (Separación)
  gravityStrength, // Espaciado de Anillos (Gravedad)
  linkWeightStrength, // Grosor 
  collectionBoundaryRepulsionStrength, // Corte de profundidad (Depth limit)
  textFontSize, // Tamaño de fuente constante
}: D3PixiRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawRef = useRef<() => void>(() => undefined)
  const livePositionRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const cameraRef = useRef(createDefaultCamera())
  const lastCenterRequestRef = useRef(0)

  const orbitFrameRef = useRef<number | null>(null)
  const orbitAngleRef = useRef(0)
  const orbitLastTimestampRef = useRef(0)

  const [internalRootId, setInternalRootId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const focusEntityId = internalRootId || activeEntityId

  useEffect(() => {
    if (activeEntityId) setInternalRootId(activeEntityId)
  }, [activeEntityId])

  useEffect(() => {
    const validIds = new Set(nodes.map(node => node.id))
    for (const nodeId of Array.from(livePositionRef.current.keys())) {
      if (!validIds.has(nodeId)) {
        livePositionRef.current.delete(nodeId)
      }
    }
  }, [nodes])

  // Fase 2: Animation state definitions
  const prevLayoutStateRef = useRef<Map<string, { angle: number; radius: number }>>(new Map())
  const targetLayoutStateRef = useRef<Map<string, { angle: number; radius: number, depth: number }>>(new Map())
  const animationProgressRef = useRef<number>(1)
  const reRootAnimFrameRef = useRef<number | null>(null)

  const interactableNodesMapperRef = useRef<Map<string, { id: string, title: string, ref: D3PixiRendererProps['nodes'][number], x: number, y: number, degree: number }>>(new Map())

  const interactableNodes = useMemo(() => {
    const list = nodes.map(n => ({
      id: n.id,
      title: n.title,
      ref: n,
      degree: degreeByNodeId.get(n.id) ?? 0,
      x: width / 2,
      y: height / 2,
    }))
    interactableNodesMapperRef.current.clear()
    list.forEach(item => interactableNodesMapperRef.current.set(item.id, item))
    return list
  }, [nodes, degreeByNodeId, width, height])

  const rootNode = useMemo(() => {
    if (!nodes.length) return null

    // Spanning Tree logic from Step 1
    const treeNodesMap = new Map<string, TreeNode>()
    nodes.forEach(n => {
      treeNodesMap.set(n.id, {
        id: n.id,
        title: n.title,
        ref: n,
        degree: degreeByNodeId.get(n.id) ?? 0,
        children: []
      })
    })

    let rootId = focusEntityId
    if (!rootId || !treeNodesMap.has(rootId)) {
      rootId = nodes.reduce((a, b) => (degreeByNodeId.get(a.id) ?? 0) > (degreeByNodeId.get(b.id) ?? 0) ? a : b).id
    }

    const actualRoot = treeNodesMap.get(rootId)!

    const visited = new Set<string>()
    visited.add(rootId)
    const queue = [rootId]

    const adj = new Map<string, string[]>()
    edges.forEach(e => {
      if (!adj.has(e.source)) adj.set(e.source, [])
      if (!adj.has(e.target)) adj.set(e.target, [])
      adj.get(e.source)!.push(e.target)
      adj.get(e.target)!.push(e.source)
    })

    while (queue.length > 0) {
      const currentId = queue.shift()!
      const current = treeNodesMap.get(currentId)!
      const neighbors = adj.get(currentId) || []

      for (const nxt of neighbors) {
        if (!visited.has(nxt)) {
          visited.add(nxt)
          const child = treeNodesMap.get(nxt)!
          current.children.push(child)
          child.parent = current
          queue.push(nxt)
        }
      }
    }

    const rootIsIsolated = (adj.get(rootId)?.length ?? 0) === 0
    if (rootIsIsolated) {
      const rootTabId = actualRoot.ref.tabId
      const sameCollectionSeeds = nodes
        .filter(n => n.id !== rootId && n.tabId === rootTabId)
        .map(n => n.id)
        .filter(id => !visited.has(id))

      for (const seedId of sameCollectionSeeds) {
        const seed = treeNodesMap.get(seedId)!
        actualRoot.children.push(seed)
        seed.parent = actualRoot
        visited.add(seedId)
      }

      // Expand level by level. Nodes are claimed from a shared available pool;
      // when a parent claims a child, later parents cannot claim it.
      const firstRingParents = sameCollectionSeeds.map(id => treeNodesMap.get(id)!).filter(Boolean)
      let currentRingParents = firstRingParents

      while (currentRingParents.length > 0) {
        const nextRingParents: TreeNode[] = []

        for (const parent of currentRingParents) {
          const neighbors = adj.get(parent.id) || []
          for (const childId of neighbors) {
            if (visited.has(childId)) continue
            const child = treeNodesMap.get(childId)
            if (!child) continue

            parent.children.push(child)
            child.parent = parent
            visited.add(childId)
            nextRingParents.push(child)
          }
        }

        currentRingParents = nextRingParents
      }

      // Last resort for totally disconnected leftovers: distribute under ring 1.
      const fallbackParents = firstRingParents

      let roundRobinIndex = 0
      for (const n of nodes) {
        if (visited.has(n.id)) continue

        const unv = treeNodesMap.get(n.id)!
        const parent = fallbackParents.length
          ? fallbackParents[roundRobinIndex % fallbackParents.length]
          : actualRoot

        parent.children.push(unv)
        unv.parent = parent
        visited.add(n.id)
        roundRobinIndex += 1
      }
    } else {
      for (const n of nodes) {
        if (!visited.has(n.id)) {
          const unv = treeNodesMap.get(n.id)!
          actualRoot.children.push(unv)
          unv.parent = actualRoot
          visited.add(n.id)
        }
      }
    }

    return actualRoot
  }, [nodes, edges, focusEntityId, degreeByNodeId])

  const treeData = useMemo(() => {
    if (!rootNode) return null
    const rootHierarchy = hierarchy(rootNode)

    rootHierarchy.sort((a, b) => a.data.ref.tabId.localeCompare(b.data.ref.tabId))

    // Fase 4: "Espaciado de Anillos"
    const radiusMultiplier = (gravityStrength / 100) + 0.5
    const computedMaxRadius = Math.max(10, Math.min(width, height) / 2 - padding - 60) * radiusMultiplier

    const treeLayout = tree<TreeNode>()
      .size([2 * Math.PI, computedMaxRadius])
      .separation((a, b) => {
        // Fase 4: "Amplitud Angular" (default 78 makes it ~2x)
        const dist = a.parent === b.parent ? 1 : (1.35 + repulsionStrength / 100)
        return dist / (a.depth || 1)
      })

    treeLayout(rootHierarchy)
    return rootHierarchy
  }, [rootNode, width, height, padding,  repulsionStrength, gravityStrength])

  const scheduleRender = () => {
    requestAnimationFrame(() => {
      drawRef.current()
    })
  }

  // Fase 2: Control the fluid animation transition
  useEffect(() => {
    if (!treeData) return

    // Build prev states from currently rendered positions when available.
    // This avoids jumps/tangled links when root changes quickly.
    const prev = new Map<string, { angle: number; radius: number }>()
    const cx = width / 2
    const cy = height / 2
    const currentOrbit = orbitAngleRef.current

    treeData.each(node => {
      const nodeId = node.data.id
      const live = livePositionRef.current.get(nodeId)
      if (live) {
        const dx = live.x - cx
        const dy = live.y - cy
        prev.set(nodeId, {
          angle: normalizeAngle(Math.atan2(dy, dx) - currentOrbit),
          radius: Math.hypot(dx, dy),
        })
        return
      }

      const priorTarget = targetLayoutStateRef.current.get(nodeId)
      if (priorTarget) {
        prev.set(nodeId, { angle: priorTarget.angle, radius: priorTarget.radius })
        return
      }

      prev.set(nodeId, { angle: (node.x ?? 0) - Math.PI / 2, radius: node.y ?? 0 })
    })
    prevLayoutStateRef.current = prev

    const next = new Map<string, { angle: number; radius: number, depth: number }>()
    treeData.each(node => {
      next.set(node.data.id, { angle: (node.x ?? 0) - Math.PI / 2, radius: (node.y ?? 0), depth: (node.depth ?? 0) })
    })
    targetLayoutStateRef.current = next

    animationProgressRef.current = 0
    let lastTime = performance.now()

    const animateTransition = (time: number) => {
      const delta = Math.max(0, time - lastTime)
      lastTime = time
      // Approximately 600ms long transition
      animationProgressRef.current += delta / 600

      if (animationProgressRef.current >= 1) {
        animationProgressRef.current = 1
        scheduleRender()
        reRootAnimFrameRef.current = null
        return
      }

      scheduleRender()
      reRootAnimFrameRef.current = requestAnimationFrame(animateTransition)
    }

    if (reRootAnimFrameRef.current !== null) cancelAnimationFrame(reRootAnimFrameRef.current)
    reRootAnimFrameRef.current = requestAnimationFrame(animateTransition)

    return () => {
      if (reRootAnimFrameRef.current !== null) cancelAnimationFrame(reRootAnimFrameRef.current)
    }
  }, [treeData])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = Math.max(1, Math.floor(width))
    canvas.height = Math.max(1, Math.floor(height))
    const context = canvas.getContext('2d')
    if (!context) return

    // Corte de profundidad max defaults to 10
    const depthCutOff = Math.max(1, Math.round(collectionBoundaryRepulsionStrength / 10))

    const draw = () => {
      context.clearRect(0, 0, width, height)
      if (!treeData) return

      context.lineCap = 'round'
      context.lineJoin = 'round'
      const isDarkTheme = themeMode === 'dark'
      const palette = getGraphThemePalette(themeMode)
      const camera = cameraRef.current

      const cx = width / 2
      const cy = height / 2

      const centerScreen = toScreen(camera, cx, cy)
      context.save()
      context.strokeStyle = hexToRgba(palette.centerGuide, 0.9)
      context.lineWidth = 1.6
      context.setLineDash([4, 3])
      context.beginPath()
      context.arc(centerScreen.x, centerScreen.y, 10, 0, Math.PI * 2)
      context.stroke()
      context.restore()

      const nodeLayoutData = new Map<string, { x: number, y: number, angle: number, radius: number }>()
      const nodeDepthById = new Map<string, number>()
      const parentIdByNodeId = new Map<string, string | null>()
      const currentOrbit = orbitAngleRef.current

      const animT = Math.min(1, animationProgressRef.current)
      // Ease out cubic logic 
      const easeT = 1 - Math.pow(1 - animT, 3)

      treeData.each(node => {
        if ((node.depth ?? 0) > depthCutOff) return

        const target = targetLayoutStateRef.current.get(node.data.id)!
        const prev = prevLayoutStateRef.current.get(node.data.id) ?? target

        // Fase 2: Zero-crossing angular interpolation avoiding 180 backtrack
        let diff = target.angle - prev.angle
        diff = ((diff + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI

        const interpAngle = prev.angle + diff * easeT
        const interpRadius = prev.radius + (target.radius - prev.radius) * easeT

        const angle = interpAngle + currentOrbit

        const worldX = cx + interpRadius * Math.cos(angle)
        const worldY = cy + interpRadius * Math.sin(angle)

        nodeLayoutData.set(node.data.id, { x: worldX, y: worldY, angle, radius: interpRadius })
        nodeDepthById.set(node.data.id, node.depth ?? 0)
        parentIdByNodeId.set(node.data.id, node.parent?.data.id ?? null)
        livePositionRef.current.set(node.data.id, { x: worldX, y: worldY })

        const interactable = interactableNodesMapperRef.current.get(node.data.id)
        if (interactable) {
          interactable.x = worldX
          interactable.y = worldY
        }
      })

      // Fase 4: Tensión de Curva (Bezier Offset)
      const curveTension = 0

      // Draw only real graph edges. Tree links include synthetic connections used
      // for layouting disconnected components and should not be shown as relations.
      edges.forEach(edge => {
        const sourceDepth = nodeDepthById.get(edge.source)
        const targetDepth = nodeDepthById.get(edge.target)
        if (typeof sourceDepth !== 'number' || typeof targetDepth !== 'number') return
        if (sourceDepth > depthCutOff || targetDepth > depthCutOff) return

        // Ring constraints:
        // - No lateral links on the same ring.
        // - Inward links are allowed only to direct parent.
        // This guarantees: many outward children, only one inward parent.
        if (sourceDepth === targetDepth) return

        const sourceParentId = parentIdByNodeId.get(edge.source) ?? null
        const targetParentId = parentIdByNodeId.get(edge.target) ?? null

        const sourceAllows = targetDepth > sourceDepth || sourceParentId === edge.target
        const targetAllows = sourceDepth > targetDepth || targetParentId === edge.source
        if (!sourceAllows || !targetAllows) return

        const sourceLayout = nodeLayoutData.get(edge.source)
        const targetLayout = nodeLayoutData.get(edge.target)
        if (!sourceLayout || !targetLayout) return

        const sourceScreen = toScreen(camera, sourceLayout.x, sourceLayout.y)
        const targetScreen = toScreen(camera, targetLayout.x, targetLayout.y)

        const isRelated = !focusEntityId || edge.source === focusEntityId || edge.target === focusEntityId

        context.strokeStyle = isRelated
          ? hexToRgba(palette.edgeRelated, 1)
          : hexToRgba(palette.edgeMuted, 0.3)

        context.lineWidth = (isRelated ? 2 : 1) * Math.max(0.7, camera.scale) * Math.max(0.1, (linkWeightStrength / 50))

        const currentSourceRad = sourceLayout.radius
        const currentTargetRad = targetLayout.radius
        const innerRadius = Math.min(currentSourceRad, currentTargetRad)
        const outerRadius = Math.max(currentSourceRad, currentTargetRad)
        const controlRadius = innerRadius + (outerRadius - innerRadius) * curveTension

        // Use circular midpoint to avoid wrap-around artifacts near -PI/PI.
        const angularDelta = normalizeAngle(targetLayout.angle - sourceLayout.angle)
        const controlAngle = sourceLayout.angle + angularDelta * 0.5

        const controlWorldX = cx + controlRadius * Math.cos(controlAngle)
        const controlWorldY = cy + controlRadius * Math.sin(controlAngle)
        const controlScreen = toScreen(camera, controlWorldX, controlWorldY)

        context.beginPath()
        context.moveTo(sourceScreen.x, sourceScreen.y)
        context.quadraticCurveTo(controlScreen.x, controlScreen.y, targetScreen.x, targetScreen.y)
        context.stroke()
      })

      treeData.each(node => {
        if (node.depth > depthCutOff) return

        const layout = nodeLayoutData.get(node.data.id)
        if (!layout) return

        const screen = toScreen(camera, layout.x, layout.y)
        const isActive = node.data.id === focusEntityId
        const isHighlighted = node.data.id === highlightedNodeId
        const isHovered = node.data.id === hoveredNodeId
        const collectionColor = resolveCollectionColor(node.data.ref.tabId, node.data.ref.tabColor)
        const radius = (7 + Math.min(10, Math.sqrt(node.data.degree) * 1.9) + (isActive ? 3 : 0)) * Math.max(0.65, Math.min(2.3, camera.scale))

        // Render optional hover halo before circle
        if (isHovered && !isActive) {
          context.fillStyle = hexToRgba(palette.nodeHighlight, 0.15)
          context.beginPath()
          context.arc(screen.x, screen.y, radius + 8 * camera.scale, 0, Math.PI * 2)
          context.fill()
        }

        context.fillStyle = isHighlighted
          ? hexToRgba(palette.nodeHighlight, 0.95)
          : isActive || isHovered
            ? hexToRgba(collectionColor, 0.98)
            : hexToRgba(collectionColor, isDarkTheme ? 0.84 : 0.9)

        context.strokeStyle = isHighlighted || isHovered ? hexToRgba(palette.nodeHighlight, 0.95) : hexToRgba(collectionColor, 1)
        context.lineWidth = isHighlighted || isActive || isHovered ? 2.2 : 1.2
        context.beginPath()
        context.arc(screen.x, screen.y, radius, 0, Math.PI * 2)
        context.fill()
        context.stroke()

        const showLabel = camera.scale >= 0.72 || isActive || isHighlighted || isHovered
        if (!showLabel) return

        const labelLines = buildLabelLines(node.data.title)
        context.fillStyle = hexToRgba(palette.label, animT * 0.95)
        context.font = `${textFontSize}px Inter, sans-serif`

        context.textAlign = 'center'
        context.textBaseline = 'bottom'
        const offset = radius + 6
        const baseY = screen.y - offset
        const lineHeight = Math.max(12, Math.round(textFontSize * 1.15))
        labelLines.forEach((line, index) => {
          const y = baseY - (labelLines.length - 1 - index) * lineHeight
          context.fillText(line, screen.x, y)
        })
      })
    }

    drawRef.current = draw
    draw()

  }, [width, height, treeData, focusEntityId, highlightedNodeId, hoveredNodeId, themeMode, linkWeightStrength,  collectionBoundaryRepulsionStrength, textFontSize])

  useEffect(() => {
    scheduleRender()
  }, [cameraRef.current.offsetX, cameraRef.current.offsetY, cameraRef.current.scale, padding])

  useEffect(() => {
    if (!nodes.length || !treeData) return
    const points = Array.from(livePositionRef.current.values())
    if (!points.length) return
    if (cameraRef.current.scale === 1 && cameraRef.current.offsetX === 0 && cameraRef.current.offsetY === 0) {
      fitCameraToPoints(cameraRef.current, points, width, height, padding)
      scheduleRender()
    }
  }, [height, nodes.length, padding, width, treeData])

  useEffect(() => {
    if (!centerViewRequestId || centerViewRequestId === lastCenterRequestRef.current) return
    lastCenterRequestRef.current = centerViewRequestId
    const points = Array.from(livePositionRef.current.values())
    if (points.length) {
      fitCameraToPoints(cameraRef.current, points, width, height, padding)
      scheduleRender()
    }
  }, [centerViewRequestId, height, padding, width, treeData])

  useEffect(() => {
    if (orbitFrameRef.current !== null) {
      cancelAnimationFrame(orbitFrameRef.current)
      orbitFrameRef.current = null
    }

    orbitLastTimestampRef.current = 0
    const orbitSpeed = 0.08

    const animate = (timestamp: number) => {
      const isOrbiting = orbitAroundCenter && !simulationPaused
      if (!isOrbiting) {
        orbitLastTimestampRef.current = timestamp
        orbitFrameRef.current = requestAnimationFrame(animate)
        return
      }

      const previousTimestamp = orbitLastTimestampRef.current || timestamp
      const deltaSeconds = Math.min(0.08, Math.max(0, (timestamp - previousTimestamp) / 1000))
      orbitLastTimestampRef.current = timestamp

      if (deltaSeconds > 0) {
        orbitAngleRef.current = normalizeAngle(orbitAngleRef.current + deltaSeconds * orbitSpeed)
        scheduleRender()
      }

      orbitFrameRef.current = requestAnimationFrame(animate)
    }

    orbitFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (orbitFrameRef.current !== null) cancelAnimationFrame(orbitFrameRef.current)
    }
  }, [orbitAroundCenter, simulationPaused])

  useD3CanvasInteractions({
    canvasRef,
    cameraRef,
    nodes: interactableNodes,
    width,
    height,
    padding,
    nodesMap: livePositionRef,
    onNodeSetRoot: setInternalRootId,
    onNodeSelect: (nodeId) => {
      const node = interactableNodesMapperRef.current.get(nodeId)
      if (node) {
        onNodeSelect(node.ref)
      }
    },
    onNodeHover: (nodeId) => {
      setHoveredNodeId(nodeId)
      scheduleRender()
    },
    // Fase 3: Arrastre Rotacional. Updates orbit based on mouse movement relative to center.
    onDragRotate: (deltaAngle: number) => {
      orbitAngleRef.current = normalizeAngle(orbitAngleRef.current + deltaAngle)
      scheduleRender()
    },
    onPanOrZoom: () => scheduleRender(),
  })

  return <canvas ref={canvasRef} className="graph-canvas graph-pixi" role="img" aria-label="Mapa narrativo del proyecto" />
}
