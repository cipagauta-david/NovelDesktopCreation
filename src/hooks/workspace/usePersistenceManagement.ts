import { useEffect } from 'react'
import { draftPayload, draftFromEntity, createHistoryEvent, isoNow } from '../../utils/workspace'
import type { DraftState, PersistedState } from '../../types/workspace'
import type { AppWorker } from '../../data/worker'
import * as Comlink from 'comlink'
import { create } from 'mutative'

export function usePersistenceManagement(
  activeProject: any,
  activeEntity: any,
  draft: DraftState | null,
  setData: React.Dispatch<React.SetStateAction<PersistedState>>,
  setSaveStatus: React.Dispatch<React.SetStateAction<'idle' | 'saving' | 'saved'>>,
  saveStatus: 'idle' | 'saving' | 'saved',
  worker: Comlink.Remote<AppWorker> | null
) {
  useEffect(() => {
    if (!draft || !activeEntity || !activeProject || draft.entityId !== activeEntity.id || !worker) {
      const frameId = window.requestAnimationFrame(() => setSaveStatus('idle'))
      return () => window.cancelAnimationFrame(frameId)
    }

    const hasChanges = JSON.stringify(draftPayload(draft)) !== JSON.stringify(draftFromEntity(activeEntity))
    if (!hasChanges) {
      const frameId = window.requestAnimationFrame(() => setSaveStatus('saved'))
      return () => window.cancelAnimationFrame(frameId)
    }

    const frameId = window.requestAnimationFrame(() => setSaveStatus('saving'))

    const timeoutId = window.setTimeout(async () => {
      // Optimistic update of state locally using Mutative for hyper-fast deep cloning
      let nextState: PersistedState | null = null

      setData((current) => {
        nextState = create(current, (draftState) => {
          const project = draftState.projects.find((p) => p.id === activeProject.id)
          if (!project) return

          const entity = project.entities.find((e) => e.id === activeEntity.id)
          if (!entity) return

          // Patch entity directly
          entity.title = draft.title || entity.title
          entity.content = draft.content
          entity.templateId = draft.templateId
          entity.tags = draft.tagsText.split(',').map(s => s.trim()).filter(Boolean)
          entity.aliases = draft.aliasesText.split(',').map(s => s.trim()).filter(Boolean)
          entity.fields = draft.fields
          entity.revision += 1
          entity.updatedAt = isoNow()

          // Prepend entity history
          entity.history.unshift(createHistoryEvent('Edición rápida', `Revisión ${entity.revision} guardada.`))
          if (entity.history.length > 20) entity.history.length = 20

          // Update project meta
          project.updatedAt = isoNow()
          project.history.unshift(createHistoryEvent('Autosave', `Guardado automático.`))
          if (project.history.length > 40) project.history.length = 40
        })

        if (nextState) {
          // Fire & Forget to worker (Off-main-thread write)
          worker.persistState(nextState).catch(console.error)
        }
        
        return nextState || current
      })
      
      setSaveStatus('saved')
    }, 500) // Debounce delay

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(timeoutId)
    }
  }, [activeEntity, activeProject, draft, setData, setSaveStatus, worker])

  useEffect(() => {
    if (saveStatus !== 'saved') return
    const timeoutId = window.setTimeout(() => setSaveStatus('idle'), 1600)
    return () => window.clearTimeout(timeoutId)
  }, [saveStatus, setSaveStatus])
}
