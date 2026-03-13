/// <reference types="node" />

import { expect, test } from '@playwright/test'

import { createSyncEngine } from '../src/services/sync/engine'
import type { PersistedState } from '../src/types/workspace'

function buildState(partial?: Partial<PersistedState>): PersistedState {
  return {
    settings: null,
    projects: [],
    activeProjectId: '',
    activeTabId: '',
    activeEntityId: '',
    changeLog: [],
    llmTraces: [],
    ...partial,
  }
}

test.beforeEach(() => {
  const store = new Map<string, string>()
  ;(globalThis as { localStorage: Storage }).localStorage = {
    getItem(key: string) {
      return store.get(key) ?? null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    },
    get length() {
      return store.size
    },
  }
  globalThis.localStorage.clear()
})

test('sync queue marks operation as poison after repeated transport failures', async () => {
  const sync = createSyncEngine()
  const state = buildState({
    changeLog: [{
      id: 'c1',
      timestamp: new Date().toISOString(),
      actorType: 'user',
      label: 'Change',
      details: 'Test',
      source: 'mutation',
    }],
  })

  await sync.enqueueStateFromChange(state, state.changeLog[0])

  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response('boom', { status: 503 })

  try {
    for (let index = 0; index < 5; index += 1) {
      await sync.flushRemoteQueue({
        endpoint: 'https://sync.example',
        workspaceId: 'ws-1',
        maxRetries: 1,
      })
    }
  } finally {
    globalThis.fetch = originalFetch
  }

  const queue = await sync.peekQueue()
  expect(queue.some((item) => Boolean(item.poisonedAt))).toBeTruthy()
})

test('sync merge keeps local and remote long-text edits through CRDT state', async () => {
  const sync = createSyncEngine()

  const local = buildState({
    projects: [{
      id: 'p1',
      name: 'Local',
      description: '',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
      tabs: [{ id: 't1', name: 'Escenas', prompt: '', icon: '🧩' }],
      entities: [{
        id: 'e1',
        tabId: 't1',
        title: 'Nodo',
        content: 'Primera versión local extensa',
        textCrdtState: JSON.stringify({ version: 1, actorId: 'e1', counter: 1, ops: [{ id: 'e1:1:i', actorId: 'e1', counter: 1, timestamp: '2026-03-01T00:00:00.000Z', type: 'insert', index: 0, text: 'Primera versión local extensa' }] }),
        templateId: 'base',
        tags: [],
        aliases: [],
        fields: [],
        assets: [],
        status: 'active',
        revision: 3,
        updatedAt: '2026-03-01T00:00:00.000Z',
        history: [],
      }],
      templates: [],
      history: [],
      relations: [],
    }],
  })

  const remote = buildState({
    projects: [{
      id: 'p1',
      name: 'Remote',
      description: '',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-02T00:00:00.000Z',
      tabs: [{ id: 't1', name: 'Escenas', prompt: '', icon: '🧩' }],
      entities: [{
        id: 'e1',
        tabId: 't1',
        title: 'Nodo',
        content: 'Primera versión remota extendida',
        textCrdtState: JSON.stringify({ version: 1, actorId: 'e1', counter: 1, ops: [{ id: 'e1:1:i', actorId: 'e1', counter: 1, timestamp: '2026-03-01T01:00:00.000Z', type: 'insert', index: 0, text: 'Primera versión remota extendida' }] }),
        templateId: 'base',
        tags: [],
        aliases: [],
        fields: [],
        assets: [],
        status: 'active',
        revision: 3,
        updatedAt: '2026-03-02T00:00:00.000Z',
        history: [],
      }],
      templates: [],
      history: [],
      relations: [],
    }],
  })

  const merged = sync.mergeRemoteState(local, remote)
  expect(merged.merged.projects[0].entities[0].content.length).toBeGreaterThan(20)
  expect(merged.conflictsResolved).toBeGreaterThanOrEqual(1)
})
