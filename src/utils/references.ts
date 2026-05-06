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
    // Resolve structured entity references → label
    .replace(/\{\{entity:[^|}]+\|([^}]+)\}\}/g, '$1')
    // Strip fenced code blocks entirely
    .replace(/```[\s\S]*?```/g, '')
    // Strip inline code
    .replace(/`[^`]*`/g, '')
    // Strip images
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    // Strip links → keep label
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // Strip bold/italic markers (**, __, *, _)
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Strip headings
    .replace(/^#{1,6}\s+/gm, '')
    // Strip blockquotes
    .replace(/^>+\s*/gm, '')
    // Strip horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Strip list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
}
