# DESIGN-01: Sistema de Diseño y Alma Visual (ARIS Architecture)

> "El código es la estructura ósea. El diseño es el latido del corazón. Si uno falla, el sistema es un cadáver."
> — ARIS (Chief Creative Technologist)

Este documento es la **Biblia de UI/UX y Sistema de Tokens** para **NovelDesktopCreation**. El enfoque es *Empatía Despiadada* con el escritor: reducir la fricción cognitiva a cero. El usuario no lee la interfaz, la interactúa instintivamente.

---

## 1. Filosofía de la Dualidad (Zen Mode vs God Mode)

Todo el diseño orbita sobre dos estados neurológicos del autor:
1. **Zen Mode (Estado de Flujo Generativo):** La interfaz desaparece. Tipografía con serifas orgánicas, márgenes expansivos, ruido visual anulado mediante modo espectral (paneles semitransparentes o invisibles).
2. **God Mode (Estado de Arquitectura):** Paneles de control rotundos, interacciones relacionales cristalizadas, taxonomía tabular con sans-serifs microscópicas y de alta densidad para manejar el lore de la historia.

---

## 2. Paleta de Colores y Tokens Raíz (Variables CSS)

Los tokens semánticos rigen Tailwind. Se evitarán hardcodes de colores. Se define una base material (Parchment) y estructural (Midnight), contrastada por la entidad neuronal (Cyan).

