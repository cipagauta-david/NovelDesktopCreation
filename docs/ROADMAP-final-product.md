# Roadmap de Producto Final (E2E)

Estado a 2026-03-12, basado en implementación real del repositorio.

## 1) Matriz de capacidades críticas

- [x] **Persistencia local DB-first**: worker con `IndexedDB` (`workspace-state`) + fallback en memoria.
- [x] **Ctrl/Cmd + click en referencias del editor live**: navegación entre entidades operativa.
- [x] **Mapa narrativo navegable**: selección de entidades desde grafo.
- [x] **Drag & drop de imágenes en editor**: carga de assets por entidad.
- [ ] **FTS5/SQLite real**: pendiente (hoy búsqueda textual en worker por filtrado tipado).
- [~] **Conexión LLM real**: implementada para OpenAI/OpenRouter/Anthropic/Gemini/Ollama, falta streaming SSE y control STOP transversal.
- [ ] **E2E tests automatizados**: pendiente (sin `npm test` actualmente).

## 2) Brechas a cerrar para “producto final”

### Fase A — Estabilización funcional (inmediata)
- [ ] Endurecer manejo de errores/red en llamadas LLM y trazas UX por proveedor.
- [ ] Agregar tests de humo E2E (onboarding → edición → autosave → recarga).
- [ ] Normalizar lint de hooks/refs en módulos legacy para tener CI verde consistente.

### Fase B — Motor de datos definitivo
- [ ] Activar SQLite WASM + índices FTS5 reales en worker.
- [ ] Migración de esquema de búsqueda (de filtro lineal a índice persistente).
- [ ] Backfill de snippets/relevancia y medición de latencia (< 30 ms en consultas frecuentes).

### Fase C — IA de producción
- [ ] Streaming de tokens (SSE/fetch-event-source) con botón STOP/AbortController global.
- [ ] Política de fallback por proveedor + reintentos exponenciales.
- [ ] Trazabilidad completa de prompts/respuestas por evento de historial.

### Fase D — UX de operaciones pesadas
- [ ] Drag & drop general expandido (tabs/entidades/templates con reordenamiento).
- [ ] Persistencia de layout del mapa (posiciones de nodos por proyecto).
- [ ] Import/Export de proyecto con validación y recuperación segura.

## 3) Criterio de salida a “producto final”

Se considera “producto final funcional E2E” cuando:

1. Flujo completo (`onboarding -> edición -> IA -> persistencia -> recarga -> búsqueda -> mapa`) es repetible sin fallos.
2. Hay pruebas automatizadas de humo sobre los flujos críticos.
3. LLM funciona en modo real con fallback robusto y cancelación explícita.
4. Búsqueda usa índice persistente (no escaneo lineal).
