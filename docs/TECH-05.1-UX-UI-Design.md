# TECH-05.1: Final App Specification — Master UI/UX & Flows

## 1. Product North Star
**"Latencia Cero, Foco Absoluto."**
Unificar la inmersión de la escritura narrativa ("Zen") con la omnisciencia del worldbuilding ("God Mode"). El escritor expande su universo sin jamás percibir una barrera de I/O, en un lienzo orgánico asistido por una IA que responde y fluye como agua bajo su entero mando.

## 2. Master UI/UX Design System
El lenguaje visual abandona lo genérico. Se implementa un **"Minimalismo Táctil con Glassmorphism Funcional"**, ofreciendo profundidad tridimensional sin sobrecarga cognitiva.

### 2.1 Visual Language (Midnight & Parchment)
- **Modo "Zen" (Parchment)**: Fondos crema orgánicos, texturas sutiles de papel y reducida luz azul para sesiones maratónicas de escritura.
- **Modo "God" (Midnight)**: Fondos abisales con efectos Glassmorphism en paneles flotantes. Alto contraste para visualizar grafos e inspeccionar metadatos masivos.
- **Profundidad Espacial**: Uso intensivo de desenfoque de fondo (`backdrop-filter: blur`) en modales superpuestos para mantener el contexto del editor debajo.

### 2.2 Core Tokens
- **Typography Hierarchy**:
  - *Serif Narrativa (Lectura/Editor)*: Escala fluida y ritmos verticales impecables (ej. *Merriweather* o *Crimson Pro*) ajustados vía `clamp()` para resonancia clásica.
  - *Sans Funcional (UI/Metadatos)*: Sistema limpio y geométrico (ej. *Inter* u *Outfit*) para pestañas, tooltips y grafos.
- **Palette (Variables CSS)**: 
  - `var(--surface-base)`, `var(--surface-glass)`, `var(--text-primary)`, `var(--brand-accent)`.
- **Motion/Animation Principles (60FPS Mandatory)**:
  - *Transiciones de Estado*: `ease-out` (200ms) para revelar metadatos.
  - *Streams de IA*: Desvanecimientos ascendentes sutiles (fade-up-in) al insertar los tokens inyectados, evitando saltos bruscos ("Jank" visual) en el bloque de texto.

### 2.3 Interactive Patterns (Revelación Progresiva)
- **God vs. Zen Mode State Transition**: Transición sin recargas. En Zen, barras laterales e indicadores de pestañas colapsan en bordes translúcidos; en God Mode, el layout expanda la topología del Workspace.
- **UI Optimista Inquebrantable**: Cada *keystroke* o arrastre en el grafo muta la UI en <16ms. El Worker de persistencia se asume exitoso de forma silenciosa.

## 3. Optimized User Flows
Mapeo de las rutas críticas de interacciones principales:

### 3.1 Flow: Invocation of RAG Content (`{{` Engine)
1. **Trigger**: El autor tipea `{{` en modo flujo.
2. **Reacción (<16ms)**: Un popover predictivo emergue bajo el cursor flotando con un leve blur.
3. **Selección**: Flechas de teclado y `Enter` escogen *[Rey Fuego]*.
4. **Finalización**: El texto inyectado muta en un *Tag* semántico interactivo. El cursor sigue al final sin robar foco de edición.

### 3.2 Flow: AI Brainstorming Assitance
1. **Comando Categórico (`Tab` o Shortcut)**: Llama a un panel lateral de IA (Profile Contextual autoseleccionado según la Tab actual).
2. **Generación Paginada (Stream)**: La IA inyecta tokens visuales en tiempo real.
3. **Control Humano (`AbortButton`)**: Botón rojo flotante y tecla `Esc` siempre disponibles para amputar la generación instantáneamente.
4. **Decisión**: Modal de inyección. El humano rechaza, edita, o integra permanentemente al lienzo.

## 4. Critical Component Deep Dive: UI Interfaces
### 4.1 "Glass Panel" Sidebar & Workspace Header
- **Sidebar (Dynamic Scope)**: Actúa como índice (árbol de colecciones). Se desvanece al 20% de opacidad cuando el mouse huye en "Zen mode". Aloja los "Profiles de Contexto" en el footer de manera críptica y selecta.
- **Workspace Header**: Alberga pestañas. Utiliza drag-and-drop con fricción calculada (físicas inerciales limitadas) para reordenar Tabs. Mantiene notificaciones asíncronas de guardado (Worker Status) como un simple y elegante *dot indicator* que late suave.

### 4.2 Interactive Relational Graph Panel
- **Tecnología**: Canvas estricto / WebGL (físicas calculadas fuera del DOM).
- **Interacción UX**: Arrastrar nodos para crear lazos (`Relation`). Agrupar por `CollectionTab` a través de gravedad centralizada (Clustering). Zoom in/out infinito mapeado a rueda de ratón con amortiguación *spring physics*.

## 5. Performance & Accessibility Budgets
- **Metric Targets**: LCP < 500ms, TTI (Time to Interactive) < 100ms. UI Thread libre el 95% del tiempo.
- **Visual Thresholds**:
  - Ningún bloqueo > 16ms en el DOM por culpa del store u FTS (Full Text Search).
  - Todo modal o panel contrastará mínimo en ratio 4.5:1 (WCAG 2.1 AA Compliance) para mitigar la fatiga visual. Modos alto contraste integrados.

***
**Impacto UX:** Una interfaz que respira junto al autor, desapareciendo cuando se requiere trance literario, pero con acceso inmediato al poder de una base de datos relacional masiva y asistencia IA controlable. El "Jank" queda desterrado del flujo creativo.
**Coste estimado de implementación:** Alto (UI). El desarrollo del Canvas interactivo y el sistema de animaciones CSS fluidas acopladas a la reactividad optimista del Worker exigirá un front-end de elite.
