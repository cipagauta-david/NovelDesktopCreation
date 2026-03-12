# ROADMAP: Evolución UI/UX hacia Parchment ↔ Obsidian (Zen Mode / God Mode)

Este roadmap traduce la visión de `DESIGN-01` y `DESIGN-02` a decisiones ejecutables sobre el código actual (`React + Vite + CSS tokens + CodeMirror`).
Objetivo operativo: **reducir fricción cognitiva y latencia percibida** sin introducir regresiones de render, accesibilidad o mantenibilidad.

---

## Principios de ejecución (no negociables)

1. **UX primero, pero medido:** ninguna mejora visual entra a `main` sin presupuesto de performance y contraste validado.
2. **Semántica antes que estética:** todo color/sombra/espaciado nace en tokens; cero hardcode nuevo en componentes.
3. **Modo Zen y God Mode comparten motor:** cambia la densidad de interfaz, no la lógica de datos.
4. **Micro-interacciones con control de daño:** animaciones sólo en `transform/opacity/box-shadow` y con `prefers-reduced-motion`.

---

## Fase 1 — Foundation & Design Tokens

### Objetivo
Unificar el sistema semántico de color/tipografía/movimiento para que `light/dark/system` y `Zen/God` dejen de depender de estilos dispersos.

### Pasos técnicos accionables

1. **Consolidar tokens raíz Parchment/Obsidian.**
	 - Tocar: `src/index.css`.
	 - Acción:
		 - Introducir bloques explícitos `:root` (Parchment) y `.dark, :root[data-theme='dark']` (Obsidian Ink).
		 - Normalizar nomenclatura a tokens semánticos del diseño (`--color-parchment`, `--color-obsidian`, `--color-primary`, `--text-heading`, `--text-body`, etc.).
		 - Mantener alias backward-compatible durante transición (`--surface-base`, `--text-primary`, `--brand-accent`) para evitar ruptura masiva.

2. **Hacer theme toggle determinista y observable.**
	 - Tocar: `src/hooks/useTheme.ts`, `src/App.tsx`.
	 - Acción:
		 - Además de la clase `.dark`, setear `data-theme="dark|light"` en `document.documentElement`.
		 - Exponer `resolvedTheme` desde un contexto simple de UI state (si aún no existe) para evitar `querySelector` y branches de tema en múltiples componentes.
		 - Añadir protección SSR-safe (ya presente parcialmente) y sincronización con `matchMedia` sólo en modo `system`.

3. **Introducir capa de utilidades de superficie (glass, border, glow).**
	 - Tocar: `src/index.css`.
	 - Acción:
		 - Definir clases utilitarias estables (`.surface-glass`, `.surface-glass-hover`, `.border-spectral`, `.shadow-glow`).
		 - Extraer transiciones globales para evitar `transition: all`; usar propiedades explícitas.

4. **Preparar migración gradual a Tailwind tokens (sin big-bang).**
	 - Tocar: `package.json`, nuevo `tailwind.config.ts` (si se decide activar Tailwind), `src/index.css`.
	 - Acción:
		 - Si el equipo adopta Tailwind en esta fase: instalar `tailwindcss`, mapear colores a CSS variables, activar `darkMode: 'class'`.
		 - Si no: mantener estrategia CSS-first, pero con naming 1:1 listo para posterior mapeo.

### Trade-offs / riesgos técnicos

- **Riesgo de regresión visual** por renombre de variables: mitigación con alias temporales y checklist de pantallas críticas.
- **Transiciones globales excesivas** pueden disparar repaints: limitar a elementos de superficie y excluir nodos calientes (`.cm-editor`, graph canvas).
- **Tailwind migration scope creep:** si se mezcla refactor visual + framework al mismo tiempo, sube el riesgo de entrega tardía.

### Impacto UX

El usuario percibe consistencia inmediata entre vistas: misma jerarquía visual, misma semántica de estados y menor fatiga por cambios bruscos de contraste. El toggle de tema deja de sentirse “cosmético” y pasa a ser un cambio de materialidad confiable. Esta fase reduce deuda cognitiva para todo el roadmap posterior.

