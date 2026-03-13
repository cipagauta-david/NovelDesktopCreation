import { useEffect } from 'react'
import { appendChangeEvent, createChangeEvent, draftPayload, draftFromEntity, createHistoryEvent, isoNow } from '../../utils/workspace'
import type { DraftState, EntityRecord, PersistedState, Project } from '../../types/workspace'
import type { AppWorker } from '../../data/worker'
import { addBreadcrumb } from '../../services/observability'
import { withSpan } from '../../services/tracing'
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

        const withChangeEvent = appendChangeEvent(nextState, createChangeEvent({
          label: 'Autosave',
          details: `Guardado automático de ${activeEntity.title}.`,
          actorType: 'user',
          projectId: activeProject.id,
          tabId: activeEntity.tabId,
          entityId: activeEntity.id,
        }))
        const correlationId = withChangeEvent.changeLog[withChangeEvent.changeLog.length - 1]?.id

        // Fire & Forget to worker (Off-main-thread write)
        addBreadcrumb('Autosave persistido en worker', 'workspace.save', {
          projectId: activeProject.id,
          entityId: activeEntity.id,
        })
        withSpan('worker.persist_state', {
          projectId: activeProject.id,
          entityId: activeEntity.id,
          correlationId,
        }, async () => {
          await worker.persistState(withChangeEvent, {
            correlationId,
            origin: 'autosave',
          })
        }).catch(console.error)

        return withChangeEvent
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
