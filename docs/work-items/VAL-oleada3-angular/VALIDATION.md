# VALIDATION — VAL-oleada3-angular (frontend, EST-10)

Fecha: 2026-11-13. Rama local `fix/VAL-oleada3-angular` (desde `origin/develop` 999f493). Sin push ni PR.
Entorno local: Windows 10, Node 24.19.0, npm 11.17.0. `public/assets/env.js` tiene un cambio local que no se
sube.

## Versiones antes y después

| Paquete | Antes (develop) | Después |
|---|---|---|
| `@angular/*` (animations, common, compiler, core, forms, platform-browser, platform-browser-dynamic, router, compiler-cli) | `^18.1.0` (instalado 18.2.14) | `22.2.4` fijo |
| `@angular/cli` | `^18.1.0` (18.2.21) | `22.2.4` fijo |
| Builder | `@angular-devkit/build-angular` `^18.1.0` | `@angular/build` `22.2.4` (build, serve, extract-i18n y karma) |
| `typescript` | `~5.5.2` (5.5.4) | `6.0.3` fijo |
| `zone.js` | `~0.14.3` (0.14.10) | `0.16.3` fijo |
| `angular-eslint` | `18.4.3` | `22.6.0` |
| `eslint` / `typescript-eslint` / `@eslint/js` | 9.39.5 / 8.72.2 / 9.39.5 | sin cambio (8.72.2 soporta TypeScript 6.0) |
| `istanbul-lib-instrument` | — | `6.0.3` (la agrega la migración de la CLI 22 para Karma) |
| `lucide-angular` | `^1.0.0` | retirado: no se importa en ningún archivo y su peer llega solo a Angular 21 |
| `source-map-js` (transitiva de postcss) | 1.2.1 | 1.2.2 |
| Node en el `Dockerfile` (etapa build) | `node:20-alpine` | `node:22.23.4-alpine@sha256:0e1754…f8202` |
| Node en `frontend-ci.yml` | `'20'` | `'22.23.4'` |

Angular 22 exige Node `^22.22.3 || ^24.15.0 || >=26.0.0` y TypeScript `>=6.0 <6.1`. Se eligió 22.2.4 porque
22.2.5 (2026-11-06) y 22.2.6 (2026-11-12) tienen menos de dos semanas; Node 22.23.4 (2026-10-20) por la
misma regla (22.23.5 es del 2026-11-11).

Los saltos intermedios usaron lo que trajo `ng update` (19.2.25, 20.3.35, 21.2.26); solo el destino se fijó.

## Commits

| Commit | Paso |
|---|---|
| `dfaa47b` | 18 → 19 |
| `a1722bd` | 19 → 20 y builder `@angular/build` (incluye PLAN.md) |
| `dc2b3e9` | 20 → 21 |
| `a2c454e` | 21 → 22.2.4, versiones fijas, Node 22 en Dockerfile y CI |
| (último) | `.trivyignore` sin excepciones, README y esta validación |

## Migraciones aplicadas (`ng update`)

| Salto | Migraciones con cambios |
|---|---|
| 18 → 19 | Standalone por defecto: quita `standalone: true` y marca `standalone: false` donde aplica (149 archivos). |
| 19 → 20 | Valores por defecto de generación en `angular.json` (`schematics`). Opcional ejecutada: `use-application-builder` (build/serve/karma a `@angular/build`). |
| 20 → 21 | Control flow en bloques (`@if`/`@for`/`@switch`) en 89 componentes, retira `CommonModule` sin uso; `lib` de `tsconfig.json` al valor por defecto del target. |
| 21 → 22 | `withXhr()` en `provideHttpClient` (101 archivos, mantiene el backend XHR); `ChangeDetectionStrategy.Eager` en 10 anfitriones de prueba (8 `*.spec.ts`, Angular 22 pasa el defecto a OnPush); `$safeNavigationMigration()` en 6 plantillas (conserva la semántica previa de `?.`); supresión de `nullishCoalescingNotNullable` y `optionalChainNotNullable` en `tsconfig.app.json`/`tsconfig.spec.json`; `istanbul-lib-instrument` en devDependencies. |

