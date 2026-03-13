# PRD Formal — NovelDesktopCreation (Parte 1: Visión y Concepto)

## 1. Resumen ejecutivo
NovelDesktopCreation es una aplicación narrativa **web-first, local-first y desktop-ready** para planear, escribir y mantener consistencia de historias largas con apoyo de IA. El producto unifica escritura, conocimiento de mundo, referencias cruzadas y visualización relacional en una sola experiencia continua.

## 2. Objetivo del producto
Construir un workspace narrativo donde cada capítulo, personaje, lugar o regla del mundo sea editable, consultable y relacionable sin fricción, con asistencia de IA controlada por el usuario.

## 3. Problema que resuelve
Los escritores suelen operar con documentos y herramientas separadas (texto, notas, mapas, asistentes IA), lo que genera:
- pérdida de contexto entre sesiones,
- inconsistencias de canon,
- interrupciones del flujo creativo,
- retrabajo para validar continuidad narrativa.

NovelDesktopCreation centraliza este flujo en una plataforma única con búsqueda estructural y operaciones optimistas.

## 4. Usuarios objetivo
### 4.1 Usuario principal
Escritores de novela y ficción serial con alto volumen de contenido y worldbuilding profundo, sensibles a cualquier interrupción de flujo.

### 4.2 Usuarios secundarios
Guionistas, narrative designers y world builders profesionales.

## 5. Visión del producto
Evolucionar de un texto lineal a un sistema narrativo relacional: cada entidad se conecta con otras y permanece trazable en el tiempo. La experiencia debe sentirse como un editor rápido, una base de conocimiento y un asistente IA en un único entorno.

## 6. Principios del producto (Filosofía ARIS)
1. **Latencia percibida mínima**: la interfaz reacciona en tiempo de interacción y delega procesos pesados al fondo.
2. **Revelación progresiva**: modo de trabajo limpio por defecto (Zen) y controles avanzados bajo demanda (God).
3. **Local-first real**: operación sin red como comportamiento base.
4. **Web-first con ruta a desktop**: arquitectura preparada para empaquetado nativo sin rediseño mayor.
5. **IA en streaming y abortable**: toda generación llega por flujo incremental y puede detenerse de inmediato.
6. **Configuración de proveedores vía UI**: claves y perfiles gestionables sin depender de `.env`.
7. **Paridad entre narrativa y lore**: mismo nivel de edición, búsqueda y navegación.
8. **Separación de hilos**: indexación y búsqueda fuera del hilo principal.
9. **Historial inmutable de cambios**: base para undo robusto, auditoría y evolución a sincronización futura.

## 7. Alcance funcional inicial (MVP)
### 7.1 Onboarding operativo
Pantalla para configurar proveedor IA, modelo por defecto y directiva inicial de proyecto.

### 7.2 Proyecto autocontenido
Un proyecto se guarda como unidad transferible que incluye contenido, metadatos, assets y configuración.

### 7.3 Navegación por colecciones (tabs)
Colecciones tipadas (por ejemplo, Personajes, Capítulos, Lugares) con acceso rápido entre entidades.

### 7.4 Entidad narrativa
Unidad atómica con:
- identificador estable,
- título,
- metadatos tipados,
- relaciones,
- bloque de contenido editable continuo.

### 7.5 Plantillas reutilizables
Templates para crear entidades con estructura predefinida (por ejemplo, Facción, Artefacto).

## 8. Criterios de éxito de producto (MVP)
- Crear un proyecto nuevo y editar su primera entidad en menos de 2 minutos.
- Navegar entre 3 colecciones sin pérdida de contexto de edición.
- Resolver referencias de entidades desde el editor sin abandonar el flujo de escritura.
- Cancelar una generación IA en curso en menos de 200 ms desde la acción del usuario.

## 9. Fuera de alcance (MVP)
- Colaboración en tiempo real multiusuario.
- Sincronización cloud nativa.
- Marketplace de plugins.
- Automatizaciones IA con escritura persistente sin confirmación humana.
