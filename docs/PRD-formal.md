# PRD Formal — NovelDesktopCreation

## 1. Resumen ejecutivo
NovelDesktopCreation es una aplicación **web-first, local-first y preparada para desktop** enfocada en el planeamiento, estructuración, consulta y creación de historias asistidas por IA. El producto combina escritura narrativa, gestión de conocimiento, referencias cruzadas, visualización de grafos/corcho, soporte multimedia y asistentes configurables por contexto.

La propuesta está inspirada conceptualmente en herramientas de escritura y organización narrativa, pero busca construir una identidad propia basada en:
- organización por colecciones (tabs) y entidades,
- navegación relacional tipo Zettelkasten,
- visualización tipo grafo/board,
- búsqueda altamente optimizada,
- IA con múltiples proveedores,
- extensibilidad mediante skills/plugins,
- y persistencia local con futuro híbrido.

## 2. Objetivo del producto
Construir un workspace narrativo inteligente que permita a escritores, worldbuilders y diseñadores narrativos crear historias como una red viva de conocimiento, donde cada personaje, capítulo, lugar, evento o regla del mundo pueda consultarse, relacionarse, visualizarse y expandirse con ayuda de IA.

## 3. Problema que resuelve
Los autores suelen repartir su proceso creativo entre múltiples herramientas: documentos para capítulos, notas sueltas para ideas, tableros visuales para inspiración, chats con IA para brainstorming y wikis improvisadas para mantener continuidad. Esto genera:
- fragmentación del conocimiento,
- pérdida de contexto,
- dificultad para encontrar información,
- inconsistencias narrativas,
- baja trazabilidad del proceso creativo,
- y escasa reutilización estructurada de la IA.

NovelDesktopCreation busca unificar ese flujo en una sola plataforma coherente.

## 4. Usuario objetivo
### Usuario principal
- Escritores de novelas y ficción serial.
- Autores que necesitan combinar escritura larga con worldbuilding.
- Usuarios que quieren aprovechar IA sin perder control estructural.

### Usuarios secundarios
- Guionistas.
- Creadores de campañas de rol.
- Diseñadores narrativos de videojuegos.
- Creadores de cómics y universos transmedia.

## 5. Visión del producto
Crear una herramienta donde la historia no sea solo texto lineal, sino un sistema de conocimiento conectado. La aplicación debe sentirse como una mezcla entre editor narrativo, base de conocimiento, tablero visual y copiloto creativo.

## 6. Principios del producto
1. **Local-first**: el producto debe funcionar localmente desde el inicio.
2. **Web-first, desktop-ready**: interfaz web con arquitectura lista para empaquetado desktop.
3. **IA configurable**: múltiples proveedores, modelos y claves configurados por UI, sin `.env` obligatorio.
4. **Equilibrio 50/50**: tanto escritura como organización/lore tienen igual prioridad.
5. **Autonomía con confirmación**: la IA puede sugerir y preparar acciones, pero las acciones estructurales se confirman.
6. **Búsqueda como infraestructura central**: encontrar información debe ser extremadamente rápido y confiable.
7. **Extensibilidad**: el sistema debe prepararse para skills/plugins comunitarios.
8. **Historial preciso**: cada cambio relevante debe ser trazable.

## 7. Alcance funcional
### 7.1 Configuración inicial
Al ejecutar la app, el sistema debe abrir una experiencia guiada en navegador para:
- configurar API keys,
- elegir proveedores,
- seleccionar modelos por tarea,
- guardar preferencias de uso,
- y dejar el sistema listo sin editar archivos `.env`.

### 7.2 Proyectos narrativos
El usuario puede crear proyectos nuevos. Cada proyecto puede incluir tabs iniciales como:
- Capítulos,
- Personajes,
- Escenarios,
- Historia/Contexto,
- Lógica del mundo.

El usuario además puede crear nuevas tabs personalizadas.

