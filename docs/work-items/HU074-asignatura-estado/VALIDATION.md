# VALIDATION — HU074: Activar o inactivar asignaturas (frontend)

Fecha: 2026-11-19. Rama local: `feat/HU074-HU178-asignatura-estado-ambito` (sin commit). Windows 10, Chrome Headless 157.

## Prueba en pantalla (John, con el backend nuevo)

Diálogos de activar e inactivar, insignia «Inactiva» y toasts `ASI_009`, `ASI_011` y `ASI_012`: OK. De esa prueba salió el
ajuste de «Nuevo grupo» (ver `PLAN.md`), validado aquí con pruebas unitarias.

## Gates (ejecutados uno a la vez, en este orden)

| Comando | Resultado |
|---|---|
| `npm run lint` | exit 0, sin hallazgos |
| `npm run lint:tokens` | OK: sin paleta por defecto ni colores literales; controles con nombre accesible y `th` con `scope` |
| `npm run check:mensajes-ui` | OK (142 códigos en el catálogo, ningún toast con texto literal) |
| `npm run check:hu-en-ui` | OK (sin códigos de HU en la interfaz) |
| `npm run check:matriz-hu` | FAIL la primera vez (faltaba el spec de grupos); tras `npm run sync:matriz-hu`: `MATRIZ_HU_PRUEBAS_PASS hu=74 archivos=98/303`. HU074: 6 archivos, 159 pruebas contadas por el script |
| `npm run check:openapi-contract` | `OPENAPI_CONTRACT_PASS sha256=c2e6d28f4842 llamadas=3 dtos=10`. Dos avisos ya existentes (`cancelacion.tipo` acepta `COORDINADOR`), ajenos a HU074 |
| `npm run check:retiro-solicitudes` | OK |
| `npm run check:registro-individual` | OK |
| `npm run check:mensajes-ui-catalogo` | FAIL **ya existente** en `develop` (`mensajes-ui-codigos-remotos.ts` y `.psv` desactualizados). HU074 no toca el catálogo; no se corrigió por indicación de John |
| `npm test -- --watch=false --browsers=ChromeHeadless --include=<6 specs>` | 1.ª corrida: `TOTAL: 1 FAILED, 159 SUCCESS`. La prueba del mock dependía del orden (otra prueba quita SIS-101 del almacén simulado); ahora parte de `MOCK_ASIGNATURAS_PLAN`. 2.ª y 3.ª corridas: `TOTAL: 160 SUCCESS`, exit 0 |
| `npm run build -- --configuration=production` | exit 0 (35 s). Avisos: presupuesto del bundle inicial 509.78 kB sobre 500 kB (+9.78 kB) y NG8113 en `ProfileComponent` y `AdminEmailManagementComponent`, archivos que HU074 no toca. No se midió el bundle inicial de `develop` para comparar |

Specs incluidos: `coordinator-management.service.spec.ts`, `study-plan-mesh.component.spec.ts`,
`study-plan-mesh-page.component.spec.ts`, `dean-plan-malla.component.spec.ts`, `mock-backend.interceptor.spec.ts`,
`coordinator-groups.component.spec.ts`.

## Chequeos previos

`npx eslint` de los `.ts` cambiados, `npx tsc --noEmit -p tsconfig.app.json` y `-p tsconfig.spec.json`: exit 0.

## Prueba en pantalla de «Nuevo grupo» (John, 2026-11-19)

Hecha: con PRB-074 inactiva, la asignatura no aparece en el combo «Asignatura» de Programa → Grupos → «Nuevo grupo». OK.

## Ronda 2 (2026-11-19): ajustes de la revisión independiente

Cuerpo `{ estaActiva }` con el estado deseado (idempotencia), bloqueo de doble envío hasta el fin de la recarga, toast de
respaldo `UI_STUDY_PLAN_MESH_PAGE_005/006`, spec del 409 con caché precargado, restauración de `mockStore` en `afterEach`,
mock con cuerpo idempotente (ver `PLAN.md` y `TEST_PLAN.md`).

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` / `-p tsconfig.spec.json` | exit 0 |
| `npm run lint` | exit 0, sin hallazgos |
| `npm run lint:tokens` | OK (tokens y a11y) |
| `npm run check:mensajes-ui` | OK (144 códigos en el catálogo, ningún toast con texto literal) |
| `npm run check:mensajes-ui-catalogo` | `MENSAJES_UI_CATALOGO_PASS textos=144 remotos=144`. Los dos códigos nuevos (`UI143`, `UI144`) se agregaron en `mensajes-ui-codigos-remotos.ts` y en el `.psv`; `--write` no produce ninguna otra diferencia. La falla «ya existente» de la ronda 1 era de fin de línea: con `core.autocrlf=true` la copia de trabajo queda en CRLF y el script compara texto exacto con su salida LF; en el índice (LF, como en el CI) no hay desalineación |
| `npm run check:hu-en-ui` | OK |
| `npm run check:matriz-hu` | FAIL (conteos de pruebas desactualizados) → `npm run sync:matriz-hu` (solo cambian conteos) → `MATRIZ_HU_PRUEBAS_PASS hu=74 archivos=98/303`. HU074: 6 archivos, 166 pruebas contadas |
| `npm run check:openapi-contract` | `OPENAPI_CONTRACT_PASS sha256=c2e6d28f4842 llamadas=3 dtos=10` (mismos dos avisos ajenos de `cancelacion.tipo`) |
| `npm run check:retiro-solicitudes` / `check:registro-individual` | OK / OK |
| `ng test --watch=false --browsers=ChromeHeadless` (6 specs de HU074 + `mensajes-ui.spec.ts`) | `TOTAL: 173 SUCCESS`, exit 0 |
| `npm run build -- --configuration=production` | exit 0 (36 s). Mismos avisos ya existentes: presupuesto del bundle inicial 509.90 kB sobre 500 kB (+9.90 kB; ronda 1: 509.78 kB) y NG8113 en `ProfileComponent` y `AdminEmailManagementComponent` |

## Pendiente

- `npm run test:ci` completo y `npm run coverage:realtime:check` (no se pidieron en esta ronda).
- Prueba en pantalla del doble clic y del cuerpo `{ estaActiva }` contra el backend nuevo (cuando backend y BD suban su parte).
