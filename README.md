# NovelDesktopCreation

NovelDesktopCreation es un workspace narrativo **web-first, local-first y preparado para desktop** para escritores, worldbuilders y diseñadores narrativos que necesitan unir escritura, organización del lore, referencias cruzadas, búsqueda rápida y asistencia con IA en una sola herramienta coherente.

## Documento base del proyecto
- PRD formal: [`docs/PRD-formal.md`](./docs/PRD-formal.md)
- Arquitectura técnica inicial: [`docs/technical-architecture-initial.md`](./docs/technical-architecture-initial.md)

## MVP ejecutable
Este repositorio ya incluye un MVP web-first/local-first implementado con React + Vite.

### Cómo arrancarlo
```bash
npm install
npm run dev
```

### Qué incluye el MVP actual
- onboarding inicial para proveedor/modelo con hint seguro de API key,
- soporte de proveedores OpenAI, Anthropic, Google Gemini, OpenRouter y Local/Ollama,
- gestión de múltiples proyectos narrativos,
- tabs iniciales y personalizadas con prompt contextual editable,
- entidades con documento editable + fields tipados,
- templates reutilizables y guardado del contexto actual como template,
- referencias estructuradas `{{}}` con sugerencias,
- hover preview y navegación solo con **Ctrl + click**,
- historial visible por entidad y actividad de proyecto,
- drag & drop inicial de imágenes,
- búsqueda textual priorizada,
- propuesta de IA con confirmación explícita,
- y primera vista de grafo narrativa.

## Organización del código
La app quedó separada por responsabilidad:
- `src/types`: tipos de dominio y UI,
- `src/data`: constantes, seeds y persistencia inicial,
- `src/utils`: referencias, búsqueda y helpers de workspace,
- `src/hooks`: coordinación central del estado y acciones,
- `src/components`: onboarding, layout, paneles y controles reutilizables.

## Decisiones actuales del MVP
- editor híbrido de markdown enriquecido con referencias `{{}}`,
- proyectos autocontenidos en disco con base local y carpeta de assets,
- entidades con contenido libre + fields tipados,
- búsqueda textual local con SQLite + FTS5,
- historial con revisiones incrementales por entidad,
- drag & drop inicial de imágenes,
- y primera vista de grafo/board.

## Fuera de alcance por ahora
- colaboración multiusuario en tiempo real,
- búsqueda semántica/vectorial,
- editor por bloques completo,
- runtime abierto de plugins/skills,
- timeline avanzada,
- y soporte robusto de video.
