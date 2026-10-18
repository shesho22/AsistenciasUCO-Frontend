# MAINT-004 — Matriz contractual

Fuente primaria consultada: `C:\Users\josev\AsistenciasUCO\AsistenciasUCO\docs\contracts\openapi\openapi-golden-path.yaml`, versión 1.1.0 (MAINT-003F), y `application.yml` del backend, donde `app.sesiones.v2.enabled` queda `false` por defecto. La copia frontend de `BACKEND_GOLDEN_PATH_CONTRACT.md` es un snapshot histórico de septiembre y no congela el wire v2.

| Método y URL | Consumidor / servicio | DTO HTTP | Rol | Estado | Cambio / prueba |
|---|---|---|---|---|---|
| `GET /api/v1/docente/horarios` | grupos docentes / `CourseService` | `ApiListResponse<HorarioDocenteDTO>` | DOCENTE | IMPLEMENTADO | Preservar golden path; specs existentes |
| `GET /api/v1/sesiones/grupo/{grupoId}` | sesiones v1 / `SessionService` | `ApiListResponse<SesionConsultadaDTO>` | DOCENTE | LEGACY COMPATIBLE | Sigue activo con bandera v2 apagada |
| `POST /api/v1/sesiones` | creación v1 / `SessionService` | `ApiMessageResponse`, 201 | DOCENTE | LEGACY COMPATIBLE | Sin campos fantasma; spec contractual existente |
| `PATCH /api/v1/sesiones/{sesionId}` | edición v1 / `SessionService` | `ApiDataResponse<Void>`, 200 | DOCENTE | LEGACY COMPATIBLE | No se agrega PUT; spec existente |
| `POST /api/v2/sesiones` | creación UTC / `SessionV2Service` | `{grupo,nombre,fechaHoraInicio,fechaHoraFin}`, 201 | DOCENTE | IMPLEMENTADO, PENDIENTE_E2E | `session-v2.service.spec.ts`; requiere flag backend |
| `GET /api/v2/sesiones/{sesionId}` | detalle UTC / `SessionV2Service` | `SesionV2DataResponse` | DOCENTE | IMPLEMENTADO, PENDIENTE_E2E | Fechas nulas en `INDETERMINADA` |
| `GET /api/v2/sesiones/grupo/{grupoId}` | listado UTC / `SessionV2Service` | `SesionV2ListResponse` | DOCENTE | IMPLEMENTADO, PENDIENTE_E2E | Sin ocultar históricos |
| `PATCH /api/v2/sesiones/{sesionId}` | edición UTC / `SessionV2Service` | `ApiVoidResponse`, 200 | DOCENTE | IMPLEMENTADO, PENDIENTE_E2E | No existe PUT v2; conserva strings al cambiar solo nombre |
| `GET /api/v1/grupos/{grupoId}/estudiantes` | golden path / `GroupService`, `StudentService` | `ApiListResponse<EstudianteGrupoDTO>` | DOCENTE/COORDINADOR/ADMINISTRADOR | IMPLEMENTADO | IDs reales preservados |
| `GET /api/v1/grupos/{grupoId}/asistencias?sesionId=` | control / `AttendanceService` | `ApiListResponse<AsistenciaConsultadaDTO>` | DOCENTE/COORDINADOR/ADMINISTRADOR | IMPLEMENTADO | `EX` no se convierte a `AN` |
| `POST /api/v1/asistencias/lote` | control / `AttendanceService` | `ApiMessageResponse`, 201 | DOCENTE | IMPLEMENTADO | SSE posterior recarga HTTP |
| `GET /api/v1/realtime/stream?grupoId=` | sincronización / transporte SSE | `text/event-stream` | Autenticado + scope | IMPLEMENTADO, PENDIENTE_E2E | Reconexión preservada |
| `GET /api/v1/estudiantes` | directorio / `CoordinatorManagementService` | `EstudiantePaginaDTO` sin envelope | COORDINADOR/ADMINISTRADOR | IMPLEMENTADO, PENDIENTE_E2E | page 0-based, size 1..100, filtros AND |
| `GET /api/v1/estudiantes` | selector de matrícula / `CoordinatorStudentsComponent` | `EstudiantePaginaDTO` sin envelope | COORDINADOR | IMPLEMENTADO, PENDIENTE_E2E | búsqueda server-side limitada; no carga global |
| `GET /api/v1/docente/reclamos` | bandeja / `AttendanceClaimService` | endpoint actual 501 | DOCENTE | BLOQUEADO_POR_CONTRATO | UI informa 501; no mocks en real |
| `PATCH /api/v1/docente/reclamos/{id}` | resolución / `AttendanceClaimService` | request de resolución + respuesta void | DOCENTE | IMPLEMENTADO, PENDIENTE_E2E | éxito por `exitoso=true`, `datos` opcional |
| `POST /api/v1/archivos/subir` | soportes / `AttendanceClaimService` | `ApiDataResponse<{fileId,nombre,url,tamanio}>`, 201 | ESTUDIANTE | IMPLEMENTADO, PENDIENTE_E2E | Respuesta corregida |
| `GET /api/v1/archivos/{fileId}` | descarga / `AttendanceClaimService` | Blob autenticado | Propietario JWT | IMPLEMENTADO, PENDIENTE_E2E | No `window.open` sin Bearer |
| `GET /api/v1/usuarios/perfil` | perfil / `AuthService` | endpoint actual 501 | Autenticado | BLOQUEADO_POR_CONTRATO | JWT seguro se conserva si falla |
| `PUT /api/v1/usuarios/perfil` | edición perfil | sin contrato vigente | Autenticado | BLOQUEADO_POR_CONTRATO | UI deshabilitada en modo real |
| Catálogos admin no presentes en OpenAPI Golden Path | `AdminManagementService` | variable | ADMINISTRADOR | LEGACY / PENDIENTE_E2E | Sin cargas automáticas globales; errores reales visibles |

