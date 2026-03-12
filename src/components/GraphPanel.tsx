import type { GraphModel } from '../types/workspace'

type GraphPanelProps = {
  graphModel: GraphModel
  activeEntityId?: string
  onSelectEntity: (entityId: string, tabId: string) => void
}

export function GraphPanel({ graphModel, activeEntityId, onSelectEntity }: GraphPanelProps) {
  const connectedNodeIds = activeEntityId
    ? new Set(
        graphModel.edges.flatMap((edge) =>
          edge.source === activeEntityId || edge.target === activeEntityId
            ? [edge.source, edge.target]
            : [],
        ),
      )
    : null

  return (
    <section className="panel surface-panel">
      <div className="panel-header">
        <div>
          <h3>Mapa narrativo</h3>
          <p>Explora cómo se conectan tus entidades a partir de las referencias que has creado.</p>
        </div>
        <small>{graphModel.nodes.length} nodos</small>
      </div>

      <svg viewBox="0 0 520 440" role="img" aria-label="Mapa narrativo del proyecto">
        {graphModel.edges.map((edge) => {
          const source = graphModel.nodes.find((node) => node.id === edge.source)
          const target = graphModel.nodes.find((node) => node.id === edge.target)
          if (!source || !target) return null
          const isRelated =
            !activeEntityId || edge.source === activeEntityId || edge.target === activeEntityId
          return (
            <line
              key={`${edge.source}-${edge.target}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={isRelated ? 'var(--border-focus)' : 'var(--border-subtle)'}
              strokeWidth={isRelated ? '2.4' : '1.2'}
            />
          )
        })}
        {graphModel.nodes.map((node) => {
          const isActive = node.id === activeEntityId
          const isConnected = connectedNodeIds?.has(node.id) ?? true

          return (
            <g
              key={node.id}
              className="graph-node"
              opacity={isActive || isConnected ? 1 : activeEntityId ? 0.22 : 1}
              onClick={() => onSelectEntity(node.id, node.tabId)}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={isActive ? 16 : 10}
                fill={isActive ? 'var(--brand-accent)' : 'var(--surface-base)'}
                stroke={isActive ? 'var(--brand-accent-hover)' : 'var(--border-focus)'}
                strokeWidth={isActive ? '2.4' : '1.4'}
              />
              <text x={node.x} y={node.y + 24} textAnchor="middle" fill="var(--text-primary)">
                {node.title.length > 18 ? `${node.title.slice(0, 18)}…` : node.title}
              </text>
            </g>
          )
        })}
      </svg>
    </section>
  )
}
