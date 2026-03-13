import type { CorrelationReport } from '../types/workspace'

type CorrelationRun = {
  correlationId: string
  intent: string
  startedAt: string
  status: 'ok' | 'error'
  events: CorrelationReport['events']
}

const reportStore = new Map<string, CorrelationRun>()

export function createCorrelationId(scope: string): string {
  return `${scope}-${crypto.randomUUID()}`
}

export function startCorrelationIntent(intent: string, correlationId = createCorrelationId(intent)): string {
  reportStore.set(correlationId, {
    correlationId,
    intent,
    startedAt: new Date().toISOString(),
    status: 'ok',
    events: [],
  })
  return correlationId
}

export function recordCorrelationStage(correlationId: string, stage: string, detail: string): void {
  const run = reportStore.get(correlationId)
  if (!run) {
    return
  }
  run.events.push({
    timestamp: new Date().toISOString(),
    stage,
    detail,
  })
}

export function finalizeCorrelationIntent(correlationId: string, status: 'ok' | 'error'): CorrelationReport | null {
  const run = reportStore.get(correlationId)
  if (!run) {
    return null
  }
  reportStore.delete(correlationId)
  return {
    correlationId: run.correlationId,
    intent: run.intent,
    startedAt: run.startedAt,
    finishedAt: new Date().toISOString(),
    status,
    events: run.events,
  }
}
