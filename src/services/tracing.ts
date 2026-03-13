import { SpanStatusCode, context, trace, type Attributes, type Span } from '@opentelemetry/api'

const tracer = trace.getTracer('novel-desktop-app')

type AsyncOrSync<T> = Promise<T> | T

export function startSpan(name: string, attributes?: Attributes): Span {
  const span = tracer.startSpan(name)
  if (attributes) {
    span.setAttributes(attributes)
  }
  return span
}

export async function withSpan<T>(
  name: string,
  attributes: Attributes | undefined,
  run: (span: Span) => AsyncOrSync<T>,
): Promise<T> {
  const span = startSpan(name, attributes)
  try {
    const result = await context.with(trace.setSpan(context.active(), span), () => run(span))
    span.setStatus({ code: SpanStatusCode.OK })
    return result
  } catch (error) {
    span.recordException(error instanceof Error ? error : new Error(String(error)))
    span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) })
    throw error
  } finally {
    span.end()
  }
}

export function markSpanError(span: Span, error: unknown): void {
  span.recordException(error instanceof Error ? error : new Error(String(error)))
  span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) })
}

export function endSpanOk(span: Span, attributes?: Attributes): void {
  if (attributes) {
    span.setAttributes(attributes)
  }
  span.setStatus({ code: SpanStatusCode.OK })
  span.end()
}

export function endSpanError(span: Span, error: unknown, attributes?: Attributes): void {
  if (attributes) {
    span.setAttributes(attributes)
  }
  markSpanError(span, error)
  span.end()
}