### Coste estimado de implementación

**Moderado**

---

## Fase 2 — Layout Core & Glassmorphism

### Objetivo
Reestructurar shell y paneles para soportar dualidad Zen/God sin romper navegación ni penalizar render en equipos medios.

### Pasos técnicos accionables

1. **Refactor del esqueleto de shell por capas de profundidad.**
	 - Tocar: `src/components/layout/AppShell.tsx`, `src/index.css`.
	 - Acción:
		 - Separar niveles: `background layer` (ambient), `navigation layer`, `content layer`, `overlay layer`.
		 - Definir clases de estado explícitas (`is-zen`, `is-god`, `is-dragging`) en raíz del shell para CSS predictivo.

2. **Estandarizar App Bar glassmórfica y status pills.**
	 - Tocar: `src/components/layout/WorkspaceHeader.tsx`, `src/index.css`.
	 - Acción:
		 - Migrar a una barra con `backdrop-filter` controlado, borde espectral y fallback sólido.
		 - Unificar chips de navegación/búsqueda/contexto con un mismo sistema de hover/focus y contraste AA.

3. **Sidebar e Inspector con ghosting progresivo y latencia visual baja.**
	 - Tocar: `src/components/layout/Sidebar.tsx`, `src/components/panels/InspectorPanel.tsx`, `src/index.css`.
	 - Acción:
		 - Estados de opacidad por intención (`rest`, `hover`, `active`) y no por selector ad-hoc.
		 - Usar `transform: translateX` para entradas/salidas; evitar animar `width` en paneles pesados.

4. **Normalizar overlays del shell (Command Palette, Shortcuts, drag overlay).**
	 - Tocar: `src/components/overlays/CommandPalette.tsx`, `src/components/overlays/ShortcutsOverlay.tsx`, `src/components/layout/AppShell.tsx`.
	 - Acción:
		 - Reusar misma superficie modal (`surface-float`) y misma política de `z-index`.
		 - Evitar stacking bugs creando escala fija de z-layers documentada en CSS.

### Trade-offs / riesgos técnicos

- **`backdrop-filter` en múltiples paneles** puede subir uso de GPU y jank en scroll.
	- Mitigación: limitar blur a 1–2 capas simultáneas y degradar a fondo opaco en hardware débil.
- **Animaciones de paneles en layout denso** pueden gatillar reflow si se animan propiedades geométricas.
	- Mitigación: sólo `transform/opacity` + `will-change` temporal.
- **Complejidad de z-index** en overlays superpuestos.
	- Mitigación: tokens de profundidad (`--z-nav`, `--z-popover`, `--z-modal`, `--z-toast`).

### Impacto UX

La interfaz deja de “pelear” con el texto: los paneles se sienten presentes cuando se necesitan e invisibles cuando estorban. El App Bar transmite estado global sin robar atención al lienzo. La consistencia de overlays reduce errores de orientación y mejora confianza del usuario experto.

### Coste estimado de implementación

**Moderado**

---

## Fase 3 — Editor Zen & Tipografía

### Objetivo
Convertir el editor en un lienzo de alto ancho de banda cognitivo: lectura prolongada cómoda, foco profundo y jerarquía tipográfica clara.

### Pasos técnicos accionables

1. **Separar tipografía narrativa vs tipografía estructural a nivel de layout.**
	 - Tocar: `src/index.css`, `src/components/panels/EditorPanel.tsx`.
	 - Acción:
		 - Aplicar `--font-serif` a canvas narrativo (`title`, `body`, `preview`) y `--font-sans` a metadatos, tabs y controles.
		 - Definir escala modular para `h1`, body y metadata con `clamp()` y line-height específico por modo.

2. **Canvas expansivo con límites de legibilidad.**
	 - Tocar: `src/components/panels/EditorPanel.tsx`, `src/index.css`.
	 - Acción:
		 - En Zen: anchura máxima de lectura (`max-width` controlado), márgenes respirables, reducción de ruido lateral.
		 - En God: volver a densidad de información sin cambiar semántica de comandos del editor.