### 2.1 CSS Variables Foundation
\`\`\`css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Superficies Inmersivas */
    --color-parchment: #F6F4EF; /* Fondo principal cálido lectura */
    --color-midnight: #0F172A;  /* Oscuro tecnológico, fondos panel */
    --color-background-light: #FAF9F6;

    /* El Río Neuronal (Acciones, AI, Focus) */
    --color-primary: #00E5FF; /* Cyan brillante: Representa lo relacional / AI */
    --color-primary-dim: rgba(0, 229, 255, 0.15); /* Hover en menús FTS */

    /* Superficies Flotantes (Glassmorphism) */
    --surface-glass: rgba(255, 255, 255, 0.8);
    --surface-glass-dark: rgba(15, 23, 42, 0.85);

    /* Textos y Contraste */
    --text-heading: #0f172a; /* Slate 900 - Titulares rotundos */
    --text-body: #1e293b;    /* Slate 800 - Cuerpo narrativo */
    --text-muted: #64748b;   /* Slate 500 - Tags, metadatos, UI inactiva */
    --text-ghost: #94a3b8;   /* Slate 400 - Rótulos ultra-suaves */
  }
}
\`\`\`

---

## 3. Topología Tipográfica Modular

La tipografía debe proveer el máximo ancho de banda para leer sin agotar el glóbulo ocular del usuario. Se divide en dos mundos excluyentes:

- **Narrativa (El Canvas): `Crimson Pro`, serif.** Configurado como variable font, optimizado para jerarquía de tamaño entre Títulos, Capítulos y Párrafos de base de \`text-xl\` (aprox 20px) con line-height super espaciado \`leading-relaxed\`.
- **Estructura (El Panel/UI): `Inter`, sans-serif.** Sistema modular enfocado en tracking para UI. Desde los insignificantes breadcrumbs (\`text-[10px]\`) hasta la taxonomía de tooltips.

---

## 4. Anatomía Anatómica de Componentes (Radiografía Tailwind)

*A continuación, el despiece exacto de cada `div`, `span` y elemento atómico proyectado para el sistema de renderizado en React/Vue.*

### 4.1 Envolventes y Canvas (El Contenedor Maestro)
El cuerpo debe sentirse orgánico. Todo el esqueleto inicial se teje así:
\`\`\`html
<!-- Root Body: Textura de papiro sintético y base expansiva -->
<div class="relative flex min-h-screen w-full flex-col overflow-x-hidden parchment-texture bg-background-light text-slate-800 transition-colors duration-300">

  <!-- Editor Main Canvas: Restringido transversalmente para la ergonomía del ojo -->
  <main class="flex-1 flex flex-col pt-32 pb-40 px-6">
    <div class="writing-area w-full max-w-3xl mx-auto">
      <!-- Inserción del motor Prosemirror / Entidades -->
    </div>
  </main>
</div>
\`\`\`

### 4.2 Arquitectura del Top Navigation (App Bar)
Se posa encima del papel sin romper su fluidez. Se usa *Glassmorphism*.
\`\`\`html
<nav class="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-parchment/60 backdrop-blur-md border-b border-midnight/5">
  <!-- Logo y Branding Espectral -->
  <div class="flex items-center gap-3">
    <span class="material-symbols-outlined text-primary">auto_stories</span>
    <h2 class="text-sm font-bold tracking-widest uppercase opacity-40">Zen Editor</h2>
  </div>

  <!-- Breadcrumbs de Búsqueda y Situación Cognitiva -->
  <div class="flex items-center gap-6">
    <div class="flex items-center gap-2 text-xs font-medium opacity-40">
      <span>Drafts</span>
      <span class="material-symbols-outlined text-[10px]">chevron_right</span>
      <span class="text-slate-900 font-semibold">The Great Narrative</span>
    </div>

    <!-- Contenedor del God Mode y Opciones -->
    ...
  </div>
</nav>
\`\`\`

### 4.3 Elementos de Texto del Editor (H1 y Body)
El contraste y el espacio en blanco son respiración para el lector.
\`\`\`html
<!-- Cabecera Magnética de Capítulo -->
<header class="mb-12">
  <h1 class="font-serif text-5xl md:text-6xl text-slate-900 mb-4 leading-tight">Chapter One: The Awakening</h1>
  <!-- Acento decorativo sutil bajo el título -->
  <div class="h-1 w-20 bg-primary/30 rounded-full"></div>
</header>

<!-- Corpus Narrativo -->
<article class="font-serif text-xl md:text-2xl leading-relaxed text-slate-800 space-y-8">
  <p>The ink flowed across the parchment like a slow river...</p>
</article>
\`\`\`

### 4.4 Botones Centrales e Invocación (Micro-Interacciones)
Cada botón refleja su impacto. Botones neutros carecen de background hasta el hover.

**1. Botones de Utilidad Silenciosa (Iconography Sidebar):**
\`\`\`html
<button class="p-2 rounded-lg text-slate-600 hover:bg-black/5 hover:text-slate-900 transition-colors focus:ring-2 focus:ring-primary/20">
  <span class="material-symbols-outlined">settings</span>
</button>
\`\`\`

**2. Botón God Mode (El Switch Maestro):**
Diseño pastilla (`Pill`) con indicador luminoso orgánico.
\`\`\`html
<button class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-midnight/5 hover:bg-midnight/10 border border-midnight/10 transition-all group">
  <span class="material-symbols-outlined text-lg text-primary">auto_fix_high</span>
  <span class="text-[10px] font-bold uppercase tracking-widest text-midnight/60 group-hover:text-midnight">God Mode</span>

  <!-- Switch Interno Simulado -->
  <div class="w-8 h-4 bg-midnight/10 rounded-full relative ml-1">
    <div class="absolute left-1 top-1 size-2 bg-primary rounded-full shadow-[0_0_8px_rgba(0,229,255,0.6)]"></div>
  </div>
</button>
\`\`\`

**3. Pills de Estado del Status Bar Inferior:**
\`\`\`html
<!-- Guardado Optimista -->
<div class="flex items-center gap-2 bg-black/5 px-4 py-2 rounded-full absolute bottom-8 left-8 hover:bg-black/10 transition-colors cursor-default">
  <div class="size-2 bg-primary rounded-full shadow-[0_0_6px_rgba(0,229,255,0.8)] animate-pulse"></div>
  <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Saved</span>
</div>

<!-- Metadata del Documento (Word Count/Time) -->
<div class="absolute bottom-8 right-8 flex gap-6 px-5 py-2 bg-black/5 rounded-full backdrop-blur-md border border-white/20 shadow-sm">
  <div class="flex flex-col items-center">
    <span class="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Words</span>
    <span class="text-sm font-semibold text-slate-700">1,248</span>
  </div>
  <!-- Divider -->
  <div class="w-px bg-black/10"></div>
  <div class="flex flex-col items-center">
    <span class="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Reading Time</span>
    <span class="text-sm font-semibold text-slate-700">6 min</span>
  </div>
</div>
\`\`\`

### 4.5 El Autocomplete Dinámico FTS Neural (Popover Modal \`{{\`)
*Probablemente el modal más delicado del sistema.* Debe renderizarse on-top absoluto (Z-index superior), anclado a la coordenada del cursor Text-Node.

\`\`\`html
<!-- Envolvente Relativo de la Referencia Inline -->
<div class="relative inline-block">
  <!-- El Texto invocado dentro de la narrativa -->
  <span class="cursor-blink pr-1 text-primary font-medium border-r-2 border-transparent animate-[blink_1s_infinite]">✦ Rey Fuego stood at the precipice of the {{</span>

  <!-- Popover / Flotante predictivo -->
  <div class="absolute top-full left-0 mt-2 w-64 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] z-[100] p-2 transform -translate-x-4 transition-all animate-in fade-in slide-in-from-top-2 duration-150">

    <!-- Cabecera de Categoría -->
    <div class="text-[10px] uppercase tracking-widest text-slate-400 px-3 py-2 font-bold select-none">
      Suggestions
    </div>

    <!-- Contenedor Listado -->
    <div class="flex flex-col gap-1">
      <!-- ITEM SELECCIONADO (Focus o Teclado Activo) -->
      <div class="flex items-center gap-3 px-3 py-2 bg-primary/10 rounded-lg text-slate-900 dark:text-gray-100 cursor-pointer transition-colors">
        <span class="material-symbols-outlined text-primary text-sm">person</span>
        <span class="text-sm font-medium">Rey Fuego</span>
        <span class="ml-auto text-[9px] uppercase font-bold text-primary/60">Character</span>
      </div>

      <!-- ITEM INACTIVO -->
      <div class="flex items-center gap-3 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer transition-colors">
        <span class="material-symbols-outlined text-sm opacity-70">castle</span>
        <span class="text-sm font-medium">Shadow Realm</span>
        <span class="ml-auto text-[9px] uppercase font-bold text-slate-400">Location</span>
      </div>
    </div>
  </div>
</div>
\`\`\`

---

## 5. Accesibilidad (A11y), Animaciones y Carga Cognitiva

### 5.1 Carga Cognitiva y "Ghosting" UI
- Todo componente lateral (Íconos de Historia, Stats, Mapas) arranca en `opacity-30` o `opacity-40` y asciende a `opacity-100` con `hover` (Revelación Progresiva).
- Prohibición del color puro #000000 o #FFFFFF en fondos/textos extendidos. Utiliza escalas `#1E293B (Slate 800)` para contrastes amables.

