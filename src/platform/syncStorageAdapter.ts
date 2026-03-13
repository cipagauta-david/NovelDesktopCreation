import type { PersistedState } from '../types/workspace'
import type { SyncQueueItem } from '../services/sync/types'

type DesktopWorkerBridge = {
  platform?: 'desktop'
  syncStorage?: {
    init?: () => Promise<void>
    readQueue?: () => Promise<SyncQueueItem[]>
    writeQueue?: (queue: SyncQueueItem[]) => Promise<void>
    readLastState?: () => Promise<PersistedState | null>
    writeLastState?: (state: PersistedState) => Promise<void>
    clear?: () => Promise<void>
  }
}

export type SyncStorageAdapter = {
  runtime: 'web' | 'desktop'
  init: () => Promise<void>
  readQueue: () => Promise<SyncQueueItem[]>
  writeQueue: (queue: SyncQueueItem[]) => Promise<void>
  readLastState: () => Promise<PersistedState | null>
  writeLastState: (state: PersistedState) => Promise<void>
  clearAll: () => Promise<void>
}

const SYNC_QUEUE_KEY = 'novel.sync.queue.v2'
const SYNC_LAST_STATE_KEY = 'novel.sync.last-state.v2'

function getDesktopBridge(): DesktopWorkerBridge | undefined {
  return (globalThis as { __NOVEL_DESKTOP__?: DesktopWorkerBridge }).__NOVEL_DESKTOP__
}

function createWebLocalStorageAdapter(): SyncStorageAdapter {
  return {
    runtime: 'web',
    async init() {
      return
    },
    async readQueue() {
      try {
        const raw = localStorage.getItem(SYNC_QUEUE_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw) as SyncQueueItem[]
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    },
    async writeQueue(queue: SyncQueueItem[]) {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
    },
    async readLastState() {
      try {
        const raw = localStorage.getItem(SYNC_LAST_STATE_KEY)
        if (!raw) return null
        return JSON.parse(raw) as PersistedState
      } catch {
        return null
      }
    },
    async writeLastState(state: PersistedState) {
      localStorage.setItem(SYNC_LAST_STATE_KEY, JSON.stringify(state))
    },
    async clearAll() {
      localStorage.removeItem(SYNC_QUEUE_KEY)
      localStorage.removeItem(SYNC_LAST_STATE_KEY)
    },
  }
}

function createDesktopAdapter(bridge: DesktopWorkerBridge): SyncStorageAdapter {
  const fallback = createWebLocalStorageAdapter()

  return {
    runtime: 'desktop',
    async init() {
      if (bridge.syncStorage?.init) {
        await bridge.syncStorage.init()
        return
      }
      await fallback.init()
    },
    async readQueue() {
      if (bridge.syncStorage?.readQueue) {
        const queue = await bridge.syncStorage.readQueue()
        return Array.isArray(queue) ? queue : []
      }
      return fallback.readQueue()
    },
    async writeQueue(queue) {
      if (bridge.syncStorage?.writeQueue) {
        await bridge.syncStorage.writeQueue(queue)
        return
      }
      await fallback.writeQueue(queue)
    },
    async readLastState() {
      if (bridge.syncStorage?.readLastState) {
        return bridge.syncStorage.readLastState()
      }
      return fallback.readLastState()
    },
    async writeLastState(state) {
      if (bridge.syncStorage?.writeLastState) {
        await bridge.syncStorage.writeLastState(state)
        return
      }
      await fallback.writeLastState(state)
    },
    async clearAll() {
      if (bridge.syncStorage?.clear) {
        await bridge.syncStorage.clear()
        return
      }
      await fallback.clearAll()
    },
  }
}

export function getSyncStorageAdapter(): SyncStorageAdapter {
  const bridge = getDesktopBridge()
  if (bridge?.platform === 'desktop') {
    return createDesktopAdapter(bridge)
  }
  return createWebLocalStorageAdapter()
}

export async function clearSyncStoragePersistence(): Promise<void> {
  const adapter = getSyncStorageAdapter()
  await adapter.clearAll()
}
