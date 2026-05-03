import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type HistoryListProps<TItem> = {
  items: TItem[]
  getKey: (item: TItem) => string
  renderItem: (item: TItem) => ReactNode
  emptyState?: ReactNode
  className?: string
}

export function HistoryList<TItem>({ items, getKey, renderItem, emptyState, className }: HistoryListProps<TItem>) {
  if (items.length === 0) return emptyState ? <>{emptyState}</> : null

  return (
    <div className={cn('history-list', className)}>
      {items.map((item) => (
        <article key={getKey(item)} className="history-item">
          {renderItem(item)}
        </article>
      ))}
    </div>
  )
}
