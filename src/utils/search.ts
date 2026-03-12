import type { EntityRecord } from '../types/workspace'
import { getPlainSnippet } from './references'

export function scoreEntity(entity: EntityRecord, query: string): number {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return 0
  }

  const title = entity.title.toLowerCase()
  const aliases = entity.aliases.join(' ').toLowerCase()
  const tags = entity.tags.join(' ').toLowerCase()
  const fields = entity.fields.map((field) => `${field.key} ${field.value}`).join(' ').toLowerCase()
  const content = getPlainSnippet(entity.content).toLowerCase()

  let score = 0
  if (title.includes(normalizedQuery)) score += title.startsWith(normalizedQuery) ? 120 : 90
  if (aliases.includes(normalizedQuery)) score += 70
  if (tags.includes(normalizedQuery)) score += 50
  if (fields.includes(normalizedQuery)) score += 35
  if (content.includes(normalizedQuery)) score += 15
  return score
}

export function buildSnippet(entity: EntityRecord, query: string): string {
  const source =
    getPlainSnippet(entity.content) ||
    entity.fields.map((field) => `${field.key}: ${field.value}`).join(' · ')
  if (!query.trim()) {
    return source.slice(0, 140)
  }
  const normalizedQuery = query.toLowerCase()
  const index = source.toLowerCase().indexOf(normalizedQuery)
  if (index === -1) {
    return source.slice(0, 140)
  }
  const start = Math.max(0, index - 42)
  return source.slice(start, start + 160)
}
