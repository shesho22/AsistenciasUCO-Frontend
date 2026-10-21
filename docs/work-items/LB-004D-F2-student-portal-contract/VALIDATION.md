---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-10-20
---

# LB-004D — F2: portal estudiantil alineado con los contratos reales

```text
BACKEND_CONTRACT: sin cambios (jose-valencia/lb-004d-b1-support-binding)
DB_CONTRACT: sin cambios; el contrato adicional de asistencia del estudiante queda como decisión pendiente del owner
MERGE: NO
```

## Causa comprobada

`StudentCoursesComponent.cargarMaterias()` asignaba `res.datos` directamente al modelo de UI. El backend entrega
`{ idAsignatura, nombreAsignatura, idGrupo, nombreGrupo }`, la UI esperaba `{ id, nombre, codigo, docente, porcentajeAsistencia,
… }`. Resultado: tarjeta sin nombre, `NaN`, `id` indefinido y `GET /estudiante/materias/undefined/sesiones` (`400 INVALID_REQUEST`)
presentado como "0 sesiones". Además `CoordinatorManagementService` pedía `/coordinador/planes-estudio` y
`/coordinador/periodos-academicos` desde su constructor, por lo que un estudiante generaba 403.

## Contratos verificados en el código Java

| DTO | Campos |
|---|---|
| `MateriaEstudianteDTO` | `idAsignatura, nombreAsignatura, idGrupo, nombreGrupo` |
| `HorarioEstudianteDTO` | `id, idEstudiante, idGrupo, codigoMateria, nombreMateria, grupo, dia, horaInicio, horaFin, docente` |
| `SesionMateriaEstudianteDTO` | `id, nombre, numero, codigo, numeroSemana, idGrupo, codigoGrupo, nombreGrupo, fechaHoraInicio, fechaHoraFin` |

Hallazgos de contrato relevantes:

- `GET /estudiante/materias/{materiaId}/sesiones` recibe el **`idAsignatura`** y devuelve las sesiones de **todos** los grupos del
  estudiante en esa asignatura (`SesionMateriaEstudianteJpaRepository`, `g.idAsignatura = :idAsignatura`). La UI filtra por `idGrupo`.
- `fechaHoraInicio/Fin` son `LocalDateTime` (sin zona en el wire; persisten en UTC). El frontend **no asume zona**: con offset/`Z` convierte
  a la zona IANA del usuario; sin zona muestra el valor tal cual y lo marca "(sin zona)".
- No existe `estadoAsistencia` ni datos de reclamo en ninguno de los tres DTO.

## Cambios

| Área | Cambio |
|---|---|
| DTO HTTP | `core/api/models/estudiante-portal-api-dto.model.ts` (espejo de los records Java). |
| Mappers | `core/mappers/student-portal.mapper.ts`: `StudentPortalMapper.toMaterias/toHorarios/toSesiones`. Sin campos inventados (`codigo/docente/aula/horario/creditos/indicadores` = `null` → "No informado" / "No disponible"). Filas sin UUID válido se descartan. Identidad compuesta `claveGrupo = idAsignatura:idGrupo`. |
| UUID | `core/utils/uuid.util.ts`; `getSesionesPorMateria` valida y **no emite petición** si el id no es UUID (`IdentificadorInvalidoError`). |
| Estados de carga | `core/api/errors/load-error.util.ts`: 400 validación, 401/403 autorización, 5xx servidor, 0 red, id inválido. La vista distingue error (con *Reintentar*) de 200 con cero elementos. El error de sesiones usa `BYPASS_GLOBAL_ERROR_TOAST` para no duplicar avisos. |
| Indicadores | Promedio/fallas = `null` ("No disponible") cuando no hay fuente autoritativa; el dashboard (`overview`) sigue la misma regla. |
| Reclamos | `iniciarReclamo` / `enviarReclamo` exigen `estadoAsistencia` autoritativo `AUSENTE` o `RETARDO`. Sin él: "Estado no disponible" y sin botón *Radicar Reclamo*. |
| Horarios | `dia` normalizado (`LUNES`, `MIERCOLES`, `SABADO`…), horas `HH:mm:ss`/`[h,m]` → `HH:mm`; columna **Sábado** solo si hay clases; vacío real ≠ error; se retiran las etiquetas fijas "Semestre 2026-2" / "Jornada Diurna". |
| 403 del estudiante | `CoordinatorManagementService` ya no carga en el constructor. Nuevo `cargarDatosAcademicosBase()` lo invocan solo `dean-faculty`, `admin-system` y `admin-facultades` (las pantallas de Coordinador ya cargaban en su `ngOnInit`). No se amplió ningún permiso. |
| Modo mock | `student-portal-mock.adapter.ts`: el interceptor mock emite la forma de los DTO reales (UUID deterministas) para ejercitar los mismos mappers. En mock se pierde el detalle de reclamos por sesión (el backend real tampoco lo entrega). |

