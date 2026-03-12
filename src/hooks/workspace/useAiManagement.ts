import { useState, useRef, useCallback } from 'react'

import type {
  Project,
  CollectionTab,
  EntityRecord,
  AiProposal,
  AppSettings,
  LlmStreamStatus,
  LlmTraceEntry,
} from '../../types/workspace'
import { buildStructuredReference } from '../../utils/references'
import { createHistoryEvent, isoNow, uid } from '../../utils/workspace'
import { requestLlmStreaming, type LlmRequestInput } from '../../services/llm'
import { LlmError } from '../../services/llmErrors'

export function useAiManagement(
  activeProject: Project | undefined,
  activeTab: CollectionTab | null,
  activeEntity: EntityRecord | null,
  settings: AppSettings | null,
  withProjectUpdate: (projectId: string, updater: (project: Project) => Project) => void,
  setToast: (msg: string) => void
) {
  const [pendingProposal, setPendingProposal] = useState<AiProposal | null>(null)
  const [streamStatus, setStreamStatus] = useState<LlmStreamStatus>('idle')
  const [streamingText, setStreamingText] = useState('')
  const [llmTraces, setLlmTraces] = useState<LlmTraceEntry[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)

  function buildFallbackProposal() {
    if (!activeEntity || !activeTab) {
      return null
    }
    const missingField = activeEntity.fields.some((field) => field.key === 'Pregunta dramática')
      ? null
      : { id: uid('field'), key: 'Pregunta dramática', value: '¿Qué verdad teme descubrir?' }

    return {
      id: uid('proposal'),
      title: `Propuesta contextual para ${activeEntity.title}`,
      summary:
        'Sugerencia local de fallback: refuerza claridad dramática, continuidad y una nota derivada para confirmación humana.',
      entityId: activeEntity.id,
      contentAppend:
        `\n\n## Sugerencia IA\n- Aumenta la fricción en el siguiente beat.\n- Conecta el conflicto con el prompt de la tab: "${activeTab.prompt}".\n- Refuerza una referencia cruzada que haga visible el costo narrativo.`,
      createEntityTitle: `${activeEntity.title} — Nota de continuidad`,
      createEntityContent:
        `Resumen operativo derivado desde ${buildStructuredReference(
          activeEntity.id,
          activeEntity.title,
        )}.\n\n- Riesgo narrativo inmediato\n- Pregunta pendiente\n- Próxima escena candidata`,
      fieldToAdd: missingField,
    } satisfies AiProposal
  }

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setStreamStatus('cancelled')
    setToast('Generación IA cancelada.')
  }, [setToast])

  async function generateAiProposal() {
    if (!activeEntity || !activeTab) return
    if (streamStatus === 'streaming') return

    // Cancelar cualquier petición anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setStreamStatus('streaming')
    setStreamingText('')

    const fallback = buildFallbackProposal()

    if (!settings) {
      if (fallback) {
        setPendingProposal(fallback)
        setToast('Sin proveedor configurado, se cargó propuesta local.')
      }
      setStreamStatus('idle')
      return
    }

    const input: LlmRequestInput = {
      provider: settings.provider,
      model: settings.model,
      apiKey: settings.apiKey,
      tabPrompt: activeTab.prompt,
      entityTitle: activeEntity.title,
      entityContent: activeEntity.content,
    }

    let accumulatedText = ''

    try {
      await requestLlmStreaming(input, controller.signal, {
        onToken(chunk) {
          accumulatedText += chunk
          setStreamingText(accumulatedText)
        },
        onDone(fullText) {
          if (!fullText.trim() || !fallback) {
            if (fallback) {
              setPendingProposal(fallback)
              setToast('Sin respuesta útil del proveedor, se cargó propuesta local.')
            } else {
              setToast('No hay entidad activa para generar propuesta IA.')
            }
            setStreamStatus('done')
            return
          }

          setPendingProposal({
            ...fallback,
            summary: `Propuesta generada con ${settings.provider} (streaming). Revisa antes de aplicar.`,
            contentAppend: `\n\n## Sugerencia IA\n${fullText.trim()}`,
          })
          setStreamStatus('done')
          setToast('Propuesta IA generada con streaming. Revisa y confirma.')
        },
        onError(error) {
          console.error('[AI] Error en streaming:', error)

          if (error instanceof LlmError && error.category === 'cancelled') {
            setStreamStatus('cancelled')
            return
          }

          // Usar fallback en caso de error
          if (fallback) {
            // Si tenemos texto parcial de streaming, usarlo
            if (accumulatedText.trim()) {
              setPendingProposal({
                ...fallback,
                summary: `Propuesta parcial (${error.userMessage}). Revisa antes de aplicar.`,
                contentAppend: `\n\n## Sugerencia IA (parcial)\n${accumulatedText.trim()}`,
              })
            } else {
              setPendingProposal(fallback)
            }
          }

          const userMsg = error instanceof LlmError ? error.userMessage : 'Error inesperado con IA.'
          setToast(userMsg)
          setStreamStatus('error')
        },
        onTrace(trace) {
          setLlmTraces((prev) => [trace, ...prev].slice(0, 50))
        },
      })
    } catch (error) {
      console.error('[AI] Error no capturado en streaming:', error)
      if (fallback) {
        setPendingProposal(fallback)
      }
      setToast('Error inesperado. Se mantiene propuesta local.')
      setStreamStatus('error')
    }
  }

  function confirmAiProposal() {
    if (!pendingProposal || !activeProject || !activeTab) return
    const now = isoNow()
    const followUpEntity: EntityRecord = {
      id: uid('entity'),
      tabId: activeTab.id,
      title: pendingProposal.createEntityTitle,
      content: pendingProposal.createEntityContent,
      templateId: activeProject.templates[1]?.id ?? activeProject.templates[0]?.id ?? '',
      tags: ['ia', 'continuidad'],
      aliases: [],
      fields: [],
      assets: [],
      status: 'active',
      revision: 1,
      updatedAt: now,
      history: [
        createHistoryEvent('Creación IA confirmada', 'Nota derivada desde propuesta contextual.', 'ai'),
      ],
    }

    withProjectUpdate(activeProject.id, (project) => ({
      ...project,
      updatedAt: now,
      entities: [
        followUpEntity,
        ...project.entities.map((entity) =>
          entity.id !== pendingProposal.entityId
            ? entity
            : {
                ...entity,
                content: `${entity.content}${pendingProposal.contentAppend}`,
                fields: pendingProposal.fieldToAdd
                  ? [...entity.fields, pendingProposal.fieldToAdd]
                  : entity.fields,
                revision: entity.revision + 1,
                updatedAt: now,
                history: [
                  createHistoryEvent('Propuesta IA aplicada', 'Se confirmó una mejora contextual.', 'ai'),
                  ...entity.history,
                ].slice(0, 20),
              },
        ),
      ],
      history: [
        createHistoryEvent('IA confirmada', `Se aplicó una propuesta sobre ${followUpEntity.title}.`, 'ai'),
        ...project.history,
      ].slice(0, 40),
    }))

    setPendingProposal(null)
    setStreamingText('')
    setStreamStatus('idle')
    setToast('Propuesta IA confirmada y aplicada con trazabilidad.')
  }

  function dismissProposal() {
    setPendingProposal(null)
    setStreamingText('')
    setStreamStatus('idle')
  }

  return {
    pendingProposal,
    streamStatus,
    streamingText,
    llmTraces,
    setPendingProposal,
    generateAiProposal,
    confirmAiProposal,
    dismissProposal,
    stopGeneration,
  }
}
