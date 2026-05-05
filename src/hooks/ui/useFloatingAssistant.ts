import { useState, useCallback, type FormEvent } from 'react'

interface UseFloatingAssistantParams {
  activeTabPrompt: string | undefined
  updateTabPrompt: (prompt: string) => void
}

export function useFloatingAssistant({ activeTabPrompt, updateTabPrompt }: UseFloatingAssistantParams) {
  const [assistantFabOpen, setAssistantFabOpen] = useState(false)
  const [floatingAssistantDraft, setFloatingAssistantDraft] = useState('')

  // SYNAPSE_WARNING: must be useCallback — FloatingAssistantFab is React.memo'd;
  // a new function reference on every render defeats the memoization entirely.
  const handleFloatingAssistantSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextPrompt = floatingAssistantDraft.trim()
    if (!nextPrompt) return
    const basePrompt = activeTabPrompt?.trim() ?? ''
    const mergedPrompt = `${basePrompt}${basePrompt ? '\n\n' : ''}Solicitud reciente del autor:\n${nextPrompt}`
    updateTabPrompt(mergedPrompt)
    setFloatingAssistantDraft('')
  }, [activeTabPrompt, floatingAssistantDraft, updateTabPrompt])

  return {
    assistantFabOpen,
    setAssistantFabOpen,
    floatingAssistantDraft,
    setFloatingAssistantDraft,
    handleFloatingAssistantSubmit,
  }
}
