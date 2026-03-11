# Arquitectura Técnica Inicial — NovelDesktopCreation (Part 1: The Core Protocol & Domain)

## 1. Objetivo Arquitectónico
Construir una plataforma altamente resiliente, veloz, y de **latencia nula** desde la percepción humana para estructuración narrativa y asistencia AI. 

## 2. Principios Técnicos (ARIS Protocol y Performance)
1. **Thread Separation (Off-Main-Thread Architecture)**: Prohibido estrictamente operaciones complejas o pesadas en el Main Thread interactivo de JS puro (SQLite writes, renderizados FTS). Se imponen Web Workers o backend nativo.
2. **Optimistic UI Inquebrantable**: La UI siempre asume un evento de input como un "Hecho final validado" pintándolo al momento (Latencia de < 16ms). Delega conflict-resolution de fondo de manera silenciosa al Store.
3. **Local-first Nativo**: Todas las dependencias radican offline primariamente; BBDD y Media viven unificados local.
4. **Desacoplamiento IPC Reactivo**: El State local renderiza una copia reactiva pura del Store; la mutación a BBDD cruza puentes tipados y síncronos evitando side-effects.
5. **IA en Vivo Transparente**: Toda AI invocable debe responder bajo `Streams / SSE` regulables a voluntad. Un `AbortController.abort()` explícito está presente en UI ante todo llamado predictivo.
6. **Diseño Tokenizado (Design System Formal)**: Los CSS y Layouts siguen variables precisas mitigadoras de contraste extremo para prevenir agotamiento visual cronificado ("Mode Zen & Mode God").
7. **Búsqueda como Motor Subyacente, no Filtro**: Arquitectura invertida liderada por FTS index.
8. **Inmutabilidad Cronológica**: Eventos append-only que actúan como seguro de vida contra AI corrompida. 

## 3. Disposición y Capas Topológicas
El sistema disocia la Pintura DOM de las transacciones fuertes.

### 3.1 Vistas y Gestor de Estados (The Main Thread Presenter)
Responsable única de Pintar, Escuchar y Reaccionar fluida y ciegamente al Optimistic State:
- Motor y Sistema de Tokens de interfaz mitigadores visuales predictibles orgánicos.
- Composiciones Modulares Inyectadas: Tab System, Editor de Bloques Markdown Rich/Custom format, Modales flotantes de pre-renderizado `{{}}` predictivos veloces.
- Despacho reactivo asíncrono (IPC Publish o MessageChannel) hacia el Backend.
- Exposición visual sin esperas ni spinners aletargantes (exceptuando Streams iniciales del LLM rellenando caracteres a 60 hz).

### 3.2 Infraestructura Dura / Background Workers (The Muscle)
El estrato del que se compone toda lógica pesada de procesamiento:
- El Driver persistente en disco (SQLite Wasm u OPFS puro).
- Motores y puentes IO para salvar Assets multi-mega de Media.
- Invocadores de LLM Drivers y Prompts estandarizados, inyectando RAG context a petición desde BBDD antes de que el Main-UI note retrasos mayores temporizadores HTTP/Sockets.

## 4. Dominios (Estructuras Nativas In-Memory)
- **`Project` & `CollectionTab`**: Orquesta el volumen principal, los directorios estáticos/JSON assets y segmenta y enruta los prompts del AI System particular de la Colección.
- **`Entity`, `Relation`, `Asset` y `Template`**: Nivel atómico y aristas conectivas universales semióticas e imágenes pre-cacheadas listas para Render Graph interactivos de alta performance.
- **`PromptProfile`**: Sub-unidad inyectada configurable global o ligada a contexto para modificar el "Alma LLM".
- **`ChangeEvent` (History Tracker)**: Row inmutable para auditar todo a la posteridad inminente CRDT distribuible.
