import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ActionRowProps = {
  children: ReactNode
  className?: string
}

export function ActionRow({ children, className }: ActionRowProps) {
  return <div className={cn('toolbar-group', className)}>{children}</div>
}
