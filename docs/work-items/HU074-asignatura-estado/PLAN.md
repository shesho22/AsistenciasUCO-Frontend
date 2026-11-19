# PLAN — HU074: Activar o inactivar asignaturas (frontend)

## Identidad y objetivo

- Fecha / rol / base Git: 2026-11-19 / implementador (agente) por orden de John / `develop` en `11c75f1`, rama
  `feat/HU074-HU178-asignatura-estado-ambito` (sin commit).
- Objetivo: que el coordinador active o inactive una asignatura desde la malla del plan
  (`/app/coordinador/planes-estudio/{planId}/malla`) con confirmación, vea cuáles están inactivas y reciba el mensaje del
  backend (éxito o rechazo 409).
- Contrato y reglas de negocio: work item homónimo del backend (`docs/work-items/HU074-asignatura-estado/`, `CONTRACT.md`) y
  migración 58 de la BD (renumerada desde la 57 al integrar NOTOMA-001). Consumo del frontend en `CONTRACT.md` de esta carpeta.

## AS-IS

| Hecho | Archivo + símbolo |
|---|---|
| No había método para `PATCH /coordinador/asignaturas/{id}/estado` | `CoordinatorManagementService` |
| La malla ya recibe `estaActivaAsignatura` y `compartida` en cada fila, pero no los mostraba (solo «Compartida») | `AsignaturaPlanItem`, `StudyPlanMeshComponent` |
| Acciones por tarjeta: iconos «Modificar asignatura» y «Desvincular del plan»; la confirmación de desvincular usa `ConfirmDialogComponent` en la página | `StudyPlanMeshComponent`, `CoordinatorStudyPlanMeshPageComponent` |
| La malla del decano usa el mismo GET (`AsignaturaPlanController`, ruta `/decano/planes-estudio/{id}/asignaturas`) y trae el mismo campo | `DeanPlanMallaComponent` |
| El mock fijaba `estaActivaAsignatura: true` y no simulaba el PATCH | `mock-backend.interceptor.ts` (`vinculoMock`) |

## TARGET

- `CoordinatorManagementService.cambiarEstadoAsignatura(idAsignatura, estaActiva)`: `PATCH .../coordinador/asignaturas/{id}/estado`
  con cuerpo `{ estaActiva }` (estado deseado; ver «Ajuste 2026-11-19 (revisión independiente)»; la primera versión enviaba `{}`). Respuesta `ApiResponse<EstadoAsignaturaResultado>`
  (`{ idAsignatura, estaActivaAsignatura }` + `mensajeUsuario`). Si es exitosa, actualiza `estaActivaAsignatura` en el caché
  de todos los planes que tengan la asignatura (el estado es de la asignatura, no del vínculo).
- `StudyPlanMeshComponent`: tercer icono en la barra de acciones de cada tarjeta, entre «Modificar asignatura» y «Desvincular
  del plan» (`data-accion="estado-asignatura"`, icono de encendido). Título «Inactivar asignatura» si está activa (tono
  `warning`) o «Activar asignatura» si está inactiva (tono `primary`); `aria-label` con el nombre de la asignatura. Emite
  `toggleEstadoSubject`. Insignia `app-badge` `danger` «Inactiva» junto a carácter y «Compartida» cuando
  `estaActivaAsignatura === false` (sin dato se trata como activa).
- `CoordinatorStudyPlanMeshPageComponent`: segundo `app-confirm-dialog` con textos según el estado:
  - Inactivar (destructivo): título y botón «Inactivar asignatura»; mensaje «¿Inactivar «{nombre}»? Mientras esté inactiva no
    podrá usarse para crear grupos ni asociarse a planes de estudio. Los grupos que ya existen no cambian.»
  - Activar: título y botón «Activar asignatura»; mensaje «¿Activar «{nombre}»? Volverá a estar disponible para crear grupos y
    asociarse a planes de estudio.»
  - Al confirmar: éxito → toast con `mensajeUsuario` del backend (ASI_011 / ASI_012) o el respaldo de UI; error → `getApiErrorMessage` en el aviso
    de la malla y en el toast (`mostrarRechazo`, mismo patrón que desvincular), lo que muestra el `message` de ASI_009 y
    ASI_006. En ambos casos se relee la malla y los planes (`recargarMalla`).
- `DeanPlanMallaComponent`: misma insignia «Inactiva» (solo lectura, sin acción).
- Mock: `PATCH /coordinador/asignaturas/{id}/estado` deja el estado pedido (sin cuerpo, alterna) en `mockStore.asignaturasPlan`; la asignatura compartida
  del mock (`SIS-101`) responde 409 `ASI_006` al inactivarla. `vinculoMock` refleja el estado guardado.

## Ajuste 2026-11-19 (prueba en pantalla de John): «Nuevo grupo» sin asignaturas inactivas

- Hallazgo: en Programa → Grupos → «Nuevo grupo» (`/app/coordinador/programa/grupos`, `CoordinatorGroupsComponent`) el combo
  «Asignatura» ofrecía asignaturas inactivas (p. ej. PRB-074) y el backend rechazaba luego con 409 `ASI_010`.
