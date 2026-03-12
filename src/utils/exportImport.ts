/**
 * Import/Export de proyectos con validación y recuperación segura.
 */

import type { ExportedProject, Project } from '../types/workspace'
import { uid, isoNow, createHistoryEvent } from './workspace'

const CURRENT_EXPORT_VERSION = 1

// ── Export ──────────────────────────────────────────────────

export function exportProject(project: Project): string {
  const exported: ExportedProject = {
    version: CURRENT_EXPORT_VERSION,
    exportedAt: isoNow(),
    project,
  }
  return JSON.stringify(exported, null, 2)
}

export function downloadProjectAsJson(project: Project): void {
  const json = exportProject(project)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitizeFilename(project.name)}-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]+/g, '_')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 80)
}

// ── Import ──────────────────────────────────────────────────

export type ImportResult =
  | { ok: true; project: Project }
  | { ok: false; error: string }

export function parseImportedProject(rawJson: string): ImportResult {
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

  // Detect format: ExportedProject wrapper or raw Project
  let project: Record<string, unknown>
  if (typeof candidate.version === 'number' && candidate.project) {
    project = candidate.project as Record<string, unknown>
  } else if (typeof candidate.name === 'string' && Array.isArray(candidate.tabs)) {
    project = candidate
  } else {
    return { ok: false, error: 'El archivo no contiene un proyecto válido. Se esperan campos name, tabs, entities.' }
  }

  // Validate required fields
  const errors: string[] = []
  if (typeof project.name !== 'string' || !project.name.trim()) errors.push('Falta el nombre del proyecto')
  if (!Array.isArray(project.tabs) || project.tabs.length === 0) errors.push('Falta al menos una colección (tab)')
  if (!Array.isArray(project.entities)) errors.push('Falta el array de entidades')

  if (errors.length > 0) {
    return { ok: false, error: `Validación fallida: ${errors.join('; ')}` }
  }

  // Re-assign IDs to avoid collisions on import
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

  // Remap entity references in content: {{entity:OLD_ID|Label}} → {{entity:NEW_ID|Label}}
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

function remapReferences(content: string, idMap: Map<string, string>): string {
  return content.replace(
    /\{\{entity:([^|}]+)\|([^}]+)\}\}/g,
    (_match, oldId: string, label: string) => {
      const newId = idMap.get(oldId) ?? oldId
      return `{{entity:${newId}|${label}}}`
    },
  )
}

/**
 * Abre un file input y lee el proyecto importado.
 */
export function promptFileImport(): Promise<ImportResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'

    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        resolve({ ok: false, error: 'No se seleccionó archivo.' })
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const text = reader.result as string
        resolve(parseImportedProject(text))
      }
      reader.onerror = () => {
        resolve({ ok: false, error: 'Error leyendo el archivo.' })
      }
      reader.readAsText(file)
    }

    input.oncancel = () => {
      resolve({ ok: false, error: 'Importación cancelada.' })
    }

    input.click()
  })
}
