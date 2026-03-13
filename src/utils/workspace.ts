import type {
  ActorType,
  ChangeEvent,
  DraftState,
  EntityDraft,
  EntityRecord,
  HistoryEvent,
  PersistedState,
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

export function createChangeEvent(params: {
  label: string
  details: string
  actorType?: ActorType
  projectId?: string
  tabId?: string
  entityId?: string
  source?: ChangeEvent['source']
}): ChangeEvent {
  return {
    id: uid('change'),
    timestamp: isoNow(),
    actorType: params.actorType ?? 'user',
    label: params.label,
    details: params.details,
    projectId: params.projectId,
    tabId: params.tabId,
    entityId: params.entityId,
    source: params.source ?? 'mutation',
  }
}

export function appendChangeEvent(state: PersistedState, event: ChangeEvent): PersistedState {
  return {
    ...state,
    changeLog: [...state.changeLog, event],
  }
}

function historyEventToChangeEvent(params: {
  event: HistoryEvent
  projectId: string
  tabId?: string
  entityId?: string
}): ChangeEvent {
  const { event, projectId, tabId, entityId } = params
  return {
    id: uid('change-legacy'),
    timestamp: event.timestamp,
    actorType: event.actorType,
    label: event.label,
    details: event.details,
    projectId,
    tabId,
    entityId,
    source: 'legacy-history',
  }
}

export function migratePersistedState(state: PersistedState): PersistedState {
  if (state.changeLog.length > 0) {
    return state
  }

  const migrated = state.projects.flatMap((project) => {
    const projectEvents = project.history.map((event) =>
      historyEventToChangeEvent({
        event,
        projectId: project.id,
      }),
    )
    const entityEvents = project.entities.flatMap((entity) =>
      entity.history.map((event) =>
        historyEventToChangeEvent({
          event,
          projectId: project.id,
          tabId: entity.tabId,
          entityId: entity.id,
        }),
      ),
    )
    return [...projectEvents, ...entityEvents]
  })

  migrated.sort((a, b) => {
    const timestampDiff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    if (timestampDiff !== 0) return timestampDiff
    return a.id.localeCompare(b.id)
  })

  return {
    ...state,
    changeLog: migrated,
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
