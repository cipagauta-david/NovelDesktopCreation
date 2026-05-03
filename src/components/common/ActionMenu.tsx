import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="icon-button"
        aria-label={label}
        style={{ background: 'var(--bg-surface-raised)' }}
      >
        {icon}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            disabled={item.disabled}
            onSelect={item.onSelect}
            className={item.destructive ? 'text-destructive focus:text-destructive focus:bg-destructive/10' : ''}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
