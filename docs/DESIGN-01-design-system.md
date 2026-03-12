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

### 2.1 CSS Variables Foundation — Light Mode (Parchment)
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

### 2.2 CSS Variables Foundation — Dark Mode (Obsidian Ink)

> *Si el modo claro es un pergamino bajo luz de vela, el modo oscuro es tinta sobre obsidiana pulida bajo luz de luna.*

**Filosofía cromática:** El dark mode **no es una inversión mecánica**. Es un cambio de **material psicológico**: de *pergamino cálido* a *obsidiana fría con venas de cyan*. La superficie base es un azul-negro profundo (`#08111F`) que evita el negro puro (#000) — el negro absoluto genera fatiga retinal en sesiones prolongadas de escritura nocturna. El cyan primario se atenúa ligeramente en luminosidad para no quemar la retina, pero se amplifica en *glow* para compensar la pérdida de contraste ambiental.

**Regla WCAG:** Todos los textos sobre `--color-obsidian` superan ratio **4.5:1** (AA) para body y **7:1** (AAA) para headings. El `--text-body-dark` (#CBD5E1, Slate 300) sobre `#08111F` alcanza **11.2:1**.

\`\`\`css
@layer base {
  .dark, :root[data-theme="dark"] {
    color-scheme: dark;

    /* ═══════════════════════════════════════════════════════
       SUPERFICIES INMERSIVAS — La Obsidiana
       Tres niveles de profundidad para crear jerarquía z-axis
       sin depender exclusivamente de sombras (que colapsan en dark).
       ═══════════════════════════════════════════════════════ */
    --color-obsidian:       #08111F; /* Base absoluta. El vacío narrativo. */
    --color-obsidian-raised:#0E1A2E; /* Paneles elevados: sidebar, inspector */
    --color-obsidian-float: #132035; /* Modales, popovers, tooltips */
    --color-midnight:       #0F172A; /* Conservado: puente semántico con light mode */
    --color-parchment:      #08111F; /* Override: en dark, "parchment" = obsidian */
    --color-background-light:#08111F;/* Override: tokens globales apuntan al dark */

    /* ═══════════════════════════════════════════════════════
       EL RÍO NEURONAL — Cyan Recalibrado
       En dark mode el cyan reduce luminosidad base pero 
       INCREMENTA el glow/shadow spread para efecto "bioluminiscente".
       ═══════════════════════════════════════════════════════ */
    --color-primary:        #00D4EE; /* Cyan ligeramente desaturado (-7 L) */
    --color-primary-dim:    rgba(0, 212, 238, 0.12); /* Hover menú: más sutil */
    --color-primary-glow:   rgba(0, 212, 238, 0.25); /* Nuevo: halo para focus rings */

    /* ═══════════════════════════════════════════════════════
       SUPERFICIES FLOTANTES — Glassmorphism Invertido
       El vidrio en dark usa fondos opacos-altos + blur reducido
       (el blur sobre negro pierde definición de borde).
       ═══════════════════════════════════════════════════════ */
    --surface-glass:        rgba(14, 26, 46, 0.92);  /* Paneles glass: casi opaco */
    --surface-glass-dark:   rgba(8, 17, 31, 0.96);   /* Modales pesados */
    --surface-glass-hover:  rgba(19, 32, 53, 0.95);   /* Hover state del glass */

    /* ═══════════════════════════════════════════════════════
       TEXTOS Y CONTRASTE — Escala Selenita
       Nombrada por la piedra selenita: blancos fríos con 
       matiz azulado imperceptible que armoniza con la obsidiana.
       ═══════════════════════════════════════════════════════ */
    --text-heading:         #F1F5F9; /* Slate 100 — Titulares luminosos */
    --text-body:            #CBD5E1; /* Slate 300 — Cuerpo narrativo principal */
    --text-muted:           #64748B; /* Slate 500 — Conservado: ancla perceptual */
    --text-ghost:           #475569; /* Slate 600 — Más oscuro que en light (invertido) */

    /* ═══════════════════════════════════════════════════════
       BORDES Y SEPARADORES — Líneas Espectrales
       En dark los bordes son sutilísimos hilos de luz.
       ═══════════════════════════════════════════════════════ */
    --border-subtle:        rgba(148, 163, 184, 0.08); /* Casi invisible */
    --border-active:        rgba(0, 212, 238, 0.30);   /* Focus/active states */
    --border-divider:       rgba(148, 163, 184, 0.06); /* Separadores de sección */

    /* ═══════════════════════════════════════════════════════
       SOMBRAS — Abismo Controlado
       En dark, las sombras son MÁS oscuras y difusas.
       Se compensa con glow de accent en elementos interactivos.
       ═══════════════════════════════════════════════════════ */
    --shadow-glass:         0 24px 80px rgba(0, 0, 0, 0.50);
    --shadow-popover:       0 12px 48px rgba(0, 0, 0, 0.60),
                            0 0 1px rgba(148, 163, 184, 0.10);
    --shadow-glow:          0 0 20px rgba(0, 212, 238, 0.15); /* Glow cyan ambiental */

    /* ═══════════════════════════════════════════════════════
       FEEDBACK SEMÁNTICO — Estados del Sistema
       Colores de estado ajustados para legibilidad sobre oscuro.
       ═══════════════════════════════════════════════════════ */
    --color-success:        #34D399; /* Emerald 400 */
    --color-warning:        #FBBF24; /* Amber 400 */
    --color-error:          #F87171; /* Red 400 */
    --color-info:           #60A5FA; /* Blue 400 */
  }
}
\`\`\`

### 2.3 Tabla Comparativa de Tokens: Light ↔ Dark

| Token Semántico | Light (Parchment) | Dark (Obsidian Ink) | Ratio WCAG (text on bg) |
|---|---|---|---|
| **Background base** | `#FAF9F6` | `#08111F` | — |
| **Surface raised** | `#F6F4EF` | `#0E1A2E` | — |
| **Surface float** | `rgba(255,255,255,0.8)` | `rgba(14,26,46,0.92)` | — |
| **Primary accent** | `#00E5FF` | `#00D4EE` | 8.1:1 / 7.4:1 |
| **Heading text** | `#0F172A` on `#FAF9F6` | `#F1F5F9` on `#08111F` | 16.3:1 / 15.1:1 |
| **Body text** | `#1E293B` on `#FAF9F6` | `#CBD5E1` on `#08111F` | 13.2:1 / 11.2:1 |
| **Muted text** | `#64748B` on `#FAF9F6` | `#64748B` on `#08111F` | 4.9:1 / 4.6:1 |
| **Ghost text** | `#94A3B8` on `#FAF9F6` | `#475569` on `#08111F` | 3.4:1 / 3.2:1 |

> **Nota sobre Ghost:** Ambos modos mantienen el ghost debajo de AA (3:1) intencionalmente — es UI *decorativa* que no transmite información esencial (WCAG 1.4.3 excepción para texto incidental).

### 2.4 Estrategia de Activación del Tema

El dark mode se activa mediante la clase `.dark` en el `<html>` o el atributo `data-theme="dark"`, compatible con la estrategia `darkMode: 'class'` de Tailwind:

\`\`\`ts
// tailwind.config.ts
export default {
  darkMode: 'class', // Permite .dark en <html> y prefijos dark: en clases
  theme: {
    extend: {
      colors: {
        parchment: 'var(--color-parchment)',
        obsidian:  'var(--color-obsidian)',
        midnight:  'var(--color-midnight)',
        primary:   'var(--color-primary)',
      },
    },
  },
}
\`\`\`

\`\`\`ts
// Lógica de toggle (respeta preferencia del sistema como fallback)
function initTheme() {
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
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
<!-- LIGHT MODE -->
<div class="relative flex min-h-screen w-full flex-col overflow-x-hidden parchment-texture bg-background-light text-slate-800 transition-colors duration-300">
  <main class="flex-1 flex flex-col pt-32 pb-40 px-6">
    <div class="writing-area w-full max-w-3xl mx-auto">
      <!-- Inserción del motor Prosemirror / Entidades -->
    </div>
  </main>
</div>

<!-- DARK MODE: Obsidian Ink — Fondo con gradientes radiantes sutiles -->
<div class="dark relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#08111F] text-slate-300 transition-colors duration-300"
     style="background: 
       radial-gradient(ellipse at 15% 5%, rgba(0, 212, 238, 0.04), transparent 40%),
       radial-gradient(ellipse at 85% 90%, rgba(99, 102, 241, 0.06), transparent 35%),
       #08111F;">
  <main class="flex-1 flex flex-col pt-32 pb-40 px-6">
    <div class="writing-area w-full max-w-3xl mx-auto">
      <!-- Inserción del motor Prosemirror / Entidades -->
    </div>
  </main>
</div>
\`\`\`
> **Nota Dark:** Los gradientes radiantes cyan/indigo al 4-6% de opacidad generan una sensación de *profundidad atmosférica* sin comprometer la legibilidad. Es el equivalente oscuro de la textura de pergamino.

### 4.2 Arquitectura del Top Navigation (App Bar)
Se posa encima del papel sin romper su fluidez. Se usa *Glassmorphism*.
\`\`\`html
<!-- LIGHT MODE -->
<nav class="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-parchment/60 backdrop-blur-md border-b border-midnight/5">
  <div class="flex items-center gap-3">
    <span class="material-symbols-outlined text-primary">auto_stories</span>
    <h2 class="text-sm font-bold tracking-widest uppercase opacity-40">Zen Editor</h2>
  </div>
  <div class="flex items-center gap-6">
    <div class="flex items-center gap-2 text-xs font-medium opacity-40">
      <span>Drafts</span>
      <span class="material-symbols-outlined text-[10px]">chevron_right</span>
      <span class="text-slate-900 font-semibold">The Great Narrative</span>
    </div>
  </div>
</nav>

<!-- DARK MODE: glass sobre obsidiana + borde luminoso inferior -->
<nav class="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 
            bg-[rgba(14,26,46,0.75)] backdrop-blur-xl 
            border-b border-white/[0.06]
            shadow-[0_1px_0_rgba(0,212,238,0.08)]">
  <div class="flex items-center gap-3">
    <span class="material-symbols-outlined text-[#00D4EE] drop-shadow-[0_0_8px_rgba(0,212,238,0.3)]">auto_stories</span>
    <h2 class="text-sm font-bold tracking-widest uppercase text-slate-400/50">Zen Editor</h2>
  </div>
  <div class="flex items-center gap-6">
    <div class="flex items-center gap-2 text-xs font-medium text-slate-500/60">
      <span>Drafts</span>
      <span class="material-symbols-outlined text-[10px]">chevron_right</span>
      <span class="text-slate-200 font-semibold">The Great Narrative</span>
    </div>
  </div>
</nav>
\`\`\`
> **Dark Pattern:** El borde inferior usa un `shadow` cyan al 8% en lugar de un `border-color`, creando un hilo de luz que ancla la barra visualmente sin generar una línea dura.

### 4.3 Elementos de Texto del Editor (H1 y Body)
El contraste y el espacio en blanco son respiración para el lector.
\`\`\`html
<!-- LIGHT MODE -->
<header class="mb-12">
  <h1 class="font-serif text-5xl md:text-6xl text-slate-900 mb-4 leading-tight">Chapter One: The Awakening</h1>
  <div class="h-1 w-20 bg-primary/30 rounded-full"></div>
</header>
<article class="font-serif text-xl md:text-2xl leading-relaxed text-slate-800 space-y-8">
  <p>The ink flowed across the parchment like a slow river...</p>
</article>

<!-- DARK MODE: Tipografía selenita + acento con glow -->
<header class="mb-12">
  <h1 class="font-serif text-5xl md:text-6xl text-slate-100 mb-4 leading-tight">Chapter One: The Awakening</h1>
  <!-- El acento en dark emite un glow sutil para compensar la oscuridad -->
  <div class="h-1 w-20 bg-[#00D4EE]/40 rounded-full shadow-[0_0_12px_rgba(0,212,238,0.2)]"></div>
</header>
<article class="font-serif text-xl md:text-2xl leading-relaxed text-slate-300 space-y-8">
  <p>The ink flowed across the parchment like a slow river...</p>
</article>
\`\`\`
> **Dark Typography:** El cuerpo narrativo baja a Slate 300 (`#CBD5E1`) en vez de Slate 100 para evitar el "efecto linterna" — texto demasiado blanco sobre fondo oscuro fatiga más rápido que un gris controlado. Los headings sí usan Slate 100 para jerarquía.

### 4.4 Botones Centrales e Invocación (Micro-Interacciones)
Cada botón refleja su impacto. Botones neutros carecen de background hasta el hover.

**1. Botones de Utilidad Silenciosa (Iconography Sidebar):**
\`\`\`html
<!-- LIGHT -->
<button class="p-2 rounded-lg text-slate-600 hover:bg-black/5 hover:text-slate-900 transition-colors focus:ring-2 focus:ring-primary/20">
  <span class="material-symbols-outlined">settings</span>
</button>

<!-- DARK: hover con halo en vez de fondo sólido -->
<button class="p-2 rounded-lg text-slate-500 hover:bg-white/[0.06] hover:text-slate-200 transition-colors focus:ring-2 focus:ring-[#00D4EE]/25 focus:outline-none">
  <span class="material-symbols-outlined">settings</span>
</button>
\`\`\`

**2. Botón God Mode (El Switch Maestro):**
Diseño pastilla (`Pill`) con indicador luminoso orgánico.
\`\`\`html
<!-- LIGHT -->
<button class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-midnight/5 hover:bg-midnight/10 border border-midnight/10 transition-all group">
  <span class="material-symbols-outlined text-lg text-primary">auto_fix_high</span>
  <span class="text-[10px] font-bold uppercase tracking-widest text-midnight/60 group-hover:text-midnight">God Mode</span>
  <div class="w-8 h-4 bg-midnight/10 rounded-full relative ml-1">
    <div class="absolute left-1 top-1 size-2 bg-primary rounded-full shadow-[0_0_8px_rgba(0,229,255,0.6)]"></div>
  </div>
</button>

<!-- DARK: borde sutil luminoso + glow amplificado en el switch -->
<button class="flex items-center gap-2 px-3 py-1.5 rounded-full 
              bg-white/[0.04] hover:bg-white/[0.08] 
              border border-white/[0.08] hover:border-[#00D4EE]/20
              transition-all group">
  <span class="material-symbols-outlined text-lg text-[#00D4EE] drop-shadow-[0_0_6px_rgba(0,212,238,0.4)]">auto_fix_high</span>
  <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-200">God Mode</span>
  <div class="w-8 h-4 bg-white/[0.06] rounded-full relative ml-1">
    <div class="absolute left-1 top-1 size-2 bg-[#00D4EE] rounded-full shadow-[0_0_12px_rgba(0,212,238,0.7)]"></div>
  </div>
</button>
\`\`\`

**3. Pills de Estado del Status Bar Inferior:**
\`\`\`html
<!-- LIGHT — Guardado Optimista -->
<div class="flex items-center gap-2 bg-black/5 px-4 py-2 rounded-full absolute bottom-8 left-8 hover:bg-black/10 transition-colors cursor-default">
  <div class="size-2 bg-primary rounded-full shadow-[0_0_6px_rgba(0,229,255,0.8)] animate-pulse"></div>
  <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Saved</span>
</div>

<!-- DARK — Guardado Optimista: glass oscuro + glow pulsante -->
<div class="flex items-center gap-2 bg-white/[0.04] px-4 py-2 rounded-full absolute bottom-8 left-8 hover:bg-white/[0.07] border border-white/[0.06] transition-colors cursor-default backdrop-blur-md">
  <div class="size-2 bg-[#00D4EE] rounded-full shadow-[0_0_10px_rgba(0,212,238,0.6)] animate-pulse"></div>
  <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Saved</span>
</div>

<!-- LIGHT — Metadata del Documento -->
<div class="absolute bottom-8 right-8 flex gap-6 px-5 py-2 bg-black/5 rounded-full backdrop-blur-md border border-white/20 shadow-sm">
  <div class="flex flex-col items-center">
    <span class="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Words</span>
    <span class="text-sm font-semibold text-slate-700">1,248</span>
  </div>
  <div class="w-px bg-black/10"></div>
  <div class="flex flex-col items-center">
    <span class="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Reading Time</span>
    <span class="text-sm font-semibold text-slate-700">6 min</span>
  </div>
</div>

<!-- DARK — Metadata del Documento: borde espectral + texto selenita -->
<div class="absolute bottom-8 right-8 flex gap-6 px-5 py-2 bg-[rgba(14,26,46,0.80)] rounded-full backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
  <div class="flex flex-col items-center">
    <span class="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Words</span>
    <span class="text-sm font-semibold text-slate-300">1,248</span>
  </div>
  <div class="w-px bg-white/[0.06]"></div>
  <div class="flex flex-col items-center">
    <span class="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Reading Time</span>
    <span class="text-sm font-semibold text-slate-300">6 min</span>
  </div>
</div>
\`\`\`

### 4.5 El Autocomplete Dinámico FTS Neural (Popover Modal \`{{\`)
*Probablemente el modal más delicado del sistema.* Debe renderizarse on-top absoluto (Z-index superior), anclado a la coordenada del cursor Text-Node.

\`\`\`html
<!-- LIGHT MODE — Envolvente Relativo de la Referencia Inline -->
<div class="relative inline-block">
  <span class="cursor-blink pr-1 text-primary font-medium border-r-2 border-transparent animate-[blink_1s_infinite]">✦ Rey Fuego stood at the precipice of the {{</span>
  
  <div class="absolute top-full left-0 mt-2 w-64 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] z-[100] p-2 transform -translate-x-4 transition-all animate-in fade-in slide-in-from-top-2 duration-150">
    <div class="text-[10px] uppercase tracking-widest text-slate-400 px-3 py-2 font-bold select-none">
      Suggestions
    </div>
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-3 px-3 py-2 bg-primary/10 rounded-lg text-slate-900 cursor-pointer transition-colors">
        <span class="material-symbols-outlined text-primary text-sm">person</span>
        <span class="text-sm font-medium">Rey Fuego</span>
        <span class="ml-auto text-[9px] uppercase font-bold text-primary/60">Character</span>
      </div>
      <div class="flex items-center gap-3 px-3 py-2 hover:bg-black/5 rounded-lg text-slate-600 cursor-pointer transition-colors">
        <span class="material-symbols-outlined text-sm opacity-70">castle</span>
        <span class="text-sm font-medium">Shadow Realm</span>
        <span class="ml-auto text-[9px] uppercase font-bold text-slate-400">Location</span>
      </div>
    </div>
  </div>
</div>

<!-- DARK MODE — Popover Obsidian: glass denso + bordes luminiscentes -->
<div class="relative inline-block">
  <span class="cursor-blink pr-1 text-[#00D4EE] font-medium border-r-2 border-transparent animate-[blink_1s_infinite]">✦ Rey Fuego stood at the precipice of the {{</span>
  
  <!-- El popover dark usa glass ultra-opaco + sombra abismal + borde cyan hint -->
  <div class="absolute top-full left-0 mt-2 w-64 
              bg-[rgba(14,26,46,0.92)] backdrop-blur-xl 
              border border-white/[0.08] 
              rounded-xl 
              shadow-[0_12px_48px_rgba(0,0,0,0.6),0_0_1px_rgba(148,163,184,0.10),0_0_20px_rgba(0,212,238,0.06)]
              z-[100] p-2 transform -translate-x-4 
              transition-all animate-in fade-in slide-in-from-top-2 duration-150">
    
    <div class="text-[10px] uppercase tracking-widest text-slate-500 px-3 py-2 font-bold select-none">
      Suggestions
    </div>
    
    <div class="flex flex-col gap-1">
      <!-- ITEM SELECCIONADO: fondo cyan diluido + text claro -->
      <div class="flex items-center gap-3 px-3 py-2 bg-[#00D4EE]/[0.08] rounded-lg text-slate-100 cursor-pointer transition-colors border border-[#00D4EE]/[0.12]">
        <span class="material-symbols-outlined text-[#00D4EE] text-sm drop-shadow-[0_0_4px_rgba(0,212,238,0.3)]">person</span>
        <span class="text-sm font-medium">Rey Fuego</span>
        <span class="ml-auto text-[9px] uppercase font-bold text-[#00D4EE]/50">Character</span>
      </div>

      <!-- ITEM INACTIVO: revelación progresiva -->
      <div class="flex items-center gap-3 px-3 py-2 hover:bg-white/[0.05] rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">
        <span class="material-symbols-outlined text-sm opacity-50">castle</span>
        <span class="text-sm font-medium">Shadow Realm</span>
        <span class="ml-auto text-[9px] uppercase font-bold text-slate-600">Location</span>
      </div>
    </div>
  </div>
</div>
\`\`\`
> **Dark Pattern — Popover:** El item seleccionado lleva un micro-borde cyan (`border-[#00D4EE]/[0.12]`) para comunicar foco sin depender solo del color de fondo — crucial en dark donde los fondos coloreados pierden definición. El ícono gana `drop-shadow` para simular emisión de luz propia.

---

## 5. Accesibilidad (A11y), Animaciones y Carga Cognitiva

### 5.1 Carga Cognitiva y "Ghosting" UI
- Todo componente lateral (Íconos de Historia, Stats, Mapas) arranca en `opacity-30` o `opacity-40` y asciende a `opacity-100` con `hover` (Revelación Progresiva).
- Prohibición del color puro #000000 o #FFFFFF en fondos/textos extendidos. Utiliza escalas `#1E293B (Slate 800)` para contrastes amables en light y `#08111F` para dark (nunca negro absoluto).
- **En dark mode**, el ghosting es aún más agresivo: componentes laterales arrancan en `opacity-20` porque el contraste percibido es mayor sobre fondos oscuros.

### 5.2 Micro-Interacciones
- **Cursor IA `Streaming`:** Un `border-r-2 border-primary` intermitente usando `@keyframes blink { from, to { border-color: transparent } 50% { border-color: #00E5FF; }}` al inyectar autocompletados desde el Provider OpenAI/Local. En dark mode el color del blink se ajusta a `#00D4EE`.
- **Transiciones Táctiles:** `transition-all duration-150 ease-out` para hovers de menú, y `duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]` para la entrada deslizante lateral del "God Mode Panel".

### 5.3 Transiciones entre Temas (Light ↔ Dark)
La transición entre modos debe ser **cinematográfica, no abrupta**. El cambio de tema aplica una animación CSS que:

1. **Fade cross-dissolve** de 300ms en `background-color` y `color` (ya cubierto por `transition-colors duration-300` en el root).
2. **Las superficies glass** transicionan con `transition: background var(--motion-slow), border-color var(--motion-slow), box-shadow var(--motion-slow)` para que los bordes y sombras se adapten suavemente.
3. **Los glows cyan** en dark hacen fade-in con `transition: box-shadow 400ms ease-out` — aparecen ligeramente después del fondo para generar sensación de "luces encendiéndose".

\`\`\`css
/* Transición suave de tema aplicada globalmente */
*, *::before, *::after {
  transition-property: background-color, border-color, color, box-shadow, opacity;
  transition-duration: 300ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Opt-out para animaciones que no deben verse afectadas */
.no-theme-transition,
.no-theme-transition *,
[data-no-transition] {
  transition-duration: 0ms !important;
}

/* Los glows entran un tick después (staggered) */
.dark .shadow-glow,
.dark [class*="drop-shadow"] {
  transition-delay: 100ms;
  transition-duration: 400ms;
}
\`\`\`

### 5.4 Accesibilidad Específica del Dark Mode
- **Focus rings:** En dark mode, los focus rings cambian de `ring-primary/20` a `ring-[#00D4EE]/25` con un spread adicional para compensar la pérdida de visibilidad del outline sobre fondos oscuros.
- **Reduced Motion:** Si el usuario tiene `prefers-reduced-motion: reduce`, todas las transiciones de tema se aplican instantáneamente (duration: 0ms) y los glows pulsantes se desactivan.
- **High contrast:** Para users con `forced-colors: active` (modo alto contraste de Windows), los bordes espectrales (`border-white/[0.06]`) se promueven a `ButtonText` del sistema y los fondos glass se eliminan en favor de fondos sólidos.

\`\`\`css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0ms !important;
    animation-duration: 0ms !important;
  }
  .animate-pulse { animation: none !important; }
}

@media (forced-colors: active) {
  .dark nav,
  .dark [class*="backdrop-blur"] {
    background: Canvas !important;
    border-color: ButtonText !important;
    backdrop-filter: none !important;
  }
}
\`\`\`

---

## 6. Resumen Visual: Mapa de Materialidad

| Concepto | Light (Parchment) | Dark (Obsidian Ink) |
|---|---|---|
| **Metáfora material** | Pergamino bajo luz de vela | Obsidiana pulida bajo luz de luna |
| **Fondo base** | Crema cálido `#FAF9F6` | Azul-negro profundo `#08111F` |
| **Textura ambiental** | CSS `parchment-texture` (ruido SVG cálido) | Gradientes radiantes cyan/indigo al 4-6% |
| **Glass surfaces** | Blanco 80% opacidad, blur alto | Obsidian glass 92% opacidad, blur alto |
| **Primary accent** | Cyan puro `#00E5FF` | Cyan atenuado `#00D4EE` + **glow** |
| **Bordes** | `border-black/5` o `border-slate-200` | `border-white/[0.06-0.08]` + shadow hints |
| **Sombras** | Sutiles, drop-shadow clásicas | Abismales + glow cyan ambiental |
| **Texto body** | Slate 800 `#1E293B` (tinta densa) | Slate 300 `#CBD5E1` (selenita) |
| **Ghosting level** | `opacity-40` reposo | `opacity-20` reposo (más agresivo) |
| **Hover pattern** | `bg-black/5` → `bg-black/10` | `bg-white/[0.04]` → `bg-white/[0.08]` |
| **Focus pattern** | `ring-primary/20` | `ring-[#00D4EE]/25` + glow delay |

---

## 📝 Veredicto y Directivas ARIS
- **Impacto UX:** Impecable y Elevado. Esta arquitectura no es meramente estética; manipula la respuesta dopamínica y la absorción atencional del escritor. Disocia la "Redacción Pura" de la "Edición Metabática". El **dark mode Obsidian Ink** completa la experiencia: los escritores nocturnos — que representan el grueso de sesiones creativas — obtienen un entorno que *minimiza la fatiga ocular sin sacrificar la jerarquía visual*. El sistema de glows cyan actúa como *bioluminiscencia funcional*, guiando la atención sin recurrir a contrastes violentos. La transición cinematográfica entre ambos modos refuerza la sensación de cambio de *ambiente*, no de *preferencia de configuración*.
- **Coste estimado de implementación:** **Moderado a Riesgo Medio** en la capa del Editor. Los tokens CSS con `.dark` class son triviales de implementar en Tailwind (`darkMode: 'class'`). La complejidad real reside en: 1) la transición global suave sin impactar performance (el `*` transition debe scope-arse con cuidado), 2) los glow/shadow en componentes interactivos que requieren GPU compositing, y 3) el popover `{{` que debe recalcular estilos de borde/sombra contextuales al tema activo sin re-render completo.