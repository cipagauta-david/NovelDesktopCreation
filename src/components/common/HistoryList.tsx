import type { ReactNode } from 'react'

type HistoryListProps<TItem> = {
  items: TItem[]
  getKey: (item: TItem) => string
  renderItem: (item: TItem) => ReactNode
  className?: string
}

export function HistoryList<TItem>({ items, getKey, renderItem, className = '' }: HistoryListProps<TItem>) {
  const classes = ['history-list', className].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      {items.map((item) => (
        <article key={getKey(item)} className="history-item">
          {renderItem(item)}
        </article>
      ))}
    </div>
  )
}
