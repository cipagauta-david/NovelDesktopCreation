import { fetchEventSource } from '@microsoft/fetch-event-source'

import type { Provider } from '../../types/workspace'
import { LlmError, classifyFetchError } from '../llmErrors'
import { buildUserPrompt, SYSTEM_PROMPT } from './prompt'
import { buildTrace } from './trace'
import type { LlmRequestInput, StreamCallbacks } from './types'

const MAX_ERROR_DETAIL_LENGTH = 240
const ANTHROPIC_MAX_TOKENS = 700

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
      } catch {
        void 0
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
        } catch {
          void 0
        }
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
