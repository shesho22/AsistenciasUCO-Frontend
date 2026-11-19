# TEST_PLAN — HU074: Activar o inactivar asignaturas (frontend)

## Pruebas unitarias

| Archivo | Casos |
|---|---|
| `core/services/coordinator-management.service.spec.ts` | PATCH a `/coordinador/asignaturas/{id}/estado` con cuerpo `{ estaActiva: false }` (inactivar) o `{ estaActiva: true }` (activar), devuelve `mensajeUsuario` y actualiza `estaActivaAsignatura` en el caché del plan con el estado real de la respuesta; el 409 `ASI_009` se propaga y la asignatura precargada en el caché conserva su estado. |
| `features/coordinator/coordinator-study-plans/components/study-plan-mesh.component.spec.ts` | La acción dice «Inactivar asignatura» (activa o sin dato) o «Activar asignatura» (inactiva), con `aria-label`; la insignia «Inactiva» solo en las inactivas; el clic emite la asignatura; con `estadoBloqueado` la acción está deshabilitada (no emite) y solo la fila de `idEstadoEnCurso` lleva `aria-busy`. |
| `features/coordinator/coordinator-study-plans/pages/study-plan-mesh-page.component.spec.ts` | Inactivar: diálogo con el alcance (no crear grupos ni asociar a planes; los grupos existentes no cambian), sin `window.confirm`, PATCH con `{ estaActiva: false }`, toast con el mensaje del backend, recarga y la fila pasa a «Inactiva» / «Activar asignatura». Activar: diálogo no destructivo, PATCH con `{ estaActiva: true }` y toast ASI_011. Cancelar: sin llamada. Doble envío: la acción queda deshabilitada (`aria-busy` mientras dura el PATCH) hasta que termina la recarga; mientras tanto no se abre otro diálogo ni sale un segundo PATCH. Sin `mensajeUsuario`: toast de respaldo `UI_STUDY_PLAN_MESH_PAGE_005` / `_006` según el estado devuelto. 409 `ASI_009` y `ASI_006` con envelope `ApiErrorResponse`: aviso y toast con el `message` del backend, sin toast de éxito, bloqueo hasta la recarga y recarga. |
| `features/dean/dean-plan-malla/dean-plan-malla.component.spec.ts` | Insignia «Inactiva» solo en la asignatura inactiva y sin acción de estado; ninguna insignia si todas están activas. |
| `features/coordinator/coordinator-groups/coordinator-groups.component.spec.ts` | «Nuevo grupo»: el combo no ofrece la asignatura inactiva (sí la activa y la que no trae dato); con todas inactivas avisa «No hay asignaturas disponibles». Edición de un grupo con asignatura inactiva: sin combo, guarda con PUT sin aviso de validación. |
| `core/interceptors/mock-backend.interceptor.spec.ts` | El mock deja el estado pedido (`{ estaActiva }`), lo refleja en la malla y responde 409 `ASI_006` para la asignatura compartida; pedir dos veces el mismo estado no lo revierte (idempotente); sin cuerpo alterna. `mockStore.asignaturasPlan` se restaura en `afterEach`. |

## Gates (a correr por orden de John; PC con poca memoria)

1. `npx eslint` de los archivos cambiados y `npm run lint`.
2. `npm run lint:tokens`, `npm run check:mensajes-ui`, `npm run check:mensajes-ui-catalogo`, `npm run check:hu-en-ui`,
   `npm run check:matriz-hu`, `npm run check:openapi-contract`, `npm run check:retiro-solicitudes`,
   `npm run check:registro-individual`.
3. `ng test` de los specs cambiados (ver `VALIDATION.md`) y luego `npm run test:ci` + `npm run coverage:realtime:check`.
4. `ng build --configuration=production`.

## Prueba manual

Coordinador → Planes de estudio → Malla: inactivar una asignatura sin grupos (toast «La asignatura quedó inactiva.», insignia
«Inactiva», icono «Activar asignatura»); intentar inactivar una con grupos vigentes (aviso ASI_009) o compartida con otro
programa (aviso ASI_006); reactivarla. Decano → Programas → malla del plan: la insignia aparece sin acción.
Tras confirmar, el icono de estado queda deshabilitado hasta que la malla termina de releerse (un doble clic no envía dos
PATCH ni abre otro diálogo). Programa → Grupos → «Nuevo grupo»: la asignatura inactiva no aparece en el combo «Asignatura»
(hecho por John el 2026-11-19 con PRB-074).
