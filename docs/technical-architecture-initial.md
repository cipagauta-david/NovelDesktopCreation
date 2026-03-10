# Arquitectura Técnica Inicial — NovelDesktopCreation

## 1. Objetivo arquitectónico
NovelDesktopCreation debe construirse como una plataforma **web-first, local-first y desktop-ready** para planeamiento, estructuración y creación de historias asistidas por IA. La arquitectura debe priorizar:
- modularidad,
- extensibilidad,
- búsqueda rápida,
- trazabilidad de cambios,
- persistencia local confiable,
- y preparación para sincronización híbrida, colaboración y plugins en el futuro.

## 2. Principios técnicos
1. **Local-first desde el día uno**: el sistema debe operar sin backend obligatorio.
2. **Modelo de dominio antes que framework**: las decisiones de UI o librerías no deben romper el núcleo del dominio.
3. **Separación por capas**: UI, aplicación, dominio, persistencia, búsqueda, IA y extensibilidad deben estar desacopladas.
4. **Extensible por diseño**: skills/plugins futuros deben integrarse sin rediseñar el core.
5. **Historial como capacidad nativa**: no como feature añadida al final.
6. **Búsqueda como infraestructura central**: no como simple filtro de listas.
7. **Preparada para desktop**: el runtime web debe poder empaquetarse posteriormente sin grandes cambios.
8. **Preparada para nube híbrida**: IDs, operaciones y modelo de cambios deben ser compatibles con sync futura.

## 3. Vista arquitectónica de alto nivel
Se propone una arquitectura en capas:

### 3.1 Capa de presentación
Responsable de:
- layout principal,
- tabs,
- panel de entidades,
- editor,
- paneles contextuales,
- grafo/board,
- configuración,
- búsquedas,
- diálogos de confirmación para acciones de IA.

### 3.2 Capa de aplicación
Coordina casos de uso, por ejemplo:
- crear proyecto,
- crear entidad,
- aplicar template,
- actualizar fields,
- invocar IA,
- confirmar acciones,
- registrar historial,
- reindexar búsqueda,
- resolver referencias.

### 3.3 Capa de dominio
Define las entidades y reglas principales del negocio:
- Project,
- CollectionTab,
- Entity,
- Template,
- FieldDefinition,
- Relation,
- PromptProfile,
- Asset,
- ChangeEvent,
- SearchIndexEntry,
- SkillDefinition.

### 3.4 Capa de infraestructura local
Implementa:
- persistencia,
- indexación,
- almacenamiento de assets,
- gestión de secretos locales,
- adaptadores de IA,
- serialización/exportación,
- logging interno.

### 3.5 Capa futura de sincronización
No es obligatoria al inicio, pero debe poder añadirse luego para:
- sync híbrido,
- colaboración,
- publicación remota de assets,
- perfiles compartidos,
- plugins distribuidos.

## 4. Modelo de dominio inicial
### 4.1 Project
Representa el contenedor raíz.

Campos sugeridos:
- `id`
- `name`
- `description`
- `createdAt`
- `updatedAt`
- `settings`
- `defaultModelConfig`
- `rootCollections[]`
- `assetsRoot`
- `historyConfig`

### 4.2 CollectionTab
Representa una colección lógica visible como tab.

Campos sugeridos:
- `id`
- `projectId`
- `name`
- `slug`
- `icon`
- `description`
- `entityType`
- `templateIds[]`
- `promptProfileId`
- `fieldDefinitions[]`
- `sortConfig`
- `viewConfig`
- `createdAt`
- `updatedAt`

### 4.3 Entity
Unidad base del sistema.

Campos sugeridos:
- `id`
- `projectId`
- `collectionId`
- `title`
- `slug`
- `aliases[]`
- `status`
- `tags[]`
- `templateId`
- `fields`
- `content`
- `relations[]`
- `assetRefs[]`
- `backlinks[]` derivables
- `createdAt`
- `updatedAt`
- `archivedAt`
- `version`

### 4.4 Template
Plantilla reusable para entidades o colecciones.

Campos sugeridos:
- `id`
- `projectId`
- `name`
- `scope` (`entity` | `collection`)
- `targetType`
- `fieldSchema`
- `defaultContent`
- `uiLayout`
- `createdAt`
- `updatedAt`

### 4.5 PromptProfile
Configura comportamiento de IA por tab o contexto.

Campos sugeridos:
- `id`
- `projectId`
- `name`
- `scope`
- `systemPrompt`
- `modelPreferences`
- `toolPolicy`
- `confirmationPolicy`
- `createdAt`
- `updatedAt`

### 4.6 Relation
Relación entre entidades.

