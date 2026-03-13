# Arquitectura Target Post-MVP — NovelDesktopCreation

## 1. Objetivo
Definir la arquitectura de producto final post-MVP, alineando sincronización, extensibilidad por plugins y adaptación desktop bajo un modelo local-first seguro.

## 2. Capas objetivo
- **UI Shell**: React + paneles desacoplados por dominio.
- **Application Core**: intents, políticas, plugin capabilities, trazabilidad por correlation ID.
- **Infrastructure Adapters**: storage, filesystem y red por runtime (`web` / `desktop`).
- **Sync Engine**: cola offline, merge CRDT base y reconciliación de conflictos.

## 3. Sincronización y consistencia
- Cola offline append-only para operaciones locales pendientes.
- Estrategia de merge CRDT base: unión por ID + política LWW por timestamps (`updatedAt`).
- Reconciliación incremental por proyecto y entidad.
- Auditoría global por `ChangeEvent`.

## 4. Seguridad de credenciales
- API keys fuera del estado persistido.
- Vault cifrado local (WebCrypto AES-GCM + key management local).
- UI solo persiste `apiKeyHint` y metadatos de proveedor/modelo.

## 5. Plataforma Web/Desktop
- `fileAdapter`: import/export desacoplado de APIs de navegador.
- `stateStorageAdapter`: persistencia del worker desacoplada de IndexedDB.
- Contrato `__NOVEL_DESKTOP__` para bridge nativo en runtimes desktop.

## 6. Extensibilidad por plugins/skills
- Registro dinámico de plugins con manifiesto mínimo (`id`, `version`, `capabilities`).
- Sandbox por capacidades:
  - `workspace:read`
  - `workspace:write`
- Contexto readonly congelado por defecto.

## 7. Observabilidad operativa
- Correlation ID por intent (UI → worker → IA → persistencia).
- Spans y breadcrumbs enriquecidos para diagnósticos de latencia y error.
- Métricas recomendadas post-MVP: p50/p95 por intent, error rate por provider, tiempo a primer token.

## 8. Roadmap técnico sugerido
1. Evolucionar merge CRDT base a CRDT op-based para edición colaborativa en texto largo.
2. Añadir replicación incremental segura con autenticación por workspace.
3. Integrar scheduler de plugins con aislamiento por dominio.
4. Incorporar panel interno de métricas y budget de performance por release.
