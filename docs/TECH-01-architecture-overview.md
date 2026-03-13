# Arquitectura Técnica Inicial — NovelDesktopCreation (Parte 1: Visión General y Dominio)

## 1. Objetivo arquitectónico
Entregar una base técnica local-first, de alta fluidez y preparada para desktop, capaz de sostener escritura narrativa, búsqueda estructural y asistencia IA en streaming sin bloquear la experiencia de edición.

## 2. Principios técnicos
1. **Separación de hilos obligatoria**: tareas intensivas (persistencia, indexación, búsquedas pesadas) fuera del hilo principal.
2. **UI optimista**: la interfaz confirma interacción de inmediato y reconcilia estado en segundo plano.
3. **Persistencia local como default**: el sistema funciona sin conectividad para operaciones núcleo.
4. **IPC tipado**: toda comunicación UI/worker utiliza contratos explícitos de mensajes y respuestas.
5. **IA por streaming y cancelable**: outputs incrementales con mecanismo estándar de cancelación.
6. **Diseño tokenizado**: consistencia visual y legibilidad de largo plazo guiadas por design system.
7. **Historial append-only**: cambios persistentes representados como eventos inmutables.

## 3. Topología por capas

### 3.1 Capa de presentación (Main Thread)
Responsable de:
- render UI,
- capturar intents del usuario,
- mantener estado reactivo optimista,
- enviar comandos al worker,
- mostrar estados de stream IA y acciones de cancelación.

Restricciones:
- no ejecutar consultas pesadas ni escrituras bloqueantes,
- no acoplar lógica de proveedor IA en componentes visuales.

### 3.2 Capa de ejecución (Worker / Infraestructura)
Responsable de:
- persistencia local,
- indexación y búsqueda,
- gestión de assets,
- ejecución de integraciones IA,
- emisión de eventos de reconciliación hacia la UI.

Implementación esperada:
- backend local con SQLite Wasm/OPFS u opción equivalente en runtime desktop,
- contratos desacoplados para proveedor IA.

## 4. Contrato de interacción UI ↔ Worker

### 4.1 Flujo base
1. UI emite `intent` tipado (ejemplo: guardar campo, crear relación, solicitar búsqueda).
2. Worker procesa y responde con `ack` o `error`.
3. Si corresponde, worker publica `event` de sincronización para mantener consistencia del estado local.

### 4.2 Garantías mínimas
- idempotencia para intents repetibles,
- manejo de errores sin bloqueo de edición,
- telemetría de eventos críticos para diagnóstico.

## 5. Modelo de dominio inicial
- **Project**: unidad autocontenida de trabajo narrativo.
- **CollectionTab**: agrupación funcional de entidades (Personajes, Capítulos, etc.).
- **Entity**: nodo base de información narrativa.
- **Relation**: vínculo tipado entre entidades.
- **Asset**: recurso binario asociado a entidades.
- **Template**: estructura reusable para creación de entidades.
- **PromptProfile**: configuración de comportamiento IA por ámbito.
- **ChangeEvent**: evento inmutable para historial y auditoría.

## 6. Decisiones de diseño técnico (MVP)
- Formato canónico de contenido editable compatible con serialización portable.
- Referencias internas soportadas por identificadores estables (no por texto visible).
- Integración de IA encapsulada por interfaz de provider para evitar acoplamiento.
- Preparación explícita para empaquetado desktop sin reescritura de dominio.
