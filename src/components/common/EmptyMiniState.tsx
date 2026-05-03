import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type EmptyMiniStateProps = {
  children: ReactNode
  className?: string
}

export function EmptyMiniState({ children, className }: EmptyMiniStateProps) {
  return (
    <div role="status" aria-live="polite" className={cn('empty-mini-state', className)}>
      {children}
    </div>
  )
}
