# VALIDATION — VAL-oleada2-cumplimiento (frontend)

## Agente B: PAR-05 y PAR-06

Fecha: 2026-11-12. Comando:

```
npx ng test --watch=false \
  --include=src/app/core/files/soporte-file.validator.spec.ts \
  --include=src/app/features/coordinator/coordinator-consolidado/consolidado-asistencia.component.spec.ts \
  --include=src/app/features/student/student-courses/components/student-claim-form.component.spec.ts \
  --include=src/app/features/student/student-courses/student-courses.component.spec.ts \
  --include=src/app/features/attendance/attendance-control/components/group-sessions-overview.component.spec.ts
```

Resultado: `TOTAL: 130 SUCCESS` (Chrome 157).

Pruebas nuevas:
- `soporte-file.validator.spec.ts`: límite parametrizado (512 KB), respaldo de 5 MB si falta o supera el techo,
  `describirTamano`.
- `consolidado-asistencia.component.spec.ts`: el color de inasistencia sigue el umbral de los KPI (5 %) y conserva 15/20
  si los KPI fallan. El helper `crear()` ahora atiende también la petición de `/indicadores`.

No corrido aquí: `npm run verify` completo (lo corre John al final).

## Cadena de suministro y CI (agente T)

`npm run lint`: 0 errores, 427 avisos. actionlint 0 hallazgos; YAML OK. Trivy local: 15 CVE HIGH (14 de Angular 18 sin parche en la línea 18, 1 de source-map-js), clasificados en `.trivyignore` con vencimiento 2027-02-12. gitleaks con configuración: 0. Detalle en [CI-CADENA-SUMINISTRO.md](CI-CADENA-SUMINISTRO.md).

- PAR-06 (correccion): `consolidado-asistencia` embebido en CULM-001 ya no repite GET `/indicadores`; toma los umbrales del estado compartido de `CoordinatorIndicatorsService.kpis()` (las tarjetas KPI ya lo piden). Standalone/decano siguen pidiendolos. `ng test --include=coordinator/**`: 233 SUCCESS.

## Compuerta Trivy de la imagen (CI)

Causa: el paso "Trivy image gate" falla porque la imagen final (base `nginxinc/nginx-unprivileged:1.30.6-alpine` fijada por digest, Alpine 3.24.2) trae 13 hallazgos HIGH/CRITICAL de paquetes del sistema que ya tienen version corregida: brotli-libs CVE-2026-111497 (CRITICAL), curl/libcurl CVE-2026-92392, libexpat CVE-2026-113351/115506/117610/118370, libxslt CVE-2026-125350/87636/9947, musl/musl-utils CVE-2026-107891 y zlib CVE-2026-85091. No hubo hallazgos de misconfig ni de secretos. Reproducido con `aquasec/trivy:0.74.0` (la version del workflow).

Correccion: en el `Dockerfile`, etapa final, `RUN apk upgrade --no-cache` como root antes de `USER 101`. No se agrego ninguna excepcion a `.trivyignore`. La linea se puede quitar cuando se suba a una base ya parcheada.

Evidencia: antes del cambio, 13 hallazgos HIGH/CRITICAL (exit 1). Despues: la etapa final con `apk upgrade --no-cache` (musl 1.2.6-r3, zlib 1.4-r0, brotli-libs 1.2.1-r0, curl 8.23.0-r0, libexpat 2.10.0-r0, libxslt 1.1.43-r4) se reescaneo con `aquasec/trivy:0.74.0` (vuln,misconfig,secret, HIGH/CRITICAL, ignore-unfixed): 0 hallazgos, exit 0. `npm run test:docker-runtime`: `DOCKER_RUNTIME_ENV_PASS` y `COMPOSE_SECURITY_WIRING_PASS`. Nota: por falta de RAM local el `ng build` dentro de Docker no termino, asi que el reescaneo se hizo sobre la misma etapa final usando el `dist` local; la capa de paquetes del SO es identica a la de CI.

## CF: fuentes locales

El escaneo de URL de Cloudflare mostro un error de seguridad en consola al cargar una fuente desde fonts.gstatic.com. Las fuentes dejan de cargarse de Google y se sirven desde el propio origen.

- `src/styles.css`: se elimina el `@import` de fonts.googleapis.com y se importan `@fontsource-variable/fraunces` (`opsz.css`, `opsz-italic.css`) y `@fontsource-variable/plus-jakarta-sans` (`wght.css`, `wght-italic.css`), ambos fijados en 5.3.0 (sin dependencias propias). Ejes cubiertos: Fraunces opsz + wght (100-900) normal/cursiva; Plus Jakarta Sans wght 200-800 normal/cursiva.
- Los nombres de familia de fontsource terminan en "Variable"; `--font-sans` y `--font-serif` listan primero `'Plus Jakarta Sans Variable'` / `'Fraunces Variable'` y conservan el nombre antiguo como respaldo. No hay otros usos de los nombres en el codigo.
- `docker-entrypoint.d/40-env-js.sh`: la CSP queda con `style-src 'self' 'unsafe-inline'` y `font-src 'self' data:` (sin origenes de Google).
- Comprobado: `ng build --configuration=production` correcto, `dist` contiene 14 archivos woff2 y ninguna referencia a googleapis/gstatic.
- `npm audit --omit=dev`: los 5 avisos altos son de paquetes Angular ya existentes; los paquetes de fuentes no anaden ninguno.
