import { useEffect, useMemo, useRef } from 'react'
import { forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force'

import { hexToRgba, resolveCollectionColor } from '../../../../utils/collectionColors'
import { createDefaultCamera, fitCameraToPoints, toScreen } from './d3Camera'
import { useD3CanvasInteractions } from './d3CanvasInteractions'
import type { D3PixiRendererProps } from './rendererProps'

type SimNode = SimulationNodeDatum & { id: string; degree: number; title: string; ref: D3PixiRendererProps['nodes'][number] }

type SimLink = { source: string | SimNode; target: string | SimNode }

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const isForceDebugEnabled = () =>
  import.meta.env.DEV && typeof window !== 'undefined' && Boolean((window as { __NDC_GRAPH_FORCE_DEBUG__?: boolean }).__NDC_GRAPH_FORCE_DEBUG__)

function addContribution(
  target: Map<string, number>,
  sourceId: string,
  contribution: number,
) {
  target.set(sourceId, (target.get(sourceId) ?? 0) + contribution)
}

function summarizeTopSources(sourceMap: Map<string, number>, top = 3) {
  return Array.from(sourceMap.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, top)
    .map(([sourceId, value]) => `${sourceId}:${value.toFixed(2)}`)
    .join(', ')
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
  linkAttractionStrength,
  collectionCohesionStrength,
  collectionBoundaryRepulsionStrength,
  simulationPaused,
  centerViewRequestId,
  orbitAroundCenter,
  degreeByNodeId,
  onNodeSelect,
  onNodePositionChange,
}: D3PixiRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const simulationRef = useRef<ReturnType<typeof forceSimulation<SimNode>> | null>(null)
  const drawRef = useRef<() => void>(() => undefined)
  const simNodesRef = useRef<SimNode[]>([])
  const nodeByIdRef = useRef<Map<string, SimNode>>(new Map())
  const livePositionRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const cameraRef = useRef(createDefaultCamera())
  const lastCenterRequestRef = useRef(0)
  const orbitFrameRef = useRef<number | null>(null)
  const orbitAngleRef = useRef(0)
  const orbitLastTimestampRef = useRef(0)
  const orbitBlendRef = useRef(0)

  const simNodes = useMemo(
    () =>
      nodes.map((node): SimNode => ({
        id: node.id,
        title: node.title,
        ref: node,
        degree: degreeByNodeId.get(node.id) ?? 0,
        x: livePositionRef.current.get(node.id)?.x ?? node.x ?? width / 2,
        y: livePositionRef.current.get(node.id)?.y ?? node.y ?? height / 2,
      })),
    [degreeByNodeId, height, nodes, width],
  )

  const simLinks = useMemo<SimLink[]>(() => edges.map((edge) => ({ source: edge.source, target: edge.target })), [edges])

  useEffect(() => {
    simNodesRef.current = simNodes
    nodeByIdRef.current = new Map(simNodes.map((node) => [node.id, node]))
  }, [simNodes])

  useEffect(() => {
    if (!nodes.length || cameraRef.current.scale !== 1 || cameraRef.current.offsetX !== 0 || cameraRef.current.offsetY !== 0) return
    fitCameraToPoints(
      cameraRef.current,
      nodes.map((node) => ({ x: node.x, y: node.y })),
      width,
      height,
      padding,
    )
  }, [height, nodes, padding, width])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = Math.max(1, Math.floor(width))
    canvas.height = Math.max(1, Math.floor(height))
    const context = canvas.getContext('2d')
    if (!context) return

    const linkDistance = clamp(120 - linkWeightStrength * 0.9, 28, 140)
    const linkStrength = clamp(0.06 + (linkWeightStrength / 100) * 0.44 + (linkAttractionStrength / 100) * 0.5, 0.04, 0.98)
    const charge = -(72 + repulsionStrength * 13.8)
    const gravity = 0.008 + (gravityStrength / 100) * 0.07
    const chargeDistanceMax = clamp(Math.max(width, height) * 0.9, 260, 1100)
    const gravityCenterX = width / 2
    const gravityCenterY = height / 2
    let debugTickCount = 0
    let debugHintShown = false

    simulationRef.current?.stop()
    const simulation = forceSimulation(simNodes)
      .force('charge', forceManyBody<SimNode>().strength(charge).distanceMin(18).distanceMax(chargeDistanceMax))
      .force('link', forceLink<SimNode, SimLink>(simLinks).id((node) => node.id).distance(linkDistance).strength(linkStrength))
      .force('x', forceX<SimNode>(gravityCenterX).strength(gravity))
      .force('y', forceY<SimNode>(gravityCenterY).strength(gravity))
      .alphaTarget(0)
      .alphaDecay(0.05)
      .velocityDecay(0.25)

    const getCollectionClusters = () => {
      const groups = new Map<string, SimNode[]>()
      for (const node of simNodes) {
        const bucket = groups.get(node.ref.tabId)
        if (bucket) bucket.push(node)
        else groups.set(node.ref.tabId, [node])
      }

      const clusters: Array<{ tabId: string; centerX: number; centerY: number; radius: number; nodes: SimNode[]; color: string }> = []
      for (const [tabId, groupedNodes] of groups) {
        if (!groupedNodes.length) {
          continue
        }

        let centerX = 0
        let centerY = 0
        for (const node of groupedNodes) {
          centerX += node.x ?? width / 2
          centerY += node.y ?? height / 2
        }
        centerX /= groupedNodes.length
        centerY /= groupedNodes.length

        let maxDistance = 22
        for (const node of groupedNodes) {
          const dx = (node.x ?? width / 2) - centerX
          const dy = (node.y ?? height / 2) - centerY
          maxDistance = Math.max(maxDistance, Math.sqrt(dx * dx + dy * dy))
        }

        clusters.push({
          tabId,
          centerX,
          centerY,
          radius: maxDistance + 30,
          nodes: groupedNodes,
          color: resolveCollectionColor(tabId, groupedNodes[0]?.ref.tabColor),
        })
      }

      return clusters
    }

    const applyCollectionSeparationForce = (
      debugByNode?: Map<string, {
        separation: number
        separationSources: Map<string, number>
        separationRadial: number
      }>,
      currentAlpha = 1,
    ) => {
      const clusters = getCollectionClusters()
      if (clusters.length <= 1) {
        return
      }

      const minGap = 32
      const separationStrength = (collectionBoundaryRepulsionStrength / 100) * 0.26 * currentAlpha

      for (let i = 0; i < clusters.length; i += 1) {
        for (let j = i + 1; j < clusters.length; j += 1) {
          const first = clusters[i]
          const second = clusters[j]
          const dx = second.centerX - first.centerX
          const dy = second.centerY - first.centerY
          const distance = Math.max(0.0001, Math.sqrt(dx * dx + dy * dy))
          const requiredDistance = first.radius + second.radius + minGap

          if (distance >= requiredDistance) {
            continue
          }

          const overlap = requiredDistance - distance
          const nx = dx / distance
          const ny = dy / distance
          const firstImpulse = (overlap * separationStrength) / Math.max(1, first.nodes.length)
          const secondImpulse = (overlap * separationStrength) / Math.max(1, second.nodes.length)

          for (const node of first.nodes) {
            const forceX = -nx * firstImpulse
            const forceY = -ny * firstImpulse
            node.vx = (node.vx ?? 0) + forceX
            node.vy = (node.vy ?? 0) + forceY
            if (debugByNode) {
              const current = debugByNode.get(node.id)
              if (current) {
                current.separation += firstImpulse
                addContribution(current.separationSources, second.tabId, firstImpulse)
                const nodeX = node.x ?? width / 2
                const nodeY = node.y ?? height / 2
                const toCenterX = gravityCenterX - nodeX
                const toCenterY = gravityCenterY - nodeY
                const toCenterLength = Math.max(0.0001, Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY))
                current.separationRadial += (forceX * toCenterX + forceY * toCenterY) / toCenterLength
              }
            }
          }

          for (const node of second.nodes) {
            const forceX = nx * secondImpulse
            const forceY = ny * secondImpulse
            node.vx = (node.vx ?? 0) + forceX
            node.vy = (node.vy ?? 0) + forceY
            if (debugByNode) {
              const current = debugByNode.get(node.id)
              if (current) {
                current.separation += secondImpulse
                addContribution(current.separationSources, first.tabId, secondImpulse)
                const nodeX = node.x ?? width / 2
                const nodeY = node.y ?? height / 2
                const toCenterX = gravityCenterX - nodeX
                const toCenterY = gravityCenterY - nodeY
                const toCenterLength = Math.max(0.0001, Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY))
                current.separationRadial += (forceX * toCenterX + forceY * toCenterY) / toCenterLength
              }
            }
          }
        }
      }
    }

    const applyCollectionCohesionForce = (currentAlpha = 1) => {
      if (collectionCohesionStrength <= 0) {
        return
      }

      const clusters = getCollectionClusters()
      if (!clusters.length) {
        return
      }

      const strength = (collectionCohesionStrength / 100) * 0.06 * currentAlpha

      for (const cluster of clusters) {
        for (const node of cluster.nodes) {
          const nodeX = node.x ?? width / 2
          const nodeY = node.y ?? height / 2
          const pullX = (cluster.centerX - nodeX) * strength
          const pullY = (cluster.centerY - nodeY) * strength
          node.vx = (node.vx ?? 0) + pullX
          node.vy = (node.vy ?? 0) + pullY
        }
      }
    }

    const applyCollectionBoundaryRepulsion = (
      debugByNode?: Map<string, {
        boundary: number
        boundarySources: Map<string, number>
        boundaryRadial: number
      }>,
      currentAlpha = 1,
    ) => {
      if (collectionBoundaryRepulsionStrength <= 0) {
        return
      }

      const clusters = getCollectionClusters()
      if (clusters.length <= 1) {
        return
      }

      const strength = (collectionBoundaryRepulsionStrength / 100) * 0.48 * currentAlpha

      for (let i = 0; i < clusters.length; i += 1) {
        for (let j = i + 1; j < clusters.length; j += 1) {
          const first = clusters[i]
          const second = clusters[j]
          const dx = second.centerX - first.centerX
          const dy = second.centerY - first.centerY
          const distance = Math.max(0.0001, Math.sqrt(dx * dx + dy * dy))
          const boundaryDistance = Math.max(36, first.radius) + Math.max(36, second.radius)
          const influenceDistance = boundaryDistance * 2.35

          if (distance >= influenceDistance) {
            continue
          }

          const overlap = Math.max(0, boundaryDistance - distance)
          const nx = dx / distance
          const ny = dy / distance
          const normalizedDistance = Math.max(0.22, distance / boundaryDistance)
          const coulombTerm = strength / (normalizedDistance * normalizedDistance)
          const overlapBoost = overlap > 0 ? 1 + overlap / boundaryDistance : 0.32
          const pairImpulse = coulombTerm * overlapBoost
          const firstImpulse = pairImpulse / Math.max(1, first.nodes.length)
          const secondImpulse = pairImpulse / Math.max(1, second.nodes.length)

          for (const node of first.nodes) {
            const forceX = -nx * firstImpulse
            const forceY = -ny * firstImpulse
            node.vx = (node.vx ?? 0) + forceX
            node.vy = (node.vy ?? 0) + forceY
            if (debugByNode) {
              const current = debugByNode.get(node.id)
              if (current) {
                current.boundary += firstImpulse
                addContribution(current.boundarySources, second.tabId, firstImpulse)
                const nodeX = node.x ?? width / 2
                const nodeY = node.y ?? height / 2
                const toCenterX = gravityCenterX - nodeX
                const toCenterY = gravityCenterY - nodeY
                const toCenterLength = Math.max(0.0001, Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY))
                current.boundaryRadial += (forceX * toCenterX + forceY * toCenterY) / toCenterLength
              }
            }
          }

          for (const node of second.nodes) {
            const forceX = nx * secondImpulse
            const forceY = ny * secondImpulse
            node.vx = (node.vx ?? 0) + forceX
            node.vy = (node.vy ?? 0) + forceY
            if (debugByNode) {
              const current = debugByNode.get(node.id)
              if (current) {
                current.boundary += secondImpulse
                addContribution(current.boundarySources, first.tabId, secondImpulse)
                const nodeX = node.x ?? width / 2
                const nodeY = node.y ?? height / 2
                const toCenterX = gravityCenterX - nodeX
                const toCenterY = gravityCenterY - nodeY
                const toCenterLength = Math.max(0.0001, Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY))
                current.boundaryRadial += (forceX * toCenterX + forceY * toCenterY) / toCenterLength
              }
            }
          }
        }
      }
    }

    const logForceDebugSnapshot = (
      debugByNode: Map<string, {
        boundary: number
        boundarySources: Map<string, number>
        boundaryRadial: number
        separation: number
        separationSources: Map<string, number>
        separationRadial: number
      }>,
      currentAlpha: number,
    ) => {
      const rows: Array<Record<string, string | number>> = []
      const linkByNode = new Map<string, { sum: number; sources: Map<string, number> }>()
      const chargeByNode = new Map<string, { sum: number; sources: Map<string, number> }>()
      const gravityByNode = new Map<string, number>()
      const radialByNode = new Map<string, { charge: number; link: number; gravity: number }>()

      for (const node of simNodes) {
        linkByNode.set(node.id, { sum: 0, sources: new Map() })
        chargeByNode.set(node.id, { sum: 0, sources: new Map() })
        radialByNode.set(node.id, { charge: 0, link: 0, gravity: 0 })
      }

      for (const edge of edges) {
        const source = nodeByIdRef.current.get(edge.source)
        const target = nodeByIdRef.current.get(edge.target)
        if (!source || !target) {
          continue
        }

        const deltaX = (target.x ?? width / 2) - (source.x ?? width / 2)
        const deltaY = (target.y ?? height / 2) - (source.y ?? height / 2)
        const distance = Math.max(0.0001, Math.sqrt(deltaX * deltaX + deltaY * deltaY))
        const magnitude = Math.abs(distance - linkDistance) * linkStrength * currentAlpha

        const sourceAcc = linkByNode.get(source.id)
        const targetAcc = linkByNode.get(target.id)
        const forceMagnitude = (distance - linkDistance) * linkStrength * currentAlpha
        const ux = deltaX / distance
        const uy = deltaY / distance

        const sourceX = source.x ?? width / 2
        const sourceY = source.y ?? height / 2
        const sourceToCenterX = gravityCenterX - sourceX
        const sourceToCenterY = gravityCenterY - sourceY
        const sourceToCenterLength = Math.max(0.0001, Math.sqrt(sourceToCenterX * sourceToCenterX + sourceToCenterY * sourceToCenterY))
        const sourceRadial = (ux * forceMagnitude * sourceToCenterX + uy * forceMagnitude * sourceToCenterY) / sourceToCenterLength

        const targetX = target.x ?? width / 2
        const targetY = target.y ?? height / 2
        const targetToCenterX = gravityCenterX - targetX
        const targetToCenterY = gravityCenterY - targetY
        const targetToCenterLength = Math.max(0.0001, Math.sqrt(targetToCenterX * targetToCenterX + targetToCenterY * targetToCenterY))
        const targetRadial = ((-ux) * forceMagnitude * targetToCenterX + (-uy) * forceMagnitude * targetToCenterY) / targetToCenterLength

        if (sourceAcc) {
          sourceAcc.sum += magnitude
          addContribution(sourceAcc.sources, target.id, magnitude)
          const sourceRadialAcc = radialByNode.get(source.id)
          if (sourceRadialAcc) {
            sourceRadialAcc.link += sourceRadial
          }
        }
        if (targetAcc) {
          targetAcc.sum += magnitude
          addContribution(targetAcc.sources, source.id, magnitude)
          const targetRadialAcc = radialByNode.get(target.id)
          if (targetRadialAcc) {
            targetRadialAcc.link += targetRadial
          }
        }
      }

      for (let firstIndex = 0; firstIndex < simNodes.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < simNodes.length; secondIndex += 1) {
          const firstNode = simNodes[firstIndex]
          const secondNode = simNodes[secondIndex]
          const deltaX = (secondNode.x ?? width / 2) - (firstNode.x ?? width / 2)
          const deltaY = (secondNode.y ?? height / 2) - (firstNode.y ?? height / 2)
          const distanceSquared = Math.max(22, deltaX * deltaX + deltaY * deltaY)
          const magnitude = (Math.abs(charge) / distanceSquared) * currentAlpha

          const firstAcc = chargeByNode.get(firstNode.id)
          const secondAcc = chargeByNode.get(secondNode.id)
          const distance = Math.max(0.0001, Math.sqrt(distanceSquared))
          const ux = deltaX / distance
          const uy = deltaY / distance

          const firstToCenterX = gravityCenterX - (firstNode.x ?? width / 2)
          const firstToCenterY = gravityCenterY - (firstNode.y ?? height / 2)
          const firstToCenterLength = Math.max(0.0001, Math.sqrt(firstToCenterX * firstToCenterX + firstToCenterY * firstToCenterY))
          const secondToCenterX = gravityCenterX - (secondNode.x ?? width / 2)
          const secondToCenterY = gravityCenterY - (secondNode.y ?? height / 2)
          const secondToCenterLength = Math.max(0.0001, Math.sqrt(secondToCenterX * secondToCenterX + secondToCenterY * secondToCenterY))
          const firstChargeRadial = ((-ux) * magnitude * firstToCenterX + (-uy) * magnitude * firstToCenterY) / firstToCenterLength
          const secondChargeRadial = (ux * magnitude * secondToCenterX + uy * magnitude * secondToCenterY) / secondToCenterLength
          if (firstAcc) {
            firstAcc.sum += magnitude
            addContribution(firstAcc.sources, secondNode.id, magnitude)
            const firstRadialAcc = radialByNode.get(firstNode.id)
            if (firstRadialAcc) {
              firstRadialAcc.charge += firstChargeRadial
            }
          }
          if (secondAcc) {
            secondAcc.sum += magnitude
            addContribution(secondAcc.sources, firstNode.id, magnitude)
            const secondRadialAcc = radialByNode.get(secondNode.id)
            if (secondRadialAcc) {
              secondRadialAcc.charge += secondChargeRadial
            }
          }
        }
      }

      for (const node of simNodes) {
        const deltaX = (node.x ?? width / 2) - gravityCenterX
        const deltaY = (node.y ?? height / 2) - gravityCenterY
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        const gravityValue = distance * gravity * currentAlpha
        gravityByNode.set(node.id, gravityValue)
        const radialAcc = radialByNode.get(node.id)
        if (radialAcc) {
          radialAcc.gravity = gravityValue
        }
      }

      for (const node of simNodes) {
        const linkAcc = linkByNode.get(node.id)
        const chargeAcc = chargeByNode.get(node.id)
        const boundaryAcc = debugByNode.get(node.id)
        const gravityAcc = gravityByNode.get(node.id) ?? 0
        const boundary = boundaryAcc?.boundary ?? 0
        const separation = boundaryAcc?.separation ?? 0
        const link = linkAcc?.sum ?? 0
        const chargeApprox = chargeAcc?.sum ?? 0
        const nodeX = node.x ?? width / 2
        const nodeY = node.y ?? height / 2
        const dxCenter = nodeX - gravityCenterX
        const dyCenter = nodeY - gravityCenterY
        const distanceToCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter)
        const speed = Math.sqrt((node.vx ?? 0) * (node.vx ?? 0) + (node.vy ?? 0) * (node.vy ?? 0))
        const kinetic = 0.5 * speed * speed
        const radialAcc = radialByNode.get(node.id)
        const radialCharge = radialAcc?.charge ?? 0
        const radialLink = radialAcc?.link ?? 0
        const radialGravity = radialAcc?.gravity ?? 0
        const radialBoundary = boundaryAcc?.boundaryRadial ?? 0
        const radialSeparation = boundaryAcc?.separationRadial ?? 0
        const netRadial = radialCharge + radialLink + radialGravity + radialBoundary + radialSeparation
        const totalApprox = chargeApprox + link + gravityAcc + boundary + separation

        rows.push({
          nodeId: node.id,
          title: node.title,
          tabId: node.ref.tabId,
          alpha: Number(currentAlpha.toFixed(4)),
          x: Number(nodeX.toFixed(1)),
          y: Number(nodeY.toFixed(1)),
          distCenter: Number(distanceToCenter.toFixed(2)),
          speed: Number(speed.toFixed(3)),
          kinetic: Number(kinetic.toFixed(4)),
          radialCharge: Number(radialCharge.toFixed(4)),
          radialLink: Number(radialLink.toFixed(4)),
          radialGravity: Number(radialGravity.toFixed(4)),
          radialBoundary: Number(radialBoundary.toFixed(4)),
          radialSeparation: Number(radialSeparation.toFixed(4)),
          netRadial: Number(netRadial.toFixed(4)),
          chargeApprox: Number(chargeApprox.toFixed(3)),
          link: Number(link.toFixed(3)),
          gravity: Number(gravityAcc.toFixed(3)),
          boundary,
          separation,
          totalApprox: Number(totalApprox.toFixed(3)),
          chargeFrom: summarizeTopSources(chargeAcc?.sources ?? new Map()),
          linkFrom: summarizeTopSources(linkAcc?.sources ?? new Map()),
          gravityFrom: 'gravity-center',
          boundaryFrom: summarizeTopSources(boundaryAcc?.boundarySources ?? new Map()),
          separationFrom: summarizeTopSources(boundaryAcc?.separationSources ?? new Map()),
        })
      }

      const filteredRows = rows.filter((row) => {
        const title = String(row.title ?? '').toLowerCase()
        return title.includes('outlier') || title.includes('naranja')
      })

      console.groupCollapsed(`[GraphForceDebug] tick=${debugTickCount} nodes=${filteredRows.length}/${rows.length} (filter: outlier|naranja)`)
      console.table(filteredRows)
      console.groupEnd()
    }

    const draw = () => {
      context.clearRect(0, 0, width, height)
      context.lineCap = 'round'
      context.lineJoin = 'round'
      const root = document.documentElement
      const isDarkTheme = root.classList.contains('dark') || root.getAttribute('data-theme') === 'dark'
      const camera = cameraRef.current
      const textScale = Math.max(0.75, Math.min(1.45, camera.scale))
      const centerWorldX = gravityCenterX
      const centerWorldY = gravityCenterY
      const centerScreen = toScreen(camera, centerWorldX, centerWorldY)

      context.save()
      context.strokeStyle = 'rgba(255, 196, 64, 0.9)'
      context.lineWidth = 1.6
      context.setLineDash([4, 3])
      context.beginPath()
      context.arc(centerScreen.x, centerScreen.y, 10, 0, Math.PI * 2)
      context.stroke()
      context.setLineDash([])
      context.beginPath()
      context.moveTo(centerScreen.x - 14, centerScreen.y)
      context.lineTo(centerScreen.x + 14, centerScreen.y)
      context.moveTo(centerScreen.x, centerScreen.y - 14)
      context.lineTo(centerScreen.x, centerScreen.y + 14)
      context.stroke()
      context.fillStyle = 'rgba(255, 196, 64, 0.84)'
      context.fillRect(centerScreen.x - 2, centerScreen.y - 2, 4, 4)
      context.restore()

      const collectionClusters = getCollectionClusters()
      for (const cluster of collectionClusters) {
        const clusterScreen = toScreen(camera, cluster.centerX, cluster.centerY)
        context.save()
        context.strokeStyle = hexToRgba(cluster.color, 0.74)
        context.lineWidth = 1.3
        context.setLineDash([6, 5])
        context.beginPath()
        context.arc(clusterScreen.x, clusterScreen.y, cluster.radius * camera.scale, 0, Math.PI * 2)
        context.stroke()
        context.restore()
      }

      for (const edge of edges) {
        const source = nodeByIdRef.current.get(edge.source)
        const target = nodeByIdRef.current.get(edge.target)
        if (!source || !target) continue
        const sourceScreen = toScreen(camera, source.x ?? width / 2, source.y ?? height / 2)
        const targetScreen = toScreen(camera, target.x ?? width / 2, target.y ?? height / 2)
        const isRelated = !activeEntityId || edge.source === activeEntityId || edge.target === activeEntityId
        context.strokeStyle = isRelated ? 'rgba(125,166,255,0.76)' : 'rgba(127,135,160,0.3)'
        context.lineWidth = (isRelated ? 2 : 1) * Math.max(0.7, camera.scale)
        context.beginPath()
        context.moveTo(sourceScreen.x, sourceScreen.y)
        context.lineTo(targetScreen.x, targetScreen.y)
        context.stroke()
      }

      for (const node of simNodes) {
        node.x = node.x ?? width / 2
        node.y = node.y ?? height / 2
        livePositionRef.current.set(node.id, { x: node.x, y: node.y })
        const screen = toScreen(camera, node.x, node.y)
        const collectionColor = resolveCollectionColor(node.ref.tabId, node.ref.tabColor)
        const isActive = node.id === activeEntityId
        const isHighlighted = node.id === highlightedNodeId
        const radius = (7 + Math.min(10, Math.sqrt(node.degree) * 1.9) + (isActive ? 3 : 0)) * Math.max(0.65, Math.min(2.3, camera.scale))

        context.fillStyle = isHighlighted
          ? 'rgba(0,212,238,0.95)'
          : isActive
            ? hexToRgba(collectionColor, 0.98)
            : hexToRgba(collectionColor, isDarkTheme ? 0.84 : 0.9)
        context.strokeStyle = isHighlighted ? 'rgba(0,212,238,0.95)' : hexToRgba(collectionColor, 1)
        context.lineWidth = isHighlighted || isActive ? 2.2 : 1.2
        context.beginPath()
        context.arc(screen.x, screen.y, radius, 0, Math.PI * 2)
        context.fill()
        context.stroke()

        const showLabel = camera.scale >= 0.72 || isActive || isHighlighted
        if (!showLabel) continue
        const label = node.title.length > 20 ? `${node.title.slice(0, 20)}…` : node.title
        context.fillStyle = 'rgba(226,232,255,0.95)'
        context.font = `${Math.round(11 * textScale)}px Inter, sans-serif`
        context.textAlign = 'center'
        context.textBaseline = 'top'
        context.fillText(label, screen.x, screen.y + radius + 6)
      }
    }

    drawRef.current = draw

    simulation.on('tick', () => {
      const currentAlpha = simulation.alpha()
      const circleForcesAlpha = Math.min(currentAlpha, 0.02)
      const debugEnabled = isForceDebugEnabled()
      if (debugEnabled && !debugHintShown) {
        debugHintShown = true
        console.info('[GraphForceDebug] enabled. Toggle with window.__NDC_GRAPH_FORCE_DEBUG__ = true|false')
      }

      const debugByNode = debugEnabled
        ? new Map(
            simNodes.map((node) => [
              node.id,
              {
                boundary: 0,
                boundarySources: new Map<string, number>(),
                boundaryRadial: 0,
                separation: 0,
                separationSources: new Map<string, number>(),
                separationRadial: 0,
              },
            ]),
          )
        : undefined

      applyCollectionSeparationForce(debugByNode, circleForcesAlpha)
      applyCollectionCohesionForce(circleForcesAlpha)
      applyCollectionBoundaryRepulsion(debugByNode, circleForcesAlpha)
      draw()

      if (debugEnabled && debugByNode) {
        debugTickCount += 1
        if (debugTickCount % 18 === 0) {
          logForceDebugSnapshot(debugByNode, currentAlpha)
        }
      }
    })
    simulationRef.current = simulation
    if (simulationPaused) simulation.alphaTarget(0).stop()
    else simulation.alphaTarget(0).alpha(0.9).restart()
    draw()

    return () => {
      simulation.stop()
      simulationRef.current = null
    }
  }, [
    activeEntityId,
    collectionCohesionStrength,
    collectionBoundaryRepulsionStrength,
    edges,
    gravityStrength,
    height,
    highlightedNodeId,
    linkAttractionStrength,
    linkWeightStrength,
    padding,
    repulsionStrength,
    simLinks,
    simNodes,
    simulationPaused,
    width,
  ])

  useEffect(() => {
    const simulation = simulationRef.current
    if (!simulation) return
    if (simulationPaused) {
      simulation.alphaTarget(0).stop()
      return
    }
    simulation.alphaTarget(0).alpha(0.5).restart()
  }, [simulationPaused])

  useEffect(() => {
    if (!centerViewRequestId || centerViewRequestId === lastCenterRequestRef.current) return
    lastCenterRequestRef.current = centerViewRequestId
    const points = simNodes.map((node) => ({ x: node.x ?? width / 2, y: node.y ?? height / 2 }))
    fitCameraToPoints(cameraRef.current, points, width, height, padding)
    drawRef.current()
    if (!simulationPaused) {
      simulationRef.current?.alpha(0.35).restart()
    }
  }, [centerViewRequestId, height, padding, simNodes, simulationPaused, width])

  useEffect(() => {
    if (orbitFrameRef.current !== null) {
      cancelAnimationFrame(orbitFrameRef.current)
      orbitFrameRef.current = null
    }

    orbitLastTimestampRef.current = 0
    const orbitSpeed = 0.26

    const animate = (timestamp: number) => {
      const targetBlend = orbitAroundCenter && !simulationPaused ? 1 : 0
      const blendSpeed = targetBlend > orbitBlendRef.current ? 3.6 : 6.2
      const previousTimestamp = orbitLastTimestampRef.current || timestamp
      const deltaSeconds = Math.min(0.08, Math.max(0, (timestamp - previousTimestamp) / 1000))
      orbitLastTimestampRef.current = timestamp

      const blendDelta = targetBlend - orbitBlendRef.current
      const blendStep = Math.min(Math.abs(blendDelta), deltaSeconds * blendSpeed)
      orbitBlendRef.current += Math.sign(blendDelta) * blendStep

      const effectiveBlend = Math.max(0, Math.min(1, orbitBlendRef.current))
      const rotationStep = deltaSeconds * orbitSpeed * effectiveBlend
      orbitAngleRef.current = (orbitAngleRef.current + rotationStep) % (Math.PI * 2)
      const nodeList = simNodesRef.current

      if (nodeList.length > 0 && effectiveBlend > 0.0001) {
        const centerX = width / 2
        const centerY = height / 2

        const cos = Math.cos(rotationStep)
        const sin = Math.sin(rotationStep)

        for (const node of nodeList) {
          const nodeX = node.x ?? width / 2
          const nodeY = node.y ?? height / 2
          const relativeX = nodeX - centerX
          const relativeY = nodeY - centerY
          const rotatedX = relativeX * cos - relativeY * sin
          const rotatedY = relativeX * sin + relativeY * cos
          node.x = centerX + rotatedX
          node.y = centerY + rotatedY
          livePositionRef.current.set(node.id, { x: node.x, y: node.y })
        }

        simulationRef.current?.alpha(0.02)
      }

      drawRef.current()

      if (targetBlend > 0 || orbitBlendRef.current > 0.0001) {
        orbitFrameRef.current = requestAnimationFrame(animate)
        return
      }

      orbitFrameRef.current = null
      orbitLastTimestampRef.current = 0
      orbitBlendRef.current = 0
      return
    }

    if (orbitAroundCenter || orbitBlendRef.current > 0.0001) {
      orbitFrameRef.current = requestAnimationFrame(animate)
    } else {
      drawRef.current()
    }

    return () => {
      if (orbitFrameRef.current !== null) {
        cancelAnimationFrame(orbitFrameRef.current)
        orbitFrameRef.current = null
      }
    }
  }, [height, orbitAroundCenter, simulationPaused, width])

  useD3CanvasInteractions({
    canvasRef,
    cameraRef,
    nodes: simNodes,
    width,
    height,
    padding,
    onNodeSelect,
    onNodePositionChange,
    onDragMove: () => {
      const simulation = simulationRef.current
      if (!simulation) return
      simulation.alphaTarget(0.045).alpha(Math.max(simulation.alpha(), 0.085)).restart()
    },
    onDragEnd: () => {
      const simulation = simulationRef.current
      if (!simulation) return
      if (!simulationPaused) {
        simulation.alphaTarget(0).alpha(Math.max(simulation.alpha(), 0.16)).restart()
        return
      }
      simulation.alphaTarget(0)
    },
    onPanOrZoom: () => {
      simulationRef.current?.alphaTarget(0).alpha(0.02)
      drawRef.current()
    },
  })

  return <canvas ref={canvasRef} className="graph-canvas graph-pixi" role="img" aria-label="Mapa narrativo del proyecto" />
}
