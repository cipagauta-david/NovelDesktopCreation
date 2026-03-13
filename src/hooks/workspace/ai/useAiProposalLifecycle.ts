import type { AiProposal, CollectionTab, EntityRecord, Project } from '../../../types/workspace'
import { createHistoryEvent, isoNow, uid } from '../../../utils/workspace'

type UseAiProposalLifecycleArgs = {
  pendingProposal: AiProposal | null
  activeProject: Project | undefined
  activeTab: CollectionTab | null
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
  ) => void
  setPendingProposal: (proposal: AiProposal | null) => void
  setStreamingText: (value: string) => void
  setStreamStatusIdle: () => void
  setToast: (msg: string) => void
}

export function useAiProposalLifecycle({
  pendingProposal,
  activeProject,
  activeTab,
  withProjectUpdate,
  setPendingProposal,
  setStreamingText,
  setStreamStatusIdle,
  setToast,
}: UseAiProposalLifecycleArgs) {
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
    }), {
      label: 'IA confirmada',
      details: `Se aplicó una propuesta sobre ${followUpEntity.title}.`,
      actorType: 'ai',
      tabId: activeTab.id,
      entityId: pendingProposal.entityId,
    })

    setPendingProposal(null)
    setStreamingText('')
    setStreamStatusIdle()
    setToast('Propuesta IA confirmada y aplicada con trazabilidad.')
  }

  function dismissProposal() {
    setPendingProposal(null)
    setStreamingText('')
    setStreamStatusIdle()
  }

  return {
    confirmAiProposal,
    dismissProposal,
  }
}
