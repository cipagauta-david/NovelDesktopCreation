import type { PersistedState } from '../../types/workspace'
import type { PluginAuditEvent, PluginCommand, PluginContext, PluginDefinition } from './types'
import { z } from 'zod'

export type PluginManager = {
  register: (plugin: PluginDefinition) => void
  list: () => PluginDefinition[]
  disable: (pluginId: string) => void
  enable: (pluginId: string) => void
  getAuditTrail: () => PluginAuditEvent[]
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
  commandPermissions: z.record(z.string(), z.array(z.enum(['command:read', 'command:write', 'command:dangerous']))).optional(),
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
  const disabledPlugins = new Set<string>()
  const auditTrail: PluginAuditEvent[] = []
  const queueByPlugin = new Map<string, Promise<void>>()
  const timestampsByPlugin = new Map<string, number[]>()

  function audit(pluginId: string, commandName: string, status: PluginAuditEvent['status'], detail: string): void {
    auditTrail.unshift({
      id: `${pluginId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      pluginId,
      commandName,
      status,
      detail,
      timestamp: new Date().toISOString(),
    })
    if (auditTrail.length > 500) {
      auditTrail.length = 500
    }
  }

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

  function checkCommandPermission(plugin: PluginDefinition, command: PluginCommand): void {
    const permissions = plugin.commandPermissions?.[command.name] ?? []
    if (permissions.length === 0) {
      return
    }

    if (permissions.includes('command:dangerous') && !plugin.capabilities.includes('workspace:write')) {
      throw new Error(`Plugin ${plugin.id} requiere workspace:write para comando peligroso`)
    }
  }

  return {
    register(plugin) {
      PluginManifestSchema.parse(plugin)
      registry.set(plugin.id, plugin)
    },

    list() {
      return Array.from(registry.values())
    },

    disable(pluginId) {
      disabledPlugins.add(pluginId)
    },

    enable(pluginId) {
      disabledPlugins.delete(pluginId)
    },

    getAuditTrail() {
      return [...auditTrail]
    },

    async runCommand(pluginId, command, args) {
      const plugin = registry.get(pluginId)
      if (!plugin) {
        throw new Error(`Plugin no encontrado: ${pluginId}`)
      }

      if (disabledPlugins.has(pluginId)) {
        audit(plugin.id, command.name, 'rejected', 'Plugin deshabilitado por kill-switch')
        throw new Error(`Plugin ${pluginId} deshabilitado por kill-switch`)
      }

      try {
        checkRateLimit(plugin)
        checkCommandPermission(plugin, command)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Comando bloqueado'
        audit(plugin.id, command.name, 'rejected', message)
        throw error
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

      await enqueue(plugin.id, async () => {
        const budget = plugin.executionBudgetMs ?? 5_000
        await Promise.race([
          Promise.resolve(plugin.onCommand(command, context)).then(() => {
            audit(plugin.id, command.name, 'ok', 'Comando ejecutado')
          }),
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Plugin ${plugin.id} excedió budget de ${budget}ms`))
            }, budget)
          }),
        ]).catch((error) => {
          const message = error instanceof Error ? error.message : 'Error en comando de plugin'
          audit(plugin.id, command.name, 'failed', message)
          throw error
        })
      })
    },
  }
}