Campos sugeridos:
- `id`
- `projectId`
- `sourceEntityId`
- `targetEntityId`
- `type`
- `label`
- `directionality`
- `metadata`
- `createdAt`
- `updatedAt`

### 4.7 Asset
Representa archivos multimedia.

Campos sugeridos:
- `id`
- `projectId`
- `entityId`
- `kind`
- `mimeType`
- `storagePath`
- `previewPath`
- `metadata`
- `createdAt`

### 4.8 ChangeEvent
Registro granular para historial.

Campos sugeridos:
- `id`
- `projectId`
- `entityType`
- `entityId`
- `operation`
- `payloadBefore`
- `payloadAfter`
- `actorType` (`user` | `ai` | `system`)
- `actorId`
- `timestamp`
- `sessionId`
- `correlationId`

### 4.9 SkillDefinition
Abstracción para extensibilidad futura.

Campos sugeridos:
- `id`
- `name`
- `version`
- `description`
- `entrypoint`
- `capabilities[]`
- `permissions[]`
- `uiHooks[]`
- `createdAt`

## 5. Persistencia local inicial
Se recomienda una estrategia local-first con separación entre:
- documentos del proyecto,
- índices derivados,
- assets binarios,
- configuración sensible,
- historial de operaciones.

### 5.1 Estructura sugerida
- **Store principal** para proyectos, tabs, entidades, templates, prompts y relaciones.
- **Store de historial** para ChangeEvents.
- **Store de búsqueda** para índices invertidos y metadatos de recuperación.
- **Storage de assets** para imágenes, videos u otros binarios.
- **Vault seguro local** para API keys.

### 5.2 Recomendación conceptual
Usar un modelo documental para los objetos principales, complementado con índices secundarios para:
- búsqueda textual,
- backlinks,
- filtros,
- relaciones,
- vistas de grafo.

## 6. Estrategia de búsqueda
La búsqueda es una prioridad arquitectónica.

### 6.1 Capacidades mínimas
- búsqueda por título,
- búsqueda full-text en contenido,
- búsqueda por aliases,
- búsqueda por tags,
- búsqueda por fields,
- filtros por colección,
- búsqueda para referencias `{{}}`.

### 6.2 Índices sugeridos
Mantener un índice local derivado con:
- `entityId`
- `titleTokens`
- `aliasTokens`
- `contentTokens`
- `fieldTokens`
- `tagTokens`
- `collectionId`
- `entityType`
- `rankSignals`

### 6.3 Evolución futura
La arquitectura debe permitir agregar después:
- búsqueda semántica,
- embeddings locales o híbridos,
- recuperación contextual para IA,
- ranking basado en uso/recencia/relación.

## 7. Resolución de referencias `{{}}`
Debe existir un subsistema especializado para referencias internas.

### 7.1 Flujo esperado
1. El editor detecta `{{`.
2. Se abre un buscador contextual.
3. El sistema consulta índice local.
4. El usuario selecciona una entidad.
5. Se inserta una referencia estructurada.
6. Hover muestra preview.
7. **Ctrl + click** navega a la entidad.
8. Click normal mantiene comportamiento de edición.

### 7.2 Formato interno sugerido
No depender solo de texto plano. Internamente, la referencia debe guardar al menos:
- `entityId`
- `displayText`
- `collectionId` opcional
- `range` dentro del documento

Esto permite renombrados seguros y navegación estable.

## 8. Sistema de historial y versionado
El historial debe tratarse como capacidad central.

### 8.1 Requisitos
- granularidad suficiente para auditar cambios,
- trazabilidad de acciones de IA,
- restauración parcial o total,
- comparación entre versiones,
- agrupación por sesión o acción compuesta.

### 8.2 Estrategia sugerida
Registrar eventos de cambio en una bitácora append-only, y combinarla con snapshots ocasionales para recuperación eficiente.

### 8.3 Acciones a registrar
- crear/editar/eliminar entidades,
- cambios de fields,
- edición de contenido,
- cambios de relación,
- cambios de prompts,
- aplicación de templates,
- inserción/eliminación de referencias,
- acciones ejecutadas por IA.

## 9. Capa de IA multi-provider
El sistema debe abstraer proveedores para evitar acoplamiento.

### 9.1 Componentes sugeridos
- `ProviderRegistry`
- `ModelRegistry`
- `CredentialStore`
- `PromptAssembler`
- `ContextRetriever`
- `ActionProposalEngine`
- `ConfirmationOrchestrator`
- `GenerationService`

### 9.2 Responsabilidades
- registrar proveedores disponibles,
- seleccionar modelos por tarea,
- construir prompts por tab/contexto,
- recuperar contexto relevante del proyecto,
- proponer acciones estructurales,
- solicitar confirmación antes de ejecutar,
- registrar eventos de IA en historial.

