# VALIDATION — P0-C ChromeHeadless

Fecha: 2026-10-20 (America/Bogota).

## Diagnóstico y cambio aplicado

- Chrome instalado: `C:\Program Files\Google\Chrome\Application\chrome.exe`.
- `CHROME_BIN` no estaba definido; `karma-chrome-launcher` pudo resolver la
  instalación de Windows.
- La captura no era un fallo de la aplicación: desde el entorno restringido,
  el acceso al socket local `localhost:9876` fue rechazado por permisos. La
  misma suite conectó correctamente al ejecutarse con el permiso local
  requerido.
- Se añadió `--remote-debugging-port=0` al launcher `ChromeHeadlessCI` para
  evitar la colisión del puerto fijo 9222. Se conservaron `--no-sandbox` y el
  resto de flags de CI; no se modificaron specs ni umbrales.

## Ejecuciones

| Comando | Resultado | Evidencia |
|---|---|---|
| `npm run test:ci` | PASS | Chrome Headless 155.0.0.0; `807/807 SUCCESS`; exit code 0; Statements 87.76%, Branches 70.68%, Functions 86.49%, Lines 88.99% |
| `npm run coverage:realtime:check` | PASS | LINE 95.06% (231/243), umbral 90%; BRANCH 84.52% (71/84), umbral 80%; exit code 0 |
| `npm run build -- --configuration=development` | PASS | Angular build completado; exit code 0 |
| `npm run build -- --configuration=production` | PASS | Angular build completado en `dist/gestio-asistencia-frontend`; exit code 0 |
| `npm run verify` | PASS | test:ci + realtime coverage + production build; exit code 0 |

La ejecución del gate que usa Chrome requirió permiso elevado para el socket
local del runner; esa limitación del entorno debe reproducirse/documentarse en
CI o en la estación de validación, no ocultarse con un skip.

## Alcance y limitaciones

- Validación frontend automatizada completada para el checkout
  `frontend-lb004d-working`.
- No se declara validación funcional contra backend, Keycloak o base de datos:
  pertenece al cierre operativo P0-C y depende de servicios/credenciales
  reales disponibles.
- No se eliminaron logs, artefactos de build, copias ni worktrees.
