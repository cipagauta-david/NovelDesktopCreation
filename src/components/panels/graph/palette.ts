export type GraphThemeMode = 'light' | 'dark'

export type GraphThemePalette = {
  centerGuide: string
  edgeRelated: string
  edgeMuted: string
  nodeHighlight: string
  label: string
}

const LIGHT_GRAPH_PALETTE: GraphThemePalette = {
  centerGuide: '#9A6A00',
  edgeRelated: '#486EC8',
  edgeMuted: '#8894A8',
  nodeHighlight: '#1C8FB4',
  label: '#2A3443',
}

const DARK_GRAPH_PALETTE: GraphThemePalette = {
  centerGuide: '#FFD166',
  edgeRelated: '#8FB0FF',
  edgeMuted: '#6F7891',
  nodeHighlight: '#66CDE9',
  label: '#E6EEF9',
}

export function getGraphThemePalette(themeMode: GraphThemeMode): GraphThemePalette {
  return themeMode === 'dark' ? DARK_GRAPH_PALETTE : LIGHT_GRAPH_PALETTE
}
