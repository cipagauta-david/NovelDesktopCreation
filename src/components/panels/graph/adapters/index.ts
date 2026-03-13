import { cosmographRendererAdapter } from './cosmographAdapter'
import { d3PixiRendererAdapter } from './d3PixiAdapter'
import { nativeGraphRendererAdapter } from './nativeAdapter'
import type { GraphRendererAdapter, GraphRendererKind } from './types'

const ADAPTERS: Record<GraphRendererKind, GraphRendererAdapter> = {
  native: nativeGraphRendererAdapter,
  cosmograph: cosmographRendererAdapter,
  'd3-pixi': d3PixiRendererAdapter,
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