- Fuente del combo: `getPlanesEstudio` + `getAsignaturasPorPlan` de cada plan (`GET /coordinador/planes-estudio/{id}/asignaturas`),
  que ya trae `estaActivaAsignatura`. No hace falta otro endpoint ni cambio de backend.
- Cambio: `asignaturasParaCrear = computed(...)` filtra `estaActivaAsignatura !== false` (sin dato se ofrece) y el combo y su
  texto «No hay asignaturas disponibles» lo usan. `asignaturas()` sigue con la lista completa.
- Edición: el formulario en modo EDITAR no muestra el combo de asignatura (el PUT no la envía); un grupo con asignatura inactiva
  se edita y guarda igual. Si el backend aún rechazara un caso, el `message` de `ASI_010` se muestra con `getApiErrorMessage`.
- Prueba en pantalla hecha por John el 2026-11-19: PRB-074 inactiva no aparece en el combo «Asignatura» de «Nuevo grupo».

## Ajuste 2026-11-19 (revisión independiente): idempotencia, doble envío y respaldo del toast

- Contrato nuevo (backend y BD en paralelo): el PATCH acepta cuerpo opcional `{ "estaActiva": true|false }` con el estado
  DESEADO; si la asignatura ya está así responde 200 sin cambio (ASI_011 / ASI_012). `datos.estaActivaAsignatura` es el
  estado real tras el SP.
- `cambiarEstadoAsignatura(id, estaActiva)` siempre envía el cuerpo (Inactivar → `false`, Activar → `true`); el caché se
  actualiza con `datos.estaActivaAsignatura` de la respuesta (estado real), no con el pedido.
- Doble envío: `idEstadoEnCurso` (PATCH en vuelo) y `cambiandoEstado = idEstadoEnCurso !== null || listado.cargando()`.
  `StudyPlanMeshComponent` recibe `estadoBloqueado` (deshabilita la acción de estado de todas las filas) e `idEstadoEnCurso`
  (`aria-busy="true"` en la fila en curso). `pedirCambioEstado` no abre otro diálogo mientras haya un cambio o la recarga en
  curso y `confirmarCambioEstado` no envía un segundo PATCH. Al responder (éxito o error) se lanza `recargarMalla`, que marca
  `listado.cargando` en el mismo tick en que se libera `idEstadoEnCurso`: el bloqueo dura hasta que termina la recarga.
- Toast de éxito con respaldo: `res.mensajeUsuario || mensajeUi('UI_STUDY_PLAN_MESH_PAGE_005' | '_006')` según el estado
  real devuelto, como el resto del componente (`UI_STUDY_PLAN_MESH_PAGE_002` en «Quitar del plan»).
- Mock: acepta `{ estaActiva }` (idempotente); sin cuerpo alterna.

## Decisiones

- Dos códigos nuevos en `mensajes-ui.ts`, solo de respaldo: `UI_STUDY_PLAN_MESH_PAGE_005` «La asignatura quedó inactiva.» y
  `UI_STUDY_PLAN_MESH_PAGE_006` «La asignatura quedó activa.» (códigos remotos `UI143` / `UI144` en
  `mensajes-ui-codigos-remotos.ts` y `docs/messages/mensajes-ui-messageucolab.psv`). El texto normal de éxito y el de error
  siguen viniendo del backend (catálogo).
- Los textos del diálogo, el título del icono y la insignia van en la plantilla, como las demás etiquetas de la malla («Quitar
  asignatura del plan», «Compartida»): es el patrón aceptado del repo para diálogos de confirmación; `check:mensajes-ui` y el
  catálogo `mensajes-ui.ts` solo cubren toasts y respaldos.
- No se agrega filtro por estado ni se oculta la asignatura inactiva: la malla muestra los vínculos activos y la asignatura
  sigue siendo parte del plan.
- `ASI_010` (asignatura inactiva al crear grupo o asociar al plan) no requiere cambio: esas pantallas ya muestran el `message`
  del 409 con `getApiErrorMessage`.

## Clase de cambio y alcance

- Change class: FEATURE (UI aditiva) sobre contrato HTTP aditivo del backend.
- ALLOWED_PATHS: `core/services/coordinator-management.service*.ts`, `core/models/role-management.model.ts`,
  `core/interceptors/mock-backend.interceptor*.ts`, `features/coordinator/coordinator-study-plans/{components,pages}/study-plan-mesh*`,
  `features/dean/dean-plan-malla/*`, `features/coordinator/coordinator-groups/*`, documentación (este work item, `frontend-backend-contract.md`,
  `MAPA_COMPONENTES_FRONTEND.md`, matriz HU).
- FORBIDDEN_PATHS: `public/assets/env.js` (cambio local de John), rutas, guards. El catálogo de mensajes de UI solo recibe
  los dos respaldos `UI_STUDY_PLAN_MESH_PAGE_005/006` (ajuste de la revisión independiente).
- SECURITY_IMPACT: ninguno (el backend aplica RBAC y ámbito; el decano no tiene la acción).
- ROLLBACK: revertir los commits del work item; sin datos persistidos en el frontend.
