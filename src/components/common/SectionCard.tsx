import { useId, useState, type ReactNode } from 'react'
import '../../styles/common/SectionCard.css';

import '../../styles/common/PanelSection.css'

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

  const sectionClasses = ['section-card', className].filter(Boolean).join(' ')
  const bodyClasses = ['section-card-body', bodyClassName].filter(Boolean).join(' ')

  function setOpen(nextOpen: boolean) {
    if (!collapsible) {
      return
    }

    if (!isControlled) {
      setInternalOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }

  return (
    <section className={sectionClasses}>
      <header className="section-card-header">
        <div>
          <h3>{title}</h3>
          {meta && <div className="section-meta">{meta}</div>}
        </div>

        <div className="section-card-actions">
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
      </header>

      {isOpen && (
        <div id={bodyId} className={bodyClasses}>
          {children}
        </div>
      )}
    </section>
  )
}
