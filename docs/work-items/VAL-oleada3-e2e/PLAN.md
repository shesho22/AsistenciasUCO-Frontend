# PLAN — VAL-oleada3-e2e (frontend, PRU-06)

Origen: `informes/LISTA_CHEQUEO_VALIDACION_2026-11-12.md`, ítem **PRU-06** ("no hay Playwright ni Cypress en
`FE/package.json`; 5 a 8 recorridos E2E automatizados"). Rama local `fix/VAL-oleada3-e2e-playwright` (desde `origin/develop`).

## Objetivo

Pruebas E2E reales y automatizadas con Playwright que recorran los flujos principales de cada rol y corran en CI sin
backend ni Keycloak.

## Decisiones

| Tema | Decisión | Motivo |
|---|---|---|
| Herramienta | `@playwright/test` **1.64.1** fijado exacto en `devDependencies` (publicado 2026-10-14). Solo Chromium. | Versión con más de dos semanas; un navegador basta para el objetivo y reduce el tiempo de CI. |
| Backend | Backend simulado del propio frontend (`mock-backend.interceptor.ts` + `mockStore`) con `USE_MOCKS=true`. | Corre en CI sin backend, base de datos ni Keycloak; los datos son deterministas (cada prueba abre una página nueva, y el `mockStore` arranca igual). |
| Configuración de prueba | `e2e/support/serve-dist.mjs` sirve el **build de producción** y reemplaza solo `/assets/env.js` por `e2e/support/env.e2e.js` (`USE_MOCKS=true`, `SECURITY_PROVIDER=legacy`, `API_URL` al mismo origen). | No hace falta una configuración nueva de Angular: `angular.json`, `environment.ts`, `public/assets/env.js` y la imagen Docker quedan iguales. Se prueba el mismo bundle que se publica. |
| Login | Formulario legacy en modo mock: el rol se resuelve por el correo de la cuenta simulada (`src/app/core/mocks/user.mock.ts`); la contraseña no se valida. | No hay credenciales reales en el repositorio. |
| Navegación | Por el menú lateral cuando el módulo está en él; si no, `navegarEnApp` (pushState + popstate, igual que un enlace del router). | En modo mock una recarga completa vuelve a abrir la sesión simulada de DOCENTE (`AuthService.initKeycloak`). |
| Red | Fixture automático que aborta toda petición fuera del origen bajo prueba y falla ante cualquier excepción no controlada (`pageerror`). | Determinismo y ninguna salida a internet desde el navegador de prueba. |
| Esperas | Solo aserciones web-first de Playwright (`toBeVisible`, `toHaveURL`, `toHaveCount`), sin `waitForTimeout`. | Sin esperas arbitrarias; 0 reintentos (`retries: 0`) para que un flake se vea. |
| `npm run verify` | **Sin cambios.** | E2E necesita el navegador de Playwright descargado y un segundo build; en CI corre como job propio (`e2e`) en paralelo al job principal. |

## Archivos

| Archivo | Qué hace |
|---|---|
| `playwright.config.ts` | Configuración: `testDir: e2e`, Chromium 1366x900, `es-CO` / `America/Bogota`, 2 workers, `retries: 0`, `trace: off`, captura solo al fallar, reporte HTML en `playwright-report/`. Levanta `serve-dist.mjs` salvo que se fije `E2E_BASE_URL`. |
| `e2e/support/serve-dist.mjs` | Servidor estático mínimo (Node, sin dependencias) con fallback de SPA en `127.0.0.1:4300` (`E2E_PORT`). |
| `e2e/support/env.e2e.js` | Configuración de runtime solo para E2E (backend simulado). |
| `e2e/support/fixtures.ts` | Cuentas por rol, `iniciarSesion`, `navegarEnApp`, `abrirModulo` y el fixture de red y errores. |
| `e2e/autenticacion.spec.ts` | Login (validaciones), inicio por rol (5 roles) y cierre de sesión. |
| `e2e/guardas-de-rol.spec.ts` | `roleGuard`: una ruta de otro rol termina en la página 403 para cada rol. |
| `e2e/flujos-por-rol.spec.ts` | Recorridos principales por rol. |
| `e2e/tsconfig.json` | Chequeo de tipos de las pruebas (`npm run e2e:typecheck`). |
| `package.json` | Scripts `e2e`, `e2e:build`, `e2e:run`, `e2e:typecheck`; `@playwright/test` 1.64.1. |
| `.github/workflows/frontend-ci.yml` | Job `e2e` (acciones fijadas por SHA, mismo estilo que el resto). |
| `.gitignore` | `playwright-report/`, `test-results/`, `blob-report/`. |

## Cómo correr

```bash
npx playwright install chromium      # una vez por máquina (descarga del CDN oficial de Playwright)
npm run e2e                          # build de producción + suite
npm run e2e:run                      # solo la suite, reutilizando el build de dist/
npx playwright show-report           # abrir el reporte HTML
```

En CI (`frontend-ci.yml`, job `e2e`): `npm ci` → `npm run e2e:typecheck` → `npx playwright install --with-deps chromium`
→ `npm run e2e:build` → `npx playwright test --trace off` (headless) → si falla, sube `playwright-report/` y
`test-results/` como artefacto `playwright-report` (14 días).

## Contra un entorno desplegado (más adelante)

`E2E_BASE_URL` apunta la suite a un frontend ya desplegado y no levanta el servidor local:

```bash
E2E_BASE_URL=https://staging.example.edu.co E2E_ALLOWED_ORIGINS=https://api.staging.example.edu.co npm run e2e:run
```

- `E2E_ALLOWED_ORIGINS` (separados por coma) habilita orígenes adicionales; por defecto el fixture bloquea todo lo que
  no sea el origen bajo prueba.
- Tal como están, las pruebas asumen el **backend simulado** (cuentas y datos de `mockStore`). Contra un despliegue que
  sirva un `env.js` con `USE_MOCKS=true` y `SECURITY_PROVIDER=legacy` corren igual.
- Contra el **stack real** (backend + PDP baseline + Keycloak) falta: (1) un proyecto `setup` de Playwright que haga el
  login institucional real (redirección al IdP) y guarde `storageState` por rol con cuentas de prueba tomadas de
  variables de entorno o secretos de CI, nunca del repositorio; (2) datos semilla conocidos para reemplazar los nombres y
  conteos del mock en las aserciones. Las aserciones de guardas de rol y de inicio por rol se reutilizan casi sin cambios.
