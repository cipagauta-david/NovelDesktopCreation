import type { ReactNode } from 'react'

type FormStackProps = {
  children: ReactNode
  className?: string
}

export function FormStack({ children, className = '' }: FormStackProps) {
  const classes = ['stacked-form', className].filter(Boolean).join(' ')
  return <div className={classes}>{children}</div>
}
