import type { FormEvent } from 'react'

type InspectorAssistantComposerProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function InspectorAssistantComposer({ value, onChange, onSubmit }: InspectorAssistantComposerProps) {
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
        <button type="submit" className="primary-button" disabled={!value.trim()}>
          Enviar
        </button>
      </div>
    </form>
  )
}
