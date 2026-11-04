# SES-04 — Resolución de reclamos (Frontend)

Rama `fix/ses04-reclamo-justificada` desde `develop@bf24b9b`. Contrato: backend `PATCH /api/v1/docente/reclamos/{id}`
(APROBADA → asistencia `EX` JUSTIFICADA; 409 `ERR_RECLAMO_YA_RESUELTO`, 404 `ERR_RECLAMO_NO_EXISTE`).

## Corregido
| Pantalla | Antes | Ahora |
|---|---|---|
| Bandeja del docente (`teacher-claims`) | Clics repetidos enviaban varias decisiones; error mostrado por código genérico | Señal `resolviendo` deshabilita ambos botones y bloquea reentradas hasta la respuesta real; muestra el `message` del backend; ante 409/404 recarga la bandeja |
| Modal de reclamos del grupo (control de asistencia) | Sin protección de doble envío; la tabla no reflejaba la justificación hasta F5 | Ignora decisiones mientras una está en curso; tras aprobar recarga la asistencia persistida de la sesión |

Sin cambios de diseño. El estudiante ya muestra `JUSTIFICADA` (`estadoAsistencia` del backend, derivado de `EX`).

## Fuera de alcance (dependencia SES-05)
`group-sessions-overview` cuenta `EX` junto con `AN` en "presentes" y en el promedio de asistencia. Cambiarlo altera la
semántica del reporte y requiere decisión contractual (¿la ausencia justificada cuenta para el porcentaje?).

## Validación
RED `d46cbb9` → fix `136349e`. `ng test` ChromeHeadlessCI **1474/1474**; `tsc` OK. Navegador **NOT_RUN** (tras merge y despliegue).
