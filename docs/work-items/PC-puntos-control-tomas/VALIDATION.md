# VALIDATION: PC-puntos-control-tomas (frontend FE-1 y FE-2)

Fecha: 2026-11-12. Rama local: `feature/PC-tomas-puntos-control`. Plan y contrato: `PLAN.md`.

## Resultado de `npm run verify`

Exit 0.

| Paso | Resultado |
|---|---|
| `lint:tokens` (tokens de diseño y nombre accesible en controles) | OK |
| `test:ci` | `TOTAL: 2737 SUCCESS` |
| `coverage:realtime:check` | OK (cobertura global: 92.92 % sentencias, 93.91 % líneas) |
| `check:retiro-solicitudes`, `check:registro-individual`, `check:hu-en-ui` | OK |
| Build de producción | OK. Advertencia de presupuesto del bundle inicial: 520.60 kB sobre 512 kB (excede por 8.60 kB; antes ≈519 kB, el aumento es de ≈1.5 kB) |

## Pantallas tocadas

- Docente, toma de asistencia (`/app/asistencia`): cabecera de la toma, avisos de edición, faltantes, cierre, línea de puntos de control, resumen de la sesión.
- Docente, reclamos (`/app/docente/reclamos`, modal de reclamos del grupo y pestaña de reclamos del grupo).
- Estudiante, detalle de la materia (`/app/estudiante/materias`), formulario de reclamo y Mis Reclamos (`/app/estudiante/reclamos`).

## Pruebas nuevas o actualizadas

- Docente tomas: `toma-asistencias.component.spec.ts` (punto de control, editable o no, aviso con plazo, `TOM_012`, descarte al dejar de ser editable), `toma-faltantes.component.spec.ts` (`esEditable`, `TOM_012`), `session-tomas-panel.component.spec.ts` (línea de puntos de control, tope de 20, toma no editable, cierre), `resumen-sesion-tomas.component.spec.ts` (minutos y estado del backend, errores del resumen), `toma-asistencia.service.spec.ts` (`GET .../tomas/resumen`), `attendance-control.tomas.spec.ts` (fixtures).
- Reclamos: `teacher-claims.component.spec.ts` (toma, "Estuvo presente", sin toma, 409 del backend, resultado), `group-claims-modal.component.spec.ts`, `attendance-claim.service.spec.ts` (`tomaId`, `resultado`), `claim.mapper.spec.ts`.
- Estudiante: `student-portal.mapper.spec.ts` (minutos, `tomas[]`, reclamable por toma), `student-course-detail.component.spec.ts` (estados, lista de tomas, botón por toma, estado y resultado del reclamo, plazo vencido, sesión cancelada), `student-claim-form.component.spec.ts`, `student-courses.component.spec.ts` (radicar con `tomaId`, errores nuevos, toma no reclamable), `student-claims.component.spec.ts`, `estado-sesion-estudiante.util.spec.ts`.

## Sin verificar

- Contra el backend real: la prueba en pantalla (docente y estudiante) queda para el agente de revisión con backend y BD migrados. El modo mock cubre solo la parte del estudiante (sesiones con tomas, radicar con `tomaId`, aprobar con `resultado`); el mock no tiene rutas de tomas del docente.
- Si el listado `GET /docente/reclamos` envía los campos de toma (el contrato solo los declara en el detalle y en el listado del estudiante), la lista del grupo muestra "Reclamo de la toma N"; si no, no aparece.

## Revisión en pantalla (2026-11-12)

Un agente QA probó la rama `feature/PC-tomas-puntos-control` en pantalla con la BD migrada (migración 37), el backend en 8080 y el frontend en 4200, con los usuarios `uco-docente` y `uco-estudiante`. Reporte completo: `informes/REVISION_PANTALLA_PUNTOS_CONTROL_2026-11-12.md`.

- Pasan: punto de control y minutos de tramo por toma, toma cerrada no editable tras abrir la siguiente, plazo de la última toma (fin más 30 minutos), aviso al cerrar, resumen de la sesión coincidente con `uv_asistencia_sesion_horas`, estado "Parcial: 34 de 60 minutos", botón de reclamo solo en la toma ausente, radicación del reclamo por toma (202), "Reclamo pendiente", aprobación "Estuvo presente" con recálculo a 60 de 60 minutos, y el resultado visible para el estudiante.
- Hallazgo menor: la bandeja de reclamos del docente no muestra la toma en la tarjeta (solo en el detalle), porque el listado no envía los campos de toma.
- Sin probar: tope de 20 tomas, `TOM_012` y `ERR_RECLAMO_TOMA_DUPLICADO` por API, "Ausencia justificada" y "Rechazar" sobre un reclamo de toma, "Marcar faltantes", QR con cámara y sesión cancelada con tomas.

## Mejora: toma en la bandeja de reclamos (2026-11-12)

Hallazgo de la revisión en pantalla: la tarjeta de la bandeja de reclamos del docente (`/app/docente/reclamos`) no decía de qué toma era el reclamo (solo el detalle). El backend ya envía `idToma`, `numeroToma` y `fechaPuntoControlUtc` en `GET /api/v1/docente/reclamos` (migración 38 de la BD y mejora paralela del backend).

- **Modelo y mapper:** sin cambios de código. `ReclamoDocenteApi`, `SolicitudRevisionItem` y `ClaimMapper.fromReclamoDocente` ya llevaban los tres campos (compartidos con el detalle y con el estudiante); solo faltaba que el listado los recibiera. Se agregó una spec del mapper.
- **Tarjeta (`teacher-claims.component.ts`):** nuevo `textoTomaTarjeta(reclamo)` devuelve `Toma N · HH:mm` (hora local con `SessionTimeZoneService.formatTemporal(..., 'time')`, el mismo formato del detalle); `textoTomaReclamada` (detalle) lo reutiliza y le agrega el estado actual de la toma. Un reclamo de la sesión completa no muestra nada (`data-testid="tarjeta-toma"` solo existe si hay toma).
- **Mock (`window.env.USE_MOCKS`):** `GET /docente/reclamos` completa `numeroToma` y `fechaPuntoControlUtc` a partir de `idToma` (misma resolución que las tomas del mock del estudiante) y el POST de `/asistencias/revisiones` los guarda al radicar por toma. El reclamo semilla `REC-001` pasa a ser de la toma 2 de `SES-001-03` (`2026-08-10T09:00:00Z`); los demás quedan como reclamos de la sesión.
- **Specs:** `teacher-claims.component.spec.ts` (tarjeta con toma y sin toma, y misma hora que el detalle), `claim.mapper.spec.ts` (toma en el listado y nulos) y `mock-backend.interceptor.spec.ts` (el mock de la bandeja trae la toma).
- **Corrida:** `npx ng test --watch=false --browsers=ChromeHeadlessCI --include=` de `teacher-claims.component.spec.ts`, `claim.mapper.spec.ts`, `mock-backend.interceptor.spec.ts` y `student-courses.component.spec.ts` = `TOTAL: 132 SUCCESS`; `npm run lint:tokens` OK. No se corrió `npm run verify` completo. Sin verificación en pantalla en esta pasada.