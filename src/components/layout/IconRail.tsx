// SYNAPSE_WARNING: onTogglePanel calls must be idempotent — callers verify panel state BEFORE toggling to avoid double-flip

import { memo } from 'react'

type NavigationTab = 'workspace' | 'content'
type InspectorTab = 'context' | 'meta' | 'history' | 'metrics'

interface LeftIconRailProps {
  navigationTab: NavigationTab
  hasLeftPanel: boolean
  panels: { sidebar: boolean; entities: boolean }
  settingsOpen: boolean
  onNavigationTabChange: (tab: NavigationTab) => void
  onTogglePanel: (panel: 'sidebar' | 'entities') => void
  onOpenSettings: () => void
}

interface RightIconRailProps {
  inspectorTab: InspectorTab
  inspectorOpen: boolean
  onInspectorTabChange: (tab: InspectorTab) => void
  onToggleInspector: () => void
}

export const LeftIconRail = memo(function LeftIconRail({
  navigationTab,
  hasLeftPanel,
  panels,
  settingsOpen,
  onNavigationTabChange,
  onTogglePanel,
  onOpenSettings,
}: LeftIconRailProps) {
  function openTab(tab: NavigationTab) {
    onNavigationTabChange(tab)
    if (!panels.sidebar) onTogglePanel('sidebar')
    if (!panels.entities) onTogglePanel('entities')
  }

  return (
    <nav className="icon-rail icon-rail-left" aria-label="Paneles izquierda">
      <button
        type="button"
        className={hasLeftPanel && navigationTab === 'workspace' ? 'icon-rail-button active' : 'icon-rail-button'}
        onClick={() => openTab('workspace')}
        aria-label="Proyecto"
        title="Proyecto"
      >⌂</button>
      <button
        type="button"
        className={hasLeftPanel && navigationTab === 'content' ? 'icon-rail-button active' : 'icon-rail-button'}
        onClick={() => openTab('content')}
        aria-label="Colecciones"
        title="Colecciones"
      >☷</button>
      <span className="icon-rail-spacer" aria-hidden="true" />
      <button
        type="button"
        className={settingsOpen ? 'icon-rail-button active' : 'icon-rail-button'}
        onClick={onOpenSettings}
        aria-label="Configuración"
        title="Configuración"
      >⚙</button>
    </nav>
  )
})

export const RightIconRail = memo(function RightIconRail({
  inspectorTab,
  inspectorOpen,
  onInspectorTabChange,
  onToggleInspector,
}: RightIconRailProps) {
  function openTab(tab: InspectorTab) {
    onInspectorTabChange(tab)
    if (!inspectorOpen) onToggleInspector()
  }

  const TABS: { id: InspectorTab; label: string; icon: string }[] = [
    { id: 'context',  label: 'Contexto',  icon: '◧' },
    { id: 'meta',     label: 'Metadatos', icon: '◨' },
    { id: 'history',  label: 'Historial', icon: '⟲' },
    { id: 'metrics',  label: 'Métricas',  icon: '◫' },
  ]

  return (
    <nav className="icon-rail icon-rail-right" aria-label="Paneles derecha">
      {TABS.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          className={inspectorOpen && inspectorTab === id ? 'icon-rail-button active' : 'icon-rail-button'}
          onClick={() => openTab(id)}
          aria-label={label}
          title={label}
        >{icon}</button>
      ))}
    </nav>
  )
})
