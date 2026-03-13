/// <reference types="node" />

import { performance } from 'node:perf_hooks'

import { expect, test } from '@playwright/test'

import { SearchIndex } from '../src/data/search/SearchIndex'
import type { EntityRecord } from '../src/types/workspace'
import { consumeSseStream } from '../src/services/llm/streamParser'

function buildEntity(index: number): EntityRecord {
  return {
    id: `entity-${index}`,
    tabId: `tab-${index % 12}`,
    title: `Entidad ${index} de rendimiento`,
    content: `Contenido largo ${index} con referencias narrativas y contexto repetido para indexación BM25. `.repeat(8),
    templateId: 'template-base',
    tags: [`tag-${index % 10}`, 'perf'],
    aliases: [`alias-${index}`],
    fields: [
      { id: `field-${index}`, key: 'Resumen', value: `Resumen ${index} con señal de búsqueda.` },
    ],
    assets: [],
    status: 'active',
    revision: 1,
    updatedAt: new Date().toISOString(),
    history: [],
  }
}

test('search indexing and query remain within regression budget', async () => {
  test.slow()

  const entities = Array.from({ length: 1800 }, (_, index) => buildEntity(index))
  const index = new SearchIndex()

  const startBuild = performance.now()
  index.buildFromEntities(entities)
  const buildMs = performance.now() - startBuild

  const startSearch = performance.now()
  const results = index.search('Entidad 174 alias-174 señal', 12)
  const searchMs = performance.now() - startSearch

  expect(index.indexedCount).toBe(1800)
  expect(results.length).toBeGreaterThan(0)
  expect(buildMs).toBeLessThan(1400)
  expect(searchMs).toBeLessThan(260)
})

test('long SSE stream parse stays under baseline budget', async () => {
  test.slow()

  const originalFetch = globalThis.fetch
  const tokenCount = 1500

  globalThis.fetch = async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let index = 0; index < tokenCount; index += 1) {
          controller.enqueue(encoder.encode(`data: {"choices":[{"delta":{"content":"t${index} "}}]}\n\n`))
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }

  let parsed = 0
  const start = performance.now()
  try {
    await consumeSseStream({
      url: 'https://fixture.invalid/sse',
      init: { method: 'POST' },
      provider: 'OpenAI',
      signal: new AbortController().signal,
      onMessage(event) {
        if (event.data === '[DONE]') {
          return true
        }
        parsed += 1
        return false
      },
    })
  } finally {
    globalThis.fetch = originalFetch
  }

  const elapsed = performance.now() - start
  expect(parsed).toBe(tokenCount)
  expect(elapsed).toBeLessThan(1800)
})
