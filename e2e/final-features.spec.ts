/// <reference types="node" />

import { expect, test } from '@playwright/test'

import { createPluginManager } from '../src/services/plugins/manager'
import { mergePersistedStates } from '../src/services/sync/engine'
import type { PersistedState } from '../src/types/workspace'
import { finalizeCorrelationIntent, recordCorrelationStage, startCorrelationIntent } from '../src/services/correlation'
import { getStateStorageAdapter } from '../src/platform/stateStorageAdapter'

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

test('sync merge keeps llm traces and formal relations', async () => {
  const local = buildState({
    projects: [{
      id: 'p1',
      name: 'Local',
      description: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      tabs: [],
      entities: [],
      relations: [{
        id: 'rel-1',
        sourceEntityId: 'a',
        targetEntityId: 'b',
        relationType: 'ally',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }],
      templates: [],
      history: [],
    }],
    llmTraces: [{
      id: 'trace-local',
      timestamp: '2026-01-01T00:00:00.000Z',
      provider: 'OpenAI',
      model: 'gpt-4o-mini',
      promptSnippet: 'hola',
      responseSnippet: 'mundo',
      durationMs: 100,
      tokenEstimate: 10,
      status: 'ok',
    }],
  })

  const remote = buildState({
    projects: [{
      id: 'p1',
      name: 'Remote',
      description: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
      tabs: [],
      entities: [],
      relations: [{
        id: 'rel-2',
        sourceEntityId: 'a',
        targetEntityId: 'c',
        relationType: 'mentor',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
      }],
      templates: [],
      history: [],
    }],
    llmTraces: [{
      id: 'trace-remote',
      timestamp: '2026-02-01T00:00:00.000Z',
      provider: 'OpenAI',
      model: 'gpt-4o-mini',
      promptSnippet: 'x',
      responseSnippet: 'y',
      durationMs: 50,
      tokenEstimate: 5,
      status: 'ok',
    }],
  })

  const merged = mergePersistedStates(local, remote)
  expect(merged.merged.llmTraces?.length).toBe(2)
  expect(merged.merged.projects[0]?.relations?.length).toBe(2)
})

test('plugin hardening validates manifest and enforces limits', async () => {
  const manager = createPluginManager()

  expect(() => {
    manager.register({
      id: 'x',
      name: 'Bad',
      version: 'beta',
      capabilities: ['workspace:read'],
      onCommand() {},
    })
  }).toThrow()

  manager.register({
    id: 'plugin-ok',
    name: 'Plugin Ok',
    version: '1.0.0',
    capabilities: ['workspace:read'],
    maxCommandsPerMinute: 1,
    executionBudgetMs: 20,
    async onCommand() {
      await new Promise((resolve) => setTimeout(resolve, 40))
    },
  })

  await expect(manager.runCommand('plugin-ok', { name: 'first' }, {
    workspace: buildState(),
    applyWorkspaceUpdate() {},
  })).rejects.toThrow(/budget/)

  await expect(manager.runCommand('plugin-ok', { name: 'second' }, {
    workspace: buildState(),
    applyWorkspaceUpdate() {},
  })).rejects.toThrow(/límite/)
})

test('correlation report is consolidated by request', async () => {
  const correlationId = startCorrelationIntent('test.intent')
  recordCorrelationStage(correlationId, 'stage-1', 'inicio')
  recordCorrelationStage(correlationId, 'stage-2', 'fin')
  const report = finalizeCorrelationIntent(correlationId, 'ok')

  expect(report?.intent).toBe('test.intent')
  expect(report?.status).toBe('ok')
  expect(report?.events.length).toBe(2)
})

test('state storage adapter prefers desktop bridge when available', async () => {
  const originalBridge = (globalThis as { __NOVEL_DESKTOP__?: unknown }).__NOVEL_DESKTOP__
  ;(globalThis as { __NOVEL_DESKTOP__?: unknown }).__NOVEL_DESKTOP__ = {
    platform: 'desktop',
    stateStorage: {
      async init() {},
      async saveState() {},
      async loadState() { return null },
    },
  }

  try {
    const adapter = getStateStorageAdapter()
    expect(adapter.runtime).toBe('desktop')
  } finally {
    ;(globalThis as { __NOVEL_DESKTOP__?: unknown }).__NOVEL_DESKTOP__ = originalBridge
  }
})
