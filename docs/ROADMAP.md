# ROADMAP DE EVOLUCIÓN UI/UX: ARCHITECTURE & RESONANT INTERFACE SYNTHESIZER (ARIS)

> "La interfaz no debe ser leída, debe ser instintivamente habitada. El código es la estructura ósea; el diseño, el latido del corazón. A partir de hoy, no escribimos componentes, forjamos ecosistemas."

Como Arquitecto Híbrido, mi mandato es erradicar la fricción entre la lógica del servidor y la psique del escritor. Este roadmap transformará nuestra base genérica de React/Vite en un hábitat de baja latencia y alta resonancia emocional, materializando la dualidad **Parchment / Obsidian Ink** y el estado de flujo **Zen / God Mode**.

A continuación, la disección táctica para ejecutar esta transición con precisión quirúrgica.

---

## FASE 1: Foundation & Design Tokens (El ADN Estructural)

Debemos inyectar nuestra paleta semántica directamente en el sistema circulatorio del proyecto. Evitaremos colores *hardcodeados* en componentes; todo responderá al entorno.

**Pasos técnicos accionables:**
1. **index.css**: Inyectar las variables CSS base de `DESIGN-01`. Definir el `:root` (Parchment) y `.dark` (Obsidian Ink). Incluir las utilidades de animación global (`transition-colors`, delays difuminados para `shadow-glow`).
2. **`tailwind.config.ts`**: Mapear `colors`, `fontFamily` (serif: Crimson Pro, sans: Inter) y `boxShadow` a las variables CSS. Activar `darkMode: 'class'`.
3. **`src/hooks/useTheme.ts`**: Crear un hook agnóstico que sincronice el estado con `localStorage`, `matchMedia` y mute la clase `.dark` en el `<html>`.
4. **index.html**: Prevenir el FOUC (Flash of Unstyled Content) inyectando un micro-script bloqueante en el `<head>` que pre-calcule y asigne `.dark` antes de que React despierte (TTFB crítico).

* **Trade-offs o riesgos técnicos:** Re-renderizados masivos en el DOM root si no se controla el context del tema. El uso extensivo de transiciones globales (`*, *::before, *::after`) puede causar *paint lag* si no silenciamos propiedades costosas (solo animar `background-color`, `border-color`, `color`, `opacity`, `box-shadow`).
* **Impacto UX:** El usuario percibe una transición de entorno cinematográfica. No es de "blanco a negro", es cambiar la luz de una vela por la de la luna. Disminuye casi a cero la fatiga retiniana nocturna.
* **Coste estimado de implementación:** Rápido.

---

## FASE 2: Layout Core & Glassmorphism (La Piel Translúcida)

Construcción del andamiaje que encapsulará al editor sin jamás ahogarlo. El UI debe aparecer como un "fantasma" (*Ghosting UI*).

**Pasos técnicos accionables:**
1. **`src/layout/AppShell.tsx`**: Reestructurar el envolvente para poseer la `parchment-texture` (ligero ruido SVG en `::before`, opacity 3%) o el gradiente radiante Cyan en dark mode.
2. **`src/layout/WorkspaceHeader.tsx`**: Convertir en cristal absoluto aplicando `backdrop-blur-md bg-parchment/60` (Light) o `bg-[rgba(14,26,46,0.75)]` + `shadow-[0_1px_0_rgba(0,212,238,0.08)]` (Dark).
3. **`src/layout/Sidebar.tsx` & `src/panels/InspectorPanel.tsx`**: Implementar la directiva de "Ghosting". En estado inactivo, opacidad base a `opacity-30` (light) y `opacity-20` (dark). En hover, transición a `opacity-100` con `duration-[300ms]`.

* **Trade-offs o riesgos técnicos:** El abuso de `backdrop-filter: blur()` combinado con transiciones de opacidad es un veneno para la GPU. Limitaremos el blur estricto al *Header* y paneles sobrepuestos, desactivándolo por completo bajo un `media query` si el sistema pide `prefers-reduced-motion` o recursos limitados.
* **Impacto UX:** El usuario siente que sus palabras son intocables. La interfaz cede la jerarquía al lienzo, mostrándose solo cuando la intención de cursor del usuario demanda control.
* **Coste estimado de implementación:** Moderado.

---

## FASE 3: Editor Zen & Tipografía (El Lienzo Respirable)

La zona neuro-crítica. Es el reactor primario de NovelDesktopCreation. Debe sentirse expansivo.

**Pasos técnicos accionables:**
1. **index.html o self-hosting de Assets**: Descargar e inyectar `Crimson Pro` (Variable Font) e `Inter` por preload `<link rel="preload">`. Cero Google Fonts bloqueantes. Usar `font-display: swap`.
2. **theme.ts**: Inyectar extensiones al editor para re-escribir su hoja de estilo in-canvas. Forzar `leading-relaxed` (1.625 a 1.75), márgenes monstruosos (`max-w-3xl`, márgenes autoadaptables al viewport). 
3. **`src/components/editor/EditorProperties.tsx`**: Crear el estilo para Títulos de Nivel 1. Subrayado base en línea `Cyan/30` en claro, y emisión de glow (`#00D4EE/40`) en modo oscuro.