### 7.3 Tabs como colecciones
Una tab representa una colección de entidades. La UI esperada es:
- tabs en la parte superior,
- lista de entidades de la colección en un panel lateral,
- y al abrir una entidad se despliega su documento editable.

### 7.4 Entidades
Cada entidad puede representar un personaje, capítulo, lugar, evento, facción, sistema económico, regla del mundo u otro concepto. Debe soportar:
- título,
- contenido largo,
- fields estructurados,
- multimedia,
- relaciones,
- historial,
- plantillas,
- y metadatos.

### 7.5 Templates
El sistema debe permitir crear y guardar templates reutilizables para:
- personajes,
- capítulos,
- ciudades,
- sistemas de magia,
- conflictos,
- u otros tipos de entidad.

### 7.6 IA contextual por tab
Cada tab puede tener su propio system prompt personalizable y persistente. Esto permite que la IA tenga comportamientos distintos según contexto.

### 7.7 Escritura asistida
La IA puede:
- expandir ideas,
- redactar secciones,
- resumir,
- reescribir,
- detectar vacíos,
- extraer entidades,
- sugerir fields,
- y proponer nuevas notas o tabs.

Cualquier acción estructural importante debe pedir confirmación al usuario.

### 7.8 Referencias cruzadas con `{{}}`
Al escribir `{{...}}`, el sistema debe:
- sugerir títulos, tarjetas o entidades relacionadas,
- filtrar entidades de otras tabs,
- insertar una referencia enlazada.

Reglas de interacción:
- **click normal**: comportamiento normal de edición del texto,
- **Ctrl + click**: navegar a la entidad enlazada,
- **hover**: mostrar un panel de preview contextual.

### 7.9 Grafo / board visual
Debe existir una visualización tipo grafo/corcho donde el usuario pueda:
- ver entidades como nodos,
- explorar relaciones,
- detectar clusters,
- y navegar visualmente por el universo narrativo.

### 7.10 Multimedia avanzada
Las entidades deben soportar inserción avanzada de multimedia:
- drag & drop de imágenes,
- referencias visuales,
- contenido embebido,
- potencial soporte de video,
- paneles de inspiración estilo Notion.

### 7.11 Historial preciso
Cada proyecto y cada entidad deben tener historial detallado de:
- creación,
- edición,
- cambios en fields,
- relaciones,
- templates,
- acciones de IA,
- y restauración/comparación de versiones.

### 7.12 Búsqueda optimizada
El sistema debe priorizar búsqueda por:
- título,
- contenido,
- fields,
- tags,
- aliases,
- relaciones,
- backlinks,
- y posteriormente búsqueda semántica.

## 8. Requerimientos funcionales
### RF-01 Onboarding
La app debe guiar la configuración inicial de proveedor, API keys y modelos desde UI.

### RF-02 Gestión de proyectos
La app debe permitir crear, abrir y administrar múltiples proyectos narrativos.

### RF-03 Gestión de tabs
La app debe permitir crear, editar, reordenar y eliminar tabs/colecciones.

### RF-04 Gestión de entidades
La app debe permitir crear, editar, duplicar, archivar y eliminar entidades.

### RF-05 Templates
La app debe permitir guardar y aplicar templates de entidad y colección.

### RF-06 IA contextual
La app debe permitir asignar prompts distintos por tab o contexto.

### RF-07 Referencias enlazadas
La app debe soportar autocompletado y navegación de referencias mediante `{{}}`.

### RF-08 Preview contextual
La app debe mostrar preview contextual de una referencia al hacer hover.

### RF-09 Navegación segura
La app debe navegar a la entidad enlazada solo con **Ctrl + click**, para no interferir con edición normal.

### RF-10 Historial
La app debe registrar cambios con suficiente granularidad para inspección y restauración.

### RF-11 Búsqueda
La app debe ofrecer búsqueda rápida y precisa a nivel de proyecto.

### RF-12 Vista visual
La app debe incluir al menos una primera versión de vista grafo/board.

