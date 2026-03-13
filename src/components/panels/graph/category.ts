import type { GraphCategory } from './contracts'

export const GRAPH_CATEGORY_LABEL: Record<GraphCategory, string> = {
  chapters: 'Capítulos',
  characters: 'Personajes',
  world: 'Mundo',
  other: 'Otros',
}

export function getNodeCategory(tabName: string): GraphCategory {
  const normalized = tabName.toLowerCase()
  if (normalized.includes('cap') || normalized.includes('escena') || normalized.includes('historia')) {
    return 'chapters'
  }
  if (normalized.includes('person')) {
    return 'characters'
  }
  if (normalized.includes('mundo') || normalized.includes('lógica') || normalized.includes('escenario') || normalized.includes('lugar')) {
    return 'world'
  }
  return 'other'
}
