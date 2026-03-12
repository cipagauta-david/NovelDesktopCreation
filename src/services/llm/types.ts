import type { Provider, LlmTraceEntry } from '../../types/workspace'

export type LlmRequestInput = {
  provider: Provider
  model: string
  apiKey?: string
  tabPrompt: string
  entityTitle: string
  entityContent: string
}

export type StreamCallbacks = {
  onToken: (chunk: string) => void
  onDone: (fullText: string) => void
  onError: (error: import('../llmErrors').LlmError) => void
  onTrace: (trace: LlmTraceEntry) => void
}
