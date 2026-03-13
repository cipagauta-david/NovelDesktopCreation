import type { FormEvent } from 'react'
import type { LlmStreamStatus } from '../../types/workspace'
import '../../styles/inspector/InspectorAssistantComposer.css';



type InspectorAssistantComposerProps = {
  value: string
  streamStatus: LlmStreamStatus
  onChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onStopGeneration: () => void
}

export function InspectorAssistantComposer({ value, streamStatus, onChange, onSubmit, onStopGeneration }: InspectorAssistantComposerProps) {
  const isStreaming = streamStatus === 'streaming'
  const canSubmit = value.trim().length > 0 && !isStreaming

  return (
    <form className="assistant-composer" onSubmit={onSubmit}>
      <div className="assistant-composer-input-shell">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Pide una escena alternativa, continuidad, tono o conflicto…"
          rows={4}
        />
        <button
          type="submit"
          className="assistant-send-button"
          disabled={!canSubmit}
          aria-label="Enviar a la IA"
          title="Enviar"
        >
          ↗
        </button>
      </div>

      <div className="assistant-composer-actions assistant-composer-footer">
        <small>Se integra en las instrucciones activas de esta colección.</small>
        {isStreaming && (
          <button
            type="button"
            className="ghost-button destructive-text assistant-stop-button"
            onClick={onStopGeneration}
          >
            ■ Detener IA
          </button>
        )}
      </div>
    </form>
  )
}