### RF-13 Multimedia
La app debe soportar drag & drop de assets y referencias visuales dentro de entidades.

### RF-14 Confirmación de acciones IA
La IA debe pedir confirmación antes de crear tabs, entidades, fields o cambios estructurales relevantes.

### RF-15 Extensibilidad
La arquitectura debe reservar un mecanismo para skills/plugins futuros.

## 9. Requerimientos no funcionales
### RNF-01 Escalabilidad conceptual
La arquitectura debe soportar crecimiento a colaboración, sincronización híbrida y plugins.

### RNF-02 Rendimiento de búsqueda
La búsqueda debe ser una capacidad de alto rendimiento incluso con proyectos grandes.

### RNF-03 Persistencia local confiable
Los datos deben almacenarse localmente de forma robusta y recuperable.

### RNF-04 Portabilidad
La base del producto debe poder ejecutarse luego como desktop sin reescritura mayor.

### RNF-05 Seguridad de secretos
Las claves/API keys deben guardarse de forma segura para el contexto local.

### RNF-06 Observabilidad del cambio
La trazabilidad de cambios debe facilitar debugging y restauración.

## 10. Restricciones iniciales
- En la primera etapa, la persistencia será local.
- La arquitectura debe quedar preparada para sincronización híbrida futura.
- Se debe evitar dependencia inicial en `.env` para configuración de usuario final.
- El sistema debe ser extensible sin rediseño total posterior.

## 11. Riesgos principales
1. Ambición excesiva del editor.
2. Complejidad de búsqueda e indexación.
3. Dificultad de historial granular con buen rendimiento.
4. Complejidad de una UX rica sin perder claridad.
5. Riesgo de acoplar demasiado la IA al modelo de datos.
6. Complejidad de multimedia avanzada en entorno local-first.

## 12. MVP sugerido
El MVP debe incluir:
- onboarding inicial,
- configuración de proveedores/modelos,
- creación de proyectos,
- tabs iniciales y personalizadas,
- entidades con documento editable,
- templates básicos,
- prompts por tab,
- búsqueda textual sólida,
- referencias `{{}}`,
- hover preview,
- Ctrl + click para navegación,
- historial por entidad,
- drag & drop de imágenes,
- y una primera vista de grafo.

## 13. Roadmap sugerido
### Fase 1
- núcleo local-first,
- proyectos,
- tabs,
- entidades,
- editor,
- prompts,
- búsqueda,
- historial,
- referencias.

### Fase 2
- relaciones tipadas,
- grafo interactivo,
- multimedia robusta,
- paneles contextuales.

### Fase 3
- detección de inconsistencias,
- timeline,
- búsqueda semántica,
- memoria narrativa refinada.

### Fase 4
- sync híbrido,
- colaboración,
- marketplace o sistema abierto de skills/plugins,
- exportadores especializados.

## 14. Criterios de aceptación iniciales
- El usuario puede crear un proyecto y navegar entre tabs.
- El usuario puede crear entidades dentro de tabs.
- El usuario puede editar una entidad con contenido y fields.
- El usuario puede definir prompts por tab.
- El usuario puede invocar referencias con `{{}}`.
- Un hover muestra preview contextual.
- Solo **Ctrl + click** navega a otra entidad.
- La búsqueda devuelve resultados relevantes y rápidos.
- El historial registra cambios de manera visible.
- La IA puede proponer cambios y solicitar confirmación.

## 15. Preguntas abiertas
- ¿Editor por bloques, markdown enriquecido o híbrido?
- ¿Qué estrategia exacta de indexación local se usará?
- ¿Cómo se modelarán los fields dinámicos?
- ¿Cuál será el formato interno de plugins/skills?
- ¿Cómo se resolverán conflictos en futura colaboración?
- ¿Qué nivel de tipado tendrán las relaciones?
- ¿Cómo sepersistirán assets multimedia a escala?