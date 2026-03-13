import type { Provider } from '../../types/workspace'
import { LlmError, classifyFetchError } from '../llmErrors'
import { buildUserPrompt, SYSTEM_PROMPT } from './prompt'
import {
  AnthropicContentBlockDeltaSchema,
  GeminiResponseSchema,
  OllamaResponseSchema,
  OpenAiStreamChunkSchema,
  parseWithContract,
} from './schemas'
import { consumeSseStream } from './streamParser'
import { buildTrace } from './trace'
import type { LlmRequestInput, StreamCallbacks } from './types'

const ANTHROPIC_MAX_TOKENS = 700

async function safeFetch(url: string, init: RequestInit, provider: Provider): Promise<unknown> {
  const response = await fetch(url, init)
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new LlmError({
      provider,
      message: `LLM ${response.status}: ${detail.slice(0, 240)}`,
      httpStatus: response.status,
    })
  }
  return response.json()
}

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
  let streamDone = false

  try {
    await consumeSseStream({
      url,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ ...body, stream: true }),
      },
      provider,
      signal,
      onMessage(event) {
        if (event.data === '[DONE]') {
          streamDone = true
          return true
        }

        let parsedPayload: unknown
        try {
          parsedPayload = JSON.parse(event.data)
        } catch {
          throw new LlmError({
            provider,
            message: 'Chunk JSON inválido en stream OpenAI-compatible.',
            category: 'contract',
            retryable: false,
          })
        }

        const parsed = parseWithContract(OpenAiStreamChunkSchema, parsedPayload, {
          provider,
          contract: 'openai-stream-chunk',
          message: 'Chunk SSE inválido para OpenAI/OpenRouter',
        })

        const delta = parsed.choices[0]?.delta?.content ?? ''
        if (delta) {
          fullText += delta
          callbacks.onToken(delta)
        }
        return false
      },
    })
  } catch (error) {
    throw classifyFetchError(error, provider)
  }

  if (!streamDone && signal.aborted) {
    throw classifyFetchError(new DOMException('Request cancelled', 'AbortError'), provider)
  }

  const duration = Date.now() - startTime
  callbacks.onDone(fullText)
  callbacks.onTrace(buildTrace(input, provider, fullText, duration, 'ok'))
}

async function streamAnthropic(
  input: LlmRequestInput,
  signal: AbortSignal,
  callbacks: StreamCallbacks,
  startTime: number,
): Promise<void> {
  let fullText = ''
  const provider: Provider = 'Anthropic'
  let streamDone = false

  try {
    await consumeSseStream({
      url: 'https://api.anthropic.com/v1/messages',
      init: {
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
      },
      provider,
      signal,
      onMessage(event) {
        if (event.event === 'message_stop' || event.data === '[DONE]') {
          streamDone = true
          return true
        }

        if (event.event !== 'content_block_delta') {
          return false
        }

        let parsedPayload: unknown
        try {
          parsedPayload = JSON.parse(event.data)
        } catch {
          throw new LlmError({
            provider,
            message: 'Chunk JSON inválido en stream Anthropic.',
            category: 'contract',
            retryable: false,
          })
        }

        const parsed = parseWithContract(AnthropicContentBlockDeltaSchema, parsedPayload, {
          provider,
          contract: 'anthropic-content-delta',
          message: 'Chunk SSE inválido para Anthropic',
        })

        const text = parsed.delta?.text ?? ''
        if (text) {
          fullText += text
          callbacks.onToken(text)
        }

        return false
      },
    })
  } catch (error) {
    throw classifyFetchError(error, provider)
  }

  if (!streamDone && signal.aborted) {
    throw classifyFetchError(new DOMException('Request cancelled', 'AbortError'), provider)
  }

  const duration = Date.now() - startTime
  callbacks.onDone(fullText)
  callbacks.onTrace(buildTrace(input, provider, fullText, duration, 'ok'))
}

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
  let text = ''

  if (provider === 'Local/Ollama') {
    text = parseWithContract(OllamaResponseSchema, payload, {
      provider,
      contract: 'ollama-generate-response',
      message: 'Payload inválido de Ollama',
    }).response
  }

  if (provider === 'Google Gemini') {
    const parsed = parseWithContract(GeminiResponseSchema, payload, {
      provider,
      contract: 'gemini-generate-response',
      message: 'Payload inválido de Gemini',
    })
    text = parsed.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === 'string')?.text ?? ''
  }

  const duration = Date.now() - startTime
  callbacks.onToken(text)
  callbacks.onDone(text)
  callbacks.onTrace(buildTrace(input, provider, text, duration, 'ok'))
}

export function getDefaultModelForProvider(provider: Provider): string {
  const defaults: Record<Provider, string> = {
    OpenAI: 'gpt-4o-mini',
    Anthropic: 'claude-3-5-haiku',
    'Google Gemini': 'gemini-2.0-flash',
    OpenRouter: 'openrouter/openai/gpt-4o-mini',
    'Local/Ollama': 'llama3.2',
  }
  return defaults[provider]
}

export async function executeProviderRequest(
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
