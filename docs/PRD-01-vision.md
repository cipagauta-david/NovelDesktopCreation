# PRD Formal — NovelDesktopCreation (Part 1: Visión y Concepto)

## 1. Resumen ejecutivo
NovelDesktopCreation es una aplicación **web-first, local-first y preparada para desktop** enfocada en el planeamiento, estructuración, consulta y creación de historias asistidas por IA. Combinando escritura narrativa, gestión de conocimiento, referencias cruzadas, visualización interactiva y asistentes configurables.

## 2. Objetivo del producto
Construir un workspace narrativo inteligente donde cada personaje, capítulo, lugar o regla del mundo pueda consultarse, relacionarse y expandirse con fluidez total y asistencia de IA.

## 3. Problema que resuelve
Resuelve la fragmentación del conocimiento creativo, pérdida de contexto e inconsistencias narrativas surgidas de usar múltiples herramientas dispersas, unificando el flujo en una sola plataforma cohesionada impulsada por UX de alta performance.

## 4. Usuario objetivo
**Principal**: Escritores de novelas y ficción serial que combinan narrativa extensa con worldbuilding profundo. Creadores con muy baja tolerancia a la interrupción de su "Flow State".
**Secundarios**: Guionistas, diseñadores narrativos y World Builders profesionales.

## 5. Visión del producto
Transformar la historia de un texto lineal a un sistema orgánico y relacional de bases indexadas. Se sentirá como un editor de alto rendimiento, cruzado con un zettelkasten, infundido con un diseño impecable de UI, asistido por "compañeros IA" instantáneos.

## 6. Principios del producto (Filosofía ARIS)
1. **Latencia Cero y UI Optimista**: El escritor jamás debe percibir demoras por I/O. La UI reacciona en paralelo al instante.
2. **Revelación Progresiva (Zen & God Mode)**: Ocultar el ruido de la metadata hasta que sea activamente requerido por el usuario, evitando sobrecarga cognitiva.
3. **Local-first**: Estabilidad, soberanía de la información, nulos problemas de red como default inicial.
4. **Web-first, desktop-ready**: Desarrollo ágil web-stack preparado para empaquetado nativo (Desktop OS).
5. **IA como Río, no como Bloque**: Resoluciones de generación vía streams (Token-by-token) siempre abortables y regulables en velocidad.
6. **Múltiples Proveedores Híbridos UI**: Configuración limpia y directa desde opciones visuales y no variables crípticas `.env`.
7. **Equilibrio Narrativa y Lore**: Tienen la misma jerarquía de priorización y facilidad de lectura/edición.
8. **Thread Separation en Búsqueda**: Sub-hilos resolviendo FTS (Full Text Search) en el Background; "0" freezing de pantalla principal.
9. **Event Sourcing Base**: Reversibilidad absoluta (Undo robusto para "Alucinaciones") que permita experimentar con seguridad total.

## 7. Alcance funcional (Core Inicial)
### 7.1 UX de Arranque (Onboarding)
Interfaz para definir modelos y directivas iniciales.

### 7.2 Proyectos Universales Autocontenidos
El Workspace asume bases de datos, recursos media y metadatos alojados nativamente en un mismo directorio transferible (folder). 

### 7.3 Vistas Híbridas (Tabs)
Colecciones tipadas en base de datos expuestas en UI como divisiones modulares que permiten saltar de un "Personaje" al "Capítulo" velozmente.

### 7.4 Anatomía de la Entidad
Nodo atómico narrativo: Atributos (`id`, `title`, `metadata-fields`, `relations`) fusionados a un editor continuo de contenido (`text block`).

### 7.5 Matrices/Templates
Formatos guardados ("Facciones", "Artefactos") listos para hidratar nuevas Entidades.
