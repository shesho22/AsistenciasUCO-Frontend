---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-14
---

# VALIDATION — VAL-oleada4-frontend-cierre (frontend)

Validación local en Windows 11 con Node 22.23.4 y Chrome Headless 157 (2026-11-14), sobre `develop` 91f89f5 más los
commits de esta rama.

## Evidencia por ítem

| Ítem | Cambio | Evidencia |
|---|---|---|
| SEG-14 | `ROLE_SCOPE_RULES`: `/decano` solo DECANO y `/coordinador` solo COORDINADOR. Excepciones con patrón de ruta: ADMINISTRADOR solo `GET coordinador/periodos-academicos` exacta; `planes-estudio/{id}/asignaturas-asociables` solo COORDINADOR (igual a `SecurityConfig` de `alejovh12/AsistenciasUCO` develop 9a72fce). Alias `ADMIN` retirado del tipo, rutas, menú y componentes. | `role-scope.interceptor.spec.ts` (matriz rol × prefijo, excepciones, 403 local del ADMINISTRADOR), `user.model.spec.ts`, specs de administración que ahora rechazan `ADMIN`. |
| OBS-14 | `GlobalErrorHandler` + `provideBrowserGlobalErrorListeners()`; entrada estructurada `frontend.unhandled_error` sin mensaje ni pila; aviso del catálogo con referencia `FE-<uuid>` (máximo uno cada 10 s); toasts de 403 y 5xx con "Código de referencia: <correlationId>" (envelope o cabecera `X-Correlation-Id`). | `global-error-handler.spec.ts`, `error.interceptor.spec.ts` (VAL OBS-14), `toast.component.spec.ts`, `api-error.util.spec.ts` (`getErrorCorrelationId`). |
| PRU-08 | `coverageReporter.check.global` en `karma.conf.js`: sentencias 90, ramas 78, funciones 90, líneas 90. | `npm run test:ci`: 94,15 % / 81,72 % / 94,40 % / 95,12 %; la compuerta corre en cada `test:ci`. |
| PRU-11 | Bordes del tope `MAXIMO_TOMAS_POR_SESION = 20`. | `session-tomas-panel.component.spec.ts` (19 de 20 abre, 20 de 20 y 21 de 20 bloquean con el motivo) y `attendance-control.tomas.spec.ts` (`TOM_004` del backend se muestra y no pide QR). |
| PRU-13 | Bordes del plazo de reclamo. | `attendance-claim.service.spec.ts` (04:59:59Z → 23:59 en Bogotá y 04:59 en UTC; 05:00:00Z → 00:00 del día siguiente; la vigencia es la del backend aunque el reloj local diga lo contrario) y `student-course-detail.component.spec.ts` (botón "Reclamar esta toma" en el último minuto válido, sin botón en el primero vencido). |
| PRU-14 | `nivelAsistencia` compara tras `redondearPorcentaje` (decisión 3A); el semáforo anuncia el valor redondeado. | `nivel-asistencia.spec.ts` (19,99 / 19,994 / 19,995 / 20,00 / 20,01 y 14,994 / 14,995) y `semaforo-asistencia.component.spec.ts`. |
| PRU-03 | Copia byte a byte del OpenAPI golden path (Infra develop 40658ce, SHA-256 c2e6d28f…) y `scripts/check-openapi-contract.mjs` en `verify` y en el CI. | `OPENAPI_CONTRACT_PASS sha256=c2e6d28f4842 llamadas=3 dtos=10`. Prueba negativa manual: un tipo cambiado, una propiedad inventada y un valor de enum fuera del contrato dan exit 1 con los tres mensajes. Aviso: el contrato no lista `COORDINADOR` en `CancelacionSesion.tipo` (DEC-065). |
| CF-04 | `inlineCritical: false` (el index ya no trae `onload`) y `script-src-attr 'none'`. `verify-docker-runtime.mjs` comprueba la CSP del contenedor y que el index no tenga manejadores en línea. | Build de producción: `<link rel="stylesheet" href="styles-….css">` sin `onload`. El paso Docker se valida en el CI (esta PC no corrió Docker). |
| EST-10 | Simulador del backend en carga diferida (`mockBackendLazyInterceptor`) y `ToastService` separado del componente. | Bundle inicial 568,22 kB → 499,02 kB (presupuesto 500 kB, sin aviso). `mock-backend-lazy.interceptor.spec.ts`. |
| EST-11 | Migración oficial a `inject()` (20 archivos), variables e imports sin uso, `this` alias, `!=` en plantillas, etiquetas asociadas, foco y teclado en clics, output `cancel` → `cancelar`, alias de `totalPages` retirado, anfitriones de prueba en OnPush, `window.env` tipado. 13 reglas pasan a `error`. | ESLint: 450 avisos → 0 errores y 315 avisos, todos `no-explicit-any` (265 en specs, 17 en el simulador, 33 en normalizadores y servicios). |
| PRU-06, EST-07, EST-08, SEC-05, SEC-08, TRI-03 | GitHub (`shesho22/AsistenciasUCO-Frontend`): Dependency graph activo (repo público), Dependabot alerts, secret scanning y push protection activos; `develop` exige PR, rama al día y los checks `build-test-verify` (incluye las compuertas Trivy), `CodeQL JavaScript/TypeScript Analysis`, `Gitleaks Secret Scan`, `Dependency Review`, `SonarCloud Code Analysis` y, desde el 2026-11-14, `E2E Playwright (Chromium, backend simulado)`. | `gh api repos/shesho22/AsistenciasUCO-Frontend/branches/develop/protection` y `security_and_analysis`. |

