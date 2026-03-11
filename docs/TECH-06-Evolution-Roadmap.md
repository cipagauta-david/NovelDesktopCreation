# TECH-06: Evolution Roadmap (04 → 05)

## 1. Análisis de Evolución

La transición desde el estado actual (TECH-04) hacia la nueva visión (TECH-05) requiere una evolución radical desde una "aplicación de escritorio funcional" hacia un "entorno inmersivo de alto rendimiento".

**Baseline (TECH-04):**
- UI funcional pero con inconsistencias ergonómicas (exceso de esquinas muy redondeadas y opacidades conflictivas con la lectura prolongada).
- Arquitectura acoplada en el Main Thread parcial, donde las actualizaciones y el renderizado reaccionan a veces con fricción.
- Dependencia estructural en jerarquías visuales estándar que no priorizan de forma absoluta la retención del foco del escritor.

**Nueva Visión (TECH-05):**
- **"Latencia Cero, Foco Absoluto"**: Transformación hacia un Minimalismo Táctil con Glassmorphism Funcional. Bifurcación clara entre el Modo Zen (inmersión literaria pura, sin ruido) y Modo God (Worldbuilding relacional masivo).
- **Desacoplamiento Total (Off-Main-Thread)**: El cerebro del sistema (Motor SQLite FTS5, RAG, Web Workers/Rust) se aísla por completo del UI Thread.
- **UI Optimista Inquebrantable**: Todo input visual se asume exitoso al instante (0ms), postergando la sincronización en background mediante Event Sourcing.

---

## 2. Directrices de Implementación Obligatorias

Los siguientes cambios, tokens y componentes de TECH-05.1 y TECH-05.2 son estrictamente **no negociables (must-have)**:

### Frontend Soul (UI/UX, micro-interacciones, accesibilidad)
- **Modos Visuales Estrictos**:
  - *Modo "Zen" (Parchment)*: Fondos crema, texturas orgánicas, reducida luz azul y colapso masivo de barras laterales (fading silencioso) para sesiones maratónicas.
  - *Modo "God" (Midnight)*: Fondos abisales con `backdrop-filter: blur`, alto contraste y despliegue topológico del Workspace/Grafo y Metadatos.
- **Jerarquía Tipográfica Dinámica**: Implementación de fuentes Serif fluidas (mediante `clamp()`) para narrativa y Sans funcionales limpias para UI/Metadatos.
- **Animaciones a 60FPS Mandatorias**: Transiciones `ease-out` (200ms) y desvanecimientos ascendentes (fade-up-in) para inyecciones de IA. Cero "jank" visual tolerado en la escritura de streams.
- **Motor Predictivo IA/RAG (`{{`)**: Popover semántico que emerja flotando con leve blur en <16ms sin jamás robar el foco del editor principal.
- **Accesibilidad y Legibilidad**: Contraste garantizado de 4.5:1 (WCAG 2.1 AA) en componentes superpuestos y supresión de la fatiga visual induciendo el estado "Zen".

### Backend Logic (Estructura, rendimiento, integraciones)
- **Engine "Off-Main-Thread"**: Migración absoluta de logica IO, indexación (FTS5) e interacciones IA hacia Web Workers o Tauri Backend (Rust) vía MessageChannels/IPC. El UI Thread debe estar libre el 95% del tiempo.
- **Persistencia mediante Event Sourcing**: Las mutaciones son un registro histórico inmutable (`ChangeEvent` Append-Only) encolado de forma asíncrona, sentando las bases del "Motor del Tiempo".
- **API Optimista Nativa**: Toda llamada de modificación despacha instantáneamente reflejando el estado en el DOM (latencia percibida 0ms) devolviendo *ACK* silenciosos mientras el worker inserta en la BBDD (SQLite Local/OPFS).
- **Lexer FTS5 Compilado C/WASM**: Autocompletado instantáneo delegado completamente a los índices de BBDD en vez de búsquedas JS costosas garantizando queries sin caída de framerate.
- **Seguridad Sandboxed**: Llaves de API y configuraciones sensibles mantenidas fuera de `/src` o `.env` base; resguardadas a través de OS Keychains o cifrados robustos usando APIs nativas.

---

## 3. Impacto UX y Latencia

Estas implementaciones obligatorias son vitales por nuestra directiva principal: **Reducir la fricción cognitiva a cero y asegurar un performance impecable.** 

En la escritura de ficciones complejas o gestión de conocimiento, cada frame perdido (>16ms), salto brusco o tiempo de recarga quiebra el "flow state" del humano.
- **Delegación al Worker:** Liberar el hilo principal asegura que el teclado, la extensión directa del cerebro del autor, no experimente latencia microscópica.
- **Modos Visuales Puros (Zen/God):** Contrarrestan de forma directa las inconsistencias ergonómicas detectadas en TECH-04, amortiguando la fatiga por contraste en sesiones prolongadas.
- **Sincronía Optimista e Inmutable:** Desvanece la percepción de operar un software de bases de datos. El usuario siente que moldea una realidad que siempre asiente y nunca falla, respondiendo en tiempo real a su velocidad de pensamiento sin miedo a perder nada.

---

## 4. Resumen Táctico

* **Impacto UX Global:** Creación de una interfaz viva que respira junto al autor. Se oculta por completo durante la ejecución artística literaria pura, pero otorga un poder de control sistémico abrumador en fracciones de segundo. El "Jank" queda desterrado.

* **Coste estimado de implementación por iniciativa clave:**
  - **Refactorización de UI (Glassmorphism + Zen/God Modes):** **Moderado/Alto** (Exige animaciones fluidas CSS muy pulidas y cambio radical de paletas semánticas).
  - **Motor Gráfico de Relaciones (Canvas/WebGL):** **Alto** (Físicas, interacciones drag-nav, pan/zoom optimizado sin afectar DOM).
  - **Arquitectura Off-Main-Thread (Workers + Optimistic UI):** **Extraordinario** (Lograr puentes IPC/Worker limpios y sincronización de estado optimista es el mayor dolor de cabeza técnico de esta fase).
  - **Motor FTS5 con Lexer de Autocompletado (`{{}}`):** **Moderado a Alto** (Requiere integración precisa de índices y sub-agentes sin bloquear llamadas).
