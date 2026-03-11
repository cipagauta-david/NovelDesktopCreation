# TECH-04: Estado Actual de la UI/UX (Baseline)

## 1. Overview del Sistema UI
- **Propósito**: Entorno de trabajo narrativo (Workspace) centrado en la creación atómica mediante "Entidades" relacionales y referenciables, cruzado con asistencia predictiva de IA.
- **Tipo de Aplicación**: Aplicación "Web-first" de escritorio, empaquetable y "Local-first".
- **Flujos de Usuario Principales**: Redacción inmersiva ("Zen Mode"), estructuración relacional (Grafo de nodos) y resolución de entidades mediante motor de búsqueda global FTS sin pérdida de foco cognitivo.

## 2. Arquitectura Visual Actual
- **Layout Principal**: Estructura de paneles laterales colapsables (Split-Pane flexible) con área de lienzo central prioritaria.
  - *Navegación Izquierda*: Agrupa metadatos globales (Proyecto, Tabs de Colecciones, Listado de Entidades).
  - *Lienzo Central*: Cede el protagonismo al contenido atómico mediante el motor de renderizado activo (Editor Rich-Text o Motor de Grafo).
  - *Inspector Derecho*: Alojamiento para interacciones de alto nivel (metadatos de entidad pura, referencias y chat IA/Propuestas).
- **Navegación**: Menú en árbol basado en selectores UI, fuertemente suplementado por una Command Palette ubicua (Ctrl/Cmd+K) que opera como enrutador mental primario sin saltos de contexto HTML.
- **Jerarquía de Información**: Diseño de revelación progresiva. El "ruido" de administración (settings, cambios de proyecto) permanece plegado o en segundo plano frente a las entidades operativas en uso.

## 3. Pantallas y Componentes
- **Vistas Principales Existentes**:
  - `OnboardingScreen`: Configuración de base del proyecto y primer arranque.
  - `Main Workspace (App)`: Shell contenedor principal que rige y despacha sobre el state de la UI.
  - `Editor View`: Vista de inmersión en la entidad atómica (Lectura/Escritura conectada).
  - `Graph View`: Lienzo de abstracción relacional topológica.
  - `Empty State / Fallback View`: Landing principal de retención ante la usencia de contexto activo.
- **Componentes Estructurales Base**:
  - `WorkspaceHeader`: Barra de herramientas macro superior (Estado global, Toggles Modulares, Alternador de vista).
  - `Sidebar` & `TabBar`: Controladores de jerarquía (Macro Proyectos -> Categorías/Tabs).
  - `EntityList`: Iterador y gestor atómico de elementos dentro de una categoría específica.
  - `MarkdownCodeEditor`: Subsistema subyacente al EditorPanel; maneja la captura semántica de eventos `{{` y redacción.
  - `InspectorPanel`: Controlador de mutaciones, relaciones y Asistente IA anclado en carril derecho.

## 4. Sistema Visual Actual (Tokens de Diseño)
- **Tipografía**: Pila tipográfica utilitaria y legible orientada pantallas digitales largas: `Inter`, `system-ui`, `-apple-system`. Optimizada vía `text-rendering: optimizeLegibility`.
- **Paleta de Colores Observada**:
  - *Cimientos*: Tema de estricto contraste oscuro (`color-scheme: dark`). Fondos base abisales (`#08111f`) con leves gradientes radiales atmosféricos en tonos `rgba(59, 130, 246, 0.12)` y `rgba(124, 58, 237, 0.16)`.
  - *Superficies*: Capas superpuestas bajo "Glassmorphism" con `backdrop-filter: blur(18px)`, fondos semitransparentes (`rgba(10, 16, 28, 0.88)`).
  - *Tipografía (Ink)*: Texto primario en blanco polar apagado (`#e5eefb`), textos auxiliares o desactivados en gris-azulado (`#93a4bc`, `#8ea0b9`).
  - *Branding/Interactive*: Degradados para CTAs primarios (`#2563eb` a `#7c3aed`), indicadores de hover/active celestes (`rgba(125, 211, 252, 0.45)`).
- **Spacing / Grid**: Escala espacial modular y orgánica (`0.75rem`, `0.8rem`, `1rem`, `1.5rem`), implementada en CSS-grids rígidos pero fluidos paramétricamente.
- **Iconografía y Morfología**: Iconografía tipográfica/minimalista (ej. `‹` para *collapse*). Formas dominantemente redondeadas; border-radius elevados en toda la capa de vistas (`14px`, `18px`, máximos de `28px`).