## MSG-02: proveedor del catálogo de mensajes por ambiente

El frontend no elige proveedor: muestra el `message` que el backend ya resolvió y usa `core/messages/mensajes-ui.ts` solo
para textos propios. El proveedor lo fija el backend con `APP_ADAPTERS_MESSAGE_CATALOG_PROVIDER` (guía:
`AsistenciasUCO-Infra/docs/hardening/MESSAGE_CATALOG_SWITCH_GUIDE.md`).

| Ambiente | Perfil del backend | Proveedor por defecto | Nota |
|---|---|---|---|
| Nube / producción | sin perfil | `azure` (App Configuration) | Exige `AZURE_APPCONFIG_ENDPOINT` (SEC-12). |
| Desarrollo local y `dev` | `local`, `dev` | `sqlserver` | Lee la tabla de mensajes de la BD. |
| Laboratorio del equipo y demo | `local` con `.env` | `messageucolab` | `MESSAGEUCOLAB_*` apunta a la app "Asistencias UCO" que administra `uco-administrador`. |
| Pantalla de administración de mensajes del frontend | — | micro frontend `minifront-mensajes` | `MESSAGEUCOLAB_API_BASE_URL`, `MESSAGEUCOLAB_APPLICATION_NAME` y `MESSAGEUCOLAB_ENVIRONMENT_NAME` en `env.js`. |

## Corrida final (2026-11-14)

| Compuerta | Comando | Resultado |
|---|---|---|
| Lint | `npm run lint` | 0 errores, 315 avisos (todos `no-explicit-any`) |
| Unitarias + cobertura | `npm run test:ci` | 2.999 SUCCESS, 0 fallos; 94,15 % sentencias, 81,72 % ramas, 94,40 % funciones, 95,12 % líneas (umbral global PRU-08 cumplido) |
| Realtime | `npm run coverage:realtime:check` | PASSED |
| Compuertas de fuente | `check:retiro-solicitudes`, `check:registro-individual`, `check:hu-en-ui`, `check:mensajes-ui` | OK (135 códigos en el catálogo) |
| Contrato OpenAPI | `npm run check:openapi-contract` | `OPENAPI_CONTRACT_PASS sha256=c2e6d28f4842 llamadas=3 dtos=10` (2 avisos: `COORDINADOR` fuera del contrato) |
| Build de producción | `ng build --configuration=production` | OK; bundle inicial 498,89 kB (presupuesto 500 kB) |
| E2E | Playwright 1.64.1 con el Chrome del sistema (`channel: 'chrome'`, configuración temporal fuera del repo) sobre el build de producción y el backend simulado | 21 passed |

La primera corrida de `npm run verify` falló en el build: el tipo nuevo de `admin-instituciones` no incluía cuatro campos
que la plantilla lee (`rector`, `activa`, `correoContacto`, `totalFacultades`). Se corrigió con un tipo de vista y el build
quedó en verde.

## Limitaciones

- No se corrió Docker en esta PC: la verificación de CSP del contenedor y la imagen quedan para el CI.
- MSG-06 y MSG-03 siguen PARCIAL (ver PLAN.md, fuera de alcance).
- F12-06 / REA-04 (QR por SSE con 2 réplicas) dependen del backend.
