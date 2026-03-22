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

function buildUserMessage(category: LlmErrorCategory, _provider: Provider): string {
  switch (category) {
    case 'auth':
      return `No pudimos validar tu acceso. Puedes revisar tu API key en los Ajustes.`
    case 'rate-limit':
      return `La IA está recibiendo demasiadas peticiones en este momento. Espera un momento, reintentaremos automáticamente...`
    case 'network':
      return `Parece que hay problemas con la conexión a internet. Verifícala e intenta de nuevo.`
    case 'server':
      return `El servicio de la IA no responde. Intentando de nuevo en un momento...`
    case 'timeout':
      return `La IA tardó mucho en preparar su respuesta. Reintentando...`
    case 'contract':
      return `Hubo un error interpretando la respuesta de la IA. Intenta reformular tu instrucción.`
    case 'cancelled':
      return 'Generación detenida.'
    default:
      return `Ocurrió un error inesperado al conectar con la IA. Por favor, intenta de nuevo.`
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
