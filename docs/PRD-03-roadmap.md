# PRD Formal — NovelDesktopCreation (Parte 3: Criterios, Riesgos y Roadmap)

## 10. Restricciones iniciales y vectores críticos
- Persistencia inicial 100% local (sin dependencia SaaS para operación base).
- Frontend reactivo con separación estricta de cargas pesadas fuera del hilo principal.
- Configuración de proveedores IA desde interfaz de usuario (sin requisito operativo de `.env`).
- Asincronía y workers definidos desde el inicio como condición de arquitectura.

## 11. Riesgos principales y mitigaciones
1. **Sobrecarga cognitiva del autor**
   - Riesgo: exceso de metadata y controles durante escritura.
   - Mitigación: revelación progresiva (modo Zen por defecto, modo avanzado bajo demanda).

2. **Degradación de fluidez (jank)**
   - Riesgo: búsquedas/indexación afectando edición en tiempo real.
   - Mitigación: indexación y consultas intensivas en worker + comunicación por contrato IPC.

3. **Pérdida de control sobre cambios IA**
   - Riesgo: modificaciones masivas sin revisión humana.
   - Mitigación: streaming visible, cancelación inmediata y confirmación previa para persistencia.

4. **Acoplamiento a un proveedor IA único**
   - Riesgo: bloqueo técnico/comercial y baja portabilidad.
   - Mitigación: capa de providers con interfaz común y switching por configuración.

5. **Evolución costosa a sincronización futura**
   - Riesgo: arquitectura no preparada para multi-dispositivo.
   - Mitigación: modelo de `ChangeEvent` inmutable desde fase temprana.

## 12. MVP recomendado
- Base de estado optimista con worker operativo.
- Persistencia local asíncrona y proyecto autocontenido.
- CRUD de entidades por colecciones/tab.
- Referencias `{{}}` con búsqueda local e inserción estable por ID.
- Integración de al menos un provider remoto y uno local con streaming + stop.
- Historial básico de cambios para undo/redo y auditoría.

## 13. Roadmap propuesto

### Fase 1 — Fundación operativa
Entregables:
- Worker + contrato IPC estable.
- Persistencia local + indexación asíncrona.
- Editor base y sistema de tabs por colección.

### Fase 2 — Conocimiento relacional
Entregables:
- Grafo de entidades/relaciones.
- Navegación cruzada y mejora de referencias.

### Fase 3 — Supervisión IA
Entregables:
- Flujos de propuesta IA con validación humana estructurada.
- Mejoras de trazabilidad por evento y diagnóstico de cambios.

### Fase 4 — Escalado y ecosistema
Entregables:
- Base técnica para sincronización (orientación CRDT/event log).
- Primeras interfaces de extensibilidad (skills/plugins).

## 14. Criterios de éxito primarios
- Operaciones principales de edición no presentan congelamientos del editor durante cargas de búsqueda/indexación.
- Toda acción IA de impacto persistente exige consentimiento explícito.
- El historial permite recuperar estados previos sin pérdida de datos.
- Contraste y legibilidad visual aptos para sesiones largas de escritura.

## 15. Decisiones de arquitectura aceptadas
- Formato canónico basado en Markdown/AST para portabilidad y control.
- Entidades como núcleo del dominio, organizadas por colecciones.
- Assets gestionados localmente dentro del proyecto autocontenido.
- Sincronización cloud y CRDT fuera del alcance del MVP (post-fase 3).
