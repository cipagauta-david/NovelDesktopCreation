import type { GraphRendererAdapter } from './types'

export const nativeGraphRendererAdapter: GraphRendererAdapter = {
  kind: 'native',
  getStatus() {
    return {
      ready: true,
    }
  },
}
