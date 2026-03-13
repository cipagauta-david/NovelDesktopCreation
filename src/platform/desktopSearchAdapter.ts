import type { SearchResult } from '../types/workspace'

type DesktopWorkerBridge = {
  platform?: 'desktop'
  search?: {
    ftsSearch?: (payload: { projectId: string; query: string; limit?: number }) => Promise<SearchResult[]>
  }
}

export type DesktopSearchAdapter = {
  runtime: 'web' | 'desktop'
  ftsSearch: (payload: { projectId: string; query: string; limit?: number }) => Promise<SearchResult[]>
}

function getDesktopBridge(): DesktopWorkerBridge | undefined {
  return (globalThis as { __NOVEL_DESKTOP__?: DesktopWorkerBridge }).__NOVEL_DESKTOP__
}

function createWebAdapter(): DesktopSearchAdapter {
  return {
    runtime: 'web',
    async ftsSearch() {
      return []
    },
  }
}

function createDesktopAdapter(bridge: DesktopWorkerBridge): DesktopSearchAdapter {
  const fallback = createWebAdapter()
  return {
    runtime: 'desktop',
    async ftsSearch(payload) {
      if (!bridge.search?.ftsSearch) {
        return fallback.ftsSearch(payload)
      }
      const results = await bridge.search.ftsSearch(payload)
      return Array.isArray(results) ? results : []
    },
  }
}

export function getDesktopSearchAdapter(): DesktopSearchAdapter {
  const bridge = getDesktopBridge()
  if (bridge?.platform === 'desktop') {
    return createDesktopAdapter(bridge)
  }
  return createWebAdapter()
}
