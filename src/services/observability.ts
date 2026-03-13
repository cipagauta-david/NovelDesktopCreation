import * as Sentry from '@sentry/react'
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web'

let initialized = false
let sentryEnabled = false

function env(name: string): string {
  const raw = import.meta.env[name]
  return typeof raw === 'string' ? raw : ''
}

export function initObservability(): void {
  if (initialized) {
    return
  }
  initialized = true

  const environment = env('VITE_APP_ENV') || env('MODE') || 'development'
  const release = env('VITE_APP_RELEASE') || 'dev-local'
  const dsn = env('VITE_SENTRY_DSN')

  if (dsn) {
    Sentry.init({
      dsn,
      environment,
      release,
      tracesSampleRate: environment === 'production' ? 0.15 : 1,
      beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
          return null
        }
        return breadcrumb
      },
    })
    sentryEnabled = true
  }

  const tracerProvider = new WebTracerProvider()
  tracerProvider.register()
}

export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
  if (!sentryEnabled) {
    return
  }
  Sentry.addBreadcrumb({
    category,
    message,
    level: 'info',
    data,
  })
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!sentryEnabled) {
    return
  }
  Sentry.captureException(error, {
    extra: context,
  })
}
