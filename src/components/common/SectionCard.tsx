import { useCallback, useId, useState, type ReactNode } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type SectionCardProps = {
  title: string
  meta?: ReactNode
  actions?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  collapsible?: boolean
  collapseLabel?: string
  expandLabel?: string
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
  collapseLabel = `Collapse ${title}`,
  expandLabel = `Expand ${title}`,
  className,
  bodyClassName,
}: SectionCardProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const bodyId = useId()
  const isControlled = typeof open === 'boolean'
  const isOpen = collapsible ? (isControlled ? open : internalOpen) : true

  const setOpen = useCallback((nextOpen: boolean) => {
    if (!collapsible) return
    if (!isControlled) setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
  }, [collapsible, isControlled, onOpenChange])

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
                aria-label={isOpen ? collapseLabel : expandLabel}
                onClick={() => setOpen(!isOpen)}
              >
                {isOpen
                  ? <ChevronUp size={12} aria-hidden />
                  : <ChevronDown size={12} aria-hidden />
                }
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
