import { useState, useEffect } from 'react'
import type { SearchResult } from '../../types/workspace'
import type { AppWorker } from '../../data/worker'
import * as Comlink from 'comlink'

export function useSearchManagement(
  activeProject: any,
  worker: Comlink.Remote<AppWorker> | null
) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  
  // Off-main-thread search (Simulador de FTS5)
  useEffect(() => {
    if (!activeProject || !searchQuery.trim() || !worker) {
      setSearchResults([])
      return
    }
    
    // Delegamos la búsqueda al worker
    const timeoutId = setTimeout(() => {
      const activeEntities = activeProject.entities.filter((e: any) => e.status === 'active')
      worker.searchEntities(searchQuery, activeEntities)
        .then((results: any[]) => {
           const mapped = results.map((entity) => ({
             entityId: entity.id,
             tabId: entity.tabId,
             title: entity.title,
             snippet: '', // To-Do: implementar logica FTS5 highlight
             score: 1,
           })).slice(0, 8)
           setSearchResults(mapped)
        })
        .catch(console.error)
    }, 150) // Debounce para no saturar IPC
    
    return () => clearTimeout(timeoutId)
  }, [activeProject, searchQuery, worker])
  
  return {
    searchQuery,
    setSearchQuery,
    searchResults
  }
}
