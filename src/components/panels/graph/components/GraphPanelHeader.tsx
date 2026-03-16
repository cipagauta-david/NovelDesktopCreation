type GraphPanelHeaderProps = {
  rendererReady: boolean
  rendererReason?: string
}

export function GraphPanelHeader({ rendererReady, rendererReason }: GraphPanelHeaderProps) {
  return (
    <div className="panel-header">
      <div>
        <h3>Mapa narrativo</h3>
        <p>Explora conexiones y arrastra nodos para reorganizar el mapa en tiempo real.</p>
        {!rendererReady && rendererReason && <small className="graph-renderer-status">{rendererReason}</small>}
      </div>
    </div>
  )
}