Migraciones opcionales no ejecutadas: `provide-initializer` (19), `router-current-navigation` (20/21),
`migrate-karma-to-vitest` (22). No hacen falta para compilar ni para la seguridad.

## Arreglos manuales

| Salto | Problema | Arreglo |
|---|---|---|
| 19 | La migración standalone falló: `has-role.directive.ts` y su spec estaban en Windows-1252. | Se pasaron a UTF-8 (incluido el guion largo 0x97 → `—`) y se repitió `ng update --migrate-only`. |
| 19 | 9 pruebas fallaron: en Angular 19 los `effect()`/`toObservable()` de componente corren en la detección de cambios, no en microtarea. | `teacher-grupos.component.spec.ts`: el mock de `RealtimeService` expone `connectionState$` (la sábana ya arranca su tiempo real). `coordinator-docentes.component.spec.ts`: `fixture.detectChanges()` antes de cada `tick()` que espera una recarga. Sin cambios en código de producción. |
| 20 | `afterRender` se retiró de `@angular/core`. | `form-field.component.ts` usa `afterEveryRender` (mismo comportamiento). |
| 20 | El karma de webpack (`@angular-devkit/build-angular:karma`) no resolvía las fuentes `@fontsource` que Tailwind 4 inlinea en `styles.css`. | Migración `use-application-builder`: karma pasa a `@angular/build:karma` (esbuild); `karma.conf.js` deja el framework/plugin de `build-angular`. |
| 20 | La migración de angular-eslint aflojó `eslint` y `typescript-eslint` a rangos `^` y duplicó `postcss` en devDependencies. | Se dejaron fijos (9.39.5 / 8.72.2) y se quitó el `postcss` duplicado. |
| 20 | Regla nueva `@angular-eslint/prefer-inject` (24 errores: servicios con inyección por constructor). | Queda en `warn` en `eslint.config.js`; el refactor se hace aparte con `ng generate @angular/core:inject`. |
| 22 | `ng update` rechazó el salto por el peer de `lucide-angular` (13.x–21.x). | Se retiró `lucide-angular`: no lo importa ningún archivo del repo (`git grep`). `@lucide/angular` tampoco se usa; se deja por ahora. |
| 22 | Regla nueva `@angular-eslint/prefer-on-push-component-change-detection` (10 errores en los anfitriones de prueba marcados `Eager` por la migración). | Queda en `warn`. |
| 22 | Tras `npm install`, `minifront-mensajes` (dependencia git) quedó sin `dist/` y el build falló. | Problema de la instalación local (npm 11 no corrió su `prepare`); se reinstaló el paquete. No cambia archivos del repo. En el CI y el Dockerfile se instala con `npm ci` desde cero. |

## Resultados

### `npm run verify` (Karma + umbrales + checks + build de producción), un salto a la vez

| Salto | Resultado | Pruebas | Statements | Branches | Lines | Realtime (líneas / ramas) |
|---|---|---|---|---|---|---|
| 19 (antes de arreglar) | falla | 9 FAILED / 2744 | | | | |
| 19 | OK | 2744 SUCCESS | 93.17% | 79.84% | 94.15% | 95.26% / 86.81% |
| 20 | OK | 2744 SUCCESS | 93.16% | 79.84% | 94.15% | 95.26% / 86.81% |
| 21 | OK | 2744 SUCCESS | 93.16% | 79.79% | 94.18% | 95.26% / 86.81% |
| 22.2.4 | OK | 2744 SUCCESS | 93.16% | 79.79% | 94.18% | 95.26% / 86.81% |

Build de producción en 22.2.4: OK. Avisos que no bloquean:
- Presupuesto `initial` de 500 kB excedido (aviso, el error es a 1 MB). Ya estaba en 19 (524.92 kB); en 22 es
  558.02 kB (+33 kB, sobre todo `@angular/core` 22).
- NG8113: imports sin uso en 5 componentes (`CardComponent`, `IconComponent`, `RouterLink`); limpieza aparte.
- En Karma: NG01354 (ngModel dentro de un componente hijo no se registra en el `NgForm` del padre; el
  comportamiento es el mismo de antes, Angular 22 solo lo avisa), NG0953 y NG0956 en pruebas.

