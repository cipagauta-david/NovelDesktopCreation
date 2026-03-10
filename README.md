# NovelDesktopCreation

NovelDesktopCreation es un workspace narrativo **web-first, local-first y preparado para desktop** para escritores, worldbuilders y diseñadores narrativos que necesitan unir escritura, organización del lore, referencias cruzadas, búsqueda rápida y asistencia con IA en una sola herramienta coherente.

## Documento base del proyecto
- PRD formal: [`docs/PRD-formal.md`](./docs/PRD-formal.md)

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