## SESSION_ATTENDANCE_CONTRACT = MISSING

Búsqueda de una consulta autorizada que entregue al estudiante autenticado su estado por sesión:

| Candidato | Resultado |
|---|---|
| `GET /api/v1/grupos/{grupoId}/asistencias` | `SecurityConfig`: solo `DOCENTE / COORDINADOR / ADMINISTRADOR` → un estudiante recibe 403; además devuelve a todo el grupo. **No usar.** |
| `GET /api/v1/estudiante/reclamos` | `FeatureUnavailableException` (501). |
| Vistas `uv_asistencia`, `uv_detalle_asistencia` | Existen en DB, pero ningún endpoint de estudiante las expone. |

### Contrato adicional mínimo propuesto (decisión del owner backend/DB; no implementado aquí)

Opción A (preferida, un solo viaje): extender `SesionMateriaEstudianteDTO` con

```json
{ "estadoAsistencia": "PRESENTE | AUSENTE | RETARDO | JUSTIFICADA | null",
  "reclamo": { "id": "uuid", "estado": "PENDIENTE | APROBADA | RECHAZADA" } | null }
```

Opción B: `GET /api/v1/estudiante/materias/{idAsignatura}/asistencias` → `[{ idSesion, estadoAsistencia }]`.

Condiciones de seguridad: identidad solo desde el JWT (`findEstudianteIdByUsuario`), restringida a los grupos en los que el estudiante
está matriculado activamente (`uv_estudiante_grupo`), nunca parámetros de otro estudiante, mismo `hasRole("ESTUDIANTE")` de `/estudiante/**`.
Decisión de dominio pendiente: `DB_BASELINE_CONTRACT` indica que **la ausencia de fila no equivale a `AN`**; hay que definir qué se
informa para una sesión sin asistencia persistida (`null` = "no registrada"). El mapeo `codigoRazonCausa` → estado de UI lo define el owner.

El frontend ya es compatible: `SesionMateriaEstudianteApiDto.estadoAsistencia?` se lee de forma tolerante (valor exacto y válido, si no `null`).

## Validación (2026-10-20, `frontend-lb004d-working`, base `6c19569`)

| Comprobación | Resultado |
|---|---|
| `npm run verify` (`test:ci` + `coverage:realtime:check` + build producción) | PASS — 778/778, realtime 95.06 % líneas / 84.52 % ramas, build OK |
| Specs nuevas/actualizadas | mapper (materias/horarios/sesiones), servicio de sesiones (UUID, UTC, cero peticiones con id inválido), componente con HTTP real (URL sin `undefined`, varios grupos, 200 vacío vs 400/401/403/500/red, reintento, sin reclamo sin estado, sin `/coordinador/**`), horarios (sábado, vacío, error), detalle, dashboard, `CoordinatorManagementService` |
| Prueba manual en navegador (Keycloak + Angular + backend + SQL) | NOT_RUN — requiere sesión de `files.e2e.estudiante1` |
