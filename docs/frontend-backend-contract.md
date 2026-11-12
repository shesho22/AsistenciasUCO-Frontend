# Contrato frontend-backend

> **Snapshot histórico:** este documento describe principalmente el contrato v1 congelado en septiembre de 2026. Para la integración MAINT-004, el OpenAPI local del backend `develop` añade sesiones UTC v2 sin reemplazar v1. La matriz vigente está en `docs/work-items/MAINT-004-frontend-backend-db-alignment/CONTRACT_MATRIX.md`; no usar este snapshot para inferir el wire temporal v2.

El backend congelado es la fuente de verdad. Las consultas usan DTO tipados y propagan los errores HTTP; en modo real no se transforman fallos en datos vacíos ni en asistencia `AN` ficticia.

## Flujo de asistencia docente

### Grupos del docente

```http
GET /api/v1/docente/horarios
```

Las filas se deduplican por `idGrupo` y sus bloques únicos forman `Course.schedule`. La pantalla docente no usa `GET /grupos`.

### Sesiones

```http
GET /api/v2/sesiones/grupo/{grupoId}
```

Se usa `SesionV2ApiDto` (UTC V2, sin bandera ni fallback a V1). No existe fallback a `POST /sesiones/consultas`. `POST /api/v2/sesiones` responde `ApiMessageResponse`; después de crear, el frontend vuelve a consultar el listado y selecciona la sesión más reciente.

### Estudiantes del grupo

```http
GET /api/v1/grupos/{grupoId}/estudiantes
```

La identidad tiene esta semántica obligatoria:

```text
EstudianteGrupo.id = matrícula
idEstudiante       = estudiante real y studentId de asistencia
documento          = studentCode mostrado en UI
```

### Consulta de asistencia

```http
GET /api/v1/grupos/{grupoId}/asistencias?sesionId={sesionId}
```

El frontend usa exclusivamente `estado`, cuyos valores válidos son `AN`, `SJC` y `EX`. Nunca reconstruye el estado con `presente`; por ello `estado=EX` y `presente=false` se conserva como `EX`. Una asistencia inexistente se inicializa como `AN`; un estado existente fuera del contrato se trata como mismatch.

### Command batch

```http
POST /api/v1/asistencias/lote
Content-Type: application/json
```

```json
{
  "sesionId": "UUID",
  "registros": [
    { "estudianteId": "UUID", "estado": "AN" },
    { "estudianteId": "UUID", "estado": "SJC" },
    { "estudianteId": "UUID", "estado": "EX" }
  ]
}
```

No se envían `grupoId`, `studentId`, `status`, `notes` ni `observaciones`. El flujo individual `POST /asistencias` no forma parte de esta vertical.

## Realtime

El stream es `GET /api/v1/realtime/stream?grupoId={UUID}` y publica `ASISTENCIAS_SESION_ACTUALIZADAS`. El detalle de lifecycle, scope y reconexión está en `docs/frontend-realtime.md`.

## Coordinación, decanatura, estudiante y docente — HU081-HU083, HU096-HU098, HU060-HU064, HU104-HU145, HU108, HU010/HU011, HU051, HU053-HU055, HU008, HU094/HU095 y HU006 (2026-10-26/27)

Contrato completo de cada vertical en el `CONTRACT.md` del work item homónimo del backend; aquí solo el consumo del frontend. Todas las listas usan `ApiResponse<T[]>` con `total`; los errores se muestran con `getApiErrorMessage`.

