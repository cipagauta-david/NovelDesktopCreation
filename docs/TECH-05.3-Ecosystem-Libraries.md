# TECH-05.3: Core Ecosystem & External Libraries
**Status:** Approved
**Author:** ARIS (Chief Creative Technologist)
**Context:** This document outlines the external packages necessary to implement the TECH-05 architecture (Off-Main-Thread) and UI design (Midnight & Parchment). The selected ecosystem has been vetted for zero-friction user experience (UX), hardware-accelerated performance, and seamless Web Worker integration.

## 1. High-Performance Graph Visualization (WebGL)
**Library:** `@cosmograph/react`
**Purpose:** Rendering the Relational Graph Panel (PRD 7.9) with up to 5,000+ entities without degrading the Main Thread.

### Architectural Justification
- **WebGL Foundation:** Uses `cosmos.gl` under the hood. It delegates 100% of the force simulation and graph rendering to the GPU.
- **Off-Main-Thread Synergy:** By bypassing the CPU completely for rendering massive arrays of force nodes, this leaves the Main Thread completely free for the CodeMirror 6 text editor processing.
- **UX Impact:** Achieves 60 FPS graph interaction (zooming, panning) while the user writes. The writer can keep the graph open as a peripheral tool and watch it organically react to the story's growth without experiencing "Input Lag" in their keystrokes.

### Implementation Notes
- Requires transforming PouchDB/SQLite Web Worker data into `TypedArrays` (binary arrays) or flat JSON arrays before transferring via `comlink` to ensure zero-copy/efficient transfer to the WebGL context.

---

## 2. AST Manipulation & Persistence Engine
**Ecosystem:** `unified`, `remark-parse`, `mdast-util-directive`, `unist-util-visit`
**Purpose:** Parsing the custom Markdown syntax (like `{{Entity}}` references) purely within the Web Worker.

### Architectural Justification
- **Zero DOM Dependency:** The `unified` ecosystem operates completely free of the DOM (Document Object Model), meaning it executes natively and perfectly inside a Web Worker.
- **AST Over Regex:** Instead of using slow and fragile Regex, we use `remark-directive` and `mdast-util-directive` to parse custom logic into Abstract Syntax Tree (AST) nodes. This allows us to cleanly map `{{}}` logic and serialize it.
- **UX Impact:** Entity resolution becomes "jank-free". The parser analyzes relationships in the background, keeping the CodeMirror autocompletion fluid and instant. 

### Implementation Notes
- Create a custom Remark plugin to tokenize the `{{}}` wrappers and process them within the Web Worker before syncing the metadata to SQLite.

---

## 3. UI Components ("Military-Grade" Headless Design)
**Library:** `radix-ui` (Primitives)
**Purpose:** Creating accessible, customizable, and perfectly predictable UI elements (Modals, Dialogs, Popovers) for the "Midnight & Parchment" aesthetic.

### Architectural Justification
- **Headless by Design:** Radix UI components do not come with opinionated CSS. They only provide the state machines and accessibility logic. They won't fight our glassmorphism or custom color tokens.
- **WCAG 2.1 Out-of-the-Box:** Modals inherently trap focus (Focus Trap), handle ARIA attributes automatically, and respond to keyboard navigation natively.
- **UX Impact:** Software that feels like professional desktop tools, not cheap web apps. Visually impaired users or power-users who solely rely on keyboard shortcuts will experience zero friction.

### Implementation Notes
- Wrap Radix primitives with our internal UI design system classes (`index.css` / variables) to ensure the unified UI aesthetic is applied indiscriminately.

---

## 4. State Management & Optimistic UI
**Libraries:** `@microsoft/fetch-event-source` + `mutative`
**Purpose:** Managing AI generation streams, fast optimistic updates, and robust abort signals.

### Architectural Justification
- **Mutative over Immer:** `mutative` is 2x to 10x faster than `immer` (default in Zustand) for deep state updates, particularly when dealing with large arrays. It disables auto-freeze by default for raw performance.
- **EventSourcing:** The native `EventSource` doesn't allow POST requests or custom headers. `@microsoft/fetch-event-source` solves this, allowing API authentication and dynamic payloads essential for AI streaming. 
- **UX Impact:** The author reads AI text generation seamlessly letter by letter at extreme fluidity. If they hit "ESC" or close a tab, the active network request is ruthlessly killed (saving memory and battery). 

### Implementation Notes
- `mutative` will be integrated into the Worker to perform heavy state patches before sending the diff to the Main Thread.

---

## 5. Micro-Interactions & Physics
**Libraries:** `@dnd-kit/core` + `framer-motion` + `lucide-react` / `phosphor-react`
**Purpose:** Consistent iconography and somatic visual feedback (Tabs reordering, dragging items).

### Architectural Justification
- **Headless Drag and Drop:** `@dnd-kit/core` separates the dragging logic from the view logic. It allows us to manage drag interactions, and pipe the X/Y coordinates into `framer-motion`.
- **Interpolation:** Using `framer-motion`'s physical spring animations on `DragMove` events gives elements a natural, weighted feel. 
- **UX Impact:** Absolute fluidity. Panels and Tabs don't "snap" abruptly. They collide, push each other, and settle with inertia, increasing dopamine and making the interface feel "alive".

### Implementation Notes
- Be careful with synchronization issues during complex layout changes involving `framer-motion` and `dnd-kit`.
