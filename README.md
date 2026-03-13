# NovelDesktopCreation

Workspace narrativo **local-first** para escritura estructurada, gestión de entidades, referencias cruzadas y asistencia IA con control explícito del autor.

## Inicio rápido
```bash
npm install
npm run dev
```

Comandos útiles:

```bash
npm run build
npm run test:e2e
```

## Estado actual del producto
- Editor + entidades + tabs de colección operativos.
- `{{}}` references con sugerencias y navegación contextual.
- Streaming IA multi-provider (OpenAI, OpenRouter, Anthropic, Gemini, Ollama/local) con stop/cancel.
- Persistencia en worker con storage adapter y migración de estado.
- `ChangeEvent` append-only global + base de sync offline-first.
- Import/export con contrato versionado + checksum SHA-256.
- Correlation ID extremo a extremo (UI, IA, worker, persistencia).
- Dashboard interno de métricas operativas en inspector (latencia p95, error rate, tiempo a primer token p95).

## Documentación oficial

Producto:
- [PRD visión](./docs/PRD-01-vision.md)
- [PRD features](./docs/PRD-02-features.md)
- [PRD roadmap](./docs/PRD-03-roadmap.md)

Diseño:
- [Design system](./docs/DESIGN-01-design-system.md)
- [Visual journey](./docs/DESIGN-02-visual-journey.md)

Arquitectura técnica:
- [Overview](./docs/TECH-01-architecture-overview.md)
- [Core systems](./docs/TECH-02-core-systems.md)
- [Infrastructure](./docs/TECH-03-infrastructure.md)
- [Target post-MVP](./docs/TECH-04-target-architecture-post-mvp.md)

Plan de ejecución:
- [Roadmap operativo](./docs/ROADMAP.md)

## Estructura principal
- `src/components`: layout, paneles, onboarding, editor e inspector.
- `src/hooks`: orquestación de estado de workspace por dominios.
- `src/services`: LLM, observabilidad, tracing, sync, plugins, seguridad.
- `src/data`: worker, seed, constantes e indexación de búsqueda.
- `src/utils`: utilidades de workspace, referencias e import/export.
