import { useState, useEffect } from 'react'
import type { Project, SearchResult } from '../../types/workspace'
import type { AppWorker } from '../../data/worker'
import { withSpan } from '../../services/tracing'
import * as Comlink from 'comlink'
import { createCorrelationId } from '../../services/correlation'

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
    const correlationId = createCorrelationId('intent-search-index')
    withSpan('worker.fts_index', {
      entities: activeEntities.length,
      correlationId,
    }, async () => {
      await worker.ftsIndex(activeEntities, { correlationId, origin: 'search-index' })
    }).catch(console.error)
  }, [activeProject, activeProject?.entities.length, worker])

  // Off-main-thread FTS search (índice invertido BM25)
  useEffect(() => {
    if (!activeProject || !searchQuery.trim() || !worker) {
      queueMicrotask(() => setSearchResults([]))
      return
    }
    
    const timeoutId = setTimeout(() => {
      const correlationId = createCorrelationId('intent-search-query')
      withSpan('worker.fts_search', {
        queryLength: searchQuery.length,
        correlationId,
      }, () => worker.ftsSearch(searchQuery, { correlationId, origin: 'search-query' }))
        .then((results) => {
           setSearchResults(results.slice(0, 12))
        })
        .catch((err) => {
          console.error('[Search] FTS search failed, falling back to linear', err)
          // Fallback a búsqueda lineal si FTS falla
          const activeEntities = activeProject.entities.filter((e) => e.status === 'active')
          worker.searchEntities(searchQuery, activeEntities, { correlationId, origin: 'search-fallback' })
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
