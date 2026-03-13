import type { LlmErrorCategory, Provider } from '../types/workspace'

/**
 * Clasificación estructurada de errores LLM por proveedor.
 * Permite UX específica (reintentar vs re-autenticar vs esperar).
 */
export class LlmError extends Error {
  readonly provider: Provider
  readonly category: LlmErrorCategory
  readonly httpStatus: number | null
  readonly retryable: boolean
  readonly userMessage: string

  constructor(opts: {
    provider: Provider
    message: string
    httpStatus?: number | null
    category?: LlmErrorCategory
    retryable?: boolean
  }) {
    super(opts.message)
    this.name = 'LlmError'
    this.provider = opts.provider
    this.httpStatus = opts.httpStatus ?? null
    this.category = opts.category ?? classifyStatus(opts.httpStatus ?? 0)
    this.retryable = opts.retryable ?? isRetryable(this.category)
    this.userMessage = buildUserMessage(this.category, opts.provider)
  }
}

function classifyStatus(status: number): LlmErrorCategory {
  if (status === 0) return 'network'
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate-limit'
  if (status === 408 || status === 504) return 'timeout'
  if (status >= 500) return 'server'
  return 'unknown'
}

function isRetryable(category: LlmErrorCategory): boolean {
  return category === 'rate-limit' || category === 'server' || category === 'timeout' || category === 'network'
}

function buildUserMessage(category: LlmErrorCategory, provider: Provider): string {
  switch (category) {
    case 'auth':
      return `Credenciales inválidas para ${provider}. Revisa tu API key en ajustes.`
    case 'rate-limit':
      return `${provider} reporta límite de tasa. Reintentando automáticamente…`
    case 'network':
      return `No se pudo conectar a ${provider}. Verifica tu conexión de red.`
    case 'server':
      return `Error en el servidor de ${provider}. Reintentando…`
    case 'timeout':
      return `La solicitud a ${provider} expiró. Reintentando…`
    case 'contract':
      return `Respuesta inválida de ${provider}. Se ignoró por seguridad de contrato.`
    case 'cancelled':
      return 'Solicitud cancelada por el usuario.'
    default:
      return `Error desconocido con ${provider}. Intenta de nuevo.`
  }
}

/**
 * Clasifica un error de fetch en un LlmError estructurado.
 */
export function classifyFetchError(error: unknown, provider: Provider): LlmError {
  if (error instanceof LlmError) return error

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new LlmError({
      provider,
      message: 'Request cancelled',
      category: 'cancelled',
      retryable: false,
    })
  }

  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return new LlmError({
      provider,
      message: error.message,
      category: 'network',
    })
  }

  const msg = error instanceof Error ? error.message : String(error)
  const statusMatch = msg.match(/LLM (\d{3})/)
  const status = statusMatch ? Number(statusMatch[1]) : 0

  return new LlmError({
    provider,
    message: msg,
    httpStatus: status || null,
  })
}

/**
 * Calcula delay exponencial con jitter para reintentos.
 */
export function retryDelay(attempt: number, base = 800): number {
  const exp = Math.min(base * 2 ** attempt, 16_000)
  const jitter = Math.random() * exp * 0.3
  return exp + jitter
}
