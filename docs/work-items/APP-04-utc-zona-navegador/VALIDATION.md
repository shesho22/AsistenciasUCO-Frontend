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

## No ejecutado

- ESTUDIANTE y COORDINADOR en navegador: NOT_RUN (requieren otro inicio de sesión manual). El coordinador seguirá
  mostrando el literal v1 «sin zona» hasta desplegar el backend `fix/app04-utc-coordinador-sesiones`.
- Detección automática de Londres/Berlín por cambio real de zona del sistema: NOT_RUN en navegador (unitario PASS).
