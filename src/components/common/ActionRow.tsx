import type { ReactNode } from 'react'

type ActionRowProps = {
  children: ReactNode
  className?: string
}

export function ActionRow({ children, className = '' }: ActionRowProps) {
  const classes = ['toolbar-group', className].filter(Boolean).join(' ')
  return <div className={classes}>{children}</div>
}
