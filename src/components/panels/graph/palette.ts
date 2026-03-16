export type GraphThemeMode = 'light' | 'dark'

export type GraphThemePalette = {
  centerGuide: string
  edgeRelated: string
  edgeMuted: string
  nodeHighlight: string
  label: string
}

const LIGHT_GRAPH_PALETTE: GraphThemePalette = {
  centerGuide: '#8d6630',
  edgeRelated: '#1d7ea0',
  edgeMuted: '#7d8aa0',
  nodeHighlight: '#1d7ea0',
  label: '#2a3443',
}

const DARK_GRAPH_PALETTE: GraphThemePalette = {
  centerGuide: '#d4ba85',
  edgeRelated: '#4db2d1',
  edgeMuted: '#6f7891',
  nodeHighlight: '#4db2d1',
  label: '#e2e8f2',
}

function readCssToken(name: string): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value.length > 0 ? value : null
}

export function getGraphThemePalette(themeMode: GraphThemeMode): GraphThemePalette {
  const fallback = themeMode === 'dark' ? DARK_GRAPH_PALETTE : LIGHT_GRAPH_PALETTE
  return {
    centerGuide: readCssToken('--text-muted') ?? fallback.centerGuide,
    edgeRelated: readCssToken('--accent-primary') ?? fallback.edgeRelated,
    edgeMuted: readCssToken('--text-muted') ?? fallback.edgeMuted,
    nodeHighlight: readCssToken('--accent-primary') ?? fallback.nodeHighlight,
    label: readCssToken('--text-primary') ?? fallback.label,
  }
}
