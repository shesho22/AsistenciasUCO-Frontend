# PLAN — APP-04: instantes UTC presentados en la zona del navegador

## Identidad y objetivo

- Fecha / base Git: 2026-11-03 / `develop@860add4` (APP-06 ya fusionado, PR #34).
- Rama: `fix/app04-utc-browser-timezone` (bloque A: núcleo temporal + primeros consumidores de sesiones).
- Origen: `PLAN-CORRECCIONES-POR-ROL.md` APP-04 y `SEC-BASELINE-018/VALIDATION.md` §K.1 del backend: el docente
  (contrato v2 UTC) ve 08:00–10:00 y el coordinador ve 13:00–15:00 la misma sesión `2026-08-17T13:00:00Z`, porque
  `/coordinador/grupos/{id}/sesiones` entrega `LocalDateTime` sin zona y `coordinator-attendance` lo pintaba con el
  pipe `date` (hora UTC mostrada como local, +5 h).
- Objetivo: una sola semántica temporal en el frontend: instante → zona IANA efectiva del navegador; valor sin zona →
  literal e identificado; fecha civil → sin desplazamiento.

## Decisiones

| Tipo semántico | Ejemplo | Regla |
|---|---|---|
| Instante real (`Z` u offset) | `fechaHoraInicio` v2, `fechaHoraInicioUtc`, bitácora del coordinador, reclamos | Se conserva el valor canónico (hasta 7 decimales) y solo se formatea en la zona efectiva. |
| `LocalDateTime` v1 sin zona | `/coordinador/grupos/{id}/sesiones` (`fechaHoraInicio`), `/decano/sesiones` | No se reinterpreta: se muestra literal y la pantalla indica «sin zona horaria confirmada». |
| Fecha civil | `inicioPeriodo`, `fechaInicioPeriodo` | No pasa por instantes; `formatCivilDate` o el pipe `date` sobre `yyyy-MM-dd` (Angular la crea como fecha local, sin desplazamiento). |
| Horario recurrente institucional | franjas semanales | Fuera de este bloque; conserva `America/Bogota` del contrato académico. |

- Zona efectiva: AUTOMÁTICA por defecto con `Intl.DateTimeFormat().resolvedOptions().timeZone`; sin GPS, IP ni
  idioma. Si el navegador no informa zona → respaldo `UTC` declarado en la etiqueta. Una preferencia manual existente
  se respeta y se identifica como «selección manual»; `setAutomatic()` regresa al modo automático.
- La zona automática se recalcula al recargar y al volver a la pestaña (`focus`/`visibilitychange`), sin cerrar sesión.
- Una sesión solo usa `fechaHoraInicioUtc`/`fechaHoraFinUtc` si `estadoTemporal = CONFIRMADA` (UTC-D06/D07).
- Se reutiliza `SessionTimeZoneService` y `session-timezone.util.ts`; no se crea un sistema temporal paralelo ni pipes
  nuevos. Las conversiones viven solo en el util; los componentes llaman al servicio.

## Alcance de rutas

- ALLOWED: `src/app/core/time/session-timezone.util.ts`, `src/app/core/services/session-timezone.service.ts`,
  `src/app/core/models/asistencia-programa.model.ts`, `coordinator-attendance`, `coordinator-ficha-modal`,
  `dean-cronograma` y sus specs; este work item.
- FORBIDDEN: escritura de sesiones v2 (sin cambios), DB, proveedor de seguridad, localStorage para datos.

## Dependencias contractuales

- Backend `fix/app04-utc-coordinador-sesiones` agrega `fechaHoraInicioUtc`, `fechaHoraFinUtc` y `estadoTemporal` a
  HU060. Hasta que se despliegue, la pantalla del coordinador muestra el literal v1 identificado como sin zona.
- Decano (`/decano/sesiones`) y estudiante (`/estudiante/materias/{id}/sesiones`) siguen en `LocalDateTime` v1:
  presentación literal identificada. Su enriquecimiento con procedencia es el siguiente bloque backend.

## Rollback

Revertir la rama. No hay migraciones, datos ni configuración runtime.
