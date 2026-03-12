import { useEffect } from 'react'
import { draftPayload, draftFromEntity, createHistoryEvent, isoNow } from '../../utils/workspace'
import type { DraftState, EntityRecord, PersistedState, Project } from '../../types/workspace'
import type { AppWorker } from '../../data/worker'
import * as Comlink from 'comlink'

export function usePersistenceManagement(
  activeProject: Project | undefined,
  activeEntity: EntityRecord | null,
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
      // Optimistic update of state locally
      setData((current) => {
        const nextState = {
          ...current,
          projects: current.projects.map((project) => {
            if (project.id !== activeProject.id) return project
            const entities = project.entities.map((entity) => {
              if (entity.id !== activeEntity.id) return entity
              const updatedEntity: EntityRecord = {
                ...entity,
                title: draft.title || entity.title,
                content: draft.content,
                templateId: draft.templateId,
                tags: draft.tagsText.split(',').map(s => s.trim()).filter(Boolean),
                aliases: draft.aliasesText.split(',').map(s => s.trim()).filter(Boolean),
                fields: draft.fields,
                revision: entity.revision + 1,
                updatedAt: isoNow(),
              }
              return {
                ...updatedEntity,
                history: [
                  createHistoryEvent('Edición rápida', `Revisión ${updatedEntity.revision} guardada.`),
                  ...entity.history,
                ].slice(0, 20),
              }
            })
            return {
              ...project,
              updatedAt: isoNow(),
              entities,
              history: [
                createHistoryEvent('Autosave', `Guardado automático.`),
                ...project.history,
              ].slice(0, 40),
            }
          }),
        }

        // Fire & Forget to worker (Off-main-thread write)
        worker.persistState(nextState).catch(console.error)

        return nextState
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
