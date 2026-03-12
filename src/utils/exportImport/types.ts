import type { Project } from '../../types/workspace'

export type ImportResult =
  | { ok: true; project: Project }
  | { ok: false; error: string }
