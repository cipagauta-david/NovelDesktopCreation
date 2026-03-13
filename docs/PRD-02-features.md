# PRD Formal — NovelDesktopCreation (Parte 2: Funciones IA y UX)

## 7. Alcance funcional (continuación)

### 7.6 IA contextual por colección
Cada colección/tab define un perfil de prompt (tono, profundidad, criticidad y límites) para adaptar el comportamiento del modelo al tipo de tarea narrativa.

### 7.7 Asistencia IA con streaming y consentimiento
Toda salida IA debe:
- renderizarse token a token,
- ofrecer control de cancelación visible,
- requerir validación humana para cambios con efecto persistente en datos.

### 7.8 Referencias inteligentes `{{}}`
Al escribir `{{`, la UI muestra sugerencias de entidades locales indexadas. Al confirmar, se guarda un enlace estable por identificador interno y se presenta texto legible en editor.

### 7.9 Vista de grafo relacional
Visualización de entidades y relaciones con agrupación por colección, navegación rápida y edición básica de vínculos.

### 7.10 Gestión de assets
Soporte de arrastrar/soltar archivos de imagen sobre una entidad, con registro local y trazabilidad del recurso dentro del proyecto.

### 7.11 Historial reversible
Registro append-only de cambios de contenido y metadatos para undo/redo, auditoría y futuras capacidades de sincronización.

### 7.12 Indexado asíncrono multicapa
Indexación y búsqueda en background sobre título, aliases, contenido y etiquetas sin bloquear la interacción del editor.

## 8. Requerimientos funcionales (RF)

### 8.1 Configuración y contexto IA
- **RF-01**: El usuario puede configurar proveedor, modelo y clave desde UI.
- **RF-02**: El sistema permite múltiples proveedores seleccionables por proyecto.
- **RF-03**: Cada colección puede asociar un perfil de prompt específico.

### 8.2 Edición y referencias narrativas
- **RF-04**: El editor soporta redacción continua orientada a teclado.
- **RF-05**: El patrón `{{` abre un buscador contextual de entidades.
- **RF-06**: La referencia insertada conserva vínculo estable aunque cambie el título visible.
- **RF-07**: El usuario puede navegar a la entidad referenciada con una interacción directa.

### 8.3 IA asistida controlada
- **RF-08**: Toda generación se muestra por streaming incremental.
- **RF-09**: Debe existir acción explícita para abortar generación en curso.
- **RF-10**: Propuestas IA con impacto persistente exigen confirmación previa.

### 8.4 Visualización y trazabilidad
- **RF-11**: El sistema ofrece vista de grafo de relaciones.
- **RF-12**: El usuario puede inspeccionar historial de cambios sin abandonar el contexto de edición.
- **RF-13**: El sistema permite adjuntar y consultar assets por entidad.

## 9. Requerimientos no funcionales (RNF)
- **RNF-01 Local-first**: El producto debe operar sin conexión para escritura, búsqueda y navegación de proyecto local.
- **RNF-02 Rendimiento UI**: Interacciones primarias del editor no deben presentar bloqueos perceptibles por tareas de indexación o persistencia.
- **RNF-03 Off-main-thread**: Indexado, consultas intensivas y persistencia se ejecutan fuera del hilo principal.
- **RNF-04 Portabilidad**: Estructura de proyecto autocontenida y transferible entre equipos.
- **RNF-05 Seguridad de claves**: Gestión de credenciales desde UI con almacenamiento protegido local.
- **RNF-06 Observabilidad**: Eventos críticos de IA, persistencia e indexación deben ser trazables para depuración.
- **RNF-07 Consistencia visual**: Uso estricto del sistema de tokens de diseño definido para legibilidad prolongada.

## 10. Criterios de aceptación (extracto MVP)
- **CA-01 (RF-05/06)**: Insertar referencia con `{{` en menos de 3 pasos de teclado y mantener el vínculo tras renombrar la entidad destino.
- **CA-02 (RF-08/09)**: Iniciar generación IA y detenerla con acción de cancelación visible sin congelar la UI.
- **CA-03 (RF-10)**: Ningún cambio persistente sugerido por IA se aplica sin confirmación explícita del usuario.
- **CA-04 (RNF-03)**: Durante indexación masiva, la edición de texto sigue disponible sin bloqueo total del editor.
