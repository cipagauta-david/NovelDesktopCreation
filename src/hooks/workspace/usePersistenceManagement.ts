import { useEffect, useRef, useCallback } from 'react'
import {
  appendChangeEvent,
  appendCheckpoint,
  appendCorrelationReport,
  createChangeEvent,
  createCheckpoint,
  draftPayload,
  draftFromEntity,
  createHistoryEvent,
  isoNow,
} from '../../utils/workspace'
import type { DraftState, EntityRecord, PersistedState, Project } from '../../types/workspace'
import type { AppWorker } from '../../data/worker'
import { addBreadcrumb } from '../../services/observability'
import { withSpan } from '../../services/tracing'
import * as Comlink from 'comlink'
import { finalizeCorrelationIntent, startCorrelationIntent } from '../../services/correlation'
import { buildNextTextCrdtState } from '../../services/sync/crdtText'
import { getStateStorageAdapterDirect } from '../../platform/stateStorageAdapter'

// Detectar runtime desktop
function isDesktopRuntime(): boolean {
  const bridge = (globalThis as { __NOVEL_DESKTOP__?: { platform?: string } }).__NOVEL_DESKTOP__
  return bridge?.platform === 'desktop'
}

// Smart debounce: solo sincroniza cuando el usuario deja de editar por IDLE_DELAY ms
const IDLE_DELAY = 5000 // 5 segundos de inactividad antes de guardar

