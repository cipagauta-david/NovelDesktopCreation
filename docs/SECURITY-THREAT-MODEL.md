# Threat model mínimo — Vault & Sync

## Alcance
- Vault local de API keys y token de sync (`indexedDB` + AES-GCM).
- Canal de sync remoto autenticado por bearer token.
- Runtime de plugins con permisos.

## Activos críticos
- API keys de proveedores LLM.
- Token bearer de sync.
- Estado narrativo del workspace.

## Amenazas principales
1. **Exfiltración de tokens por XSS**: scripts maliciosos leyendo estado en runtime.
2. **Replay/uso de token expirado**: token sin rotación usado indefinidamente.
3. **Plugin malicioso**: ejecución de comandos peligrosos sin control.
4. **Corrupción de estado en sync**: operaciones fallidas que se reintentan sin límite.

## Mitigaciones implementadas
- Vault cifrado con AES-GCM por dispositivo y metadatos de rotación.
- Expiración de token de sync por política (30 días por defecto, máx. 180).
- Kill-switch de plugins + permisos por comando + auditoría en memoria.
- Cola de sync por operación con backoff exponencial y poison queue.

## Riesgos residuales
- XSS en renderer puede operar con secretos si el usuario está activo.
- Falta de attestation de runtime para plugins de terceros.
- Sin HSM/TPM binding del material criptográfico en modo web.

## Próximos controles recomendados
- Encriptar token con clave derivada de passphrase del usuario.
- Firma de plugins y verificación de integridad de manifests.
- Telemetría de seguridad para detectar tasas anómalas de fallos sync.
