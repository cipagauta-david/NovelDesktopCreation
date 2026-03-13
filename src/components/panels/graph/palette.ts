import type { GraphCategory } from './contracts'

type Palette = {
  fill: string
  stroke: string
  halo: string
}

export function getCategoryPalette(category: GraphCategory, isDarkTheme: boolean): Palette {
  if (category === 'chapters') {
    return {
      fill: isDarkTheme ? 'rgba(59, 130, 246, 0.82)' : 'rgba(37, 99, 235, 0.92)',
      stroke: isDarkTheme ? 'rgba(147, 197, 253, 0.96)' : 'rgba(30, 64, 175, 0.96)',
      halo: isDarkTheme ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.28)',
    }
  }

  if (category === 'characters') {
    return {
      fill: isDarkTheme ? 'rgba(249, 115, 22, 0.82)' : 'rgba(234, 88, 12, 0.9)',
      stroke: isDarkTheme ? 'rgba(253, 186, 116, 0.96)' : 'rgba(194, 65, 12, 0.96)',
      halo: isDarkTheme ? 'rgba(249, 115, 22, 0.34)' : 'rgba(249, 115, 22, 0.25)',
    }
  }

  if (category === 'world') {
    return {
      fill: isDarkTheme ? 'rgba(20, 184, 166, 0.8)' : 'rgba(13, 148, 136, 0.9)',
      stroke: isDarkTheme ? 'rgba(94, 234, 212, 0.92)' : 'rgba(15, 118, 110, 0.96)',
      halo: isDarkTheme ? 'rgba(20, 184, 166, 0.3)' : 'rgba(20, 184, 166, 0.22)',
    }
  }

  return {
    fill: isDarkTheme ? 'rgba(148, 163, 184, 0.74)' : 'rgba(100, 116, 139, 0.84)',
    stroke: isDarkTheme ? 'rgba(226, 232, 240, 0.88)' : 'rgba(51, 65, 85, 0.9)',
    halo: isDarkTheme ? 'rgba(148, 163, 184, 0.25)' : 'rgba(148, 163, 184, 0.18)',
  }
}
