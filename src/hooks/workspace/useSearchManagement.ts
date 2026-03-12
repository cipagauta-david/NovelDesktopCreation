import { useState, useEffect } from 'react'
import type { Project, SearchResult } from '../../types/workspace'
import type { AppWorker } from '../../data/worker'
import * as Comlink from 'comlink'

export function useSearchManagement(
  activeProject: Project | undefined,
  worker: Comlink.Remote<AppWorker> | null
) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  
  // Off-main-thread search (Simulador de FTS5)
  useEffect(() => {
    if (!activeProject || !searchQuery.trim() || !worker) {
      return
    }
    
    // Delegamos la búsqueda al worker
    const timeoutId = setTimeout(() => {
      const activeEntities = activeProject.entities.filter((e) => e.status === 'active')
      worker.searchEntities(searchQuery, activeEntities)
        .then((results) => {
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
  
  const visibleSearchResults = searchQuery.trim() ? searchResults : []

  return {
    searchQuery,
    setSearchQuery,
    searchResults: visibleSearchResults
  }
}
