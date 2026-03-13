import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Cosmograph, type CosmographRef } from '@cosmograph/react'

import type { GraphEdge, GraphNode } from '../../../../types/workspace'
import { getNodeCategory } from '../category'

type CosmographRendererProps = {
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

const CATEGORY_COLORS: Record<string, string> = {
  chapters: '#3b82f6',
  characters: '#f97316',
  world: '#14b8a6',
  other: '#94a3b8',
}

export function CosmographRenderer({
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
}: CosmographRendererProps) {
  const cosmographRef = useRef<CosmographRef>(undefined)
  const points = useMemo(
    () =>
      nodes.map((node, index) => ({
        index,
        id: node.id,
        title: node.title,
        tabId: node.tabId,
        category: getNodeCategory(node.tabName),
        degree: degreeByNodeId.get(node.id) ?? 0,
        x: node.x,
        y: node.y,
      })),
    [degreeByNodeId, nodes],
  )

  const pointIndexById = useMemo(() => {
    const next = new Map<string, number>()
    for (const point of points) {
      next.set(point.id, point.index)
    }
    return next
  }, [points])

  const links = useMemo(
    () =>
      edges
        .map((edge) => {
          const sourceIndex = pointIndexById.get(edge.source)
          const targetIndex = pointIndexById.get(edge.target)
          if (typeof sourceIndex !== 'number' || typeof targetIndex !== 'number') {
            return null
          }

          return {
            source: edge.source,
            target: edge.target,
            sourceIndex,
            targetIndex,
          }
        })
        .filter(
          (edge): edge is { source: string; target: string; sourceIndex: number; targetIndex: number } =>
            Boolean(edge),
        ),
    [edges, pointIndexById],
  )

  const pointColorByMap = useMemo(() => CATEGORY_COLORS, [])
  const pointSizeRange = useMemo<[number, number]>(() => [6, 18], [])
  const repulsionT = Math.pow(repulsionStrength / 100, 1.8)
  const gravityT = Math.pow(gravityStrength / 100, 1.3)
  const linkT = Math.pow(linkWeightStrength / 100, 1.4)

  const simulationRepulsion = 0.08 + repulsionT * 0.52
  const simulationGravity = 0.14 + gravityT * 0.28
  const simulationLinkSpring = 0.12 + linkT * 0.46
  const simulationFriction = 0.93

  useEffect(() => {
    const cosmograph = cosmographRef.current
    if (!cosmograph) {
      return
    }

    const raf = window.requestAnimationFrame(() => {
      if (!simulationPaused) {
        cosmograph.start(0.12)
      }
    })

    return () => {
      window.cancelAnimationFrame(raf)
    }
  }, [
    simulationRepulsion,
    simulationGravity,
    simulationLinkSpring,
    simulationFriction,
    simulationPaused,
    points.length,
    links.length,
  ])

  useEffect(() => {
    const cosmograph = cosmographRef.current
    if (!cosmograph) {
      return
    }

    if (simulationPaused) {
      cosmograph.pause()
      return
    }

    cosmograph.unpause()
    cosmograph.start(0.08)
  }, [simulationPaused])

  useEffect(() => {
    if (!centerViewRequestId) {
      return
    }

    const cosmograph = cosmographRef.current
    if (!cosmograph) {
      return
    }

    cosmograph.fitView(320, 0.14)
    cosmograph.pause()
    onAutoPauseAfterCenter?.()
  }, [centerViewRequestId, onAutoPauseAfterCenter])

  const commitPositions = useCallback(() => {
    if (!onNodePositionChange) {
      return
    }

    const cosmograph = cosmographRef.current
    if (!cosmograph) {
      return
    }

    const positions = cosmograph.getPointPositions()
    if (!positions || positions.length < points.length * 2) {
      return
    }

    for (let index = 0; index < points.length; index += 1) {
      const point = points[index]
      if (!point) {
        continue
      }
      const x = positions[index * 2]
      const y = positions[index * 2 + 1]
      if (typeof x !== 'number' || typeof y !== 'number') {
        continue
      }
      onNodePositionChange(point.id, x, y)
    }
  }, [onNodePositionChange, points])

  return (
    <Cosmograph
      ref={cosmographRef}
      className="graph-cosmograph"
      style={{ width: '100%', height: '540px' }}
      points={points}
      links={links}
      pointIdBy="id"
      pointIndexBy="index"
      linkSourceBy="source"
      linkTargetBy="target"
      linkSourceIndexBy="sourceIndex"
      linkTargetIndexBy="targetIndex"
      pointXBy="x"
      pointYBy="y"
      pointLabelBy="title"
      pointColorBy="category"
      pointColorByMap={pointColorByMap}
      pointColorByFn={(value: unknown, index?: number) => {
        if (typeof index !== 'number') {
          return '#94a3b8'
        }
        const point = points[index]
        if (!point) {
          return '#94a3b8'
        }
        if (point.id === activeEntityId || point.id === highlightedNodeId) {
          return '#00d4ee'
        }
        return CATEGORY_COLORS[String(value)] ?? '#94a3b8'
      }}
      pointSizeBy="degree"
      pointSizeRange={pointSizeRange}
      pointSizeByFn={(value: unknown, index?: number) => {
        if (typeof index !== 'number') {
          return 7
        }
        const point = points[index]
        const base = typeof value === 'number' ? 6 + Math.min(10, Math.sqrt(Math.max(value, 0)) * 2.2) : 7
        if (!point) {
          return base
        }
        return point.id === activeEntityId || point.id === highlightedNodeId ? base + 2.5 : base
      }}
      selectPointOnClick="single"
      focusPointOnClick
      enableDrag
      enableSimulation
      preservePointPositionsOnDataUpdate
      rescalePositions
      simulationRepulsion={simulationRepulsion}
      simulationGravity={simulationGravity}
      simulationLinkSpring={simulationLinkSpring}
      simulationFriction={simulationFriction}
      simulationCenter={0.35}
      simulationLinkDistance={18}
      simulationDecay={1400}
      enableSimulationDuringZoom={false}
      showLabels
      showTopLabels
      showDynamicLabels
      labelMargin={1}
      labelPadding={[4, 2, 4, 2]}
      pointLabelFontSize={12}
      hoveredPointCursor="pointer"
      onPointClick={(index) => {
        if (typeof index !== 'number') {
          return
        }
        const selected = points[index]
        if (!selected) {
          return
        }
        const node = nodes.find((entry) => entry.id === selected.id)
        if (node) {
          onNodeSelect(node)
        }
      }}
      onDragEnd={() => {
        commitPositions()
      }}
      onMount={(cosmograph) => {
        cosmographRef.current = cosmograph
        cosmograph.start(0.12)
      }}
      linkColor="rgba(148,163,184,0.45)"
      linkWidth={1.2}
      backgroundColor="rgba(2,6,23,0.94)"
    />
  )
}
