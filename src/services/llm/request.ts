import type { Provider } from '../../types/workspace'
import { LlmError, classifyFetchError, retryDelay } from '../llmErrors'
import { addBreadcrumb, captureException } from '../observability'
import { endSpanError, endSpanOk, startSpan } from '../tracing'
import { buildUserPrompt } from './prompt'
import { LlmRequestInputSchema, ProviderSchema, parseWithContract } from './schemas'
import { buildTrace } from './trace'
import { executeProviderRequest, getDefaultModelForProvider } from './providers'
import type { LlmRequestInput, StreamCallbacks } from './types'

const MAX_RETRIES = 3
const FALLBACK_ORDER: Provider[] = ['OpenAI', 'OpenRouter', 'Anthropic', 'Google Gemini', 'Local/Ollama']

function resolveProvider(value: unknown): Provider {
  const parsed = ProviderSchema.safeParse(value)
  return parsed.success ? parsed.data : 'OpenAI'
}

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
  const validatedInput = parseWithContract(LlmRequestInputSchema, input, {
    provider: resolveProvider(input.provider),
    contract: 'llm-request-input',
    message: 'Configuración inválida para solicitud LLM',
  })

  const userPrompt = buildUserPrompt(validatedInput)
  addBreadcrumb('Inicio de solicitud LLM', 'llm.request', {
    provider: validatedInput.provider,
    model: validatedInput.model,
  })

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (signal.aborted) {
      callbacks.onError(new LlmError({ provider: validatedInput.provider, message: 'Cancelled', category: 'cancelled', retryable: false }))
      return
    }

    const startTime = Date.now()
    const requestSpan = startSpan('llm.request', {
      provider: validatedInput.provider,
      model: validatedInput.model,
      attempt,
    })
    let firstTokenMarked = false

    const tracedCallbacks: StreamCallbacks = {
      ...callbacks,
      onToken(chunk) {
        if (!firstTokenMarked) {
          firstTokenMarked = true
          const firstTokenMs = Date.now() - startTime
          const firstTokenSpan = startSpan('llm.first_token', {
            provider: validatedInput.provider,
            model: validatedInput.model,
          })
          endSpanOk(firstTokenSpan, { firstTokenMs })
          requestSpan.setAttribute('firstTokenMs', firstTokenMs)
        }
        callbacks.onToken(chunk)
      },
    }

    try {
      await executeProviderRequest(validatedInput, signal, tracedCallbacks, startTime, userPrompt)
      endSpanOk(requestSpan, {
        durationMs: Date.now() - startTime,
        status: 'ok',
      })
      return
    } catch (err) {
      const llmErr = classifyFetchError(err, validatedInput.provider)
      endSpanError(requestSpan, llmErr, {
        durationMs: Date.now() - startTime,
        category: llmErr.category,
      })

      if (llmErr.category === 'cancelled') {
        callbacks.onTrace(buildTrace(validatedInput, validatedInput.provider, '', Date.now() - startTime, 'cancelled'))
        callbacks.onError(llmErr)
        return
      }

      if (!llmErr.retryable || attempt === MAX_RETRIES) {
        const fallbackResult = await tryFallbackProviders(validatedInput, signal, callbacks)
        if (!fallbackResult) {
          callbacks.onTrace(buildTrace(validatedInput, validatedInput.provider, '', Date.now() - startTime, 'error', llmErr.message))
          callbacks.onError(llmErr)
          captureException(llmErr, {
            provider: validatedInput.provider,
            model: validatedInput.model,
            attempt,
          })
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