| Pantalla | Llamadas | Notas de consumo |
|---|---|---|
| Malla del coordinador (HU081-HU083) | `PATCH /api/v1/coordinador/planes-estudio/{id}/toggle-estado`, `POST .../{id}/semestres`, `DELETE .../{id}/semestres/{numero}` | `normalizarPlanEstudio` (inp, `estaActivoPlanEstudio`, `totalSemestres`) y `normalizarAsignaturaPlan` (`credito`→`creditos`, `codigoSemestre`→`semestre`); máximo 10 semestres. |
| `admin/periodos` (HU096-HU098) | `POST`/`PUT /{id}`/`DELETE /{id}` sobre `/api/v1/admin/periodos-academicos` | Solo el administrador; coordinador y decano consumen `GET /api/v1/coordinador/periodos-academicos` en modo lectura. El estado (planeación/activo/cerrado) se calcula con las fechas en `normalizarPeriodoAcademico`. |
| `coordinador/asistencias` (HU064, HU060, HU061) | `GET /api/v1/coordinador/grupos`, `/grupos/{id}/sesiones`, `/sesiones/{id}/asistencias` | Filtros vacíos no se envían; paginación `pagina`/`tamano` (1..100). |
| `decano/estudiantes`, `decano/estructura`, `decano/cronograma` (HU104, HU105, HU109, HU119, HU145) | `GET /api/v1/decano/estudiantes`, `/estudiantes/{id}`, `/estructura`, `/sesiones` | Servicio propio `DeanFacultadService`; la estructura llega como árbol Facultad → Programa → Plan. |
| `decano/programas` (HU112), `decano/docentes` (HU128), `decano/asignaturas` y `admin/asignaturas` (HU143), `admin/estudiantes` y ficha de `decano/estudiantes` (HU157) | `GET /api/v1/decano/programas-creditos`, `/decano/docentes`, `/decano/asignaturas`, `/admin/asignaturas`, `/admin/estudiantes`, `/{admin,decano}/estudiantes/{id}/historial` | `ConsultasTransversalesService`; listados con `ListadoPaginado` (filas, total, página y error en Signals). `decano/programas` pide los créditos una vez (`tamano=100`, más páginas si hacen falta) y ya no llama a la malla de cada plan. La ficha unificada se muestra con `HistorialEstudianteComponent`; una matrícula sin grupo trae `resumen: null`. |
| `coordinador/consolidado-asistencia` y `decano/consolidado-asistencia` (HU061) | `GET /api/v1/coordinador/consolidado-asistencia`, `/decano/consolidado-asistencia` (`idPeriodoAcademico`, `idPrograma`, `idAsignatura`, `idDocente`, paginación) | `ConsultasTransversalesService.getConsolidadoAsistencia`; una fila por grupo con porcentajes sobre sesiones ejecutadas × estudiantes activos. |
| Pestaña "Trazabilidad y Auditoría" de `admin/sistema` (HU172) | `GET /api/v1/admin/auditoria` (`desde`, `hasta` ISO-8601, `accion`, `resultado`, `soloAsistencia`, paginación) | `AdminAuditoriaComponent`; por defecto 7 días y solo asistencia; máximo 90 días (400 si se excede). |
| `admin/catalogos` (HU154) y `admin/areas` (HU150) | `GET /api/v1/admin/tipos-programa`, `GET /api/v1/admin/areas` | Catálogos base de solo consulta (regla de John, 2026-11-04): sin crear, editar ni cambiar estado. Los tipos de documento se consultan con `GET /api/v1/tipos-identificacion` (HU022); su administración (HU153) quedó reducida a consulta. |
| Reclamo y detalle del curso del estudiante (HU005/HU016) | `GET /api/v1/categorias-justificacion` | `ConsultasTransversalesService.getCategoriasJustificacion()`; `{ id, codigo, nombre, descripcion }`, solo consulta. El reclamo sigue enviando el `nombre` en `categoria`. |
| `admin/estados` (HU155/HU167) | `GET /api/v1/admin/estados` | `ConsultasTransversalesService.getEstadosSistema()`; `{ catalogo: SOLICITUD | ESTUDIANTE_GRUPO, id, codigo, nombre }`, solo consulta. |
| Grupos del docente (HU058) | `GET /api/v1/docente/asignaturas` (+ `idTipoPrograma`, `nombreTipoPrograma`), `GET /api/v1/tipos-programa` | Filtro "Nivel formativo" con el catálogo real; sin catálogo no se muestra. |
| Formulario de asignaturas del coordinador (HU147, P5) | `GET /api/v1/coordinador/componentes-formacion`, `GET /api/v1/admin/areas`; `POST`/`PUT /coordinador/planes-estudio/{id}/asignaturas…` con `{ codigo, nombre, creditos, semestreNumero, nombreArea, nombreComponente }` | `aSolicitudAsignatura()`; créditos > 0 (`ASI_001` → 400), área o componente inexistentes (404), semestre fuera del plan (`PLA_004` → 404), plan de otro programa (`SEC_002` → 403). |
| `decano/programas` y `decano/programas/:planId` (HU108) | `GET /api/v1/decano/estructura` (planes) y `GET /api/v1/decano/planes-estudio/{id}/asignaturas` (malla) | No se usan rutas `/coordinador/**` desde pantallas del decano: `SecurityConfig` no admite DECANO allí. (Rama `feature/HU108-malla-plan-decano`.) |
| `estudiante/reclamos` (HU010/HU011, consulta) | `GET /api/v1/estudiante/reclamos` (`estado`, `pagina`, `tamano`) y `GET /api/v1/archivos/{fileId}` (soporte) | `AttendanceClaimService.getReclamosEstudiante` + `ClaimMapper.fromReclamoEstudiante` (mismo mapeo que la bandeja docente, sin datos del estudiante; instantes UTC en la zona IANA del usuario). Sin toast global: la vista muestra el error (403 si el usuario no es estudiante). Eliminar espera TD-059. |
| Hub del grupo del docente → padrón → "Retirar" (HU051) | `POST /api/v1/docente/grupos/{grupoId}/estudiantes/{estudianteId}/retiro` `{motivo}` | `GroupService.retirarEstudiante` sin toast global; `TeacherRetiroEstudianteModalComponent` exige motivo (1..500) y muestra el error del backend (403/404/409); tras el retiro se recarga el padrón (`GET /grupos/{id}/estudiantes`). |
| `perfil` → "Expediente y vínculos institucionales" (HU006) | `GET /api/v1/usuarios/perfil` | `PerfilService` sin toast global; solo lectura; vínculos por rol con estado; sin edición (el `PUT` se retiró en CULM-001 A.2-14). `AuthService#fetchProfileFromBackend` y su flag no cambian. |
| `estudiante/oferta` (HU008) | `GET /api/v1/estudiante/oferta-academica` (`busqueda`, `pagina`, `tamano`) | `OfertaAcademicaService` sin toast global; búsqueda con debounce; etiqueta "Transversal · Básica/Institucional" con `transversal`/`tipoAsignatura`; solo consulta: sin acción de solicitar y con el texto "Para matricularte, usa el QR o PIN…" (`oferta-como-matricularse`) si no está matriculado. |
| `coordinador/docentes` → "Ver ficha e historial" (HU094) | `GET /api/v1/coordinador/docentes/{idDocente}/ficha` (`pagina`, `tamano`, `idPeriodoAcademico` opcional) | `CoordinatorDocenteFichaModalComponent` pagina de 5 en el servidor; muestra resumen de carga e historial con VIGENTE/FINALIZADO/PRÓXIMO; el 404 (docente ajeno) se muestra en la ficha. Ya no se usa `CourseService` en esta pantalla. |
| `admin/docentes` (HU136) | `GET /api/v1/admin/docentes` (`busqueda`, `idFacultad`, `idPrograma`, `estaActivo`, `pagina`, `tamano`) | `ConsultasTransversalesService.getDocentesInstitucion()`, mismo `DocenteFacultadItem` que HU128 más `tieneVinculoActivo`; `estadoVinculo` (`SIN_VINCULO` o `TODOS`) solo se envía si no es el valor por defecto. Los programas del selector salen de `GET /decano/programas` (el administrador ve los de su institución). |
| Instituciones (HU161/HU162/HU164 descartadas) | Solo `GET /api/v1/admin/instituciones` | `AdminManagementService` ya no tiene crear, editar ni activar instituciones; el mock tampoco las simula. |
| Corrección de identidad (HU159) | `PUT /api/v1/coordinador/estudiantes/{idEstudiante}/identidad`, `PUT /api/v1/admin/decanos/{id}/identidad`, `GET /api/v1/configuracion/identidad` | `CorreccionIdentidadService`. Cuerpo `{ primerNombre, segundoNombre, primerApellido, segundoApellido, idTipoIdentificacion?, numeroIdentificacion?, motivo }`; respuesta `{ idRegistro, sincronizacionIdentidad: OK o PENDIENTE, mensajeUsuario }` (PENDIENTE = aviso). La configuración se pide una vez; si falla, el documento queda de solo lectura. |
| Documento en HU121 y HU092 (HU159) | `PUT /api/v1/decano/coordinadores/{id}`, `PUT /api/v1/coordinador/docentes/{idDocente}` (aditivo) | `ActualizarCoordinadorPayload` y `ActualizarDocentePayload` suman `idTipoIdentificacion`, `numeroIdentificacion` y `motivo`, solo cuando el documento cambia. |
| `coordinador/docentes` → contadores y filtro (HU095) | `GET /api/v1/coordinador/docentes/resumen`; `GET /api/v1/coordinador/docentes` con `idTipoVinculacion` | Total, activos, inactivos y un chip por tipo; chip o selector filtran en el servidor y vuelven a la página 1; el consolidado se relee tras vincular, editar o cambiar estado. |
| `estudiante/reclamos` y detalle del curso → "Retirar" (A.2-7) | `DELETE /api/v1/estudiante/reclamos/{id}` → `ApiMessageResponse { exitoso, mensaje }`; 404 `REV_006`, 409 `REV_007` | `AttendanceClaimService.eliminarReclamo(id)`; "Retirar" solo en PENDIENTE; el estado `RETIRADA` se ve como insignia neutra "Retirada" y no cuenta como pendiente; el toast muestra `mensaje` o el `message` del error. |
| `admin/decanos` → "Desactivar/Reactivar" (A.2-8) | `PATCH /api/v1/admin/decanos/{id}/toggle` → `DecanoItemDTO` con `estaActivoDecano`; 409 `DEC_002`, 404 `DEC_001` | `AdminManagementService.toggleDecanoStatus` normaliza el DTO; la tarjeta refleja el estado devuelto. |
| Matrícula manual del docente → búsqueda por documento (A.2-15, DEC-027) | `GET /api/v1/grupos/{grupoId}/estudiantes/busqueda?tipoIdentificacionId=&documento=` → `datos: EstudianteBusquedaDTO` o `null`; `POST /api/v1/grupos/{grupoId}/estudiantes` sin `correo` ni `password` para un estudiante existente | `StudentService.searchStudentByIdentification(grupoId, tipo, documento)`; correo enmascarado de solo lectura; con matrícula `A` se bloquea el envío, con `I` se avisa la reactivación; 403/400 muestran el `message` del backend y no abren el alta. Ya no se lista `GET /api/v1/estudiantes`. |

## Configuración

Docker publica el frontend en `http://localhost:4200`. `API_URL`, `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID` y `USE_MOCKS` generan `assets/env.js` en runtime. `SECURITY_PROVIDER` también, con defecto `baseline` (igual que el backend); para usar el flujo legacy (password grant) en desarrollo hay que fijar `SECURITY_PROVIDER` en `legacy` de forma explícita en `env.js` o en el entorno del contenedor. El client público es `asistencias-uco-frontend`; el client `asistencias-api` continúa siendo la fuente de roles del JWT.
