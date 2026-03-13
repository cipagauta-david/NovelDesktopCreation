import type { PersistedState } from '../../types/workspace'
import type { PluginCommand, PluginContext, PluginDefinition } from './types'

export type PluginManager = {
  register: (plugin: PluginDefinition) => void
  list: () => PluginDefinition[]
  runCommand: (
    pluginId: string,
    command: PluginCommand,
    args: {
      workspace: PersistedState
      applyWorkspaceUpdate: (updater: (current: PersistedState) => PersistedState) => void
    },
  ) => Promise<void>
}

function freezeReadonlyWorkspace(workspace: PersistedState): Readonly<PersistedState> {
  return Object.freeze(structuredClone(workspace))
}

export function createPluginManager(): PluginManager {
  const registry = new Map<string, PluginDefinition>()

  return {
    register(plugin) {
      registry.set(plugin.id, plugin)
    },

    list() {
      return Array.from(registry.values())
    },

    async runCommand(pluginId, command, args) {
      const plugin = registry.get(pluginId)
      if (!plugin) {
        throw new Error(`Plugin no encontrado: ${pluginId}`)
      }

      const readonlyWorkspace = freezeReadonlyWorkspace(args.workspace)
      const canWrite = plugin.capabilities.includes('workspace:write')

      const context: PluginContext = canWrite
        ? {
            workspace: readonlyWorkspace,
            applyWorkspaceUpdate: args.applyWorkspaceUpdate,
          }
        : {
            workspace: readonlyWorkspace,
          }

      await Promise.resolve(plugin.onCommand(command, context))
    },
  }
}
