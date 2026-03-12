import type { AiProposal, CollectionTab, EntityRecord } from '../../../types/workspace'
import { buildStructuredReference } from '../../../utils/references'
import { uid } from '../../../utils/workspace'

export function buildFallbackProposal(activeEntity: EntityRecord | null, activeTab: CollectionTab | null) {
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