## 5. Patrones de Interacción
- **Navegación Táctica**: Arquitectura predispuesta para teclado total (`F11`/`Mod+Shift+F` para Modo Foco/Zen; `Mod+K` Búsqueda y salto ruteado; `Mod+\` para mostrar/ocultar el Inspector de panel lateral).
- **Formularios / Inputs**: El UX de escritura secundaria destaca el estado `:focus` con auras generosas de 4px (`rgba(59, 130, 246, 0.08)`) manteniendo previsibilidad espacial.
- **Estados Transicionales**: Rediseño kinético. Las revelaciones, transiciones flex-basis en columnas, y transformaciones hover utilizan curvas estandarizadas `150ms` a `220ms ease` con un `cubic-bezier(0.4, 0, 0.2, 1)` imitando inercia pesada.

## 6. Flujos de Usuario Críticos (Journeys)
- **Modo Acceso Semántico**: Evento *Keydown Cmd+K* -> Despliegue de modal semántico (`Search Palette`) -> Query optimista ultra-rápido en BBDD FTS -> Click evento -> Inyección instantánea de Entidad en `Main Column`.
- **Modo Creación y Tabulación**: Despliegue *Sidebar* -> Switch Proyecto -> Tab (ej. Personajes) -> Adición Node-Entidad nueva instanciando *Plantilla pre-guardada*.
- **Modo Exploración Cognitiva ("God Mode")**: Swap Vista al `GraphPanel` -> Arrastre y revisión visual de aristas -> Selección click-derecho o click sobre nodo expande la entidad abriendo el `InspectorPanel` colapsado sin perder de vista entera la malla neural.

## 7. Performance Percibida
- **Latencia Optimizada (Optimistic UI)**: Se asume que el backend nunca fallará. La aplicación, orientada a la filosofía local-first, muta la UI local y la sincronización a SQLite se emite como un Side-Effect diferido.
- **Gestión Visual Condicional**: El *App Shell* previene cuellos de botella controlando si montar o expulsar nodos del DOM (via condicionales React para Paneles) o simplemente ocultando vía CSS opacidades dependiento del peso de rerenderización en *hot-paths*.

## 8. Accesibilidad Observada
- **Manejo de Contraste Activo**: Textos sobre-legibles en escala máxima frente a la penumbra requerida por el tema base, asegurando ratio WCAG decente en el eje de la escritura.
- **Semántica HTML5**: Se advierten `roles` WAI-ARIA (e.g., `role="dialog"`, `aria-label`, `aria-modal="true"`) inyectados en Command Palettes y modales de exclusión para screen readers (`.visually-hidden`).
- **Estados Visibles**: Contornos para navegación secuencial. (Nota futura: falta auditar el Tab-Index total a lo largo y ancho del editor y del árbol de Colecciones).

## 9. Inconsistencias Detectables y Trade-offs
- **Concordancia Ergonómica ("Zen" vs "Glass")**: Las profusiones premium del diseño Glass (backdrop-blurs altos, contornos alfa y degradados envolventes) combaten a largo plazo contra la premisa principal de inmersión literaria. Un exceso de ruido trasfondo (por mínimo que sea el alfa) podría inducir fatiga extra en jornadas de lectoescritura de 6+ horas.
- **Sobrecarga de Redondeo Funcional**: Paneles internos apilados restan margen *matemático activo* a la pantalla. Un contenedor de `28px` curveado dentro de otro de `24px` sacrifica el uso vertical que, en resoluciones menores (1366px), es crítico para el canvas literario o el grafo topológico.

## 10. Mapa Estructural del Frontend (Topología)
- `/src/App.tsx`: Shell Orquestador raíz (State manager superior, Layout Grid maestro, Bindings Teclado global).
- `/src/components/`
  - `WorkspaceHeader.tsx`: Presentador universal de la cinta superior, control de menús y estados sintéticos.
  - `Sidebar.tsx`: Gestor root de la aplicación (preferencias del writer, proyectos, etc.).
  - `TabBar.tsx`: Módulo de colecciones activas / Indexamiento por clase (Lugares, Trama, Notas).
  - `EntityList.tsx`: Módulo granular de los items de un Tab en específico.
  - `EditorPanel.tsx`: Presentador inmersivo (Canvas del editor en modo lectura/redacción).
  - `MarkdownCodeEditor.tsx`: Subcomponente interno de input avanzado, parseador y manejador de tags `{{}}`.
  - `GraphPanel.tsx`: Motor render de interconexiones (Vista alternativa a EditorPanel).
  - `InspectorPanel.tsx`: Gestor contextual dinámico (Se infla lateralmente con la Meta-Data o IA ligada a la Entidad activa).
  - `OnboardingScreen.tsx`: Enrutamiento inicial local-first de bienvenida y hard-settings.
