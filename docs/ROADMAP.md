# ROADMAP de Implementación — Librerías de Alta Prioridad

Fecha: 2026-03-12

## Objetivo
Integrar de forma progresiva las librerías instaladas para mejorar:
- robustez de contratos (Zod),
- performance en listas densas (TanStack Virtual),
- resiliencia de streaming SSE multi-provider (eventsource-parser),
- trazabilidad y observabilidad en producción (@sentry/react + OpenTelemetry Web).

## Librerías instaladas
- `zod`
- `@tanstack/react-virtual`
- `eventsource-parser`
- `@sentry/react`
- `@opentelemetry/api`
- `@opentelemetry/sdk-trace-web`

---

## Fase 1 — Hardening de contratos (Día 1-2)
### Alcance
1. Definir schemas Zod para:
	- mensajes IPC UI ↔ Worker,
	- configuración de providers LLM,
	- payloads de respuesta por proveedor (OpenAI/OpenRouter/Anthropic/Gemini/Ollama).
2. Añadir capa `safeParse` + mapeo de errores tipados a `LlmError`.
3. Registrar métricas de validación fallida (contador por proveedor).

### Entregables
- Nuevo módulo de schemas tipados (ej. `src/services/llm/schemas.ts`).
- Integración en `src/services/llm/providers.ts` y capa worker donde aplique.

### Criterio de aceptación
- Ningún parse de JSON de proveedor se procesa sin validación explícita.
- Error de contrato inválido muestra categoría útil (no `unknown` genérico).

---

## Fase 2 — Virtualización de listas críticas (Día 2-4)
### Alcance
1. Identificar listas de alto volumen:
	- entidades (`EntityList`),
	- historial (`InspectorHistory`),
	- resultados de búsqueda/sugerencias `{{`.
2. Aplicar `@tanstack/react-virtual` en esas vistas.
3. Medir mejora de render y scroll en datasets grandes.

### Entregables
- Integración en componentes de panel con fallback visual idéntico.
- Ajustes de altura estimada, overscan y memoización.

### Criterio de aceptación
- Scroll fluido y sin congelamiento perceptible en listas grandes.
- Sin regresión visual ni de navegación por teclado.

---

## Fase 3 — Pipeline SSE robusto (Día 4-6)
### Alcance
1. Introducir `eventsource-parser` para unificar parse de streams SSE.
2. Estandarizar eventos:
	- token,
	- done,
	- error,
	- heartbeat (si proveedor lo emite).
3. Reforzar abortado inmediato (`AbortController`) y cierre limpio de stream.

### Entregables
- Adaptador SSE común (ej. `src/services/llm/streamParser.ts`).
- Refactor incremental de providers a parser unificado.

### Criterio de aceptación
- Streaming no se rompe por chunks parciales ni frames incompletos.
- `Abort` detiene en caliente sin fugas de callbacks.

---

## Fase 4 — Observabilidad productiva (Día 6-8)
### Alcance
1. Integrar `@sentry/react` en bootstrap (`main.tsx`) con environment/release.
2. Captura de excepciones UI + breadcrumbs de acciones críticas (save, stream, abort, import/export).
3. Inicializar trazas con OpenTelemetry Web para spans en:
	- request LLM,
	- tiempo de primer token,
	- duración total de streaming,
	- operaciones pesadas del worker.

### Entregables
- Inicialización de Sentry y tracer web.
- Utilidades para instrumentar spans en servicios LLM/worker.

### Criterio de aceptación
- Error reproducible aparece en Sentry con contexto suficiente.
- Spans permiten distinguir latencia de red vs parse/render local.

---

## Fase 5 — QA y cierre (Día 8-10)
### Alcance
1. Smoke E2E de:
	- escritura,
	- `{{}}` suggestions,
	- streaming + stop,
	- navegación de entidades largas.
2. Ajustar umbrales de logging/telemetría para no contaminar consola.
3. Documentar runbook de errores comunes y troubleshooting.

### Entregables
- Checklist de regresión funcional.
- Documentación técnica corta en `docs/` para operación y debugging.

### Criterio de aceptación
- Build/lint/e2e smoke en verde.
- Sin degradación perceptible del editor en flujo continuo.

---

## Riesgos y mitigación
- **Riesgo:** sobreinstrumentación afecta performance.
  - **Mitigación:** muestreo de trazas y feature flags por entorno.
- **Riesgo:** virtualización rompe accesibilidad/teclado.
  - **Mitigación:** pruebas explícitas de foco y navegación en listas virtualizadas.
- **Riesgo:** variaciones de formato SSE por proveedor.
  - **Mitigación:** parser unificado + tests de fixtures por proveedor.

## Orden recomendado de PRs
1. PR-01: Zod contracts + errores tipados.
2. PR-02: Virtualización de listas críticas.
3. PR-03: Parser SSE unificado con eventsource-parser.
4. PR-04: Sentry + OTel (instrumentación base).
5. PR-05: QA final + documentación operativa.

## Definición de Terminado (DoD)
- Contratos críticos validados en runtime.
- Listas grandes sin jank perceptible.
- Streaming estable y abortable en todos los providers activos.
- Errores y latencias observables con contexto accionable.
