import type { PersistedState } from '../../types/workspace'

export type PluginCapability = 'workspace:read' | 'workspace:write'

export type PluginCommand = {
  name: string
  payload?: unknown
}

export type PluginReadonlyContext = {
  workspace: Readonly<PersistedState>
}

export type PluginWritableContext = PluginReadonlyContext & {
  applyWorkspaceUpdate: (updater: (current: PersistedState) => PersistedState) => void
}

export type PluginContext = PluginReadonlyContext | PluginWritableContext

export type PluginDefinition = {
  id: string
  name: string
  version: string
  capabilities: PluginCapability[]
  onCommand: (command: PluginCommand, context: PluginContext) => Promise<void> | void
}
