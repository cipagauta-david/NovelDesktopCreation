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
  nodesMap: React.MutableRefObject<Map<string, { x: number, y: number }>> 
  onNodeSetRoot: (nodeId: string) => void
  onNodeSelect?: (nodeId: string) => void
  onNodeHover?: (nodeId: string | null) => void
  onNodePositionChange?: (entityId: string, x: number, y: number) => void
  onDragMove?: () => void
  onDragEnd?: () => void
  onDragRotate?: (deltaAngle: number) => void
  onPanOrZoom: () => void
}

export function useD3CanvasInteractions({
  canvasRef,
  cameraRef,
  nodes,
  width,
  height,
  padding,
  nodesMap,
  onNodeSetRoot,
  onNodeSelect,
  onNodeHover,
  onNodePositionChange,
  onDragMove,
  onDragEnd,
  onDragRotate,
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

    let currentHover: string | null = null

    const toLocal = (event: PointerEvent | WheelEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * canvas.width
      const y = ((event.clientY - rect.top) / rect.height) * canvas.height
      return { x, y }
    }
    
    const findNode = ({ x, y }: { x: number; y: number }): SimNodeLike | null => {
      const radius = 22 / Math.max(0.1, cameraRef.current.scale)
      let closest: SimNodeLike | null = null
      let minDistance = Infinity

      for (const node of nodes) {
        const livePos = nodesMap.current.get(node.id)
        const dx = (livePos?.x ?? 0) - x
        const dy = (livePos?.y ?? 0) - y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < minDistance) {
          minDistance = dist
          closest = node
        }
      }
      
      if (minDistance <= radius) return closest
      return null
    }

    const onDown = (event: PointerEvent) => {
      const screen = toLocal(event)
      const clickedWorld = toWorld(cameraRef.current, screen.x, screen.y)
      const node = findNode(clickedWorld)
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
      const worldPos = toWorld(cameraRef.current, screen.x, screen.y)
      lastWorld = worldPos
      dragVelocity = { x: 0, y: 0 }
      
      const livePos = nodesMap.current.get(node.id)
      dragging.fx = livePos?.x ?? 0
      dragging.fy = livePos?.y ?? 0
      canvas.style.cursor = 'grabbing'
      canvas.setPointerCapture(event.pointerId)
    }

    const onMove = (event: PointerEvent) => {
      const screen = toLocal(event)
      
      if (!dragging && !panning) {
        const node = findNode(toWorld(cameraRef.current, screen.x, screen.y))
        const newHover = node ? node.id : null
        if (currentHover !== newHover) {
          currentHover = newHover
          onNodeHover?.(newHover)
          canvas.style.cursor = newHover ? 'pointer' : 'grab'
        }
      }

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
      
      const dx1 = lastWorld.x - width / 2
      const dy1 = lastWorld.y - height / 2
      const angle1 = Math.atan2(dy1, dx1)
      
      const dx2 = pos.x - width / 2
      const dy2 = pos.y - height / 2
      const angle2 = Math.atan2(dy2, dx2)
      
      let deltaAngle = angle2 - angle1
      deltaAngle = ((deltaAngle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI

      dragVelocity = {
        x: pos.x - lastWorld.x,
        y: pos.y - lastWorld.y,
      }
      lastWorld = pos
      dragging.fx = pos.x
      dragging.fy = pos.y
      
      if (onDragRotate) {
        onDragRotate(deltaAngle)
      } else if (onDragMove) {
        onDragMove()
      }
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
      
      if (!moved) {
        event.stopPropagation()
        event.preventDefault()
        
        if (event.ctrlKey || event.metaKey) {
          onNodeSetRoot(node.id)
          onNodeSelect?.(node.id)
        }
        
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
        canvas.style.cursor = 'grab'
        dragging = null
        return
      }
      
      onDragEnd?.()
      if (typeof node.x === 'number' && typeof node.y === 'number') onNodePositionChange?.(node.id, node.x, node.y)
      
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

    const onClickPrevent = (event: MouseEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.stopPropagation()
        event.preventDefault()
      }
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointerleave', onUp)
    canvas.addEventListener('click', onClickPrevent, { capture: true })
    canvas.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointerleave', onUp)
      canvas.removeEventListener('click', onClickPrevent, { capture: true })
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [cameraRef, canvasRef, height, nodes, nodesMap, onDragEnd, onDragMove, onNodePositionChange, onNodeSelect, onNodeSetRoot, onNodeHover, onPanOrZoom, padding, width])
}
