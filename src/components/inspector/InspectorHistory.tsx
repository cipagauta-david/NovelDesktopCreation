import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

import type { HistoryEvent } from '../../types/workspace'
import { formatTimestamp } from '../../utils/workspace'

const actorIcons: Record<string, string> = {
  user: '✍',
  ai: '⚡',
  system: '⚙',
}

export function InspectorHistory({ items }: { items: HistoryEvent[] }) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const shouldVirtualize = items.length > 30

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 92,
    overscan: 6,
    enabled: shouldVirtualize,
  })

  if (!shouldVirtualize) {
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

  return (
    <div ref={parentRef} className="history-list" style={{ maxHeight: 360, overflowY: 'auto' }}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const event = items[virtualRow.index]
          if (!event) {
            return null
          }

          return (
            <article
              key={event.id}
              className={`history-item history-actor-${event.actorType}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
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
          )
        })}
      </div>
    </div>
  )
}
