import type { FormEvent } from 'react'
import type { LlmStreamStatus } from '../../types/workspace'

type InspectorAssistantComposerProps = {
  value: string
  streamStatus: LlmStreamStatus
  onChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onStopGeneration: () => void
}

export function InspectorAssistantComposer({ value, streamStatus, onChange, onSubmit, onStopGeneration }: InspectorAssistantComposerProps) {
  const isStreaming = streamStatus === 'streaming'

  return (
    <form className="assistant-composer" onSubmit={onSubmit}>
      <label className="assistant-composer-label">
        <span>Habla con la IA</span>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Pide una escena alternativa, continuidad, tono o conflicto."
          rows={3}
        />
      </label>

      <div className="assistant-composer-actions">
        <small>Se integra en las instrucciones activas de esta colección.</small>
        <div className="assistant-composer-buttons">
          {isStreaming && (
            <button
              type="button"
              className="ghost-button destructive-text assistant-stop-button"
              onClick={onStopGeneration}
            >
              ■ Detener IA
            </button>
          )}
          <button type="submit" className="primary-button" disabled={!value.trim() || isStreaming}>
            Enviar
          </button>
        </div>
      </div>
    </form>
  )
}
