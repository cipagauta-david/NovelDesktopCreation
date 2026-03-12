# DESIGN-02: El Viaje Visual de NovelDesktopCreation (ARIS Vision)

> "Una herramienta no es lo que hace, sino cómo te hace sentir mientras lo haces. Si el diseño no respira contigo, te está asfixiando." 
> — ARIS (Chief Creative Technologist)

Este documento es una exploración ilustrativa e inmersiva del aspecto final de **NovelDesktopCreation**. Dejamos de lado los bloques de código y las arquitecturas de fondo para adentrarnos en la *experiencia pura*. Imagínate sentado frente a tu monitor a las 2 AM, o en una cafetería a contraluz. Así se ve, así se siente.

---

## 1. El Alma Visual: Colores y Materialidad

La plataforma existe en una dualidad perpetua, no como "temas", sino como ecosistemas de luz:

*   **Parchment (Modo Día / Modo Vela):** Se siente como un papel denso y de alta calidad. El fondo es un crema cálido (`#FAF9F6`), sin ser amarillo chillón. Las texturas son sutiles, como el granulado de la página de un libro viejo. Los textos son de un color tinta-pizarra (`#1E293B`), y las notas laterales, ligeras e ingrávidas.
*   **Obsidian Ink (Modo Noche / Modo Luna):** Te envuelve en un azul-negro profundo y pulido (`#08111F`). No es un negro absoluto, sino un abismo que descansa la vista. Los bordes de la interfaz son finísimos hilos de luz `Ghost`. Aquí, el color primario, un *Cyan Bioluminiscente* (`#00D4EE`), respira con un sutil _glow_ (resplandor). Los elementos importantes no estallan en contrastes violentos, sino que brillan suavemente como flora de aguas profundas.

Todo cuenta con **Glassmorphism**: Paneles flotantes traslúcidos y con desenfoque de fondo (backdrop-blur). La interfaz flota sobre tus letras sin pisarlas.

---

## 2. El Flujo de las Vistas: Interconexión y Sensaciones

### 2.1. Onboarding / Welcome Flow (El Portal de Entrada)
Al abrir la app por primera vez, el ruido es cero. Una ventana limpia, flotante en cristal esmerilado que te pregunta el título de tu obra. Con un diseño espacioso, seleccionas presets de _Worldbuilding_ o _Ficción Pura_. Las transiciones duran 300ms, suaves; los botones ceden bajo el clic como teclas mecánicas finamente amortiguadas.

### 2.2. Editor Zen (El Lienzo Principal)
El corazón de la app. 
*   **Visualización:** El lienzo se expande. Fuera paneles, fuera ruido. Sólo "Crimson Pro" (tipografía Serif), elegante, masiva, en tamaños grandes y con un interlineado que permite "respirar" a los párrafos. El título subraya su presencia con una fina línea Cyan.
*   **Interacción:** A medida que bajas, el fondo reacciona a tu scroll. Es inmersivo. El teclado es el único dueño.

### 2.3. Suggestions & AI Streamer (El Murmullo Neuronal `{{}}`)
En medio del Modo Zen, escribes `{{`. Inmediatamente la pantalla se congela un milisegundo y de la punta de tu frase se despliega un **Popover de cristal**.
*   **Diseño:** Bordes con un brillo cyan microscópico si estás en Obsidian Ink. Se listan sugerencias mágicas de la nada (personajes, lugares). 
*   **AI Streamer:** Si pides a la IA que genere texto, las letras fluyen hacia el lienzo una a una (`border-r-2 animate-blink`), arrastrando tras de sí estelas de creación, y en la esquina lateral derecha palpita un botón **[Detener/Abortar]** con una sombra roja translúcida.

### 2.4. Barra Superior (El App Bar Glassmórfico)
Arriba descansa una barra semitransparente que se funde con el texto si haces scroll por debajo de ella.
*   Contiene migas de pan tipográficas diminutas ("Borradores > El Gran Relato").
*   Muestra el icono de la colección actual. En la esquina derecha, pequeñas _pills_ te dicen amablemente el número de palabras y el tiempo de lectura (ej. `6 min`).

### 2.5. God Mode / Dashboard (El Ojo del Omnisciente)
Un atajo de teclado (`Ctrl+M`) o el botón central "God Mode" (una pastilla luminosa) arranca una transición de cámara (Zoom-out figurativo). El lienzo retrocede, volviéndose una columna central. 
*   Aparecen taxonomías tabulares precisas, letras "Inter" sin serifas para atrapar miles de datos. 
*   El lienzo muta a un centro de control; aquí gobiernas las jerarquías y categorías.

