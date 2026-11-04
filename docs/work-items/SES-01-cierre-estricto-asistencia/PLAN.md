# SES-01 — Toma de asistencia solo durante la sesión activa (Frontend)

- Fecha / base: 2026-11-03 / `develop@bf24b9b` (incluye APP-04, PR #35). Rama: `fix/ses01-cierre-estricto-asistencia`.
- Origen: backend `docs/work-items/SEC-BASELINE-019-upgrade-performance/PLAN-CORRECCIONES-POR-ROL.md`, decisión 1 (2026-11-02) y SES-01.
- Contrato backend: `POST /api/v1/asistencias/lote` responde `409` con `ERR_SESION_NO_INICIADA`, `ERR_SESION_CERRADA` o
  `ERR_SESION_HORARIO_INDETERMINADO` fuera de la ventana (rama backend homónima).

## Requisito

La pantalla «Tomar asistencia» solo permite cambios ordinarios con la sesión activa, `inicio <= ahora < fin`.
Fuera de la ventana se bloquean el cambio individual, «Marcar todos presentes/ausentes» y «Guardar», con un mensaje
claro; la consulta del registro sigue disponible. Sin tolerancia posterior al cierre.

## Causa corregida

LB-001B.1B retiró el gate sintético `isSessionConcluded` y dejó la UI sin regla temporal («el backend decide»). Con la
decisión del 2026-11-02 la regla existe y el backend la aplica; la UI la presenta.

## Diseño

| Pieza | Comportamiento |
|---|---|
| `core/utils/session-attendance-window.util.ts` | `getAttendanceWindowState(session, nowMs)` → `ABIERTA` / `NO_INICIADA` / `CERRADA` / `INDETERMINADA`, por **instante** RFC3339 v2 (independiente de la zona del navegador, APP-04). Sin instantes confirmados → `INDETERMINADA` |
| `core/utils/attendance-now.token.ts` | `ATTENDANCE_NOW` (por defecto `Date.now`): reloj de **presentación**, inyectable en pruebas |
| `AttendanceControlComponent` | `attendanceWindowState` derivado de la sesión actual; temporizador hasta el siguiente límite (tope 30 s) que re-evalúa aunque la página quede abierta; al cerrarse con cambios sin guardar los descarta y recarga lo persistido; re-evalúa al cambiar de sesión; guardas en `setStatus`, marcado masivo y `saveAttendance` |
| `AttendanceControlTableComponent` | Input `attendanceWindowState`; `controlsDisabled` incluye la ventana (botones y atajos de teclado); aviso `role="status"` con el mensaje |
| `AttendanceControlHeaderComponent` | Input `attendanceWindowOpen`; `bulkDisabled` lo incluye |
| Error 409 de ventana | Nunca se muestra como éxito: toast de error con el mensaje del backend, descarte de cambios locales y recarga |

El reloj del navegador no es autoridad: si está alterado la UI puede mostrar la ventana abierta, pero el backend y la DB
rechazan con su reloj (409) y la UI vuelve al estado persistido.

## Conflicto de prueba resuelto (`TEST_CONTRACT_CONFLICT`)

Tres specs afirmaban la regla anterior («no dependen de ningún estado de sesión», LB-001B.1B). La decisión funcional
confirmada del 2026-11-02 la reemplaza; se reformularon para la sesión activa confirmada y los bloqueos quedaron en
`attendance-control.ses01.spec.ts`. Los fixtures de las specs existentes usan una sesión v2 activa (`sesionActivaV2`).

## No alcance

Reclamos (SES-04), sesiones programadas/extraordinarias (SES-02/03), QR/PIN, cambios de diseño visual.
