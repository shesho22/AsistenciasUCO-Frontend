# TEST_PLAN — APP-04 (bloque A)

| Caso | Spec | Expectativa |
|---|---|---|
| CASO 1 tres zonas | `core/time/temporal-presentation.spec.ts` | `2026-11-03T15:00:00Z` → 10:00 Bogotá, 15:00 Londres, 16:00 Berlín. |
| CASO 2 medianoche | `temporal-presentation.spec.ts`, `session-timezone.service.spec.ts` | `2026-07-16T01:00:00Z` → 15/07 20:00, 16/07 02:00, 16/07 03:00; offset `-05:00` equivale a `Z`; rango que cruza medianoche muestra la fecha del fin. |
| CASO 3 fecha civil | `temporal-presentation.spec.ts` | `2026-12-25` → `25/12/2026`; con hora/offset o inválida → `null`. |
| CASO 4 DST | `temporal-presentation.spec.ts` (+ casos previos de `session-timezone.util.spec.ts`) | Londres/Berlín verano e invierno; `01:30` del 29/03 inexistente y del 25/10 ambigua en Londres → error explícito. |
| CASO 5 cambio de zona | `session-timezone.service.spec.ts` | Modo auto: Bogotá → `visibilitychange` con Berlín → zona y hora cambian; el instante canónico no. Manual no se pisa. |
| CASO 6 roles | `coordinator-attendance.component.spec.ts` (+ specs v2 docentes existentes) | Mismo instante UTC → misma hora que el docente; recalcula al cambiar la zona. |
| Precisión UTC V2 | `temporal-presentation.spec.ts`, `coordinator-attendance.component.spec.ts` | `.1234567Z` se conserva en el valor canónico. |
| Sin zona / INDETERMINADA | `temporal-presentation.spec.ts`, coordinador, decano | Literal, marcado `SIN_ZONA`; un instante de sesión INDETERMINADA no se usa. |
| Respaldo y etiqueta | `session-timezone.service.spec.ts` | Sin zona del navegador → `UTC` + «respaldo»; etiqueta automática/manual. |
| Bitácora | `coordinator-ficha-modal.component.spec.ts` | `14:00Z` del 23/10 → 15:00 en Londres (BST). |

RED: compilación fallida por API/campos inexistentes (`presentTemporalValue`, `formatCivilDate`,
`timeZoneOffsetLabel`, `resolveSessionInstant`, `zoneSource`, `zoneLabel`, `presentTemporal`, `fechaHoraInicioUtc`,
`estadoTemporal`), 2026-11-03 01:57 America/Bogota, antes de cambiar producción.