3. **Ajustar tema de CodeMirror a tokens globales.**
	 - Tocar: `src/components/editor/editorThemes.ts`, `src/components/editor/markdown/theme.ts`, `src/index.css`.
	 - Acción:
		 - Sustituir colores hardcode del editor por variables (`--text-body`, `--color-primary`, `--border-active`).
		 - Garantizar contraste de cursor, selección y tokens markdown en ambos temas.

4. **Unificar barra de metadatos inferior (Saved, words, reading time).**
	 - Tocar: `src/components/editor/panel/EditorMetadata.tsx`, `src/index.css`.
	 - Acción:
		 - Usar pills de estado con feedback optimista y latencia visual baja (`saved` aparece inmediato, persistencia real continúa off-thread).

### Trade-offs / riesgos técnicos

- **Tipografía grande + line-height alto** mejora lectura, pero reduce densidad de edición para power users.
	- Mitigación: escala adaptable por modo, no por preferencia global.
- **CodeMirror theming profundo** puede introducir inconsistencias entre extensiones.
	- Mitigación: snapshot visual de estados críticos (selección, hover, referencia, suggestion-active).
- **Canvas muy ancho** fatiga micro-sacadas oculares.
	- Mitigación: ancho óptimo fijo en Zen, no full-bleed real.

### Impacto UX

El usuario entra en flujo con menos saltos atencionales y menos fricción perceptiva entre lectura y edición. La tipografía deja de ser decoración y pasa a ser una interfaz cognitiva. En sesiones largas, se reduce fatiga visual y mejora el ritmo de escritura sostenida.

### Coste estimado de implementación

**Moderado / Alto**

---

## Fase 4 — El Río Neuronal & Micro-interacciones

### Objetivo
Implementar interacciones de alto valor narrativo (`{{}}`, streaming, transición Zen↔God) con precisión posicional y presupuesto estricto de frame time.

### Pasos técnicos accionables

1. **Popover neural `{{` con anclaje robusto al caret.**
	 - Tocar: `src/components/panels/EditorPanel.tsx`, `src/components/editor/panel/EditorSuggestions.tsx`, `src/index.css`.
	 - Acción:
		 - Reutilizar la lógica existente de `coordsAtPos` y endurecerla contra resize/scroll/viewport shifts.
		 - Mover cálculo pesado a `requestAnimationFrame` + throttling por frame.
		 - Definir variante visual dark con borde cyan + glow sutil, sin depender sólo de color para selección.

2. **Streaming IA con señales de estado no intrusivas.**
	 - Tocar: `src/components/editor/panel/EditorHeader.tsx`, `src/components/editor/panel/EditorMetadata.tsx`, `src/components/inspector/InspectorAssistantComposer.tsx`, `src/index.css`.
	 - Acción:
		 - Cursor de streaming (`blink`) y botón `Abort` con jerarquía clara de riesgo.
		 - Estado `idle/saving/saved/streaming/error` visible en un único canal visual consistente.

3. **Transición Zen ↔ God como cambio de densidad, no cambio de app.**
	 - Tocar: `src/components/layout/AppShell.tsx`, `src/components/panels/EditorPanel.tsx`, `src/index.css`.
	 - Acción:
		 - Añadir coreografía de 200–300ms: collapse/expand de paneles por `transform + opacity`.
		 - Evitar remount de paneles críticos para no perder estado de scroll o foco.

4. **Política de motion/accessibility para micro-interacciones.**
	 - Tocar: `src/index.css`.
	 - Acción:
		 - `@media (prefers-reduced-motion: reduce)` con desactivación de pulses/blinks decorativos.
		 - `@media (forced-colors: active)` con fallback de bordes y eliminación de blur no legible.

### Trade-offs / riesgos técnicos

- **Anclaje de popover al caret** es sensible a zoom, scroll anidado y fuentes variables.
	- Mitigación: pruebas en breakpoints y validación en Windows scaling 125%/150%.
