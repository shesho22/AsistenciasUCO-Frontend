# VALIDATION — APP-04 (bloque A)

Fecha: 2026-11-03 (America/Bogota). Base `develop@860add4`; rama `fix/app04-utc-browser-timezone`.

## Pruebas automatizadas

| Alcance | Comando | Resultado |
|---|---|---|
| RED focalizado | `npx ng test --watch=false --browsers=ChromeHeadlessCI --include=<5 specs APP-04>` | RED esperado: exit 1, errores TS por API/campos inexistentes (producción sin cambios). |
| GREEN focalizado | mismo comando | PASS: 50/50, exit 0. |
| Suite completa | `npm run test:ci` | PASS: 1437/1437; Statements 91.41 %, Branches 76.57 %, Functions 91.17 %, Lines 92.35 %. |
| Realtime + build | `npm run coverage:realtime:check && npm run build -- --configuration=production` | PASS: realtime LINE 95.06 % (≥ 90 %); build de producción exit 0. |
| CI remoto | GitHub Actions sobre el SHA final | PENDIENTE: se registra al abrir el PR. |

## Navegador integrado (Claude desktop) — DOCENTE

- Stack local existente: frontend `ng serve` :4200 (esta rama), backend :8080 (jar previo, sin cambios de esta fase).
- Sesión iniciada manualmente por el usuario; no se capturaron credenciales ni tokens.
- Pantalla: `/app/asistencia?courseId=<grupo>` → «Historial y Cronograma de Sesiones».
- Respuesta contractual: `GET /api/v2/sesiones/grupo/{id}` → 200, 3 sesiones `CONFIRMADA`/`UTC_V2`.
- Mecanismo de zona: el navegador integrado no ofrece DevTools → Sensors. Bogotá se validó con la zona real del
  navegador (modo automático, `Intl` = `America/Bogota`). Londres y Berlín se validaron con el mecanismo oficial de
  preferencia manual de `SessionTimeZoneService` (`asistenciasuco.session-timezone`) y recarga. Esto valida la
  presentación por zona IANA, **no** la detección automática de otra zona del sistema, cubierta solo por pruebas
  unitarias (CASO 5). Al terminar se eliminó la preferencia: modo automático restaurado y verificado (08:00).

| Instante canónico | Zona efectiva | Esperado | Observado | Resultado |
|---|---|---|---|---|
| `2026-08-17T13:00:00Z`–`15:00Z` | America/Bogota (auto) | 17/08 08:00–10:00 | 2026-08-17 08:00 - 10:00 | PASS |
| `2026-12-09T13:00:00Z`–`15:00Z` | America/Bogota (auto) | 09/12 08:00–10:00 | 2026-12-09 08:00 - 10:00 | PASS |
| `2026-08-17T13:00:00Z` | Europe/London (manual, BST) | 14:00–16:00 | 14:00 - 16:00 | PASS |
| `2026-12-09T13:00:00Z` | Europe/London (manual, GMT) | 13:00–15:00 | 13:00 - 15:00 | PASS |
| `2026-08-17T13:00:00Z` | Europe/Berlin (manual, CEST) | 15:00–17:00 | 15:00 - 17:00 | PASS |
| `2026-12-09T13:00:00Z` | Europe/Berlin (manual, CET) | 14:00–16:00 | 14:00 - 16:00 | PASS |
| Identidad (CASO 5) | tras cambiar de zona y recargar | mismos ids e instantes | respuesta v2 idéntica a la primera | PASS |

## Navegador integrado — COORDINADOR (backend local previo, sin la rama APP-04)

- Sesión iniciada manualmente por el usuario. Pantalla `/app/coordinador/asistencias` → Grupo 001 → «Ver sesiones».
- `GET /api/v1/coordinador/grupos/{id}/sesiones?pagina=1&tamano=10` → 200; `fechaHoraInicio` = `2026-08-17T13:00:00`
  (sin zona) y **sin** `fechaHoraInicioUtc`/`estadoTemporal` (backend no actualizado).

| Sesión | Observado | Esperado con este backend | Resultado |
|---|---|---|---|
| SES-01/02/03 | `17/08/2026 13:00 – 15:00`, `24/08/2026 13:00 – 15:00`, `09/12/2026 13:00 – 15:00` + aviso «Algunas horas están registradas sin zona horaria confirmada…» | Literal v1 identificado, sin conversión inventada | PASS (comportamiento de respaldo) |
| CASO 6 docente ↔ coordinador | Docente 08:00, coordinador 13:00 (literal identificado) | Igual hora solo con el backend APP-04 desplegado | PENDIENTE de despliegue backend |

## Navegador integrado — COORDINADOR con backend APP-04 desplegado localmente

- Con autorización del usuario se reinició el backend local :8080 con el jar de `fix/app04-utc-coordinador-sesiones`
  (`5ed28da`), mismo script `start-backend-baseline.ps1 -Provider baseline` y `.env`. Health 200.
- Respuesta HU060: v1 `fechaHoraInicio = 2026-08-17T13:00:00` intacto + `fechaHoraInicioUtc = 2026-08-17T13:00:00Z`,
  `estadoTemporal = CONFIRMADA` (mismos instantes que `GET /api/v2/sesiones/grupo/{id}` del docente).

| Zona efectiva | SES-01 (17/08) | SES-03 (09/12) | Docente (misma zona) | Resultado |
|---|---|---|---|---|
| America/Bogota (auto) | 08:00 – 10:00 | 08:00 – 10:00 | 08:00 – 10:00 | PASS (CASO 6) |
| Europe/London (manual) | 14:00 – 16:00 | 13:00 – 15:00 | 14:00 / 13:00 | PASS |
| Europe/Berlin (manual) | 15:00 – 17:00 | 14:00 – 16:00 | 15:00 / 14:00 | PASS |

- Etiqueta visible: «Horas en America/Bogota (UTC-05:00, automática del navegador).» Cabecera del detalle de
  asistencia: `17/08/2026 08:00 – 10:00`. Preferencia manual retirada al terminar (modo automático).
- Bitácora de la ficha (Indicadores): NOT_RUN, «No hay estudiantes con alerta en este período»; cubierta por spec.

## No ejecutado

- ESTUDIANTE en navegador: NOT_RUN (requiere otro inicio de sesión manual).
- Detección automática de Londres/Berlín por cambio real de zona del sistema: NOT_RUN en navegador (unitario PASS).
