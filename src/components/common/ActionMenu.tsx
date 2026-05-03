import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
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
  /** Accepts any renderable content: string, icon component, etc. */
  icon?: ReactNode
  items: ActionItem[]
  className?: string
}

const destructiveCls = 'text-destructive focus:text-destructive focus:bg-destructive/10'

export function ActionMenu({ label, icon = '⋯', items, className }: ActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn('icon-button bg-[var(--bg-surface-raised)]', className)}
        aria-label={label}
      >
        {icon}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item, i) => (
          <DropdownMenuItem
            key={`${item.label}-${i}`}
            disabled={item.disabled}
            onSelect={item.onSelect}
            className={item.destructive ? destructiveCls : undefined}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
