import { useState } from 'react'

import type { CollectionTab } from '../types/workspace'
import { ActionMenu } from './common/ActionMenu'

type TabBarProps = {
  tabs: CollectionTab[]
  activeTab: CollectionTab | null
  newTabName: string
  onNewTabNameChange: (value: string) => void
  onSelectTab: (tabId: string) => void
  onCreateTab: () => void
  onMoveTab: (direction: -1 | 1) => void
  onRenameTab: () => void
  onDeleteTab: () => void
}

export function TabBar({
  tabs,
  activeTab,
  newTabName,
  onNewTabNameChange,
  onSelectTab,
  onCreateTab,
  onMoveTab,
  onRenameTab,
  onDeleteTab,
}: TabBarProps) {
  const [showComposer, setShowComposer] = useState(false)

  return (
    <section className="tab-bar">
      <div className="tab-strip">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab?.id ? 'tab-pill active' : 'tab-pill'}
            onClick={() => onSelectTab(tab.id)}
          >
            <span>{tab.icon}</span>
            {tab.name}
          </button>
        ))}
      </div>

      <div className="tab-toolbar">
        <ActionMenu
          label="Opciones de tab"
          items={[
            {
              label: showComposer ? 'Ocultar nueva tab' : 'Mostrar nueva tab',
              onSelect: () => setShowComposer((current) => !current),
            },
            { label: 'Mover a la izquierda', onSelect: () => onMoveTab(-1) },
            { label: 'Mover a la derecha', onSelect: () => onMoveTab(1) },
            { label: 'Renombrar tab', onSelect: onRenameTab },
            {
              label: 'Eliminar tab',
              onSelect: onDeleteTab,
              destructive: true,
              disabled: tabs.length === 1,
            },
          ]}
        />

        {showComposer && (
          <div className="inline-composer">
            <input
              value={newTabName}
              onChange={(event) => onNewTabNameChange(event.target.value)}
              placeholder="Nueva tab personalizada"
            />
            <button type="button" className="primary-button" onClick={onCreateTab}>
              Añadir
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
