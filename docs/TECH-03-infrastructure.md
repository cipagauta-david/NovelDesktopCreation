# Arquitectura Técnica Inicial — NovelDesktopCreation (Parte 3: Infraestructura, Desktop y Escalado)

## 11. Infraestructura de visualización de grafo
- Render del grafo en tecnología apta para volumen (Canvas/WebGL según implementación).
- Cálculo de layout desacoplado de la UI cuando el volumen lo requiera.
- Actualización por lotes/debounce para evitar recomputación continua.
- Nodo y arista derivados de datos canónicos de entidades y relaciones.

## 12. Estrategia web-first y desktop-ready

### 12.1 Contrato de plataforma
La aplicación usa un adaptador de plataforma para filesystem, almacenamiento y capacidades nativas. El dominio no depende de APIs de un host específico.

### 12.2 Modo web
Fallback a almacenamiento web local compatible con operación offline.

### 12.3 Modo desktop
Uso de APIs nativas mediante adaptador equivalente (por ejemplo, runtimes desktop) sin alterar la lógica de negocio.

## 13. Ruta de escalado a sincronización futura
- El registro `ChangeEvent` actúa como base para reconciliación de cambios.
- El MVP conserva operación local; sincronización remota queda en fases posteriores.
- Se prioriza estabilidad del modelo de eventos antes de introducir CRDT o replicación.

## 14. Extensibilidad (skills/plugins)
- Definir superficie mínima de extensión post-MVP:
	- hooks de lectura de proyecto,
	- exportadores,
	- analizadores de consistencia.
- Mantener sandbox de capacidades para evitar acceso no controlado al núcleo de datos.

## 15. Seguridad y gestión de credenciales
- Configuración de claves y proveedores desde UI.
- Almacenamiento local protegido para secretos.
- Nunca exponer credenciales en logs, exports o trazas de error.

## 16. Pipeline recomendado de implementación
1. **Base asíncrona**: worker, IPC tipado y persistencia local.
2. **Experiencia de edición**: layout, tokens visuales, editor y navegación por tabs.
3. **Búsqueda y referencias**: índice local + `{{}}` estable por ID.
4. **IA controlada**: streaming, cancelación y validación humana de cambios persistentes.
5. **Grafo e historial**: visualización relacional e inspección de `ChangeEvent`.

## 17. Observabilidad y depuración
- Trazas separadas por dominio: UI, worker, IA, persistencia, indexación.
- Correlation ID por intent para seguir flujos end-to-end.
- Registro de errores recuperables con contexto suficiente para soporte.
- Métricas mínimas: latencia por operación, tasa de error y estado de indexación.
