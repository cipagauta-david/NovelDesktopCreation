import type { LlmTraceEntry, Provider } from '../../types/workspace'
import type { LlmRequestInput } from './types'
import { buildUserPrompt } from './prompt'

function traceUid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.8)
}

export function buildTrace(
  input: LlmRequestInput,
  provider: Provider,
  response: string,
  durationMs: number,
  status: LlmTraceEntry['status'],
  errorDetail?: string,
): LlmTraceEntry {
  return {
    id: traceUid('trace'),
    correlationId: input.correlationId,
    timestamp: new Date().toISOString(),
    provider,
    model: input.model,
    promptSnippet: buildUserPrompt(input).slice(0, 200),
    responseSnippet: response.slice(0, 300),
    durationMs,
    tokenEstimate: estimateTokens(buildUserPrompt(input) + response),
    status,
    errorDetail,
  }
}
