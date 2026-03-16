import type { ReactNode } from 'react'

type SummaryGridItem = {
  label: ReactNode
  value: ReactNode
}

type SummaryGridProps = {
  items: SummaryGridItem[]
  className?: string
}

export function SummaryGrid({ items, className = '' }: SummaryGridProps) {
  const classes = ['meta-summary-list', className].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      {items.map((item, index) => (
        <div key={index} className="meta-summary-item">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  )
}
