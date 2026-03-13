import type { PersistedState } from '../../types/workspace'
import type { PluginCommand, PluginContext, PluginDefinition } from './types'
import { z } from 'zod'

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

const PluginManifestSchema = z.object({
  id: z.string().trim().min(3),
  name: z.string().trim().min(1),
  version: z.string().trim().regex(/^\d+\.\d+\.\d+/),
  capabilities: z.array(z.enum(['workspace:read', 'workspace:write'])).min(1),
  executionBudgetMs: z.number().int().positive().max(60_000).optional(),
  maxCommandsPerMinute: z.number().int().positive().max(600).optional(),
  onCommand: z.function({
    input: [z.object({ name: z.string(), payload: z.unknown().optional() }), z.any()],
    output: z.union([z.void(), z.promise(z.void())]),
  }),
})

function freezeReadonlyWorkspace(workspace: PersistedState): Readonly<PersistedState> {
  return Object.freeze(structuredClone(workspace))
}

export function createPluginManager(): PluginManager {
  const registry = new Map<string, PluginDefinition>()
  const queueByPlugin = new Map<string, Promise<void>>()
  const timestampsByPlugin = new Map<string, number[]>()

  function enqueue(pluginId: string, run: () => Promise<void>): Promise<void> {
    const current = queueByPlugin.get(pluginId) ?? Promise.resolve()
    const next = current.then(run, run)
    queueByPlugin.set(pluginId, next.catch(() => undefined))
    return next
  }

  function checkRateLimit(plugin: PluginDefinition): void {
    const maxPerMinute = plugin.maxCommandsPerMinute ?? 120
    const now = Date.now()
    const threshold = now - 60_000
    const timestamps = (timestampsByPlugin.get(plugin.id) ?? []).filter((value) => value >= threshold)
    if (timestamps.length >= maxPerMinute) {
      throw new Error(`Plugin ${plugin.id} excedió el límite de ${maxPerMinute} comandos/minuto`)
    }
    timestamps.push(now)
    timestampsByPlugin.set(plugin.id, timestamps)
  }

  return {
    register(plugin) {
      PluginManifestSchema.parse(plugin)
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

      checkRateLimit(plugin)

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

      await enqueue(plugin.id, async () => {
        const budget = plugin.executionBudgetMs ?? 5_000
        await Promise.race([
          Promise.resolve(plugin.onCommand(command, context)),
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Plugin ${plugin.id} excedió budget de ${budget}ms`))
            }, budget)
          }),
        ])
      })
    },
  }
}
