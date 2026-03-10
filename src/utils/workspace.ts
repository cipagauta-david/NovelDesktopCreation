import type {
  ActorType,
  DraftState,
  EntityDraft,
  EntityRecord,
  HistoryEvent,
} from '../types/workspace'

export function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export function isoNow(): string {
  return new Date().toISOString()
}

export function createHistoryEvent(
  label: string,
  details: string,
  actorType: ActorType = 'user',
): HistoryEvent {
  return {
    id: uid('history'),
    label,
    details,
    actorType,
    timestamp: isoNow(),
  }
}

export function parseCommaSeparated(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function draftFromEntity(entity: EntityRecord): EntityDraft {
  return {
    title: entity.title,
    content: entity.content,
    templateId: entity.templateId,
    tagsText: entity.tags.join(', '),
    aliasesText: entity.aliases.join(', '),
    fields: entity.fields.map((field) => ({ ...field })),
  }
}

export function draftStateFromEntity(entity: EntityRecord): DraftState {
  return {
    entityId: entity.id,
    ...draftFromEntity(entity),
  }
}

export function draftPayload(draft: DraftState): EntityDraft {
  return {
    title: draft.title,
    content: draft.content,
    templateId: draft.templateId,
    tagsText: draft.tagsText,
    aliasesText: draft.aliasesText,
    fields: draft.fields,
  }
}

export function formatTimestamp(timestamp: string): string {
  const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : undefined

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}
