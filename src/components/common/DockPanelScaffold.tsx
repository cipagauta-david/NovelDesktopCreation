import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

import '../../styles/common/DockPanelScaffold.css'

type DockPanelScaffoldProps = {
  side: 'left' | 'right'
  eyebrow: string
  collapseLabel: string
  onCollapse: () => void
  showHeader?: boolean
  tabs?: ReactNode
  footer?: ReactNode
  className?: string
  children: ReactNode
}

export function DockPanelScaffold({
  side,
  eyebrow,
  collapseLabel,
  onCollapse,
  showHeader = true,
  tabs,
  footer,
  className,
  children,
}: DockPanelScaffoldProps) {
  const collapseArrow = side === 'left' ? '‹' : '›'
  const classes = cn(
    'dock-panel',
    side === 'left' ? 'dock-panel-left' : 'dock-panel-right',
    footer && 'dock-panel-has-footer',
    className,
  )

  return (
    <aside className={classes}>
      <div className="dock-panel-sticky-head">
        {showHeader ? (
          <div className={cn('panel-dock-header', side === 'right' && 'panel-dock-header-right')}>
            <span className="eyebrow">{eyebrow}</span>
            <button type="button" className="panel-dock-toggle" aria-label={collapseLabel} onClick={onCollapse}>
              {collapseArrow}
            </button>
          </div>
        ) : null}

        {tabs}
      </div>

      <div className="dock-panel-scroll-area">{children}</div>

      {footer ? <div className="dock-panel-footer">{footer}</div> : null}
    </aside>
  )
}
