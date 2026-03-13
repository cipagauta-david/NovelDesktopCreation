# Sync Contract v2026-03-sync-v2

## Endpoint
- `POST /api/v2/sync/events`

## Headers
- `Content-Type: application/json`
- `X-Sync-Contract-Version: 2026-03-sync-v2`
- `Authorization: Bearer <token>`

## Request
```json
{
  "contractVersion": "2026-03-sync-v2",
  "workspaceId": "workspace-123",
  "operations": [
    {
      "id": "sync-op-1",
      "changeEventId": "change-1",
      "timestamp": "2026-03-12T12:00:00.000Z",
      "type": "entity.upsert",
      "projectId": "project-1",
      "entityId": "entity-1",
      "payload": {}
    }
  ]
}
```

## Response
```json
{
  "acceptedOperationIds": ["sync-op-1"],
  "state": {}
}
```

## Semántica
- El backend procesa operaciones idempotentes por `id`.
- La respuesta puede incluir `state` reconciliado para merge local.
- Los clientes aplican backoff exponencial y mueven a poison queue tras N reintentos.
