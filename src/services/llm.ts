import type { Provider, LlmTraceEntry } from '../types/workspace'
import { LlmError, classifyFetchError, retryDelay } from './llmErrors'
import { fetchEventSource } from '@microsoft/fetch-event-source'

// ── Tipos ───────────────────────────────────────────────────

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
  onError: (error: LlmError) => void
  onTrace: (trace: LlmTraceEntry) => void
}

// ── Constantes ──────────────────────────────────────────────

const SYSTEM_PROMPT =
  'Eres un asistente editorial para narrativa. Debes proponer mejoras concretas y breves en español.'
const MAX_ENTITY_CONTENT_LENGTH = 4000
const MAX_ERROR_DETAIL_LENGTH = 240
const ANTHROPIC_MAX_TOKENS = 700
const MAX_RETRIES = 3

// ── Fallback provider order ─────────────────────────────────

const FALLBACK_ORDER: Provider[] = ['OpenAI', 'OpenRouter', 'Anthropic', 'Google Gemini', 'Local/Ollama']

function buildUserPrompt(input: LlmRequestInput) {
  return [
    `Entidad: ${input.entityTitle}`,
    `Contexto de tab: ${input.tabPrompt || 'Sin prompt definido.'}`,
    'Contenido actual:',
    input.entityContent.slice(0, MAX_ENTITY_CONTENT_LENGTH) || '(vacío)',
    '',
    'Devuelve 3 bullets de mejora narrativa y una nota breve de continuidad.',
  ].join('\n')
}

function traceUid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.8)
}

// ── Extract text from non-streaming responses ───────────────

function extractTextFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const candidate = payload as Record<string, unknown>

  const openAiLike = candidate.choices
  if (Array.isArray(openAiLike) && openAiLike.length > 0) {
    const choice = openAiLike[0] as Record<string, unknown>
    const message = choice.message as Record<string, unknown> | undefined
    if (message && typeof message.content === 'string') return message.content
  }

  const anthropicContent = candidate.content
  if (Array.isArray(anthropicContent) && anthropicContent.length > 0) {
    const first = anthropicContent[0] as Record<string, unknown>
    if (typeof first.text === 'string') return first.text
  }

  const geminiCandidates = candidate.candidates
  if (Array.isArray(geminiCandidates) && geminiCandidates.length > 0) {
    const first = geminiCandidates[0] as Record<string, unknown>
    const content = first.content as Record<string, unknown> | undefined
    const parts = content?.parts as Array<Record<string, unknown>> | undefined
    const text = parts?.find((part) => typeof part.text === 'string')?.text
    if (typeof text === 'string') return text
  }

  const ollamaResponse = candidate.response
  if (typeof ollamaResponse === 'string') return ollamaResponse

  return ''
}

// ── Fetch con clasificación de errores ──────────────────────

async function safeFetch(url: string, init: RequestInit, provider: Provider): Promise<unknown> {
  const response = await fetch(url, init)
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new LlmError({
      provider,
      message: `LLM ${response.status}: ${detail.slice(0, MAX_ERROR_DETAIL_LENGTH)}`,
      httpStatus: response.status,
    })
  }
  return response.json()
}

// ── Streaming endpoints (SSE) ───────────────────────────────

async function streamOpenAiCompatible(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  provider: Provider,
  signal: AbortSignal,
  callbacks: StreamCallbacks,
  startTime: number,
  input: LlmRequestInput,
): Promise<void> {
  let fullText = ''

  await fetchEventSource(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ ...body, stream: true }),
    signal,
    onmessage(event) {
      if (event.data === '[DONE]') return
      try {
        const parsed = JSON.parse(event.data)
        const delta = parsed?.choices?.[0]?.delta?.content ?? ''
        if (delta) {
          fullText += delta
          callbacks.onToken(delta)
        }
      } catch { /* ignore parse errors on stream chunks */ }
    },
    onclose() {
      const duration = Date.now() - startTime
      callbacks.onDone(fullText)
      callbacks.onTrace(buildTrace(input, provider, fullText, duration, 'ok'))
    },
    onerror(err) {
      throw classifyFetchError(err, provider)
    },
    openWhenHidden: true,
  })
}