### `npm run lint`

0 errores en cada salto. Avisos: 427 (18/19) → 451 (20, +24 `prefer-inject`) → 461 (22, +10 OnPush).

### Trivy (filesystem, igual que la compuerta del CI)

`aquasec/trivy:0.74.0` (`TRIVY_VERSION` de `frontend-ci.yml`), sobre el árbol del commit (`git archive`, como
el checkout del CI, sin `node_modules`, `dist` ni `coverage`):
`trivy fs . --scanners vuln,misconfig,secret --severity HIGH,CRITICAL --ignore-unfixed --skip-dirs node_modules,dist,coverage --ignorefile .trivyignore --exit-code 1`.

| Corrida | Resultado |
|---|---|
| Sin archivo de excepciones (vacío), `--ignore-unfixed` | exit 0: `package-lock.json` 0 vulnerabilidades, `Dockerfile` 0 misconfiguraciones, 0 secretos |
| Con el `.trivyignore` nuevo (sin entradas), compuerta | exit 0 |
| Inventario (sin `--ignore-unfixed`) | 0 HIGH/CRITICAL |

Excepciones retiradas de `.trivyignore` (las 15): CVE-2026-50170, CVE-2026-54266, CVE-2026-68945,
CVE-2026-54267, CVE-2026-101896, CVE-2026-111752 (SSR/hidratación), CVE-2026-32635, CVE-2026-69151,
CVE-2026-27970 (i18n), CVE-2026-50171, CVE-2026-54268 (DoS de pipes), CVE-2025-66412, CVE-2026-22610
(compilador SVG/MathML), CVE-2025-66035 (XSRF a URL relativa al protocolo) y CVE-2026-93749 (`source-map-js`).
El archivo queda sin entradas, con un comentario de formato, porque el CI lo pasa en `trivyignores`.

No se construyó la imagen Docker en local (pesado para el portátil): el job del CI hace `docker build` con
`node:22.23.4-alpine` y corre el Trivy de imagen. Es la primera corrida con Node 22: revisar ese job.

Nota local: Trivy sobre el directorio montado de Windows agota el tiempo (5 min) recorriendo `node_modules`;
por eso el escaneo se hizo sobre el `git archive` del commit dentro del contenedor.

### `npm audit --omit=dev`

0 vulnerabilidades (0 low, 0 moderate, 0 high, 0 critical).

Con dependencias de desarrollo (`npm audit`): 13 (1 low, 9 moderate, 3 high, 0 critical). Las 3 HIGH son solo
de desarrollo: `body-parser` < 1.20.9 y `follow-redirects` 1.16.0 (vía Karma), y `vite` 8.3.0–8.3.2 (vía
`@angular/build` 22.2.4; se corrige con `@angular/build` 22.2.7, que todavía no cumple las dos semanas). Trivy no
las reporta porque no escanea dependencias de desarrollo.

### E2E (Playwright)

La suite vive en la rama `fix/VAL-oleada3-e2e-playwright` y no está en `develop`; no se corrió aquí. Al unir
las dos ramas hay que correr `npm run e2e` sobre Angular 22.

## Pendiente

1. CI: primera corrida con Node 22.23.4 y `@angular/build` (job de build de imagen y Trivy de imagen).
2. Subir `@angular/*` a 22.2.6+ y `@angular/build` a 22.2.7+ cuando cumplan dos semanas (quita la HIGH de `vite`
   de desarrollo), y `npm audit fix` para `body-parser`/`follow-redirects` (desarrollo).
3. Deuda que deja el salto (avisos, no errores): `prefer-inject` (24), OnPush en anfitriones de prueba (10),
   `$safeNavigationMigration()` en 6 plantillas, NG8113 en 5 componentes, `allowSignalWrites` obsoleto (7 archivos) en
   `effect()`, presupuesto inicial de 500 kB.
4. Opcional: `migrate-karma-to-vitest` (Karma está deprecado en Angular 22) y retirar `@lucide/angular` (sin uso).
