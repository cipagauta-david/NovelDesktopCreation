// SYNAPSE_WARNING: InspectorAssistantComposer.onSubmit expects FormEvent<HTMLFormElement> — do NOT wrap or transform the event

import { memo, type FormEvent } from 'react'
import type { LlmStreamStatus } from '../../types/workspace'
import { InspectorAssistantComposer } from '../inspector/InspectorAssistantComposer'

interface FloatingAssistantFabProps {
  isOpen: boolean
  hasSuggestion: boolean
  draft: string
  streamingText: string
  streamStatus: LlmStreamStatus
  onToggle: () => void
  onClose: () => void
  onDraftChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onStopGeneration: () => void
}

export const FloatingAssistantFab = memo(function FloatingAssistantFab({
  isOpen,
  hasSuggestion,
  draft,
  streamingText,
  streamStatus,
  onToggle,
  onClose,
  onDraftChange,
  onSubmit,
  onStopGeneration,
}: FloatingAssistantFabProps) {
  return (
    <>
      {isOpen && (
        <section className="ai-fab-panel" aria-label="Asistente rápido">
          <header className="ai-fab-panel-head">
            <strong>Asistente IA</strong>
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              aria-label="Cerrar asistente"
            >
              ✕
            </button>
          </header>
          <InspectorAssistantComposer
            value={draft}
            streamStatus={streamStatus}
            streamingText={streamingText}
            onChange={onDraftChange}
            onSubmit={onSubmit}
            onStopGeneration={onStopGeneration}
          />
        </section>
      )}
      <button
        type="button"
        className={[
          'ai-fab-button',
          isOpen ? 'active' : '',
          hasSuggestion ? 'has-suggestion' : '',
        ].filter(Boolean).join(' ')}
        onClick={onToggle}
        aria-label="Abrir asistente IA"
      >
        ✦
      </button>
    </>
  )
})