### 5.2 Micro-Interacciones
- **Cursor IA `Streaming`:** Un `border-r-2 border-primary` intermitente usando `@keyframes blink { from, to { border-color: transparent } 50% { border-color: #00E5FF; }}` al inyectar autocompletados desde el Provider OpenAI/Local.
- **Transiciones Táctiles:** `transition-all duration-150 ease-out` para hovers de menú, y `duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]` para la entrada deslizante lateral del "God Mode Panel".

---

## 📝 Veredicto y Directivas ARIS
- **Impacto UX:** Impecable y Elevado. Esta arquitectura no es meramente estética; manipula la respuesta dopamínica y la absorción atencional del escritor. Disocia la "Redacción Pura" de la "Edición Metabática". Al sumergirse con los tokens definidos, el usuario sentirá una robustez de Software Enterprise bajo las ropas de un documento medieval modernizado.
- **Coste estimado de implementación:** **Moderado a Riesgo Medio** en la capa del Editor. Pintar Tailwind y CSS puro no cuesta nada; la ingeniería pesada reside en proyectar (renderizar) dinámicamente en coordenadas precisas el HTML del "Popover Modal `{{`" flotando en medio del Text-Tree del editor Prosemirror/Markdown y anclarlo perfectamente ante cambios de resize o scroll.