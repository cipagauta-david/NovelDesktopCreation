# PRD Formal — NovelDesktopCreation (Part 2: Funciones IA y UX)

## 7. Alcance funcional (Continuación)

### 7.6 IA contextual (Profiles de Contexto)
System prompts asimilados a cada "Pestaña/Colección", alterando la personalidad, verbosidad y modo crítico del LLM automáticamente para cada tarea (ej: El prompt de un Personaje vs un Capítulo).

### 7.7 Asistencia AI, Streaming Constante y Consentimiento
Filosofía ARIS (Autonomía Informada):
- Generación y brainstorming en la página DEBE hacerse visible como caracteres fluyendo en tiempo real (SSE/Streaming Streams).
- "God Level Feature": Mandos nativos tácticos `AbortController` visibles para cancelar locuras LLM sin penalización UX ni facturación API inútil.
- IA expone sus sugerencias de modificación de base de datos como pre-validaciones modales; el Humano es quien decide inyectarlo o ignorarlo.

### 7.8 Invocación de Red Neuronal Textual (`{{}}`)
- Input instantáneo `{{` muestra Hover-Lists predictivas con auto-filtrado FTS ultra-liviano.
- Semántica Oculta: Detrás del texto "Jon Nieve" se almacena una etiqueta formal {Entity_Id}. Previene rupturas en el canon sí "Jon" se renombra a "Aegon".
- Ctrl-Click o Click contextual viaja a destino sin trabas visuales. 

### 7.9 Conexiones Visceral (Mapeo Gráfico)
Lienzo que materializa la estructura abstracta. Relaciones de bases de datos expuestas visualmente, permitiendo arrastrar líneas para "vincular". Deben clusterizarse de forma elegante según su tipología de tab.

### 7.10 Assets e Inspiraciones Híbridas
Arrastrar y soltar un PNG/JPG sobre la entidad engendra una entrada transparente local. La interface expone el FilePath y asiste como MoodBoards in-app nativos.

### 7.11 Motor del Tiempo Reversible (Changes)
Se modela un historial a prueba de balas (Event-Sourcing pattern primitivo) de cambios granulares, previniendo accidentes mayúsculos e inspirando tranquilidad creativa en el usuario y su IA.

### 7.12 Indexado Multicapa Asíncrono
SQLite embebido procesando los miles de registros pasados desde UI; Búsquedas por Body text, alias, etiquetas corren a 60FPS porque el CPU del UI thread nunca las digiere directamente.

## 8. Requerimientos Funcionales (Hitos)
- **RF-01 / RF-06:** Configuración Provider en UI, y vinculación de Prompts a los distintos contextos del árbol de proyectos.
- **RF-07 / RF-09:** Redacciones continuas y linkeos `{{}}`. El teclado domina las interacciones principales en estado "Zen".
- **RF-10 / RF-12:** Visualización relacional (Grafo) e inmersión Time-Travel al historial sin salir del editor.
- **RF-14:** Pre-check Humano obligatorio para todo efecto secundario AI que modifique la base de datos de manera radical.

## 9. Requerimientos No Funcionales (Core ARIS)
- **RNF-01 / RNF-04**: Compatibilidad con sistema UUID listos para Sync-Local y empaquetado seguro en Contenedores OS Native sin librerías Node dependientes que bloqueen portabilidad estática Web-First.
- **RNF-07 Rendimiento (Latencia Zero / Off Main-Thread)**: Imposición estricta arquitectural: Parseos, FTS5 y BBDD jamás paralizan el Hilo UI Visual.
- **RNF-08 Ergonomía Design Tokens**: Interfaz fundamentada en un conjunto de variables limitadas "Midnight & Parchment". Transiciones cálidas que cuiden el balance visual.
