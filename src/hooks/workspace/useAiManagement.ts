import { useState } from 'react'

import type {
  Project,
  CollectionTab,
  EntityRecord,
  AiProposal,
  AppSettings,
  LlmStreamStatus,
  LlmTraceEntry,
} from '../../types/workspace'
import { useAiProposalLifecycle } from './ai/useAiProposalLifecycle'
import { useAiStreaming } from './ai/useAiStreaming'

export function useAiManagement(
  activeProject: Project | undefined,
  activeTab: CollectionTab | null,
  activeEntity: EntityRecord | null,
  settings: AppSettings | null,
  withProjectUpdate: (
    projectId: string,
    updater: (project: Project) => Project,
    change?: {
      label: string
      details: string
      actorType?: 'user' | 'ai' | 'system'
      tabId?: string
      entityId?: string
    },
  ) => void,
  setToast: (msg: string) => void
) {
  const [pendingProposal, setPendingProposal] = useState<AiProposal | null>(null)
  const [streamStatus, setStreamStatus] = useState<LlmStreamStatus>('idle')
  const [streamingText, setStreamingText] = useState('')
  const [llmTraces, setLlmTraces] = useState<LlmTraceEntry[]>([])
  const streaming = useAiStreaming({
    activeTab,
    activeEntity,
    settings,
    streamStatus,
    setStreamStatus,
    setStreamingText,
    setPendingProposal,
    setLlmTraces,
    setToast,
  })

  const lifecycle = useAiProposalLifecycle({
    pendingProposal,
    activeProject,
    activeTab,
    withProjectUpdate,
    setPendingProposal,
    setStreamingText,
    setStreamStatusIdle: () => setStreamStatus('idle'),
    setToast,
  })

  return {
    pendingProposal,
    streamStatus,
    streamingText,
    llmTraces,
    setPendingProposal,
    generateAiProposal: streaming.generateAiProposal,
    confirmAiProposal: lifecycle.confirmAiProposal,
    dismissProposal: lifecycle.dismissProposal,
    stopGeneration: streaming.stopGeneration,
  }
}
