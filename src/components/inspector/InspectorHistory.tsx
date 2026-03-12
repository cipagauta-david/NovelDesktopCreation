import type { HistoryEvent } from '../../types/workspace'
import { formatTimestamp } from '../../utils/workspace'

export function InspectorHistory({ items }: { items: HistoryEvent[] }) {
  return (
    <div className="history-list">
      {items.map((event) => (
        <article key={event.id} className="history-item">
          <strong>{event.label}</strong>
          <p>{event.details}</p>
          <small>
            {event.actorType} · {formatTimestamp(event.timestamp)}
          </small>
        </article>
      ))}
    </div>
  )
}
