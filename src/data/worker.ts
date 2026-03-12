import * as Comlink from 'comlink'

// Define the interface for our Worker to enforce contract.
// This will hide the SQLite/localStorage implementations from the Main Thread.
export interface AppWorker {
  init(): Promise<void>
  persistState(state: any): Promise<void>
  loadState(): Promise<any>
  searchEntities(query: string, entities: any[]): Promise<any[]>
}

const workerObj = {
  // Local volatile state
  async init(): Promise<void> {
    console.log('[Worker] Initializing SQLite / OPFS Engine...')
    // En el futuro, inicializaremos sqlite-wasm aquí
  },

  async persistState(state: any): Promise<void> {
    // Simulamos la latencia asincrónica del worker pero procesamos off-thread
    localStorage.setItem('novel-desktop-workspace-v1', JSON.stringify(state))
  },

  async loadState(): Promise<any> {
    // Si estuviéramos usando un FTS5 puro, reconstruiríamos el state desde SQLite
    const saved = localStorage.getItem('novel-desktop-workspace-v1')
    return saved ? JSON.parse(saved) : null
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
