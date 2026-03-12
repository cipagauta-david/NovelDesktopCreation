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
    <section className="tab-bar tab-bar-compact">
      <div className="tab-strip-area">
        <div className="tab-strip-header">
          <span className="eyebrow">Colecciones</span>
          <ActionMenu
            label="Opciones de la colección"
            items={[
              { label: 'Mover a la izquierda', onSelect: () => onMoveTab(-1) },
              { label: 'Mover a la derecha', onSelect: () => onMoveTab(1) },
              { label: 'Renombrar colección', onSelect: onRenameTab },
              {
                label: 'Eliminar colección',
                onSelect: onDeleteTab,
                destructive: true,
                disabled: tabs.length === 1,
              },
            ]}
          />
        </div>

        <div className="tab-tree" role="tree" aria-label="Colecciones del proyecto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={tab.id === activeTab?.id ? 'tab-tree-item active' : 'tab-tree-item'}
              onClick={() => onSelectTab(tab.id)}
              role="treeitem"
              aria-selected={tab.id === activeTab?.id}
            >
              <span className="tab-tree-icon">{tab.icon}</span>
              <span className="tab-tree-copy">
                <strong>{tab.name}</strong>
                <small>{tab.prompt}</small>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="tab-toolbar">
        <button
          type="button"
          className="ghost-button compact-button"
          onClick={() => setShowComposer((current) => !current)}
        >
          {showComposer ? 'Cerrar' : 'Nueva colección'}
        </button>

        {showComposer && (
          <div className="inline-composer">
            <input
              value={newTabName}
              onChange={(event) => onNewTabNameChange(event.target.value)}
              placeholder="Nombre de la nueva colección"
            />
            <button type="button" className="primary-button" onClick={onCreateTab}>
              Crear
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
