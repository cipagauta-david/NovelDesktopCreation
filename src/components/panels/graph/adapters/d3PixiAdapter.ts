import type { GraphRendererAdapter } from './types'

export const d3PixiRendererAdapter: GraphRendererAdapter = {
  kind: 'd3-pixi',
  getStatus() {
    if (typeof window === 'undefined') {
      return {
        ready: false,
        reason: 'D3 + Pixi requiere entorno browser con canvas disponible.',
      }
    }

    const hasCanvas = typeof window.HTMLCanvasElement !== 'undefined'
    if (!hasCanvas) {
      return {
        ready: false,
        reason: 'Canvas no disponible; usando renderer nativo como fallback.',
      }
    }

    return {
      ready: true,
    }
  },
}
