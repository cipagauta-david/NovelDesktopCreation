# Esquema SQLite local (dinámico) — v1

## Objetivo
Definir una base local que soporte un dominio cambiante sin romper compatibilidad.

Estrategia aplicada:
- **Fuente canónica**: snapshot completo del workspace (lectura/escritura simple y robusta).
- **Proyección relacional**: tablas indexables para consultas rápidas en UI y analítica local.
- **Flexibilidad**: cada tabla conserva `data_json` para campos futuros sin migraciones urgentes.

## Tablas canónicas

### `workspace_snapshots`
- `snapshot_key` (PK)
- `schema_version`
- `state_json`
- `updated_at`

Uso: estado completo serializado por clave (`latest`).

### `app_state` (compat)
- `key` (PK)
- `value`
- `updated_at`

Uso: compatibilidad retroactiva con implementación previa.

### `schema_meta`
- `key` (PK)
- `value`
- `updated_at`

Uso: versión de esquema y metadatos de migración.

## Tablas derivadas (consulta rápida)

### Contexto global
- `workspace_kv(key PK, value_json, updated_at)`
  - keys actuales: `settings`, `active_pointer`, `sync_remote_config`, `sync_stats`.

### Dominio editorial
- `projects(id PK, name, description, created_at, updated_at, data_json)`
- `project_tabs(id PK, project_id, position, name, prompt, icon, data_json)`
- `entity_templates(id PK, project_id, name, description, fields_json, default_content, data_json)`
- `entities(id PK, project_id, tab_id, title, content, text_crdt_state, template_id, status, revision, updated_at, tags_json, aliases_json, data_json)`
- `entity_fields(id PK, entity_id, field_key, field_value, data_json)`
- `entity_assets(id PK, entity_id, name, mime_type, data_url, data_json)`
- `entity_history(id PK, entity_id, timestamp, actor_type, label, details, data_json)`
- `domain_relations(id PK, project_id, source_entity_id, target_entity_id, relation_type, label, created_at, updated_at, data_json)`
- `project_history(id PK, project_id, timestamp, actor_type, label, details, data_json)`
- `change_events(id PK, timestamp, actor_type, label, details, source, correlation_id, intent, project_id, tab_id, entity_id, data_json)`
- `graph_layout_positions(project_id, entity_id, x, y, PK(project_id, entity_id))`

### Observabilidad y sync
- `llm_traces(id PK, timestamp, correlation_id, provider, model, prompt_snippet, response_snippet, duration_ms, first_token_ms, token_estimate, status, error_detail, data_json)`
- `correlation_reports(correlation_id PK, intent, started_at, finished_at, status, events_json, data_json)`
- `sync_queue(id PK, enqueued_at, next_attempt_at, poisoned_at, item_json)`
- `sync_state(key PK, value_json, updated_at)`

### Índice FTS5
- `entities_fts(entity_id UNINDEXED, project_id UNINDEXED, title, aliases, tags, content)`
  - tokenización: `unicode61 remove_diacritics 2`
  - consulta principal: `MATCH` + `bm25` + `snippet`
  - mantenimiento: **incremental** por diff de entidades activas (upsert/delete), sin rebuild total por guardado.

## Índices
Se añadieron índices por:
- relaciones por `project_id`, `source_entity_id`, `target_entity_id`.
- entidades por `project_id`, `tab_id`, `status`, `updated_at`.
- eventos/trazas por `timestamp` y `correlation_id`.
- `sync_queue` por `next_attempt_at`.

## Patrón para proyecto dinámico
1. **Cambios rápidos de modelo**: añadir campo nuevo dentro de `data_json` primero.
2. **Promoción a columna**: cuando haya necesidad de query/filtro frecuente.
3. **Backfill incremental**: migración por lotes sin bloquear arranque.
4. **Compatibilidad**: mantener snapshot como contrato de carga para evitar roturas.

## Próximas evoluciones recomendadas
- Añadir FTS5 para `entities(title, content, aliases, tags)`.
- Migraciones numeradas (`schema_meta` + scripts idempotentes por versión).
