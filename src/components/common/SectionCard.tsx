import { useId, useState, type ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type SectionCardProps = {
  title: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  collapsible?: boolean
  className?: string
  bodyClassName?: string
}

export function SectionCard({
  title,
  meta,
  actions,
  children,
  defaultOpen = true,
  open,
  onOpenChange,
  collapsible = true,
  className = '',
  bodyClassName = '',
}: SectionCardProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const bodyId = useId()
  const isControlled = typeof open === 'boolean'
  const isOpen = collapsible ? (isControlled ? open : internalOpen) : true

  function setOpen(nextOpen: boolean) {
    if (!collapsible) return
    if (!isControlled) setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
  }

  return (
    <Card size="sm" className={cn('gap-2', className)} role="region">
      <CardHeader className="px-3 py-0 border-b-0 gap-1">
        <div className="flex items-start justify-between gap-2 flex-wrap min-w-0">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-[0.78rem] font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </CardTitle>
            {meta && <div className="mt-0.5 text-[0.74rem] text-muted-foreground/70">{meta}</div>}
          </div>
          <div className="flex gap-1 items-center flex-shrink-0">
            {actions}
            {collapsible && (
              <button
                type="button"
                className="section-toggle"
                aria-expanded={isOpen}
                aria-controls={bodyId}
                aria-label={isOpen ? `Contraer ${String(title)}` : `Expandir ${String(title)}`}
                onClick={() => setOpen(!isOpen)}
              >
                {isOpen ? '⌃' : '⌄'}
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent id={bodyId} className={cn('px-3 pb-3', bodyClassName)}>
          {children}
        </CardContent>
      )}
    </Card>
  )
}
