# MAINT-004 — Validación

## Baseline

- HEAD auditado: `e2d4cdb7b14abb652878f30462b3aa0e246cc1e4`.
- Rama de integración creada: `jose-valencia/maint-004-frontend-utc-v2-integration`.
- `git status` inicial: limpio.
- `git fetch origin --prune`: bloqueado por `Permission denied` al escribir `.git/FETCH_HEAD`; se usaron referencias locales.
- `npm run test:ci`: el bundle se generó, pero Karma quedó en `Starting browser ChromeHeadless`; no se cuenta como PASS ni como ejecución funcional.

## Validación ejecutada durante el trabajo

- `npm ci`: BLOQUEADO por `EPERM` al desvincular `node_modules/@rollup/rollup-win32-x64-msvc/rollup.win32-x64-msvc.node` bajo OneDrive.
- `npm install --ignore-scripts`: PASS de recuperación del árbol instalado; npm reportó 59 vulnerabilidades.
- `npm run build -- --configuration=development`: PASS.
- `npm run test:ci` con `CHROME_BIN=C:\Program Files\Google\Chrome\Application\chrome.exe` y launcher `ChromeHeadlessCI`: bundle PASS, ejecución BLOQUEADA en el arranque del navegador.
- `npm run coverage:realtime:check`: FAIL esperado porque el bloqueo del navegador no generó `coverage/**/lcov.info`.
- `npm run build -- --configuration=production`: PASS con acceso de red autorizado para inlining de Google Fonts.
- `npm run verify`: intentado; se detuvo en `test:ci` por el mismo bloqueo de `ChromeHeadless`, por lo que no alcanzó cobertura ni build dentro del encadenamiento.
- Pruebas unitarias agregadas: compiladas por el proyecto; ejecución completa queda condicionada a un ChromeHeadless disponible.
- `npm audit --json`: 59 alertas: 0 info, 6 low, 12 moderate, 38 high y 3 critical. Hay 8 nodos directos vulnerables; la mayoría son transitivos del toolchain. Las correcciones propuestas requieren saltos mayores a Angular 21/22.
- Conteo de pruebas: no disponible; Karma no llegó a ejecutar la suite. No se declara ningún spec PASS/FAIL/SKIP.
- Backend/DB reales: no se declaró E2E ni smoke; no se modificaron backend, SQL Server, `sql_server_asistencias` ni `gestionasistenciadb`.

## Validación pendiente

1. Ejecutar en un host/CI donde ChromeHeadless pueda conectarse a Karma y obtener conteo exacto.
2. Repetir `npm ci` fuera de una carpeta sincronizada/bloqueada por OneDrive.
3. Ejecutar `npm run test:ci`, `npm run coverage:realtime:check` y `npm run verify` sin omitir suites.
4. Smoke SSE y recorrido manual por rol contra backend/DB locales encendidos.

## Dictamen

AMARILLO/BLOQUEADO: development y production build pasan; no se puede declarar GREEN porque tests, cobertura y `verify` no terminaron con código 0.

