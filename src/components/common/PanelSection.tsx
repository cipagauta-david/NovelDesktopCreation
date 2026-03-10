import { useState, type ReactNode } from 'react'

type PanelSectionProps = {
  title: string
  meta?: ReactNode
  actions?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

export function PanelSection({
  title,
  meta,
  actions,
  defaultOpen = true,
  children,
}: PanelSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="section-card">
      <header className="section-card-header">
        <div>
          <h3>{title}</h3>
          {meta && <div className="section-meta">{meta}</div>}
        </div>
        <div className="section-card-actions">
          {actions}
          <button type="button" className="ghost-button" onClick={() => setOpen((current) => !current)}>
            {open ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </header>
      {open && <div className="section-card-body">{children}</div>}
    </section>
  )
}
