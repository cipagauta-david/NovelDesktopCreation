import type { Project } from '../../types/workspace'
import { createHistoryEvent, isoNow, uid } from '../workspace'
import type { ImportResult } from './types'
import { getPlatformFileAdapter } from '../../platform/fileAdapter'

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function remapReferences(content: string, idMap: Map<string, string>): string {
  return content.replace(
    /\{\{entity:([^|}]+)\|([^}]+)\}\}/g,
    (_match, oldId: string, label: string) => {
      const newId = idMap.get(oldId) ?? oldId
      return `{{entity:${newId}|${label}}}`
    },
  )
}

export async function parseImportedProject(rawJson: string): Promise<ImportResult> {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    return { ok: false, error: 'El archivo no contiene JSON válido.' }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Formato no reconocido.' }
  }

  const candidate = parsed as Record<string, unknown>

  let project: Record<string, unknown>
  if (typeof candidate.version === 'number' && candidate.project) {
    if (candidate.version !== 1) {
      return { ok: false, error: `Versión de exportación no soportada: ${String(candidate.version)}.` }
    }

    if (typeof candidate.checksum === 'string' && candidate.checksum) {
      const algorithm = candidate.checksumAlgorithm
      if (algorithm !== 'SHA-256') {
        return { ok: false, error: 'Algoritmo de checksum no soportado. Se esperaba SHA-256.' }
      }

      const projectCandidate = candidate.project as Record<string, unknown>
      const computed = await sha256Hex(JSON.stringify(projectCandidate))
      if (computed !== candidate.checksum) {
        return { ok: false, error: 'El checksum del archivo no coincide. El proyecto puede estar corrupto o alterado.' }
      }
    }
    project = candidate.project as Record<string, unknown>
  } else if (typeof candidate.name === 'string' && Array.isArray(candidate.tabs)) {
    project = candidate
  } else {
    return { ok: false, error: 'El archivo no contiene un proyecto válido. Se esperan campos name, tabs, entities.' }
  }

  const errors: string[] = []
  if (typeof project.name !== 'string' || !project.name.trim()) errors.push('Falta el nombre del proyecto')
  if (!Array.isArray(project.tabs) || project.tabs.length === 0) errors.push('Falta al menos una colección (tab)')
  if (!Array.isArray(project.entities)) errors.push('Falta el array de entidades')

  if (errors.length > 0) {
    return { ok: false, error: `Validación fallida: ${errors.join('; ')}` }
  }

  const idMap = new Map<string, string>()

  const tabs = (project.tabs as Array<Record<string, unknown>>).map((tab) => {
    const newId = uid('tab')
    idMap.set(tab.id as string, newId)
    return {
      id: newId,
      name: String(tab.name ?? 'Colección importada'),
      icon: String(tab.icon ?? '📁'),
      prompt: String(tab.prompt ?? ''),
    }
  })

  const templates = Array.isArray(project.templates)
    ? (project.templates as Array<Record<string, unknown>>).map((t) => {
        const newId = uid('template')
        idMap.set(t.id as string, newId)
        return {
          id: newId,
          name: String(t.name ?? 'Template importado'),
          description: String(t.description ?? ''),
          fields: Array.isArray(t.fields) ? (t.fields as string[]) : [],
          defaultContent: String(t.defaultContent ?? ''),
        }
      })
    : []

  const entities = Array.isArray(project.entities)
    ? (project.entities as Array<Record<string, unknown>>).map((e) => {
        const newId = uid('entity')
        const oldId = e.id as string
        idMap.set(oldId, newId)
        return {
          id: newId,
          tabId: idMap.get(e.tabId as string) ?? tabs[0]?.id ?? '',
          title: String(e.title ?? 'Entidad importada'),
          content: String(e.content ?? ''),
          templateId: idMap.get(e.templateId as string) ?? templates[0]?.id ?? '',
          tags: Array.isArray(e.tags) ? (e.tags as string[]) : [],
          aliases: Array.isArray(e.aliases) ? (e.aliases as string[]) : [],
          fields: Array.isArray(e.fields)
            ? (e.fields as Array<Record<string, unknown>>).map((f) => ({
                id: uid('field'),
                key: String(f.key ?? ''),
                value: String(f.value ?? ''),
              }))
            : [],
          assets: Array.isArray(e.assets)
            ? (e.assets as Array<Record<string, unknown>>).map((a) => ({
                id: uid('asset'),
                name: String(a.name ?? ''),
                mimeType: String(a.mimeType ?? 'image/*'),
                dataUrl: String(a.dataUrl ?? ''),
              }))
            : [],
          status: e.status === 'archived' ? ('archived' as const) : ('active' as const),
          revision: typeof e.revision === 'number' ? e.revision : 1,
          updatedAt: typeof e.updatedAt === 'string' ? e.updatedAt : isoNow(),
          history: [
            createHistoryEvent('Importado', 'Entidad importada desde archivo externo.', 'system'),
          ],
        }
      })
    : []

  for (const entity of entities) {
    entity.content = remapReferences(entity.content, idMap)
  }

  const now = isoNow()
  const importedProject: Project = {
    id: uid('project'),
    name: `${String(project.name)} (importado)`,
    description: String(project.description ?? 'Proyecto importado desde archivo externo.'),
    createdAt: now,
    updatedAt: now,
    tabs,
    entities,
    templates,
    history: [
      createHistoryEvent('Proyecto importado', `Importado desde archivo JSON con ${entities.length} entidades.`, 'system'),
    ],
  }

  return { ok: true, project: importedProject }
}

export function promptFileImport(): Promise<ImportResult> {
  return (async () => {
    const rawText = await getPlatformFileAdapter().pickTextFile('.json,application/json')
    if (!rawText) {
      return { ok: false, error: 'Importación cancelada.' }
    }
    return parseImportedProject(rawText)
  })()
}
