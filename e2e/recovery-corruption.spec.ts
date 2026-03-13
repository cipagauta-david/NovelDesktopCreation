/// <reference types="node" />

import { expect, test } from '@playwright/test'

import { migratePersistedState } from '../src/utils/workspace'

test('recovery from corrupted persisted payload falls back safely', async () => {
  const corrupted = {
    settings: null,
    projects: 'not-an-array',
    activeProjectId: 7,
    activeTabId: null,
    activeEntityId: null,
    changeLog: null,
  }

  const recovered = migratePersistedState(corrupted as never)
  expect(Array.isArray(recovered.projects)).toBeTruthy()
  expect(Array.isArray(recovered.changeLog)).toBeTruthy()
  expect(typeof recovered.activeProjectId).toBe('string')
})
