export type D3Camera = {
  scale: number
  offsetX: number
  offsetY: number
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export const createDefaultCamera = (): D3Camera => ({ scale: 1, offsetX: 0, offsetY: 0 })

export const toScreen = (camera: D3Camera, x: number, y: number) => ({
  x: x * camera.scale + camera.offsetX,
  y: y * camera.scale + camera.offsetY,
})

export const toWorld = (camera: D3Camera, x: number, y: number) => ({
  x: (x - camera.offsetX) / camera.scale,
  y: (y - camera.offsetY) / camera.scale,
})

export function zoomAt(camera: D3Camera, screenX: number, screenY: number, deltaY: number) {
  const factor = deltaY < 0 ? 1.1 : 0.9
  const nextScale = clamp(camera.scale * factor, 0.35, 3.2)
  const world = toWorld(camera, screenX, screenY)
  camera.scale = nextScale
  camera.offsetX = screenX - world.x * nextScale
  camera.offsetY = screenY - world.y * nextScale
}

export function fitCameraToPoints(
  camera: D3Camera,
  points: Array<{ x: number; y: number }>,
  viewportWidth: number,
  viewportHeight: number,
  padding: number,
) {
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
  const fitScale = clamp(Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight) * 0.92, 0.35, 3.2)
  const centerWorldX = minX + boundsWidth / 2
  const centerWorldY = minY + boundsHeight / 2

  camera.scale = fitScale
  camera.offsetX = viewportWidth / 2 - centerWorldX * fitScale
  camera.offsetY = viewportHeight / 2 - centerWorldY * fitScale
}
