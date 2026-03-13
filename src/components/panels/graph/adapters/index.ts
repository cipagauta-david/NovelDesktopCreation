import { cosmographRendererAdapter } from './cosmographAdapter'
import { nativeGraphRendererAdapter } from './nativeAdapter'
import type { GraphRendererAdapter, GraphRendererKind } from './types'

const ADAPTERS: Record<GraphRendererKind, GraphRendererAdapter> = {
  native: nativeGraphRendererAdapter,
  cosmograph: cosmographRendererAdapter,
}

export function getGraphRendererAdapter(kind: GraphRendererKind): GraphRendererAdapter {
  return ADAPTERS[kind]
}

export function resolveGraphRendererAdapter(requestedKind?: GraphRendererKind): GraphRendererAdapter {
  if (!requestedKind) {
    return ADAPTERS.native
  }

  const adapter = ADAPTERS[requestedKind]
  if (!adapter) {
    return ADAPTERS.native
  }

  return adapter
}

export type { GraphRendererAdapter, GraphRendererContext, GraphRendererKind } from './types'
