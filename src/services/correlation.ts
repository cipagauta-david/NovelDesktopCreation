export function createCorrelationId(scope: string): string {
  return `${scope}-${crypto.randomUUID()}`
}