* **Trade-offs o riesgos técnicos:** Sincronizar clases de Tailwind con extensiones subyacentes del editor de Markdown (ProseMirror/CodeMirror) requiere manipulación DOM profunda. Una librería mal configurada puede colapsar el editor al superar las 15,000 palabras si los nodos tipográficos repintan ineficientemente.
* **Impacto UX:** Erradicación del "síndrome del papel técnico". Escribir se vuelve una experiencia literaria instantánea; cada párrafo se acomoda a la retina sin exigir re-direccionamiento pesado del iris.
* **Coste estimado de implementación:** Rápido (Visual core) / Moderado (Mapping de nodos del Editor).

---

## FASE 4: El Río Neuronal & Micro-interacciones (El Estado Máquina)

Conectar la invocación `{{` y las transiciones macro (Zen vs God Mode). Aquí es donde el frontend cobra alma autómata.

**Pasos técnicos accionables:**
1. **decorations.ts**: Implementar rastreo de cursor. Al detectar `{{`, calcular asíncronamente el bounding box (`x,y`) del *text-node* actual mediante Javascript puro acoplado al Framework.
2. **CommandPalette.tsx (Adaptado para Popover {{)**: Usar un gestor de posicionamiento flotante (como `Floating UI` o equivalente nativo) para renderizar el menú de sugerencias con `Z-index: 100`, con CSS attributes de sombra abismal `shadow-2xl` y micro-borde luminiscente en dark mode.
3. **request.ts y Editor**: Animar la respuesta. Todo texto insertado por la IA en stream gana un `border-r-2 border-[#00D4EE] animate-[blink_1s_infinite]` temporal.
4. **ActionMenu.tsx (Botón The Switcher)**: Construir el `God Mode Pill`. Al pulsar, lanzar una transición orquestada usando `transform: scale() translate()` y `opacity` cruzada entre el componente Zen Editor y el Panel Relacional Tabular.

* **Trade-offs o riesgos técnicos:** Calcular coordenadas (x,y) del cursor relativas al body puede desfasarse al hacer scroll o re-dimensionar la ventana. Usar estado React puro hiperactiva re-renders en teclado. Solución: Bypass de React, la extensión del editor actualizará un `DOM element` usando mutaciones directas y referencias, notificando a React con estrangulamiento (`throttle`).
* **Impacto UX:** El usuario no detiene su escritura para usar la IA o ver metadatos. Lo invoca tangencialmente. El "Río Neuronal" recompensa visualmente su entrada de datos sin expulsarlo del contexto creativo.
* **Coste estimado de implementación:** Alto (Seducción técnica extrema, requiere alta sincronización de estado y manipulación de coordenadas).

---

## AUDITORÍA ARIS: Checklist de Performance y Accesibilidad Final

Ningún componente pasará a main si incumple este protocolo. La belleza visual que sacrifica la fluidez es un crimen arquitectónico.

### ⚡ Performance & Engine Check
- [ ] **TTFB y FCP Sagrados:** La carga inicial visual (*First Contentful Paint*) no depende de hidratación de estados complejos de React. La estructura base y texturas cargan con el puro HTML + CSS generado.
- [ ] **Aislamiento de Pintura (Layer Promotion):** Todo panel flotante (`CommandPalette`, `Sidebar` si es colapsable) y popovers mágicos `{{}}` poseen `will-change: transform, opacity` para empujar a la GPU. **Nunca** animar `top`, `left`, `width` o `height`.  
- [ ] **DOM Throttling en AI Streaming:** Durante una generación de texto masiva por IA, los `decorations` del cursor actúan fuera del árbol reactivo mediante manipulaciones DOM optimizadas (CodeMirror/ProseMirror Plugins) para evitar colapsar los frames a < 20fps.
- [ ] **Carga de Tipografías Oculta (FOIT prevention):** `font-display: swap` en activo. Se utiliza subsetting vectorial (woff2 purgado a latin chars esenciales) limitando los requests tipográficos < 80kb totales.

### 🛡️ Accesibilidad (La Empatía Real)
- [ ] **Ratios WCAG Blindados:** El `--text-body` Dark (`#CBD5E1`) sobre base `--color-obsidian` (`#08111F`) arroja un score riguroso superior a 9:1. El glow Cyan jamás diluye legibilidad. No hay excusas matemáticas.
- [ ] **Micro-interacciones Seguras (Vestibular check):** Si el navegador clama `prefers-reduced-motion: reduce`, la constante de transición cinematográfica pasa instintivamente a `0ms`. El Popover *aparece*, no *flota*.
- [ ] **Foco Cíclico Inquebrantable:** El teclado no es un ciudadano de segunda. Todos los botones fantasma y paneles flotantes ganan un contorno imperativo al ser enfocados (`focus-visible:ring-2 focus:ring-[#00D4EE]/25`).
- [ ] **Screen Readers & Cortisol:** Todo Streaming de IA utiliza anclajes ARIA como `aria-live="polite"` o `assertive` para notificar cuándo la Inteligencia comenzó, y cuándo detuvo su torrente creador, mitigando la ansiedad de las herramientas no-deterministas.