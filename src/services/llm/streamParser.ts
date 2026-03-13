import { createParser, type EventSourceMessage, type ParseError } from 'eventsource-parser'

import type { Provider } from '../../types/workspace'
import { LlmError } from '../llmErrors'

const MAX_ERROR_DETAIL_LENGTH = 240

type ConsumeSseStreamArgs = {
  url: string
  init: RequestInit
  provider: Provider
  signal: AbortSignal
  onMessage: (event: EventSourceMessage) => boolean | void
  onHeartbeat?: () => void
}

export async function consumeSseStream({
  url,
  init,
  provider,
  signal,
  onMessage,
  onHeartbeat,
}: ConsumeSseStreamArgs): Promise<void> {
  const response = await fetch(url, { ...init, signal })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new LlmError({
      provider,
      message: `LLM ${response.status}: ${detail.slice(0, MAX_ERROR_DETAIL_LENGTH)}`,
      httpStatus: response.status,
    })
  }

  if (!response.body) {
    throw new LlmError({
      provider,
      message: 'Respuesta SSE sin body de stream.',
      category: 'contract',
      retryable: false,
    })
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let shouldStop = false
  let parserError: ParseError | null = null

  const parser = createParser({
    onEvent(event) {
      if (onMessage(event)) {
        shouldStop = true
      }
    },
    onComment() {
      onHeartbeat?.()
    },
    onError(error) {
      parserError = error
    },
  })

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read()
      if (done) break

      parser.feed(decoder.decode(value, { stream: true }))

      if (parserError) {
        throw new LlmError({
          provider,
          message: 'SSE inválido recibido desde provider.',
          category: 'contract',
          retryable: false,
        })
      }

      if (shouldStop) {
        await reader.cancel().catch(() => undefined)
        break
      }
    }

    parser.feed(decoder.decode())
  } finally {
    reader.releaseLock()
  }
}
