import { GRAPH_CATEGORY_LABEL } from './category'
import type { GraphCategory } from './contracts'

type GraphHudProps = {
  availableCategories: GraphCategory[]
  categoryVisibility: Record<GraphCategory, boolean>
  searchTerm: string
  repulsionStrength: number
  gravityStrength: number
  linkWeightStrength: number
  simulationPaused: boolean
  position?: { x: number; y: number }
  disableSimulationToggle?: boolean
  onToggleCategory: (category: GraphCategory) => void
  onSearchTermChange: (value: string) => void
  onClearSearch: () => void
  onSubmitSearch: () => void
  onRepulsionStrengthChange: (value: number) => void
  onGravityStrengthChange: (value: number) => void
  onLinkWeightStrengthChange: (value: number) => void
  onCenterView: () => void
  onToggleSimulation: () => void
  onPositionChange?: (position: { x: number; y: number }) => void
}

export function GraphHud({
  availableCategories,
  categoryVisibility,
  searchTerm,
  repulsionStrength,
  gravityStrength,
  linkWeightStrength,
  simulationPaused,
  position,
  disableSimulationToggle,
  onToggleCategory,
  onSearchTermChange,
  onClearSearch,
  onSubmitSearch,
  onRepulsionStrengthChange,
  onGravityStrengthChange,
  onLinkWeightStrengthChange,
  onCenterView,
  onToggleSimulation,
  onPositionChange,
}: GraphHudProps) {
  const hudPosition = position ?? { x: 0, y: 0 }

  return (
    <div
      className="graph-hud"
      aria-label="Controles del grafo"
      style={{ top: `calc(0.9rem + ${hudPosition.y}px)`, left: `calc(0.9rem + ${hudPosition.x}px)` }}
    >
      <div
        className="graph-hud-drag-handle"
        role="button"
        aria-label="Mover panel de controles"
        title="Arrastra para mover"
        onPointerDown={(event) => {
          if (!onPositionChange) {
            return
          }
          const startX = event.clientX
          const startY = event.clientY
          const initialX = hudPosition.x
          const initialY = hudPosition.y
          const target = event.currentTarget as HTMLDivElement
          target.setPointerCapture(event.pointerId)

          const handlePointerMove = (moveEvent: PointerEvent) => {
            const deltaX = moveEvent.clientX - startX
            const deltaY = moveEvent.clientY - startY
            onPositionChange({
              x: initialX + deltaX,
              y: initialY + deltaY,
            })
          }

          const clear = () => {
            target.removeEventListener('pointermove', handlePointerMove)
            target.removeEventListener('pointerup', clear)
            target.removeEventListener('pointercancel', clear)
          }

          target.addEventListener('pointermove', handlePointerMove)
          target.addEventListener('pointerup', clear)
          target.addEventListener('pointercancel', clear)
        }}
      >
        ⋮⋮ Mover
      </div>

      <div className="graph-hud-row graph-hud-filters">
        {availableCategories.map((category) => (
          <button
            key={category}
            type="button"
            className={categoryVisibility[category] ? 'graph-hud-toggle active' : 'graph-hud-toggle'}
            onClick={() => onToggleCategory(category)}
          >
            {GRAPH_CATEGORY_LABEL[category]}
          </button>
        ))}
      </div>

      <div className="graph-hud-row graph-hud-search-row">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Buscar nodo..."
          aria-label="Buscar nodo"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onSubmitSearch()
            }
          }}
        />
        {searchTerm && (
          <button type="button" className="graph-hud-clear" onClick={onClearSearch}>
            Limpiar
          </button>
        )}
      </div>

      <div className="graph-hud-row graph-hud-actions">
        <button type="button" className="graph-hud-clear" onClick={onCenterView}>
          Centrar
        </button>
        <button
          type="button"
          className="graph-hud-clear"
          onClick={onToggleSimulation}
          disabled={disableSimulationToggle}
        >
          {simulationPaused ? 'Reanudar' : 'Congelar'}
        </button>
      </div>

      <label className="graph-hud-slider">
        <span>Repulsión</span>
        <input
          type="range"
          min={0}
          max={100}
          value={repulsionStrength}
          onChange={(event) => onRepulsionStrengthChange(Number(event.target.value))}
          aria-label="Repulsión de nodos"
        />
        <small>{repulsionStrength}%</small>
      </label>

      <label className="graph-hud-slider">
        <span>Gravedad</span>
        <input
          type="range"
          min={0}
          max={100}
          value={gravityStrength}
          onChange={(event) => onGravityStrengthChange(Number(event.target.value))}
          aria-label="Gravedad de simulación"
        />
        <small>{gravityStrength}%</small>
      </label>

      <label className="graph-hud-slider">
        <span>Peso</span>
        <input
          type="range"
          min={0}
          max={100}
          value={linkWeightStrength}
          onChange={(event) => onLinkWeightStrengthChange(Number(event.target.value))}
          aria-label="Peso de enlaces"
        />
        <small>{linkWeightStrength}%</small>
      </label>
    </div>
  )
}
