# PRD Formal — NovelDesktopCreation (Part 3: Criterios y Riesgos)

## 10. Restricciones iniciales y Vectores Críticos
- La persistencia será íntegramente local al arranque. (Cero SaaS block-in).
- El núcleo UI será React/Vue reactivo puro desvinculado de procesos Node bloqueantes.
- Prohibida la solución "Solo ponle un `.env`". El usuario debe poder transitar y mutar llaves por su propia comodidad UI.
- Implementar la asincronía y Workers es un requerimiento TIER-1 (es excesivamente costoso migrar de Síncrono a Asíncrono en sistemas grandes). 

## 11. Riesgos principales y Mitigaciones
1. **El "Monster-App" Parálisis**: El creador es saturado con metadata inútil o controles IA abismales en la fase narrativa pura.
   - *Solución*: "Progressive Disclosure Mode" (Zen vs God Mode).
2. **"Jank" (Caídas Acumuladas de Framerate)**: La app tiembla cuando SQLite busca un millón de palabras al tipear.
   - *Solución*: Off-Main-Thread Bridge mediante Web Workers / Tauri IPC estricto.
3. **Pérdida de Canon o Control AI**: El modelo sobre-escribe 15 páginas sin percatarse el usuario de los daños subyacentes.
   - *Solución*: Confirmación orquestada y flujos de stream visuales paralizables (`AbortController`) sumado al inmutable `ChangeEvent`.
4. **Acoplamiento UI/IA**: Atarse a OpenAI APIs quemadas en código fuente.
   - *Solución*: Interfaces agnósticas (Providers).

## 12. MVP Destilado Sugerido
- Bootstrapping del Worker Híbrido (Core aislado de la vista).
- Tipografía y Tokens "Zen" para editor enriquecido.
- Sistema de Projects Modulares con tabs pre-cargadas.
- Base central CRUD: Entidades editables y guardables optimistamente a local SQLite asíncrono.
- Extractor/Buscador y resolutor de `{{Referencias}}` reactivo.
- Provider OpenAI u Local (LMStudio/Ollama) operando vía Streaming incesante y con botoneras STOP tácticas.

## 13. Roadmap Proyectado
- **Fase 1 (Cimientos Vivos)**: Bootstrapping asíncrono, persistencia offline, editor inmaculado y enlaces instantáneos FTS5. Percepción 0 Latencia lograda. Modelado Prompt/Tab.
- **Fase 2 (Visualización y Contexto Profundo)**: Integración formal relacional estructurada con Grafos (D3/Canvas base).
- **Fase 3 (Supervisión AI Core)**: Analítica automática narrativa (timeline de fallos generada vía LLM). Sugerencia autónoma de fields.
- **Fase 4 (Ampliación y Cloud-CRDT)**: Sync y Resolución concurrente mediante CRDT (Habilitado intrínsecamente por la bitácora `ChangeEvent` temprana). Ecosistema puro Skills.

## 14. Criterios de Éxito Primarios
- Ningún modal/prompt LLM local o externo traba la aplicación Visual. (Frames garantizados sin parones > 100ms jamás).
- Trazabilidad y accesibilidad (contraste +60 para fatiga visual).

## 15. Decisiones Arquitectónicas Restringidas (Aceptadas)
- Uso de esquemas Markdown u AST para el core de lectura, evitando que el formalismo bloquee el ritmo del autor.
- Entidades ricas aisladas conceptualmente en `Tabs`.
- El uso de Assets nativamente locales inmersos en estructura estática del proyecto para máxima potabilidad.
- Delegación CRDT/Online nativo exclusivo para Post-Fase 3.
