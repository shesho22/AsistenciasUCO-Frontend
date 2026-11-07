---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-07
---

# PLAN — Retiro de las llamadas a los stubs de matrícula del coordinador (HU156 cubierta)

Decisión de John (2026-11-07): la primera alta de un estudiante va atada a un grupo, así que HU156 queda cubierta por
HU050 (el docente, o el coordinador en los grupos de su programa, con `POST /api/v1/grupos/{grupoId}/estudiantes`) y
HU176B (QR). El backend retira los 4 stubs 501 de `/api/v1/coordinador/grupos/{grupoId}/estudiantes/**` y
`/api/v1/coordinador/solicitudes-matricula/**` (work item del mismo nombre en el backend).

## Alcance

| Archivo | Cambio |
|---|---|
| `core/services/coordinator-management.service.ts` | Se retiran `getSolicitudesMatricula()` (`GET /coordinador/solicitudes-matricula`) y `resolverSolicitudMatricula()` (`PATCH /coordinador/solicitudes-matricula/{id}`). Respondían 501 y ninguna pantalla los usaba. `crearSolicitudMatricula()` se queda: la usa "Mis cursos" del estudiante contra `POST /estudiante/solicitudes-matricula` (HU053) |
| `coordinator-management.service.spec.ts`, `coordinator-students.component.spec.ts` | Se quitan las pruebas y los spies de los métodos retirados |

Sin cambios de pantalla, rutas ni menús. Las solicitudes de ingreso las sigue resolviendo el docente (HU053-HU055).

## Rollback

Revertir el commit.
