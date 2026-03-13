import { useCallback, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import type {
  AiProposal,
  AppSettings,
  CollectionTab,
  EntityRecord,
  LlmStreamStatus,
  LlmTraceEntry,
} from '../../../types/workspace'
import { requestLlmStreaming } from '../../../services/llm/request'
import type { LlmRequestInput } from '../../../services/llm/types'
import { LlmError } from '../../../services/llmErrors'
import { addBreadcrumb, captureException } from '../../../services/observability'
import { buildFallbackProposal } from './proposalFactory'

type UseAiStreamingArgs = {
  activeTab: CollectionTab | null
  activeEntity: EntityRecord | null
  settings: AppSettings | null
  streamStatus: LlmStreamStatus
  setStreamStatus: (status: LlmStreamStatus) => void
  setStreamingText: (value: string) => void
  setPendingProposal: (proposal: AiProposal | null) => void
  setLlmTraces: Dispatch<SetStateAction<LlmTraceEntry[]>>
  setToast: (msg: string) => void
}

function useAiStreaming({
  activeTab,
  activeEntity,
  settings,
  streamStatus,
  setStreamStatus,
  setStreamingText,
  setPendingProposal,
  setLlmTraces,
  setToast,
}: UseAiStreamingArgs) {
  const abortControllerRef = useRef<AbortController | null>(null)
  const bufferedTextRef = useRef('')
  const frameRef = useRef<number | null>(null)

  const flushStreamingText = useCallback(() => {
    frameRef.current = null
    setStreamingText(bufferedTextRef.current)
  }, [setStreamingText])

  const queueStreamingFlush = useCallback(() => {
    if (frameRef.current != null) {
      return
    }
    frameRef.current = window.requestAnimationFrame(flushStreamingText)
  }, [flushStreamingText])

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      addBreadcrumb('Abort de streaming solicitado por usuario', 'llm.abort')
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    if (frameRef.current != null) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    setStreamStatus('cancelled')
    setToast('Generación IA cancelada.')
  }, [setStreamStatus, setToast])

  async function generateAiProposal() {
    if (!activeEntity || !activeTab) return
    if (streamStatus === 'streaming') return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setStreamStatus('streaming')
    bufferedTextRef.current = ''
    setStreamingText('')

    const fallback = buildFallbackProposal(activeEntity, activeTab)

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
    addBreadcrumb('Inicio de streaming IA', 'llm.stream.start', {
      provider: settings.provider,
      model: settings.model,
    })

    try {
      await requestLlmStreaming(input, controller.signal, {
        onToken(chunk) {
          accumulatedText += chunk
          bufferedTextRef.current = accumulatedText
          queueStreamingFlush()
        },
        onDone(fullText) {
          if (frameRef.current != null) {
            window.cancelAnimationFrame(frameRef.current)
            frameRef.current = null
          }
          setStreamingText(accumulatedText)

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
          addBreadcrumb('Streaming IA completado', 'llm.stream.done', {
            provider: settings.provider,
            chars: fullText.length,
          })
          setStreamStatus('done')
          setToast('Propuesta IA generada con streaming. Revisa y confirma.')
        },
        onError(error) {
          if (frameRef.current != null) {
            window.cancelAnimationFrame(frameRef.current)
            frameRef.current = null
          }
          setStreamingText(accumulatedText)

          if (error instanceof LlmError && error.category === 'cancelled') {
            setStreamStatus('cancelled')
            return
          }

          if (fallback) {
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
          captureException(error, {
            provider: settings.provider,
            model: settings.model,
            phase: 'streaming-onError',
          })
          setToast(userMsg)
          setStreamStatus('error')
        },
        onTrace(trace) {
          setLlmTraces((prev) => [trace, ...prev].slice(0, 50))
        },
      })
    } catch {
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      if (fallback) {
        setPendingProposal(fallback)
      }
      captureException(new Error('Error inesperado en generateAiProposal'), {
        provider: settings.provider,
        model: settings.model,
        phase: 'streaming-catch',
      })
      setToast('Error inesperado. Se mantiene propuesta local.')
      setStreamStatus('error')
    }
  }

  return {
    generateAiProposal,
    stopGeneration,
  }
}

export { useAiStreaming }
export default useAiStreaming
