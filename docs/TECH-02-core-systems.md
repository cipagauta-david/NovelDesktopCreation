# Arquitectura Técnica Inicial — NovelDesktopCreation (Parte 2: Sistemas Core)

## 5. Estado y persistencia

### 5.1 Contrato transaccional
La UI envía intents al worker (por ejemplo, `CREATE_ENTITY`, `UPDATE_CONTENT`, `SEARCH_QUERY`). El worker ejecuta la transacción, confirma el resultado y publica eventos de sincronización.

Resultado esperado por operación:
- `ack` con payload canónico cuando aplica,
- `error` estructurado con código, mensaje y contexto recuperable,
- `event` para actualización de índices y vistas derivadas.

### 5.2 Estructura mínima del store local
- datos canónicos de proyecto y entidades,
- índices de búsqueda,
- registro append-only de cambios,
- referencias a assets,
- almacenamiento protegido de configuración sensible.

## 6. Sistema de indexación y búsqueda

### 6.1 Cobertura de indexación
Campos iniciales:
- título,
- aliases,
- contenido principal,
- etiquetas/metadatos relevantes.

### 6.2 Reglas operativas
- indexación incremental en background,
- consultas no bloqueantes para UI,
- invalidación controlada tras cambios de contenido,
- diseño extensible para incorporación futura de embeddings.

## 7. Sistema de referencias `{{}}`

### 7.1 Flujo funcional
1. El editor detecta trigger `{{`.
2. Solicita sugerencias al índice local.
3. Inserta referencia con etiqueta visible + identificador estable.
4. En navegación, resuelve por ID y no por texto visible.

### 7.2 Garantías
- estabilidad ante renombrado de entidades,
- serialización portable,
- degradación controlada si el destino no existe.

## 8. Sistema de IA y control de ejecución

### 8.1 Arquitectura por capas
`Provider Adapter` → `Prompt Assembler` → `Streaming Pipeline` → `UI Renderer`.

### 8.2 Reglas obligatorias
- salida incremental token a token,
- cancelación explícita mediante controlador de aborto,
- timeout y manejo de errores normalizados por proveedor,
- aprobación humana para aplicar cambios persistentes sugeridos por IA.

## 9. Modelo editorial canónico
- representación canónica serializable y estable,
- proyección de UI rica desacoplada del formato persistido,
- compatibilidad con transformaciones futuras sin romper datos históricos.

## 10. Sistema de assets
- importación local de binarios por entidad,
- trazabilidad de ruta/identificador dentro del proyecto,
- políticas de copia/exportación para mantener portabilidad del workspace.

## 11. Estado de implementación (2026-03-12)

Checks completados en este hito:

1. **Sync offline-first + merge strategy + base CRDT**
	- Se implementó un motor de sincronización local con cola offline y merge LWW por entidad/proyecto.
	- Base CRDT aplicada mediante unión por ID + resolución de conflicto por `updatedAt`.

2. **Vault cifrado para credenciales IA**
	- `apiKey` ya no forma parte del estado persistido.
	- Se añadió vault local cifrado (AES-GCM vía WebCrypto) para guardar/leer claves por proveedor.

3. **Platform Adapter formal (web/desktop)**
	- Se desacopló acceso a filesystem (import/export) y storage de estado (worker) mediante adapters.
	- Runtime web usa APIs del navegador; runtime desktop queda preparado para bridge nativo.

4. **Contrato de integridad import/export**
	- Export incluye `version`, `checksumAlgorithm` y `checksum` SHA-256 del proyecto.
	- Import valida versión y checksum antes de aceptar contenido.

5. **Sistema base de plugins/skills con capabilities**
	- Se incorporó `PluginManager` con registro/ejecución.
	- Sandbox por permisos: `workspace:read` y `workspace:write` con contexto congelado para lectura.
