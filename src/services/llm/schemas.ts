import { z } from 'zod'

import type { Provider } from '../../types/workspace'
import { LlmError } from '../llmErrors'

const providerValues = ['OpenAI', 'Anthropic', 'Google Gemini', 'OpenRouter', 'Local/Ollama'] as const

export const ProviderSchema = z.enum(providerValues)

export const LlmRequestInputSchema = z.object({
  provider: ProviderSchema,
  model: z.string().trim().min(1),
  apiKey: z.string().trim().min(1).optional(),
  tabPrompt: z.string(),
  entityTitle: z.string().trim().min(1),
  entityContent: z.string(),
})

export const OpenAiStreamChunkSchema = z.object({
  choices: z.array(z.object({
    delta: z.object({
      content: z.string().optional(),
    }).optional(),
  })).min(1),
})

export const AnthropicContentBlockDeltaSchema = z.object({
  delta: z.object({
    text: z.string().optional(),
  }).optional(),
})

export const GeminiResponseSchema = z.object({
  candidates: z.array(
    z.object({
      content: z.object({
        parts: z.array(z.object({ text: z.string().optional() })).optional(),
      }).optional(),
    }),
  ).optional(),
})

export const OllamaResponseSchema = z.object({
  response: z.string(),
})

export const FieldValueSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
})

export const AssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  dataUrl: z.string(),
})

export const HistoryEventSchema = z.object({
  id: z.string(),
  label: z.string(),
  details: z.string(),
  timestamp: z.string(),
  actorType: z.enum(['user', 'ai', 'system']),
})

export const ChangeEventSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  actorType: z.enum(['user', 'ai', 'system']),
  label: z.string(),
  details: z.string(),
  projectId: z.string().optional(),
  tabId: z.string().optional(),
  entityId: z.string().optional(),
  source: z.enum(['legacy-history', 'mutation']),
})

export const EntityRecordSchema = z.object({
  id: z.string(),
  tabId: z.string(),
  title: z.string(),
  content: z.string(),
  templateId: z.string(),
  tags: z.array(z.string()),
  aliases: z.array(z.string()),
  fields: z.array(FieldValueSchema),
  assets: z.array(AssetSchema),
  status: z.enum(['active', 'archived']),
  revision: z.number(),
  updatedAt: z.string(),
  history: z.array(HistoryEventSchema),
})

export const FtsSearchResultSchema = z.object({
  entityId: z.string(),
  tabId: z.string(),
  title: z.string(),
  snippet: z.string(),
  score: z.number(),
})

export const PersistedStateSchema = z.object({
  settings: z.object({
    authorName: z.string(),
    provider: ProviderSchema,
    model: z.string(),
    apiKeyHint: z.string(),
    apiKey: z.string().optional(),
  }).nullable(),
  projects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    tabs: z.array(z.object({
      id: z.string(),
      name: z.string(),
      prompt: z.string(),
      icon: z.string(),
    })),
    entities: z.array(EntityRecordSchema),
    templates: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      fields: z.array(z.string()),
      defaultContent: z.string(),
    })),
    history: z.array(HistoryEventSchema),
  })),
  activeProjectId: z.string(),
  activeTabId: z.string(),
  activeEntityId: z.string(),
  changeLog: z.array(ChangeEventSchema).default([]),
  graphLayouts: z.record(z.string(), z.record(z.string(), z.object({ x: z.number(), y: z.number() }))).optional(),
  llmTraces: z.array(z.object({
    id: z.string(),
    timestamp: z.string(),
    provider: ProviderSchema,
    model: z.string(),
    promptSnippet: z.string(),
    responseSnippet: z.string(),
    durationMs: z.number(),
    tokenEstimate: z.number(),
    status: z.enum(['ok', 'error', 'fallback', 'cancelled']),
    errorDetail: z.string().optional(),
  })).optional(),
})

const validationCounters = new Map<string, number>()

function bumpValidationMetric(provider: Provider, contract: string): void {
  const key = `${provider}:${contract}`
  validationCounters.set(key, (validationCounters.get(key) ?? 0) + 1)
}

export function getValidationFailureMetrics(): Record<string, number> {
  return Object.fromEntries(validationCounters.entries())
}

export function parseWithContract<T>(
  schema: z.ZodType<T>,
  payload: unknown,
  opts: {
    provider: Provider
    contract: string
    message: string
  },
): T {
  const result = schema.safeParse(payload)
  if (result.success) {
    return result.data
  }

  bumpValidationMetric(opts.provider, opts.contract)
  const detail = result.error.issues[0]?.message ?? 'payload inválido'
  throw new LlmError({
    provider: opts.provider,
    message: `${opts.message}: ${detail}`,
    category: 'contract',
    retryable: false,
  })
}