### 2.6. Panel Izquierdo & Derecho (Sidebar Browser / Inspector)
*   **Panel Izquierdo:** Un explorador de colecciones fluido. Tiene _ghosting_: al quitar el cursor, sus letras se vuelven un suave gris humo (`opacity-40` o `20` en dark mode) para no distraerte.
*   **Panel Derecho (Inspector):** Sale deslizándose. Muestra metadatos y relacionales exactos del párrafo donde estás. Campos `id`, `estado`, `referencias`.

### 2.7. Panel de Assets / Moodboard Visual
Un mosaico donde lanzas un `jpg` y la app lo embebe al instante. Las imágenes toman esquinas redondeadas radiantes. Tienen _masonry layout_, un tablero Pinterest sumergido dentro del mismo universo de la app.

### 2.8. Graph Canvas (El Mapa Estelar)
Entrar aquí deshace el lienzo de texto y te arrastra a **WebGL/Canvas**.
*   Nodos que flotan gravitatoriamente, unidos por finos hilos de plata u obsidiana luminosa según el tema.
*   Zoom interactivo: de lejos son constelaciones. Si haces doble clic a una "Estrella-Personaje", viajas automáticamente a su documento en el Editor Zen.

### 2.9. Command Palette (El Oráculo)
Pulsas `Ctrl+K`. Desde arriba del centro desciende un rectángulo flotante (sombra profunda `shadow-2xl` y `backdrop-blur`).
*   Búsqueda tipográfica gigante. Con un solo _keystroke_, la app filtra toda tu historia. Es magnético, rápido y se siente como Spotlight (macOS) o Raycast cruzado con IA.

### 2.10. Historial / Time Travel (El Río del Tiempo)
Si cometes un error grave o la IA alucina de más. Presionas la flecha del tiempo.
*   La pantalla se tiñe sutilmente de un sepia pálido o azul congelado (stasis pattern). 
*   Muestra a la izquierda tu texto y a la derecha una línea cronológica de _Event Sourcing_ inmutable. Ves las deleciones en rojo coral (`#F87171`) y las inserciones en verde brillante (`#34D399`). El humano retoma el control absoluto.

### 2.11. Modal de Validación (Pre-check Humano)
Antes de que la IA modifique masivamente tu universo, la pantalla oscurece. Una tarjeta central clara y estricta pide permiso. "AI sugiere alterar jerarquía. Confirmar / Rechazar". La decisión final (UX Consent) es rotunda, los botones rechazar/aceptar tienen áreas táctiles generosas.

### 2.12. Settings Providers y Palette Theme Switcher
*   **Theme Switcher:** Un icono del sol/luna que no solo cambia el color, desencadena una fusión animada de 300ms donde las sombras se desinflan para transformarse en luces de neón en la Obsidiana, y viceversa.
*   **Settings Provider:** Panel pragmático. Sin _env files_. Inputs de tokens protegidos con asteriscos `••••••`, y sliders táctiles para decidir la temperatura y verbosidad del modelo LLM.

### 2.13. Export & Mini-Preview (El Objeto Final)
*   **Live Reader:** En una esquinita o dividiendo pantalla (`split-view`), el texto aparece renderizado exactamente como un ebook Kindle o ePub (márgenes bloqueados, textura cruda sin UI de interfaz).
*   **Export UI:** Una vista pragmática de _checklist_, íconos limpios con _checkboxes_ de formatos (PDF, EPUB, JSON) que se deslizan afirmativamente.

---

## 3. Resumen Táctico de Interconexión

El usuario fluye como agua entre estas vistas.
La **Barra Superior** y los atajos de la **Command Palette** actúan como los puentes sutiles. Nunca te obligan a retroceder o "salir" de una ventana; te deslizan. 
Cuando estás en _God Mode_, las **conexiones y Graph Canvas** son inmediatas, revelando la estructura de los datos. Y cuando llega la musa, cierras los paneles y el entorno vuelve a ser **Parchment/Obsidian**, un folio en blanco esperando tus dictados y una Inteligencia Artificial atenta a tus `{{` susurros. El viaje es circular: Inspiración -> Estructura -> Inspiración.

---

**Impacto UX:** 
Convierte al usuario en el soberano de un ecosistema que nunca grita, sólo sugiere. El diseño evoca profesionalidad y calma profunda.
**Coste estimado de implementación:** 
Diseño y layouts puramente CSS/Tailwind (Rápido/Moderado). Transiciones cinéticas entre God Mode y Canvas / Time Travel (Elevado, requiere ingeniería delicada en State Manager y WebGL).