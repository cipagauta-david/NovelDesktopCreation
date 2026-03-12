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
  
  // Ensure FTS index is up-to-date when project entities change
  useEffect(() => {
    if (!activeProject || !worker) return
    const activeEntities = activeProject.entities.filter((e) => e.status === 'active')
    worker.ftsIndex(activeEntities).catch(console.error)
  }, [activeProject, activeProject?.entities.length, worker])

  // Off-main-thread FTS search (índice invertido BM25)
  useEffect(() => {
    if (!activeProject || !searchQuery.trim() || !worker) {
      setSearchResults([])
      return
    }
    
    const timeoutId = setTimeout(() => {
      worker.ftsSearch(searchQuery)
        .then((results) => {
           setSearchResults(results.slice(0, 12))
        })
        .catch((err) => {
          console.error('[Search] FTS search failed, falling back to linear', err)
          // Fallback a búsqueda lineal si FTS falla
          const activeEntities = activeProject.entities.filter((e) => e.status === 'active')
          worker.searchEntities(searchQuery, activeEntities)
            .then((entities) => {
               const mapped = entities.map((entity) => ({
                 entityId: entity.id,
                 tabId: entity.tabId,
                 title: entity.title,
                 snippet: '',
                 score: 1,
               })).slice(0, 8)
               setSearchResults(mapped)
            })
            .catch(console.error)
        })
    }, 120) // Debounce reducido gracias al índice
    
    return () => clearTimeout(timeoutId)
  }, [activeProject, searchQuery, worker])
  
  const canShowResults = Boolean(activeProject && worker && searchQuery.trim())
  const visibleSearchResults = canShowResults ? searchResults : []

  return {
    searchQuery,
    setSearchQuery,
    searchResults: visibleSearchResults
  }
}