### 9.3 Tipos de acción IA
- responder preguntas sobre el mundo,
- generar texto,
- resumir,
- extraer entidades,
- proponer fields,
- sugerir crear tab,
- sugerir crear nota,
- detectar vacíos e inconsistencias.

## 10. Editor y representación documental
La decisión exacta entre markdown enriquecido, editor por bloques o híbrido sigue abierta, pero la arquitectura debe soportar contenido estructurado.

### 10.1 Requisitos del editor
- texto rico,
- referencias internas,
- multimedia embebida,
- fields estructurados,
- hover preview,
- historial,
- edición segura sin romper navegación.

### 10.2 Recomendación inicial
Adoptar una representación de documento estructurado que permita serializar:
- bloques,
- texto inline,
- referencias,
- embeds,
- metadata.

## 11. Multimedia avanzada
El sistema debe soportar assets ricos desde fases tempranas.

### 11.1 Capacidades
- drag & drop,
- previews,
- referencias dentro del documento,
- reutilización en múltiples entidades,
- metadatos de inspiración.

### 11.2 Consideraciones técnicas
- deduplicación opcional,
- previews o thumbnails,
- rutas estables locales,
- estrategia futura de sincronización de binarios.

## 12. Vista de grafo / board
El grafo no debe depender de datos exclusivos de visualización; debe derivarse del modelo relacional.

### 12.1 Nodos
- entidades,
- opcionalmente colecciones,
- opcionalmente grupos temáticos.

### 12.2 Aristas
- relaciones explícitas,
- backlinks,
- menciones,
- referencias `{{}}`.

### 12.3 Requisitos
- filtros por tipo,
- navegación a entidad,
- clusters,
- performance aceptable en proyectos medianos.

## 13. Preparación para desktop
Como el producto será web-first pero desktop-ready, la arquitectura debe:
- evitar dependencias que bloqueen empaquetado,
- aislar acceso a filesystem,
- abstraer servicios nativos,
- facilitar empaquetado futuro en contenedor desktop.

## 14. Preparación para sync híbrida y colaboración
Aunque no se implemente al inicio, se recomienda diseñar desde ahora:
- IDs estables globales,
- change events bien definidos,
- separación entre estado base y operaciones,
- versionado por entidad,
- política futura de resolución de conflictos.

## 15. Sistema de skills/plugins
El sistema debe prever un contrato interno para extensiones.

### 15.1 Casos futuros
- exportación a Ren'Py,
- validadores narrativos,
- generadores de timeline,
- análisis de personajes,
- integraciones con otros formatos,
- asistentes por género.

### 15.2 Requisitos del contrato
- permisos explícitos,
- hooks controlados,
- acceso limitado a datos,
- versionado,
- aislamiento razonable,
- registro en historial de acciones relevantes.

## 16. Seguridad local
### 16.1 Secretos
Las API keys no deben depender del archivo `.env` del usuario final. Deben guardarse en almacenamiento local seguro o lo más seguro posible para el entorno.

### 16.2 Datos del proyecto
Deben existir mecanismos de:
- backup/export,
- recuperación,
- prevención de corrupción,
- validación básica de integridad.

## 17. Observabilidad y depuración
Se recomienda incluir desde temprano:
- logging interno estructurado,
- métricas locales básicas,
- rastreo de fallos de indexación,
- rastreo de acciones IA,
- herramientas de inspección de historial.

## 18. Riesgos técnicos abiertos
1. Definir un editor suficientemente flexible sin disparar complejidad.
2. Diseñar búsqueda local potente y mantenible.
3. Mantener historial granular sin degradar rendimiento.
4. Diseñar referencias `{{}}` robustas frente a renombrados y cambios.
5. Soportar multimedia avanzada en modo local-first.
6. Diseñar desde ahora para sync futura sin sobre-ingeniería prematura.
7. Crear un sistema de plugins seguro y útil.

## 19. Decisiones abiertas a aterrizar
- formato interno exacto del documento,
- motor local de persistencia,
- motor/indexador de búsqueda,
- estrategia de snapshots del historial,
- modelo exacto de relaciones tipadas,
- contrato inicial de skills/plugins,
- política de gestión de assets pesados,
- estrategia de empaquetado desktop.

## 20. Recomendación de siguiente paso
Antes de construir, conviene aterrizar en detalle:
1. el modelo de documento,
2. el modelo de búsqueda,
3. el modelo de historial,
4. y el contrato de extensibilidad.

Esas cuatro decisiones condicionarán gran parte del resto de la arquitectura.