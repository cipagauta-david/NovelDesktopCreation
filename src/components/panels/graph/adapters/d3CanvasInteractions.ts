import { useEffect, type RefObject } from 'react'
import type { GraphNode } from '../../../../types/workspace'
import type { D3Camera } from './d3Camera'
import { toWorld, zoomAt } from './d3Camera'

type SimNodeLike = {
  id: string
  ref: GraphNode
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

type InteractionArgs = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  cameraRef: RefObject<D3Camera>
  nodes: SimNodeLike[]
  width: number
  height: number
  padding: number
  onNodeSelect: (node: GraphNode) => void
  onNodePositionChange?: (entityId: string, x: number, y: number) => void
  onDragMove: () => void
  onDragEnd?: () => void
  onPanOrZoom: () => void
}

export function useD3CanvasInteractions({
  canvasRef,
  cameraRef,
  nodes,
  width,
  height,
  padding,
  onNodeSelect,
  onNodePositionChange,
  onDragMove,
  onDragEnd,
  onPanOrZoom,
}: InteractionArgs) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let dragging: SimNodeLike | null = null
    let panning = false
    let moved = false
    let lastScreen = { x: 0, y: 0 }
    let lastWorld = { x: 0, y: 0 }
    let dragVelocity = { x: 0, y: 0 }
    canvas.style.cursor = 'grab'

    const toLocal = (event: PointerEvent | WheelEvent) => ({ x: event.offsetX, y: event.offsetY })
    const findNode = ({ x, y }: { x: number; y: number }) => {
      for (const node of nodes) {
        const dx = (node.x ?? 0) - x
        const dy = (node.y ?? 0) - y
        if (Math.sqrt(dx * dx + dy * dy) <= 18) return node
      }
      return null
    }

    const onDown = (event: PointerEvent) => {
      const screen = toLocal(event)
      const node = findNode(toWorld(cameraRef.current, screen.x, screen.y))
      moved = false
      lastScreen = screen
      if (!node) {
        panning = true
        canvas.style.cursor = 'grabbing'
        canvas.setPointerCapture(event.pointerId)
        return
      }

      dragging = node
      moved = false
      const world = toWorld(cameraRef.current, screen.x, screen.y)
      lastWorld = world
      dragVelocity = { x: 0, y: 0 }
      dragging.fx = dragging.x
      dragging.fy = dragging.y
      canvas.style.cursor = 'grabbing'
      canvas.setPointerCapture(event.pointerId)
    }

    const onMove = (event: PointerEvent) => {
      const screen = toLocal(event)
      if (panning) {
        moved = true
        cameraRef.current.offsetX += screen.x - lastScreen.x
        cameraRef.current.offsetY += screen.y - lastScreen.y
        lastScreen = screen
        onPanOrZoom()
        return
      }

      if (!dragging) return
      moved = true
      const pos = toWorld(cameraRef.current, screen.x, screen.y)
      dragVelocity = {
        x: pos.x - lastWorld.x,
        y: pos.y - lastWorld.y,
      }
      lastWorld = pos
      dragging.fx = pos.x
      dragging.fy = pos.y
      onDragMove()
    }

    const onUp = (event: PointerEvent) => {
      if (panning) {
        panning = false
        canvas.style.cursor = 'grab'
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
        return
      }

      if (!dragging) return
      const node = dragging
      node.x = node.fx ?? node.x
      node.y = node.fy ?? node.y
      node.vx = Math.max(-14, Math.min(14, dragVelocity.x * 1.9))
      node.vy = Math.max(-14, Math.min(14, dragVelocity.y * 1.9))
      node.fx = null
      node.fy = null
      if (!moved && event.ctrlKey && typeof node.x === 'number' && typeof node.y === 'number') {
        cameraRef.current.offsetX = width / 2 - node.x * cameraRef.current.scale
        cameraRef.current.offsetY = height / 2 - node.y * cameraRef.current.scale
        onPanOrZoom()
      }
      onDragEnd?.()
      if (typeof node.x === 'number' && typeof node.y === 'number') onNodePositionChange?.(node.id, node.x, node.y)
      if (!moved) onNodeSelect(node.ref)
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
      canvas.style.cursor = 'grab'
      dragging = null
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const screen = toLocal(event)
      zoomAt(cameraRef.current, screen.x, screen.y, event.deltaY)
      onPanOrZoom()
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointerleave', onUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointerleave', onUp)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [cameraRef, canvasRef, height, nodes, onDragEnd, onDragMove, onNodePositionChange, onNodeSelect, onPanOrZoom, padding, width])
}
