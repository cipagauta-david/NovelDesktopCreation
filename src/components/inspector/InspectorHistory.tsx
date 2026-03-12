import type { HistoryEvent } from '../../types/workspace'
import { formatTimestamp } from '../../utils/workspace'

const actorIcons: Record<string, string> = {
  user: '✍',
  ai: '⚡',
  system: '⚙',
}

export function InspectorHistory({ items }: { items: HistoryEvent[] }) {
  return (
    <div className="history-list">
      {items.map((event) => (
        <article
          key={event.id}
          className={`history-item history-actor-${event.actorType}`}
        >
          <strong>
            <span className="history-actor-icon" aria-hidden="true">
              {actorIcons[event.actorType] ?? '•'}
            </span>
            {event.label}
          </strong>
          <p>{event.details}</p>
          <small>
            {event.actorType} · {formatTimestamp(event.timestamp)}
          </small>
        </article>
      ))}
    </div>
  )
}
