import { useLayoutEffect, useRef, type FormEvent } from 'react'
import type { LlmStreamStatus } from '../../types/workspace'
import { Button } from '../ui/Button'
import '../../styles/inspector/InspectorAssistantComposer.css';



type InspectorAssistantComposerProps = {
  value: string
  streamStatus: LlmStreamStatus
  streamingText: string
  onChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onStopGeneration: () => void
}

export function InspectorAssistantComposer({ value, streamStatus, streamingText, onChange, onSubmit, onStopGeneration }: InspectorAssistantComposerProps) {
    const isStreaming = streamStatus === 'streaming'
  const canSubmit = value.trim().length > 0 && !isStreaming
  const showStreamResult =
    isStreaming ||
    (!!streamingText && (streamStatus === 'done' || streamStatus === 'error'))
  const formRef = useRef<HTMLFormElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }
    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 320)}px`
  }, [value])

    const setMode = (modePrompt: string) => {
    onChange(`${value}${value ? '\n' : ''}${modePrompt}`)
  }

  const streamHeader = isStreaming
    ? 'Recibiendo respuesta…'
    : streamStatus === 'done'
      ? 'Respuesta generada'
      : 'Respuesta parcial'

  return (
    <form ref={formRef} className="assistant-composer" onSubmit={onSubmit}>
      <div className="assistant-composer-modes" style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <Button type="button" className="btn--ghost btn--sm" onClick={() => setMode('Sugerir nuevas referencias y variables de fondo para esta escena:')}>
          Referencias
        </Button>
        <Button type="button" className="btn--ghost btn--sm" onClick={() => setMode('Proponer los próximos 3 pasos narrativos (Propuesta Narrativa)')}>
          Propuesta
        </Button>
        <Button type="button" className="btn--ghost btn--sm" onClick={() => setMode('Desarrollar la Pregunta Dramática o conflicto central:')}>
          Conflicto
        </Button>
      </div>
      <div className="assistant-composer-input-shell">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && canSubmit) {
              event.preventDefault()
              formRef.current?.requestSubmit()
            }
          }}
          placeholder="Pide una escena alternativa, continuidad, tono o conflicto…"
          rows={4}
        />
        <Button
          type="submit"
          className="assistant-send-button btn--default"
          disabled={!canSubmit}
          aria-label="Enviar a la IA"
          title="Enviar"
        >
          ↗
        </Button>
      </div>

            {showStreamResult && (
        <div className="assistant-stream-preview" aria-live="polite">
          <div className="assistant-stream-header">
            {isStreaming && <span className="streaming-dot" />}
            {streamStatus === 'error' && <span className="streaming-warning" aria-label="Advertencia">⚠</span>}
            <span>{streamHeader}</span>
          </div>
          {streamingText ? (
            <p className="assistant-stream-text">{streamingText}</p>
          ) : (
            isStreaming && (
              <div className="assistant-stream-skeleton" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            )
          )}
        </div>
      )}

      <div className="assistant-composer-actions assistant-composer-footer">
        <small>Se integra en las instrucciones activas de esta colección.</small>
        {isStreaming && (
          <Button
            type="button"
            className="ghost-button destructive-text assistant-stop-button btn--ghost"
            onClick={onStopGeneration}
          >
            ■ Detener IA
          </Button>
        )}
      </div>
    </form>
  )
}
