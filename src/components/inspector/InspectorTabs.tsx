type InspectorTabsProps = {
  activeTab: 'context' | 'meta' | 'history'
  onChange: (tab: 'context' | 'meta' | 'history') => void
}

export function InspectorTabs({ activeTab, onChange }: InspectorTabsProps) {
  return (
    <div className="context-tabs">
      <button
        type="button"
        className={activeTab === 'context' ? 'context-tab active' : 'context-tab'}
        onClick={() => onChange('context')}
      >
        Contexto / IA
      </button>
      <button
        type="button"
        className={activeTab === 'meta' ? 'context-tab active' : 'context-tab'}
        onClick={() => onChange('meta')}
      >
        Metadatos
      </button>
      <button
        type="button"
        className={activeTab === 'history' ? 'context-tab active' : 'context-tab'}
        onClick={() => onChange('history')}
      >
        Historial
      </button>
    </div>
  )
}
