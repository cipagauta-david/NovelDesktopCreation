import type { GraphCollectionMeta } from './contracts'

type GraphHudProps = {
  availableCollections: GraphCollectionMeta[]
  availableCollectionCounts: Record<string, number>
  collectionVisibility: Record<string, boolean>
  searchTerm: string
  searchMatchCount: number
  repulsionStrength: number
  gravityStrength: number
  linkWeightStrength: number
  linkAttractionStrength: number
  collectionCohesionStrength: number
  collectionBoundaryRepulsionStrength: number
  simulationPaused: boolean
  position?: { x: number; y: number }
  disableSimulationToggle?: boolean
  onToggleCollection: (collectionId: string) => void
  onCollectionColorChange: (collectionId: string, color: string) => void
  onSearchTermChange: (value: string) => void
  onClearSearch: () => void
  onSubmitSearch: () => void
  onRepulsionStrengthChange: (value: number) => void
  onGravityStrengthChange: (value: number) => void
  onLinkWeightStrengthChange: (value: number) => void
  onLinkAttractionStrengthChange: (value: number) => void
  onCollectionCohesionStrengthChange: (value: number) => void
  onCollectionBoundaryRepulsionStrengthChange: (value: number) => void
  onCenterView: () => void
  onToggleSimulation: () => void
  onPositionChange?: (position: { x: number; y: number }) => void
}

export function GraphHud({
  availableCollections,
  availableCollectionCounts,
  collectionVisibility,
  searchTerm,
  searchMatchCount,
  repulsionStrength,
  gravityStrength,
  linkWeightStrength,
  linkAttractionStrength,
  collectionCohesionStrength,
  collectionBoundaryRepulsionStrength,
  simulationPaused,
  position,
  disableSimulationToggle,
  onToggleCollection,
  onCollectionColorChange,
  onSearchTermChange,
  onClearSearch,
  onSubmitSearch,
  onRepulsionStrengthChange,
  onGravityStrengthChange,
  onLinkWeightStrengthChange,
  onLinkAttractionStrengthChange,
  onCollectionCohesionStrengthChange,
  onCollectionBoundaryRepulsionStrengthChange,
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
        {availableCollections.map((collection) => (
          <button
            key={collection.id}
            type="button"
            className={collectionVisibility[collection.id] ? 'graph-hud-toggle active' : 'graph-hud-toggle'}
            onClick={() => onToggleCollection(collection.id)}
          >
            <span className="graph-hud-collection-dot" style={{ backgroundColor: collection.color }} aria-hidden="true" />
            {collection.name} ({availableCollectionCounts[collection.id] ?? 0})
            <input
              type="color"
              className="graph-hud-color-input"
              value={collection.color}
              aria-label={`Color de ${collection.name}`}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => onCollectionColorChange(collection.id, event.target.value)}
            />
          </button>
        ))}
      </div>

      <div className="graph-hud-row graph-hud-search-row">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Buscar nodo o colección..."
          aria-label="Buscar nodo"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onSubmitSearch()
            }
          }}
        />
        {searchTerm.trim() && <small className="graph-hud-search-meta">{searchMatchCount}</small>}
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
          max={200}
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

      <label className="graph-hud-slider">
        <span>Atracción enlaces</span>
        <input
          type="range"
          min={0}
          max={100}
          value={linkAttractionStrength}
          onChange={(event) => onLinkAttractionStrengthChange(Number(event.target.value))}
          aria-label="Atracción de enlaces"
        />
        <small>{linkAttractionStrength}%</small>
      </label>

      <label className="graph-hud-slider">
        <span>Cohesión colección</span>
        <input
          type="range"
          min={0}
          max={1000}
          value={collectionCohesionStrength}
          onChange={(event) => onCollectionCohesionStrengthChange(Number(event.target.value))}
          aria-label="Cohesión de colección"
        />
        <small>{collectionCohesionStrength}%</small>
      </label>

      <label className="graph-hud-slider">
        <span>Repulsión borde colección</span>
        <input
          type="range"
          min={0}
          max={1000}
          value={collectionBoundaryRepulsionStrength}
          onChange={(event) => onCollectionBoundaryRepulsionStrengthChange(Number(event.target.value))}
          aria-label="Repulsión del borde de colección"
        />
        <small>{collectionBoundaryRepulsionStrength}%</small>
      </label>
    </div>
  )
}
