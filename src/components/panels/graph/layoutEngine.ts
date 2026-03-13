import type { GraphLayoutContext, GraphLayoutEngine } from './contracts'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export const radialRepulsionLayoutEngine: GraphLayoutEngine = {
  id: 'radial-repulsion-v1',
  applyLayout({ nodes, settings, viewport }: GraphLayoutContext) {
    if (settings.repulsionStrength === 50 || nodes.length === 0) {
      return nodes
    }

    const centerX = viewport.width / 2
    const centerY = viewport.height / 2
    const factor = 0.72 + (settings.repulsionStrength / 100) * 1.05

    return nodes.map((node) => {
      const dx = node.x - centerX
      const dy = node.y - centerY
      return {
        ...node,
        x: clamp(centerX + dx * factor, viewport.padding, viewport.width - viewport.padding),
        y: clamp(centerY + dy * factor, viewport.padding, viewport.height - viewport.padding),
      }
    })
  },
}
