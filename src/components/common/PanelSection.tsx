import type { ReactNode } from 'react'
import { SectionCard } from './SectionCard'

type PanelSectionProps = {
  title: string
  meta?: ReactNode
  actions?: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  collapsible?: boolean
  className?: string
  bodyClassName?: string
  children: ReactNode
}

export function PanelSection({
  title,
  meta,
  actions,
  defaultOpen = true,
  open,
  onOpenChange,
  collapsible = true,
  className,
  bodyClassName,
  children,
}: PanelSectionProps) {
  return (
    <SectionCard
      title={title}
      meta={meta}
      actions={actions}
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
      collapsible={collapsible}
      className={className}
      bodyClassName={bodyClassName}
    >
      {children}
    </SectionCard>
  )
}
