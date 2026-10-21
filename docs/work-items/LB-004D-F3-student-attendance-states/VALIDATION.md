---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-10-20
---

# LB-004D — F3: estados reales de asistencia y reclamo habilitado por el backend

```text
BACKEND_CONTRACT: aditivo en jose-valencia/lb-004d-b1-support-binding (ver LB-004D-STUDENT-SESSION-ATTENDANCE-CONTRACT.md del backend)
MERGE: NO  (el cambio de contrato requiere revisión de los owners DB/Backend/Frontend)
```

## Causa de «Estado no disponible»

`GET /estudiante/materias/{id}/sesiones` solo devolvía `uv_sesion`; no existía ningún campo de asistencia. Además, en la DB local el
estudiante `files.e2e.estudiante1` **no tenía ninguna asistencia registrada**: solo una cabecera `Asistencia` sin detalle (residuo del E2E de
radicación, que crea la cabecera si falta y no la limpia). El frontend actuaba correctamente al no inventar un estado.

## Contrato consumido

`SesionMateriaEstudianteApiDto` suma `estadoAsistencia` (`PRESENTE|AUSENTE|JUSTIFICADA|NO_DISPONIBLE`), `estadoSolicitudRevision`
(`pendiente|aceptada|rechazada|DESCONOCIDO|null`) y `reclamable`. Los tres son opcionales: un backend anterior produce `NO_DISPONIBLE`.

| Valor del backend | UI | ¿Botón «Radicar Reclamo»? |
|---|---|---|
| `PRESENTE` | badge PRESENTE | no |
| `AUSENTE` + `reclamable` + sin solicitud | badge AUSENTE | **sí** |
| `AUSENTE` con solicitud existente | badge AUSENTE + «Solicitud de revisión: pendiente/aprobada/rechazada» | no (evita duplicado) |
| `JUSTIFICADA` | badge JUSTIFICADA | no |
| `RETARDO` | solo mocks: **la DB no distingue retardo** (catálogo AN/SJC/EX) | solo si el backend lo marcara reclamable |
| `NO_DISPONIBLE` / ausente / desconocido | «Estado no disponible» | **no** (nunca equivale a AUSENTE) |

`reclamable` en la UI exige: pista del backend **y** estado AUSENTE/RETARDO **y** ninguna solicitud previa. La autorización
definitiva sigue en backend/DB al radicar. El formulario (categoría, justificación, PDF/PNG/JPEG ≤ 5 MiB, ClamAV + MinIO,
`soporteArchivoId`) no cambió.

## Otros cambios

* `console.warn` diagnóstico del mapper (pendiente de la sesión anterior): ahora registra solo conteos y **nombres de campos** de la primera fila
  descartada, nunca valores (identificadores, nombres, correos). Cubierto por prueba.
* Horarios: la UI ya muestra `horarios-vacio` («No hay clases registradas…») y el mapper acepta lunes–sábado en el formato real
  (`LUNES`, `HH:mm:ss`). Prueba nueva lunes–sábado sin `NaN`/`undefined`.

## Horarios — diagnóstico con datos reales

`dbo.Horario` / `uv_horario` tiene **3 filas en toda la DB**, todas de grupos `FIX-PAG-*` (fixtures de paginación). `uv_horario_estudiante`
(6 300 filas) corresponde a esos grupos; el Grupo 001 – Arquitectura de Software **no tiene horarios definidos**, por lo que
`GET /estudiante/horarios` de `files.e2e.estudiante1` es legítimamente vacío. No se fabricaron horarios: `STUDENT_SCHEDULE=BLOCKED_BY_DATA`.

## Pruebas

`npm run verify` (tests + coverage realtime + build de producción): **789/789 SUCCESS**, `coverage:realtime` PASSED, build de producción OK.
Nuevas/actualizadas: mapeo de estados y de solicitud, `NO_DISPONIBLE` ≠ `AUSENTE`, `reclamable` (6 combinaciones), logging sin valores,
horarios lunes–sábado, detalle del curso (botón solo si reclamable; solicitud existente; JUSTIFICADA/PRESENTE sin botón),
contenedor (flujo HTTP: ausencia reclamable abre el formulario; ya radicada no; JUSTIFICADA/PRESENTE no).
