import type { ReactNode } from 'react'

type EmptyMiniStateProps = {
  children: ReactNode
  className?: string
}

export function EmptyMiniState({ children, className }: EmptyMiniStateProps) {
  return <div className={['empty-mini-state', className].filter(Boolean).join(' ')}>{children}</div>
}
