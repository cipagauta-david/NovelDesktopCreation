type GraphFloatingToolbarProps = {
  nodeCount: number
  useD3PixiRenderer: boolean
  orbitAroundCenter: boolean
  relationSourceId: string | null
  activeEntityId?: string
  onToggleOrbit: () => void
  onToggleRelationMode: (nextSourceId: string | null) => void
}

export function GraphFloatingToolbar({
  nodeCount,
  useD3PixiRenderer,
  orbitAroundCenter,
  relationSourceId,
  activeEntityId,
  onToggleOrbit,
  onToggleRelationMode,
}: GraphFloatingToolbarProps) {
  return (
    <div className="graph-floating-toolbar" role="toolbar" aria-label="Acciones del mapa narrativo">
      <small>{nodeCount} nodos</small>
      {useD3PixiRenderer && (
        <button
          type="button"
          className={orbitAroundCenter ? 'ghost-button compact-button active' : 'ghost-button compact-button'}
          onClick={onToggleOrbit}
        >
          {orbitAroundCenter ? '⏸️ Detener órbita' : '🛰️ Iniciar órbita'}
        </button>
      )}
      <button
        type="button"
        className={relationSourceId ? 'ghost-button compact-button active' : 'ghost-button compact-button'}
        onClick={() => onToggleRelationMode(relationSourceId ? null : activeEntityId ?? null)}
      >
        {relationSourceId ? '✕ Cancelar enlace' : '+ Crear enlace'}
      </button>
    </div>
  )
}
