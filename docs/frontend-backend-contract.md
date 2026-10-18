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
GET /api/v1/sesiones/grupo/{grupoId}
```

Se usa `SesionConsultadaApiDto`. No existe fallback a `POST /sesiones/consultas`. `POST /api/v1/sesiones` responde `ApiMessageResponse`; después de crear, el frontend vuelve a consultar el listado y selecciona la sesión más reciente.

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

## Configuración

Docker publica el frontend en `http://localhost:4200`. `API_URL`, `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID` y `USE_MOCKS` generan `assets/env.js` en runtime. El client público es `asistencias-uco-frontend`; el client `asistencias-api` continúa siendo la fuente de roles del JWT.
