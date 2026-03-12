import type { ExportedProject, Project } from '../../types/workspace'
import { isoNow } from '../workspace'

const CURRENT_EXPORT_VERSION = 1

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]+/g, '_')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 80)
}

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
