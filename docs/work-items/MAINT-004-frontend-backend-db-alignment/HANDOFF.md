# MAINT-004 — Handoff

## Listo para revisión

- Rama de integración creada sin merge a `develop`.
- v1 preservado y v2 encapsulado en `SessionV2Service`.
- URLs de API separadas y feature flag `USE_SESSIONS_V2`.
- Zona IANA, DST explícito, medianoche y precisión de strings v2.
- Estados temporales visibles y sesiones históricas no reinterpretadas.
- POST/PATCH recargan desde backend; no hay selección por coincidencia de nombre/fecha.
- Directorio coordinador migrado a página real en modo real.
- Constructor administrativo sin side effects.
- Reclamos 501 y perfil sin contrato se separan de los flujos exitosos.
- Archivos alineados a `fileId` y descarga autenticada.
- Modo mock/real con fuente efectiva coherente: no hay red accidental para rutas API no simuladas y no se reutilizan tokens mock en real.
- Directorio y matrícula con consultas server-side cancelables; no se pagina una carga masiva local.
- `08:00–08:00` y offsets RFC3339 imposibles se rechazan; cambio de zona durante edición requiere revisión explícita.
- PATCH de reclamo void se considera exitoso por `exitoso=true`, sin exigir `datos`.

## No declarar terminado

- No hay ejecución E2E real documentada.
- Karma llega a iniciar el servidor, pero el proceso no conecta al runner en este entorno, incluso con Chrome instalado y `CHROME_BIN` configurado.
- No se verificó que el backend/DB locales estén encendidos ni se cambió `APP_SESIONES_V2_ENABLED`.
- Reclamos docentes listado y perfil institucional siguen pendientes del backend; 501 no se muestra como cero reclamos.
- No se debe hacer merge a `develop` hasta completar CI y smoke manual.

## Siguiente paso recomendado

Repetir `npm run verify` con Node 20/ChromeHeadless operativo y ejecutar el smoke SSE en un ambiente backend/DB compatible; después activar v2 y recorrer la guía por rol. `npm ci` quedó bloqueado por EPERM de OneDrive; `npm install --ignore-scripts` permitió recuperar `node_modules`, pero no sustituye la validación limpia.

