import type { GraphRendererAdapter } from './types'

export const cosmographRendererAdapter: GraphRendererAdapter = {
  kind: 'cosmograph',
  getStatus() {
    if (typeof window === 'undefined') {
      return {
        ready: false,
        reason: 'Cosmograph requiere entorno browser con WebGL disponible.',
      }
    }

    const hasWebGL = typeof window.WebGL2RenderingContext !== 'undefined' || typeof window.WebGLRenderingContext !== 'undefined'
    if (!hasWebGL) {
      return {
        ready: false,
        reason: 'WebGL no disponible; usando renderer nativo como fallback.',
      }
    }

    return {
      ready: true,
    }
  },
}