export function usePersistenceManagement(
  data: PersistedState,
  activeProject: Project | undefined,
  activeEntity: EntityRecord | null,
  draft: DraftState | null,
  setData: React.Dispatch<React.SetStateAction<PersistedState>>,
  setSaveStatus: React.Dispatch<React.SetStateAction<'idle' | 'saving' | 'saved'>>,
  saveStatus: 'idle' | 'saving' | 'saved',
  worker: Comlink.Remote<AppWorker> | null
) {
  // Obtener el adapter correcto según el runtime
  const stateStorage = getStateStorageAdapterDirect()
  const isDesktop = isDesktopRuntime()

  // Refs para el timer inteligente
  const idleTimerRef = useRef<number | null>(null)
  const lastContentRef = useRef<string | null>(null)
  const isEditingRef = useRef<boolean>(false)
  const hasHydratedRef = useRef(false)
  const persistTimerRef = useRef<number | null>(null)

  const cancelGlobalPersistTimer = useCallback(() => {
    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current)
      persistTimerRef.current = null
    }
  }, [])

  // Función para cancelar el timer de guardado
  const cancelIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }, [])

  // Función para ejecutar el guardado real
  const executeSave = useCallback(async () => {
    if (!draft || !activeEntity || !activeProject) return

    const hasChanges = JSON.stringify(draftPayload(draft)) !== JSON.stringify(draftFromEntity(activeEntity))
    if (!hasChanges) {
      setSaveStatus('saved')
      return
    }

    const correlationId = startCorrelationIntent('entity.autosave')

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
              textCrdtState: buildNextTextCrdtState({
                actorId: entity.id,
                previousText: entity.content,
                nextText: draft.content,
                previousState: entity.textCrdtState,
                timestamp: isoNow(),
              }),
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
        intent: 'entity.autosave',
        correlationId,
        actorType: 'user',
        projectId: activeProject.id,
        tabId: activeEntity.tabId,
        entityId: activeEntity.id,
      }))
      const withCheckpoint = appendCheckpoint(withChangeEvent, createCheckpoint(withChangeEvent, {
        label: 'Autosave',
        correlationId,
      }))

      // Persistir estado
      if (isDesktop) {
        addBreadcrumb('Autosave persistido via IPC SQLite', 'workspace.save', {
          projectId: activeProject.id,
          entityId: activeEntity.id,
          runtime: 'desktop',
        })
        withSpan('ipc.state.save', {
          projectId: activeProject.id,
          entityId: activeEntity.id,
          correlationId,
          runtime: 'desktop',
        }, async () => {
          await stateStorage.saveState(withCheckpoint)
        }).catch((err) => {
          console.error('[Persistence] Desktop IPC save failed, falling back to worker', err)
          worker?.persistState(withCheckpoint, { correlationId, origin: 'autosave-fallback' }).catch(console.error)
        })
      } else {
        addBreadcrumb('Autosave persistido en worker', 'workspace.save', {
          projectId: activeProject.id,
          entityId: activeEntity.id,
          runtime: 'web',
        })
        withSpan('worker.persist_state', {
          projectId: activeProject.id,
          entityId: activeEntity.id,
          correlationId,
          origin: 'autosave',
        }, async () => {
          await worker?.persistState(withCheckpoint, {
            correlationId,
            origin: 'autosave',
          })
        }).catch(console.error)
      }

      const report = finalizeCorrelationIntent(correlationId, 'ok')
      return report ? appendCorrelationReport(withCheckpoint, report) : withCheckpoint
    })

    setSaveStatus('saved')
    isEditingRef.current = false
    console.log('[Persistence] Guardado ejecutado tras inactividad')
  }, [draft, activeEntity, activeProject, isDesktop, setData, setSaveStatus, stateStorage, worker])

  // Effect principal: detecta cambios en el draft y reinicia el timer
  useEffect(() => {
    // Validaciones básicas
    if (!draft || !activeEntity || !activeProject || draft.entityId !== activeEntity.id) {
      cancelIdleTimer()
      setSaveStatus('idle')
      lastContentRef.current = null
      isEditingRef.current = false
      return
    }

    const currentContent = JSON.stringify(draftPayload(draft))
    const previousContent = lastContentRef.current

    // Si no hay cambios reales, no hacer nada
    if (currentContent === previousContent) {
      return
    }

    lastContentRef.current = currentContent

    // Hay cambios - el usuario está editando activamente
    if (previousContent !== null) {
      // Ya había contenido previo, el usuario está editando
      isEditingRef.current = true

      // Cancelar timer existente y programar nuevo
      // Esto "reinicia" el timer de 5 segundos
      cancelIdleTimer()
      setSaveStatus('saving')

      idleTimerRef.current = window.setTimeout(() => {
        executeSave()
      }, IDLE_DELAY)
    }

    return () => {
      // Cleanup: no cancelamos el timer aquí para permitir que continúe
      // El timer se cancela cuando cambia el entityId o cuando se ejecuta el save
    }
  }, [draft, activeEntity, activeProject, cancelIdleTimer, executeSave, setSaveStatus])

  useEffect(() => {
    if (!worker) return

    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true
      return
    }

    cancelGlobalPersistTimer()
    persistTimerRef.current = window.setTimeout(() => {
      const correlationId = startCorrelationIntent('workspace.persist.snapshot')

      if (isDesktop) {
        addBreadcrumb('Snapshot persistido via IPC SQLite', 'workspace.save', {
          projectId: data.activeProjectId,
          runtime: 'desktop',
        })
        withSpan('ipc.state.save', {
          projectId: data.activeProjectId,
          correlationId,
          runtime: 'desktop',
        }, async () => {
          await stateStorage.saveState(data)
        }).catch((err) => {
          console.error('[Persistence] Desktop snapshot save failed, falling back to worker', err)
          worker.persistState(data, { correlationId, origin: 'snapshot-fallback' }).catch(console.error)
        })
      } else {
        withSpan('worker.persist_state', {
          projectId: data.activeProjectId,
          correlationId,
          origin: 'snapshot',
        }, async () => {
          await worker.persistState(data, { correlationId, origin: 'snapshot' })
        }).catch(console.error)
      }
    }, 900)

    return () => {
      cancelGlobalPersistTimer()
    }
  }, [cancelGlobalPersistTimer, data, isDesktop, stateStorage, worker])

  // Cleanup cuando cambia el entity activo
  useEffect(() => {
    return () => {
      cancelIdleTimer()
      cancelGlobalPersistTimer()
    }
  }, [cancelGlobalPersistTimer, cancelIdleTimer])

  // Resetear el save status después de guardar
  useEffect(() => {
    if (saveStatus !== 'saved') return
    const timeoutId = window.setTimeout(() => setSaveStatus('idle'), 1600)
    return () => window.clearTimeout(timeoutId)
  }, [saveStatus, setSaveStatus])
}