async function streamAnthropic(
  input: LlmRequestInput,
  signal: AbortSignal,
  callbacks: StreamCallbacks,
  startTime: number,
): Promise<void> {
  let fullText = ''
  const provider: Provider = 'Anthropic'

  await fetchEventSource('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': input.apiKey!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
      stream: true,
    }),
    signal,
    onmessage(event) {
      if (event.event === 'content_block_delta') {
        try {
          const parsed = JSON.parse(event.data)
          const text = parsed?.delta?.text ?? ''
          if (text) {
            fullText += text
            callbacks.onToken(text)
          }
        } catch { /* ignore */ }
      }
    },
    onclose() {
      const duration = Date.now() - startTime
      callbacks.onDone(fullText)
      callbacks.onTrace(buildTrace(input, provider, fullText, duration, 'ok'))
    },
    onerror(err) {
      throw classifyFetchError(err, provider)
    },
    openWhenHidden: true,
  })
}

// ── Non-streaming fallback (Gemini, Ollama) ─────────────────

async function fetchNonStreaming(
  input: LlmRequestInput,
  signal: AbortSignal,
  callbacks: StreamCallbacks,
  startTime: number,
): Promise<void> {
  const provider = input.provider
  const userPrompt = buildUserPrompt(input)
  let url: string
  let init: RequestInit

  if (provider === 'Local/Ollama') {
    url = 'http://localhost:11434/api/generate'
    init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: input.model,
        prompt: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
        stream: false,
      }),
      signal,
    }
  } else if (provider === 'Google Gemini') {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(input.apiKey!)}`
    init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }] }],
      }),
      signal,
    }
  } else {
    throw new LlmError({ provider, message: 'Provider no soportado para non-streaming', category: 'unknown' })
  }

  const payload = await safeFetch(url, init, provider)
  const text = extractTextFromPayload(payload)
  const duration = Date.now() - startTime
  callbacks.onToken(text)
  callbacks.onDone(text)
  callbacks.onTrace(buildTrace(input, provider, text, duration, 'ok'))
}

// ── Trace builder ───────────────────────────────────────────

function buildTrace(
  input: LlmRequestInput,
  provider: Provider,
  response: string,
  durationMs: number,
  status: LlmTraceEntry['status'],
  errorDetail?: string,
): LlmTraceEntry {
  return {
    id: traceUid('trace'),
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

// ── Main streaming API with retries + fallback ──────────────

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

async function executeProviderRequest(
  input: LlmRequestInput,
  signal: AbortSignal,
  callbacks: StreamCallbacks,
  startTime: number,
  userPrompt: string,
): Promise<void> {
  const provider = input.provider

  if (provider === 'OpenAI' || provider === 'OpenRouter') {
    if (!input.apiKey) throw new LlmError({ provider, message: 'API key requerida', category: 'auth' })
    const url = provider === 'OpenAI'
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://openrouter.ai/api/v1/chat/completions'

    await streamOpenAiCompatible(
      url,
      { Authorization: `Bearer ${input.apiKey}` },
      {
        model: input.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
      },
      provider,
      signal,
      callbacks,
      startTime,
      input,
    )
    return
  }

  if (provider === 'Anthropic') {
    if (!input.apiKey) throw new LlmError({ provider, message: 'API key requerida', category: 'auth' })
    await streamAnthropic(input, signal, callbacks, startTime)
    return
  }

  if (provider === 'Google Gemini' && !input.apiKey) {
    throw new LlmError({ provider, message: 'API key requerida', category: 'auth' })
  }
  await fetchNonStreaming(input, signal, callbacks, startTime)
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
      // Continue to next fallback
    }
  }

  return false
}

function getDefaultModelForProvider(provider: Provider): string {
  const defaults: Record<Provider, string> = {
    OpenAI: 'gpt-4o-mini',
    Anthropic: 'claude-3-5-haiku',
    'Google Gemini': 'gemini-2.0-flash',
    OpenRouter: 'openrouter/openai/gpt-4o-mini',
    'Local/Ollama': 'llama3.2',
  }
  return defaults[provider]
}

// ── Legacy non-streaming API (preserved for compatibility) ──

export async function requestLlmProposal(input: LlmRequestInput): Promise<string> {
  return new Promise((resolve, reject) => {
    let fullText = ''
    const controller = new AbortController()

    requestLlmStreaming(
      input,
      controller.signal,
      {
        onToken: (chunk) => { fullText += chunk },
        onDone: () => resolve(fullText),
        onError: (err) => reject(err),
        onTrace: () => { /* no-op for legacy */ },
      },
    ).catch(reject)
  })
}
