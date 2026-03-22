# Sync Contract v2026-03-sync-v2

## Overview
El motor de sincronización utiliza una cola offline con operaciones idempotentes. Cada operación lleva un ID único generado con `uid('sync-op')` para garantizar idempotencia.

## Endpoint
- `POST /api/v2/sync/events`

## Headers
- `Content-Type: application/json`
- `X-Sync-Contract-Version: 2026-03-sync-v2`
- `Authorization: Bearer <token>`

## Request Format
```json
{
  "contractVersion": "2026-03-sync-v2",
  "workspaceId": "workspace-123",
  "operations": [
    {
      "id": "sync-op-abc123",
      "changeEventId": "change-1",
      "correlationId": "corr-xyz",
      "timestamp": "2026-03-12T12:00:00.000Z",
      "type": "entity.upsert",
      "projectId": "project-1",
      "entityId": "entity-1",
      "payload": {}
    }
  ]
}
```

## Response Format
```json
{
  "acceptedOperationIds": ["sync-op-abc123"],
  "state": {}
}
```

## Operation Types

### entity.upsert
```json
{
  "id": "sync-op-xxx",
  "changeEventId": "change-xxx",
  "correlationId": "corr-xxx",
  "timestamp": "2026-03-12T12:00:00.000Z",
  "type": "entity.upsert",
  "projectId": "project-1",
  "entityId": "entity-1",
  "payload": { /* EntityRecord completo */ }
}
```

### entity.delete
```json
{
  "id": "sync-op-xxx",
  "type": "entity.delete",
  "projectId": "project-1",
  "entityId": "entity-1",
  "payload": { "id": "entity-1" }
}
```

### project.upsert
```json
{
  "id": "sync-op-xxx",
  "type": "project.upsert",
  "projectId": "project-1",
  "payload": { /* Project con tabs, templates, entities */ }
}
```

### project.delete
```json
{
  "id": "sync-op-xxx",
  "type": "project.delete",
  "projectId": "project-1",
  "payload": { "id": "project-1" }
}
```

### relation.upsert
```json
{
  "id": "sync-op-xxx",
  "type": "relation.upsert",
  "projectId": "project-1",
  "payload": { /* DomainRelation */ }
}
```

### relation.delete
```json
{
  "id": "sync-op-xxx",
  "type": "relation.delete",
  "projectId": "project-1",
  "payload": { "id": "relation-1" }
}
```

### workspace.settings
```json
{
  "id": "sync-op-xxx",
  "type": "workspace.settings",
  "payload": { "settings": {}, "syncRemoteConfig": {} }
}
```

### workspace.pointer
```json
{
  "id": "sync-op-xxx",
  "type": "workspace.pointer",
  "payload": { "activeProjectId": "...", "activeTabId": "...", "activeEntityId": "..." }
}
```

## Queue Item Structure (Internal)
```json
{
  "id": "sync-queue-xxx",
  "enqueuedAt": "2026-03-12T12:00:00.000Z",
  "retries": 0,
  "nextAttemptAt": "2026-03-12T12:00:00.000Z",
  "changeEventId": "change-xxx",
  "projectId": "project-1",
  "operation": { /* SyncOperation */ }
}
```

## Semántica de Merge
- **Idempotencia**: Operaciones procesadas por `id` único
- **CRDT Base**: Unión por ID + LWW por `updatedAt`/`timestamp`
- **Merge de Texto**: CRDT de texto para contenido de entidades
- **Respuesta**: Puede incluir `state` reconciliado para merge local

## Retry Strategy
- Backoff exponencial: `1250ms * 2^(retries-1)` con jitter [0.75, 1.25]
- Máximo reintentos: 5 (configurable)
- Poison queue: tras N reintentos fallidos, se marca `poisonedAt`
