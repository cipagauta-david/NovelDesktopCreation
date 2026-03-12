import { useState } from 'react'

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

  return (
    <div className="action-menu">
      <button
        type="button"
        className="icon-button"
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
      >
        {icon}
      </button>
      {open && (
        <div className="action-menu-popover">
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
        </div>
      )}
    </div>
  )
}
