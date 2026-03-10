import type { GraphModel } from '../types/workspace'

type GraphPanelProps = {
  graphModel: GraphModel
  activeEntityId?: string
  onSelectEntity: (entityId: string, tabId: string) => void
}

export function GraphPanel({ graphModel, activeEntityId, onSelectEntity }: GraphPanelProps) {
  return (
    <section className="panel surface-panel">
      <div className="panel-header">
        <div>
          <h3>Vista de grafo</h3>
          <p>Nodos derivados de entidades y enlaces creados desde referencias estructuradas.</p>
        </div>
        <small>{graphModel.nodes.length} nodos</small>
      </div>

      <svg viewBox="0 0 520 440" role="img" aria-label="Grafo narrativo inicial">
        {graphModel.edges.map((edge) => {
          const source = graphModel.nodes.find((node) => node.id === edge.source)
          const target = graphModel.nodes.find((node) => node.id === edge.target)
          if (!source || !target) return null
          return (
            <line
              key={`${edge.source}-${edge.target}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="rgba(148, 163, 184, 0.45)"
              strokeWidth="2"
            />
          )
        })}
        {graphModel.nodes.map((node) => (
          <g key={node.id} className="graph-node" onClick={() => onSelectEntity(node.id, node.tabId)}>
            <circle
              cx={node.x}
              cy={node.y}
              r={node.id === activeEntityId ? 36 : 28}
              fill={node.id === activeEntityId ? '#7c3aed' : '#172033'}
              stroke="#c4b5fd"
              strokeWidth="2"
            />
            <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="middle">
              {node.title.slice(0, 12)}
            </text>
          </g>
        ))}
      </svg>
    </section>
  )
}
