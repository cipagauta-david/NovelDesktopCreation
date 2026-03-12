# Arquitectura Técnica Inicial — NovelDesktopCreation (Part 2: Subsistemas de Máquinas)

## 5. El State y Persistencia (Worker-Driven Transactions)
### 5.0 Contrato Inter-Procesos (IPC/Worker Bridge)
La UI despacha un "intent" (ej. `SAVE_FIELD`). La Interfaz sigue fluyendo (optimista), el "Worker" ejecuta sobre las tablas SQL puras e indexa el historial. Toda transacción emite evento silencioso de validación confirmada o empuja estado compensatorio al fallar sin arruinar el flujo general del autor.

### 5.1 Fisiología del Local Store
Seccionado en: Docs JSON/Blob, Índices FTS5 pre-calculados al fondo de memoria sin bloquear las Master Tables, Storage System multimedia, Event-Logger puramente Appending y Vault Crypto para almacenar Secretos del sistema seguro.

## 6. Malla de Información Inversa (FTS Indexado Permanente)
Índices re-armados en base de tokens, en un loop en background, sobre Títulos, aliases temporales de personajes, body content. Asegura cruce veloz ante inputs como `<Jon>` proveyendo el UUID nativo interno para la macro-búsqueda semántica instantánea. Soporte arquitectónico listado para Embeddings RAG posteriores.

## 7. Hyper-Text References System (`{{` Lexer-Engine)
1. Al teclear `{{` en la view UI de Prosemirror o bloque un pre-loader rápido intercepta FTS5 del store local y muestra candidatos `[Rey Fuego - ID:192]`.
2. UI inyecta componente especial Node en DOM, pero serializa string al Save Event como bloque universal portable de texto.
3. Permuta inmunitaria contra Renombrados que destrocen el "World Lore".

## 8. Abstracciones Neurales y AI Control System
Aislamiento por Drivers: Providers -> Assembler -> Streaming Output Pipeline.
### 8.1 Las "Directivas de Hierro AI" (UX)
- `Streaming`: Cada Output generado DEBE bajar Token-by-Token directo inyectado a la interface evitando esperas monolíticas del Request entero HTTP o Socket local.
- `Botonera Nuclear`: El autor siempre debe visualizar su mando explícito con interrupción condicional de flujo LLM (`AbortController.abort()`). Deteniendo cobros/tiempo-máquina innecesario u outputs envenenados (Rambling AI).
- Autoridad Delegada Limitada: Una pre-visualización Modal (Validation Orchestrator). Nada altera permanentemente la Tabulación General del Universo Lore del BD SQL si el Humano no ha aprobado los efectos mariposa.

## 9. Representación Editorial Formal del Lienzo
El motor base editorial requiere disociación:
Estado canónico formal (texto plano markdown y custom tags json limpios subyacentes) frente a Proyecciones Elegantes de Interfaz enriquecida de muy alta calidad.
Fuentes, paddings (`clamp()`), y ritmos y lecturas tipográficas de formato libro deben permear permanentemente las decisiones del bloque de desarrollo front.

## 10. Sistema Media Storage / Binarios Nativos
Los buffers y referenciación local Blob file asumen la forma de Assets In-App directos; reduciendo las conversiones en línea y previniendo pérdidas al copiar el Proyecto entero USB-File localmente de host a host operativamente fluido.
