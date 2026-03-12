import * as Comlink from 'comlink'

// IndexedDB Helper implementation for Web Worker persistence
// localStorage is not accessible inside a Web Worker.
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('novel-desktop-db', 1)
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('workspace')) {
        db.createObjectStore('workspace')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function idbSetItem(key: string, val: any): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workspace', 'readwrite')
    const store = tx.objectStore('workspace')
    const request = store.put(val, key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function idbGetItem(key: string): Promise<any> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workspace', 'readonly')
    const store = tx.objectStore('workspace')
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Define the interface for our Worker to enforce contract.
// This will hide the SQLite/IDB implementations from the Main Thread.
export interface AppWorker {
  init(): Promise<void>
  persistState(state: any): Promise<void>
  loadState(): Promise<any>
  searchEntities(query: string, entities: any[]): Promise<any[]>
}

const workerObj = {
  // Local volatile state
  async init(): Promise<void> {
    console.log('[Worker] Initializing IndexedDB Engine... (SQLite / OPFS coming next)')
  },

  async persistState(state: any): Promise<void> {
    // Escrito nativamente off-thread usando IndexedDB
    await idbSetItem('novel-desktop-workspace-v1', state)
  },

  async loadState(): Promise<any> {
    // Si estuviéramos usando un FTS5 puro, reconstruiríamos el state desde SQLite
    const saved = await idbGetItem('novel-desktop-workspace-v1')
    return saved ? saved : null
  },

  async searchEntities(query: string, entities: any[]): Promise<any[]> {
    // Simula el Full Text Search (FTS5) off-main-thread
    const normalized = query.trim().toLowerCase()
    if (!normalized) return []
    
    // Aquí implementaremos FTS5 con SQLite en fases posteriores
    return entities.filter((e) => 
      e.title.toLowerCase().includes(normalized) ||
      e.aliases.some((alias: string) => alias.toLowerCase().includes(normalized)) ||
      e.content.toLowerCase().includes(normalized)
    )
  }
}

// Exponemos el objeto al Main Thread usando Comlink
Comlink.expose(workerObj)

