import type { LlmTraceEntry, Provider } from '../../types/workspace'

type InspectorMetricsDashboardProps = {
  traces: LlmTraceEntry[]
}

type ProviderMetric = {
  provider: Provider
  total: number
  errors: number
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) {
    return 0
  }
  const sorted = [...values].sort((a, b) => a - b)
  const rawIndex = Math.ceil(sorted.length * ratio) - 1
  const index = Math.min(Math.max(rawIndex, 0), sorted.length - 1)
  return sorted[index]
}

function toPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function toMs(value: number): string {
  return `${Math.round(value)} ms`
}

function buildProviderMetrics(traces: LlmTraceEntry[]): ProviderMetric[] {
  const grouped = new Map<Provider, ProviderMetric>()

  for (const trace of traces) {
    const current = grouped.get(trace.provider) ?? {
      provider: trace.provider,
      total: 0,
      errors: 0,
    }

    current.total += 1
    if (trace.status === 'error') {
      current.errors += 1
    }

    grouped.set(trace.provider, current)
  }

  return [...grouped.values()].sort((left, right) => right.total - left.total)
}

export function InspectorMetricsDashboard({ traces }: InspectorMetricsDashboardProps) {
  const total = traces.length
  const errors = traces.filter((trace) => trace.status === 'error').length
  const durationSamples = traces.map((trace) => trace.durationMs).filter((value) => Number.isFinite(value) && value > 0)
  const firstTokenSamples = traces
    .map((trace) => trace.firstTokenMs)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0)

  const errorRate = total > 0 ? (errors / total) * 100 : 0
  const p95Latency = percentile(durationSamples, 0.95)
  const p95FirstToken = percentile(firstTokenSamples, 0.95)
  const providerMetrics = buildProviderMetrics(traces)

  if (total === 0) {
    return (
      <div className="empty-mini-state">
        Aún no hay trazas suficientes para calcular métricas operativas.
      </div>
    )
  }

  return (
    <div className="metrics-dashboard">
      <div className="metrics-grid">
        <article className="metric-card">
          <span>Latencia p95</span>
          <strong>{toMs(p95Latency)}</strong>
          <small>{durationSamples.length} muestras</small>
        </article>

        <article className="metric-card">
          <span>Error rate</span>
          <strong>{toPercent(errorRate)}</strong>
          <small>{errors} / {total} requests</small>
        </article>

        <article className="metric-card">
          <span>Tiempo a primer token p95</span>
          <strong>{firstTokenSamples.length > 0 ? toMs(p95FirstToken) : 'N/A'}</strong>
          <small>{firstTokenSamples.length} muestras</small>
        </article>
      </div>

      <div className="metrics-provider-list">
        {providerMetrics.map((metric) => {
          const providerErrorRate = metric.total > 0 ? (metric.errors / metric.total) * 100 : 0
          return (
            <article key={metric.provider} className="history-item">
              <strong>{metric.provider}</strong>
              <small>
                {metric.total} requests · error rate {toPercent(providerErrorRate)}
              </small>
            </article>
          )
        })}
      </div>
    </div>
  )
}
