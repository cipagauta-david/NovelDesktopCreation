import type { RefToken } from '../types/workspace'

export function buildStructuredReference(entityId: string, label: string): string {
  return `{{entity:${entityId}|${label}}}`
}

export function getReferenceTokens(content: string): RefToken[] {
  const matches = content.matchAll(/\{\{entity:([^|}]+)\|([^}]+)\}\}/g)
  return Array.from(matches, ([raw, entityId, label]) => ({ raw, entityId, label }))
}

export function getPlainSnippet(content: string): string {
  return content
    .replace(/\{\{entity:[^|}]+\|([^}]+)\}\}/g, '$1')
    .replace(/[#>*_`-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
