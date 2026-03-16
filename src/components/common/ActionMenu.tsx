import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import '../../styles/common/ActionMenu.css';



type ActionItem = {
  label: string
  onSelect: () => void
  disabled?: boolean
  destructive?: boolean
}

type ActionMenuProps = {
  label: string
  icon?: string
  items: ActionItem[]
}

export function ActionMenu({ label, icon = '⋯', items }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    function updatePosition() {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const popoverWidth = 260
      const margin = 8
      const estimatedHeight = 280

      const preferredLeft = rect.right - popoverWidth
      const left = Math.max(margin, Math.min(preferredLeft, viewportWidth - popoverWidth - margin))
      const fitsBelow = rect.bottom + 8 + estimatedHeight <= viewportHeight - margin
      const top = fitsBelow
        ? rect.bottom + 8
        : Math.max(margin, rect.top - estimatedHeight - 8)

      setPosition({ top, left })
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (popoverRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      setOpen(false)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="action-menu">
      <button
        ref={triggerRef}
        type="button"
        className="icon-button"
        aria-label={label}
        style={{ background: 'var(--bg-surface-raised)' }}
        onClick={() => setOpen((current) => !current)}
      >
        {icon}
      </button>
      {open && createPortal(
        <div
          ref={popoverRef}
          className="action-menu-popover action-menu-popover-floating"
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className={item.destructive ? 'menu-item destructive' : 'menu-item'}
              disabled={item.disabled}
              onClick={() => {
                item.onSelect()
                setOpen(false)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}
