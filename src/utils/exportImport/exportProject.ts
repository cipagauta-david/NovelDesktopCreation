import type { ExportedProject, Project } from '../../types/workspace'
import { isoNow } from '../workspace'
import { getPlatformFileAdapter } from '../../platform/fileAdapter'

const CURRENT_EXPORT_VERSION = 1

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]+/g, '_')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 80)
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function exportProject(project: Project): Promise<string> {
  const projectPayload = JSON.stringify(project)
  const checksum = await sha256Hex(projectPayload)

  const exported: ExportedProject = {
    version: CURRENT_EXPORT_VERSION,
    exportedAt: isoNow(),
    checksum,
    checksumAlgorithm: 'SHA-256',
    project,
  }
  return JSON.stringify(exported, null, 2)
}

export async function downloadProjectAsJson(project: Project): Promise<void> {
  const json = await exportProject(project)
  const fileName = `${sanitizeFilename(project.name)}-${Date.now()}.json`
  await getPlatformFileAdapter().downloadTextFile(fileName, json, 'application/json')
}
