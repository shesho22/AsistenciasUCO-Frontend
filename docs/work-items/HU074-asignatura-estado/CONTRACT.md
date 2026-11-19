# CONTRACT — HU074 (consumo del frontend)

Contrato congelado en el backend: `docs/work-items/HU074-asignatura-estado/CONTRACT.md` (misma rama). Aquí solo cómo lo
consume la SPA.

| Llamada | Método del servicio | Consumo |
|---|---|---|
| `PATCH /api/v1/coordinador/asignaturas/{id}/estado` con cuerpo opcional `{ "estaActiva": true\|false }` (estado DESEADO) | `CoordinatorManagementService.cambiarEstadoAsignatura(id, estaActiva)` | `{id}` = `AsignaturaPlanItem.id` (el `idAsignatura` de la fila de la malla, `normalizarAsignaturaPlan`). La SPA siempre envía el cuerpo: «Inactivar» → `false`, «Activar» → `true`. Idempotente: si la asignatura ya está así, el backend responde 200 sin cambio con ASI_011 / ASI_012, así un doble envío o un reintento no deshace la acción. Sin cuerpo el backend alterna (compatibilidad). |
| 200 `{ exitoso, datos: { idAsignatura, estaActivaAsignatura }, mensajeUsuario }` | `EstadoAsignaturaResultado` (`role-management.model.ts`) | `datos.estaActivaAsignatura` es el estado REAL tras el SP: con él se actualiza el caché de mallas. Toast con `mensajeUsuario` (ASI_011 / ASI_012) o, si no llega, el respaldo `UI_STUDY_PLAN_MESH_PAGE_005` / `_006` según ese estado; la página relee la malla. |
| 409 `ASI_009` / `ASI_006` (`ApiErrorResponse`) | — | `getApiErrorMessage` devuelve el `message` del catálogo (código de feature, no `CONFLICT`); se muestra en el aviso de la malla y en el toast. |
| 403 `FORBIDDEN` | — | Mismo manejo (`getApiErrorMessage` → mensaje del backend). |
| `GET /api/v1/{coordinador,decano}/planes-estudio/{id}/asignaturas` | sin cambio | `estaActivaAsignatura === false` → insignia «Inactiva». |

`ASI_010` (asignatura inactiva en `POST /grupos` y `POST .../asignaturas-asociadas`) se muestra con el manejo existente de
esas pantallas (`getApiErrorMessage`); no hay cambio de código.
