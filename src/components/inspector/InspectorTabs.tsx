import '../../styles/inspector/InspectorTabs.css';

type InspectorTabsProps = {
  activeTab: 'context' | 'meta' | 'history' | 'metrics'
  onChange: (tab: 'context' | 'meta' | 'history' | 'metrics') => void
}

export function InspectorTabs({ activeTab, onChange }: InspectorTabsProps) {
  return (
    <div className="inspector-tabs-container" role="tablist" aria-label="Secciones del inspector">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'context'}
        className={activeTab === 'context' ? 'inspector-tab active' : 'inspector-tab'}
        onClick={() => onChange('context')}
      >
        Contexto / IA
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'meta'}
        className={activeTab === 'meta' ? 'inspector-tab active' : 'inspector-tab'}
        onClick={() => onChange('meta')}
      >
        Metadatos
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'history'}
        className={activeTab === 'history' ? 'inspector-tab active' : 'inspector-tab'}
        onClick={() => onChange('history')}
      >
        Historial
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'metrics'}
        className={activeTab === 'metrics' ? 'inspector-tab active' : 'inspector-tab'}
        onClick={() => onChange('metrics')}
      >
        Métricas
      </button>
    </div>
  )
}
