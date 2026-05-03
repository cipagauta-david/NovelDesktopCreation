import { Tab, Tabs } from '@nextui-org/react'

export type PanelTabOption<T extends string> = {
  id: T
  label: string
}

type PanelTabsProps<T extends string> = {
  ariaLabel: string
  activeTab: T
  options: readonly PanelTabOption<T>[]
  onChange: (tab: T) => void
}

export function PanelTabs<T extends string>({ ariaLabel, activeTab, options, onChange }: PanelTabsProps<T>) {
  return (
    <Tabs
      aria-label={ariaLabel}
      selectedKey={activeTab}
      onSelectionChange={(key) => onChange(key as T)}
      variant="underlined"
      size="sm"
      classNames={{
        base: 'w-full',
        tabList: [
          'w-full gap-0 rounded-none border-b px-1',
          'bg-[var(--panel-tabs-bg)] border-[var(--panel-tabs-border)]',
        ].join(' '),
        tab: 'h-9 px-3 text-[0.8125rem] font-medium text-[var(--text-muted)] data-[hover=true]:text-[var(--text-primary)]',
        cursor: 'bg-[var(--accent-primary)] w-full h-[2px]',
        tabContent:
          'group-data-[selected=true]:text-[var(--text-primary)] group-data-[selected=true]:font-semibold',
        panel: 'hidden p-0',
      }}
    >
      {options.map((option) => (
        <Tab key={option.id} title={option.label} />
      ))}
    </Tabs>
  )
}
