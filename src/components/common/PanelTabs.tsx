import '../../styles/common/PanelTabs.css'

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
    <div className="panel-tabs-container" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={activeTab === option.id}
          className={activeTab === option.id ? 'panel-tab active' : 'panel-tab'}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