- **Demasiada animación simultánea** puede romper 60fps durante streaming.
	- Mitigación: priorizar señal funcional sobre ornamento; no más de una animación prominente por zona.
- **Glow/shadow acumulativos** en dark pueden encarecer composición.
	- Mitigación: reducir blur radius y aplicar glow solo a foco activo.

### Impacto UX

La IA deja de sentirse como proceso externo y se integra al flujo mental del autor sin invadir su atención. El popover `{{` se vuelve un gesto natural de memoria asistida, no un modal disruptivo. El salto Zen/God comunica poder de control sin romper continuidad emocional de la escritura.

### Coste estimado de implementación

**Alto**

---

## Orden recomendado de entrega (sprints)

1. **Sprint A (1–1.5 semanas):** Fase 1 completa + smoke visual en editor y header.
2. **Sprint B (1–2 semanas):** Fase 2 completa + overlays unificados + deuda de z-index cerrada.
3. **Sprint C (1.5–2 semanas):** Fase 3 con focus en editor + CodeMirror theme semántico.
4. **Sprint D (2 semanas):** Fase 4 completa + hardening de performance/accesibilidad + polishing.

Dependencia crítica: no iniciar Fase 4 sin tokens y layout estabilizados (Fase 1/2), o se duplica retrabajo.

---

## Auditoría Final — Performance y Accesibilidad (Gate de release)

### A. Performance (no degradar TTFB ni rendering)

- [ ] **TTFB** no se altera por cambios de UI (confirmar que no se agregaron cargas bloqueantes en bootstrap).
- [ ] **FCP/LCP** en arranque no empeoran >10% frente a baseline actual.
- [ ] **Interacciones clave** (`Ctrl+K`, toggle Zen/God, abrir inspector, `{{` popover) responden en <100ms percibidos.
- [ ] **Frame budget**: transiciones se sostienen cerca de 60fps en hardware medio (sin picos prolongados >16ms).
- [ ] **Blur/glass budget**: máximo 2 superficies con `backdrop-filter` activas en simultáneo.
- [ ] **CodeMirror hot path** libre de transiciones globales costosas (`background`, `box-shadow`) en cada repaint.
- [ ] **Graph panel** aislado de transiciones de tema global para evitar jank en canvas/WebGL.

### B. Accesibilidad (no negociable)

- [ ] Contraste mínimo **AA 4.5:1** en body text y controles interactivos principales.
- [ ] Focus visible consistente en light/dark con `:focus-visible` real (sin eliminar outline sin reemplazo).
- [ ] Navegación completa por teclado en header, sidebars, palette, popover de sugerencias y modales.
- [ ] `prefers-reduced-motion` desactiva animaciones no esenciales sin romper feedback de estado.
- [ ] `forced-colors: active` mantiene bordes/labels legibles y neutraliza superficies glass no interpretables.
- [ ] Estados de sistema (`saving/saved/error/streaming`) no dependen exclusivamente del color.

### C. Calidad operativa

- [ ] Checklist visual comparativa Light (Parchment) vs Dark (Obsidian) en vistas: onboarding, editor, graph, inspector, command palette.
- [ ] E2E smoke actualizado para validar apertura del editor, navegación de paneles y estado base de tema.
- [ ] Documentación de tokens y capas de layout actualizada en `docs/` antes de cerrar milestone.

---

## Veredicto operativo

Este plan minimiza retrabajo porque ataca primero la semántica (tokens + estado de tema), luego la estructura (layout), después el corazón cognitivo (editor), y finalmente el brillo neuronal (micro-interacciones). El resultado esperado no es “una UI más bonita”; es una interfaz que reduce decisiones inútiles por minuto y sostiene sesiones creativas largas con menor fricción mental.

**Impacto UX:** El usuario percibe continuidad, control y calma en cada transición; escribir vuelve a sentirse primario y administrar complejidad se vuelve secundario, como debe ser. La dualidad Zen/God deja de ser un toggle y se convierte en un lenguaje operacional.

**Coste estimado de implementación:** **Moderado → Alto** (según profundidad de Fase 4 y migración opcional a Tailwind).
