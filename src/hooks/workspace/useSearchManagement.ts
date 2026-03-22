import { useState, useEffect } from 'react'
import type { Project, SearchResult } from '../../types/workspace'
import type { AppWorker } from '../../data/worker'
import { withSpan } from '../../services/tracing'
import * as Comlink from 'comlink'
import { createCorrelationId } from '../../services/correlation'
import { getDesktopSearchAdapter } from '../../platform/desktopSearchAdapter'

const desktopSearch = getDesktopSearchAdapter()

// Detectar runtime desktop
function isDesktopRuntime(): boolean {
  const bridge = (globalThis as { __NOVEL_DESKTOP__?: { platform?: string } }).__NOVEL_DESKTOP__
  return bridge?.platform === 'desktop'
}

export function useSearchManagement(
  activeProject: Project | undefined,
  worker: Comlink.Remote<AppWorker> | null
) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const isDesktop = isDesktopRuntime()

  // Ensure FTS index is up-to-date when project entities change
  // Desktop: SQLite FTS se mantiene automáticamente via persistState
  // Web: necesita reconstruir índice en worker
  useEffect(() => {
    if (!activeProject || !worker) return

    // Desktop: skip - FTS se mantiene en SQLite via state persistence
    if (isDesktop) {
      console.log('[Search] Desktop runtime: SQLite FTS handles indexing')
      return
    }

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
      
      withSpan('workspace.search', {
        queryLength: searchQuery.length,
        correlationId,
        runtime: isDesktop ? 'desktop' : 'web',
      }, async () => {
        // Desktop: usar SQLite FTS directamente via desktopSearchAdapter
        if (isDesktop) {
          console.log('[Search] Desktop runtime: Using SQLite FTS via IPC')
          const sqliteResults = await desktopSearch.ftsSearch({
            projectId: activeProject.id,
            query: searchQuery,
            limit: 12,
          })
          
          if (sqliteResults.length > 0) {
            return sqliteResults
          }
          
          // Fallback: búsqueda lineal si SQLite FTS no tiene resultados
          console.log('[Search] Desktop: SQLite FTS empty, using linear search fallback')
          const activeEntities = activeProject.entities.filter((e) => e.status === 'active')
          return activeEntities
            .filter((e) =>
              e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              e.aliases.some((a: string) => a.toLowerCase().includes(searchQuery.toLowerCase()))
            )
            .slice(0, 12)
            .map((entity) => ({
              entityId: entity.id,
              tabId: entity.tabId,
              title: entity.title,
              snippet: '',
              score: 1,
            }))
        }

        // Web: usar worker FTS
        return worker.ftsSearch(searchQuery, { correlationId, origin: 'search-query' })
      })
        .then((results) => {
           setSearchResults(results.slice(0, 12))
        })
        .catch((err) => {
          console.error('[Search] FTS search failed, falling back to linear', err)
          // Fallback a búsqueda lineal
          const activeEntities = activeProject.entities.filter((e) => e.status === 'active')
          const filtered = activeEntities.filter((entity) =>
            entity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entity.aliases.some((a: string) => a.toLowerCase().includes(searchQuery.toLowerCase()))
          ).slice(0, 8).map((entity) => ({
            entityId: entity.id,
            tabId: entity.tabId,
            title: entity.title,
            snippet: '',
            score: 1,
          }))
          setSearchResults(filtered)
        })
    }, 120) // Debounce
    
    return () => clearTimeout(timeoutId)
  }, [activeProject, searchQuery, worker, isDesktop])
  
  const canShowResults = Boolean(activeProject && worker && searchQuery.trim())
  const visibleSearchResults = canShowResults ? searchResults : []

  return {
    searchQuery,
    setSearchQuery,
    searchResults: visibleSearchResults
  }
}
