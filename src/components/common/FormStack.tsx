import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type FormStackProps = {
  children: ReactNode
  className?: string
}

export function FormStack({ children, className }: FormStackProps) {
  return <div className={cn('stacked-form', className)}>{children}</div>
}
