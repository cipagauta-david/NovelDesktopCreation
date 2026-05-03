import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type SummaryGridItem = {
  label: string
  value: ReactNode
}

type SummaryGridProps = {
  items: SummaryGridItem[]
  className?: string
}

export function SummaryGrid({ items, className }: SummaryGridProps) {
  return (
    <dl className={cn('meta-summary-list', className)}>
      {items.map((item, i) => (
        <div key={`${item.label}-${i}`} className="meta-summary-item">
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
