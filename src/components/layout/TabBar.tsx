import { memo, useState } from 'react'

import type { CollectionTab } from '../../types/workspace'
import { resolveCollectionColor } from '../../utils/collectionColors'
import { ActionMenu } from '../common/ActionMenu'
import { Field } from '../common/Field'
import { Button } from '../ui/Button'
import '../../styles/layout/TabBar.css';



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
  onUpdateActiveTabColor: (color: string) => void
}

function renderCollectionIcon(name: string) {
  const normalized = name.toLowerCase()

  if (normalized.includes('capítulo') || normalized.includes('escena') || normalized.includes('escrit')) {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M5 4.5a1.5 1.5 0 0 1 1.5-1.5H15v13H6.5A1.5 1.5 0 0 0 5 17.5V4.5Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5 5h9" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    )
  }

  if (normalized.includes('person') || normalized.includes('personaje')) {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="7" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 16c.8-2.2 2.8-3.4 6-3.4s5.2 1.2 6 3.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }

  if (normalized.includes('mapa') || normalized.includes('mundo') || normalized.includes('lugar')) {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M3.5 5.5 8 3l4 2.5L16.5 3v11.5L12 17l-4-2.5L3.5 17V5.5Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="4" y="4" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export const TabBar = memo(function TabBar({
  tabs,
  activeTab,
  newTabName,
  onNewTabNameChange,
  onSelectTab,
  onCreateTab,
  onMoveTab,
  onRenameTab,
  onDeleteTab,
  onUpdateActiveTabColor,
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
              title={tab.prompt}
              role="treeitem"
              aria-selected={tab.id === activeTab?.id}
            >
              <span className="tab-tree-icon" style={{ color: resolveCollectionColor(tab.id, tab.color) }}>{renderCollectionIcon(tab.name)}</span>
              <span className="tab-tree-copy">
                <strong>{tab.name}</strong>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="tab-toolbar">
        {activeTab && (
          <Field className="tab-color-field" label={<span>Color</span>}>
            <input
              type="color"
              value={resolveCollectionColor(activeTab.id, activeTab.color)}
              onChange={(event) => onUpdateActiveTabColor(event.target.value)}
              aria-label={`Color de ${activeTab.name}`}
            />
          </Field>
        )}
        <Button
          type="button"
          className="secondary-button compact-button btn--secondary"
          onClick={() => setShowComposer((current) => !current)}
        >
          {showComposer ? 'Cerrar' : 'Nueva colección'}
        </Button>

        {showComposer && (
          <div className="inline-composer">
            <Field label={<span className="visually-hidden">Nombre de la nueva colección</span>}>
              <input
                value={newTabName}
                onChange={(event) => onNewTabNameChange(event.target.value)}
                placeholder="Nombre de la nueva colección"
              />
            </Field>
            <Button type="button" className="primary-button btn--default" onClick={onCreateTab}>
              Crear
            </Button>
          </div>
        )}
      </div>
    </section>
  )
})
