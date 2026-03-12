import type { Provider } from '../../types/workspace'
import { LlmError, classifyFetchError, retryDelay } from '../llmErrors'
import { buildUserPrompt } from './prompt'
import { buildTrace } from './trace'
import { executeProviderRequest, getDefaultModelForProvider } from './providers'
import type { LlmRequestInput, StreamCallbacks } from './types'

const MAX_RETRIES = 3
const FALLBACK_ORDER: Provider[] = ['OpenAI', 'OpenRouter', 'Anthropic', 'Google Gemini', 'Local/Ollama']

async function tryFallbackProviders(
  originalInput: LlmRequestInput,
  signal: AbortSignal,
  callbacks: StreamCallbacks,
): Promise<boolean> {
  const fallbacks = FALLBACK_ORDER.filter((p) => p !== originalInput.provider)

  for (const provider of fallbacks) {
    if (signal.aborted) return false
    if (provider !== 'Local/Ollama' && !originalInput.apiKey) continue

    const fallbackInput: LlmRequestInput = {
      ...originalInput,
      provider,
      model: getDefaultModelForProvider(provider),
    }

    const startTime = Date.now()
    try {
      await executeProviderRequest(
        fallbackInput,
        signal,
        {
          ...callbacks,
          onTrace: (trace) => callbacks.onTrace({ ...trace, status: 'fallback' }),
        },
        startTime,
        buildUserPrompt(fallbackInput),
      )
      return true
    } catch {
      continue
    }
  }

  return false
}

export async function requestLlmStreaming(
  input: LlmRequestInput,
  signal: AbortSignal,
  callbacks: StreamCallbacks,
): Promise<void> {
  const userPrompt = buildUserPrompt(input)

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (signal.aborted) {
      callbacks.onError(new LlmError({ provider: input.provider, message: 'Cancelled', category: 'cancelled', retryable: false }))
      return
    }

    const startTime = Date.now()
    try {
      await executeProviderRequest(input, signal, callbacks, startTime, userPrompt)
      return
    } catch (err) {
      const llmErr = classifyFetchError(err, input.provider)

      if (llmErr.category === 'cancelled') {
        callbacks.onTrace(buildTrace(input, input.provider, '', Date.now() - startTime, 'cancelled'))
        callbacks.onError(llmErr)
        return
      }

      if (!llmErr.retryable || attempt === MAX_RETRIES) {
        const fallbackResult = await tryFallbackProviders(input, signal, callbacks)
        if (!fallbackResult) {
          callbacks.onTrace(buildTrace(input, input.provider, '', Date.now() - startTime, 'error', llmErr.message))
          callbacks.onError(llmErr)
        }
        return
      }

      const delay = retryDelay(attempt)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

export async function requestLlmProposal(input: LlmRequestInput): Promise<string> {
  return new Promise((resolve, reject) => {
    let fullText = ''
    const controller = new AbortController()

    requestLlmStreaming(
      input,
      controller.signal,
      {
        onToken: (chunk) => {
          fullText += chunk
        },
        onDone: () => resolve(fullText),
        onError: (err) => reject(err),
        onTrace: () => {},
      },
    ).catch(reject)
  })
}
