import { useState } from 'react'

import type {
  Project,
  CollectionTab,
  EntityRecord,
  AiProposal,
  AppSettings,
} from '../../types/workspace'
import { buildStructuredReference } from '../../utils/references'
import { createHistoryEvent, isoNow, uid } from '../../utils/workspace'
import { requestLlmProposal } from '../../services/llm'

export function useAiManagement(
  activeProject: Project | undefined,
  activeTab: CollectionTab | null,
  activeEntity: EntityRecord | null,
  settings: AppSettings | null,
  withProjectUpdate: (projectId: string, updater: (project: Project) => Project) => void,
  setToast: (msg: string) => void
) {
  const [pendingProposal, setPendingProposal] = useState<AiProposal | null>(null)
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false)

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

  async function generateAiProposal() {
    if (!activeEntity || !activeTab) return
    if (isGeneratingProposal) return
    setIsGeneratingProposal(true)
    const fallback = buildFallbackProposal()
    try {
      const llmText =
        settings === null
          ? ''
          : await requestLlmProposal({
              provider: settings.provider,
              model: settings.model,
              apiKey: settings.apiKey,
              tabPrompt: activeTab.prompt,
              entityTitle: activeEntity.title,
              entityContent: activeEntity.content,
            })

      if (!llmText.trim() || !fallback) {
        if (fallback) {
          setPendingProposal(fallback)
          setToast('Sin respuesta remota, se cargó propuesta local.')
        } else {
          setToast('No hay entidad activa para generar propuesta IA.')
        }
        return
      }

      setPendingProposal({
        ...fallback,
        summary: `Propuesta generada con ${settings?.provider ?? 'motor local'}. Revisa antes de aplicar.`,
        contentAppend: `\n\n## Sugerencia IA\n${llmText.trim()}`,
      })
      setToast('Propuesta IA generada. Revisa y confirma antes de aplicar.')
    } catch (error) {
      console.error('[AI] Error generando propuesta remota, usando fallback local', error)
      if (fallback) {
        setPendingProposal(fallback)
      }
      setToast('No se pudo conectar al proveedor IA. Se mantiene propuesta local.')
    } finally {
      setIsGeneratingProposal(false)
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
    setToast('Propuesta IA confirmada y aplicada con trazabilidad.')
  }

  function dismissProposal() {
    setPendingProposal(null)
  }

  return {
    pendingProposal,
    isGeneratingProposal,
    setPendingProposal,
    generateAiProposal,
    confirmAiProposal,
    dismissProposal,
  }
}
