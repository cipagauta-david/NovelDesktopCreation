/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import {
  AnthropicContentBlockDeltaSchema,
  GeminiResponseSchema,
  OpenAiStreamChunkSchema,
  parseWithContract,
} from '../src/services/llm/schemas'
import { consumeSseStream } from '../src/services/llm/streamParser'
import { classifyFetchError } from '../src/services/llmErrors'

function fixturePath(name: string): string {
  return join(process.cwd(), 'e2e', 'fixtures', 'llm', name)
}

test('provider fixtures satisfy contract schemas', async () => {
  const openAiChunk = JSON.parse(readFileSync(fixturePath('openai-valid-chunk.json'), 'utf8'))
  const anthropicDelta = JSON.parse(readFileSync(fixturePath('anthropic-valid-delta.json'), 'utf8'))
  const geminiResponse = JSON.parse(readFileSync(fixturePath('gemini-valid-response.json'), 'utf8'))

  const parsedOpenAi = parseWithContract(OpenAiStreamChunkSchema, openAiChunk, {
    provider: 'OpenAI',
    contract: 'test-openai-fixture',
    message: 'Fixture inválido OpenAI',
  })
  const parsedAnthropic = parseWithContract(AnthropicContentBlockDeltaSchema, anthropicDelta, {
    provider: 'Anthropic',
    contract: 'test-anthropic-fixture',
    message: 'Fixture inválido Anthropic',
  })
  const parsedGemini = parseWithContract(GeminiResponseSchema, geminiResponse, {
    provider: 'Google Gemini',
    contract: 'test-gemini-fixture',
    message: 'Fixture inválido Gemini',
  })

  expect(parsedOpenAi.choices[0]?.delta?.content).toContain('Hola')
  expect(parsedAnthropic.delta?.text).toContain('Token')
  expect(parsedGemini.candidates?.[0]?.content?.parts?.[0]?.text).toContain('Gemini')
})

test('SSE HTTP failure is mapped to structured LLM error', async () => {
  const originalFetch = globalThis.fetch

  globalThis.fetch = async () => {
    return new Response('rate limit', {
      status: 429,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  let thrownCategory = ''
  try {
    await consumeSseStream({
      url: 'https://fixture.invalid/stream',
      init: { method: 'POST' },
      provider: 'OpenAI',
      signal: new AbortController().signal,
      onMessage() {
        return false
      },
    })
  } catch (error) {
    thrownCategory = classifyFetchError(error, 'OpenAI').category
  } finally {
    globalThis.fetch = originalFetch
  }

  expect(thrownCategory).toBe('rate-limit')
})

test('network and rate-limit errors are classified correctly', async () => {
  const network = classifyFetchError(new TypeError('fetch failed'), 'OpenRouter')
  expect(network.category).toBe('network')
  expect(network.retryable).toBeTruthy()

  const rateLimit = classifyFetchError(new Error('LLM 429: too many requests'), 'OpenAI')
  expect(rateLimit.category).toBe('rate-limit')
  expect(rateLimit.retryable).toBeTruthy()
})
