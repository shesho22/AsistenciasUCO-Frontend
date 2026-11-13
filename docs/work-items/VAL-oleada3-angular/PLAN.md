# PLAN — VAL-oleada3-angular (frontend, EST-10)

Origen: `informes/LISTA_CHEQUEO_VALIDACION_2026-11-12.md`, ítem EST-10 (y TRI-03 por `.trivyignore`).
Rama local `fix/VAL-oleada3-angular`, cortada de `origin/develop` (999f493).

## Problema

`.trivyignore` tenía 15 excepciones (14 CVE de Angular 18 + `source-map-js`), todas con vencimiento
2027-02-12, porque Angular 18 está fuera de soporte y no recibe parches. La corrección de fondo es subir
de versión mayor de Angular; las excepciones eran un puente.

## Objetivo

Subir a la última versión mayor estable de Angular con al menos dos semanas de publicada, un salto mayor
a la vez con las migraciones oficiales de `ng update`, y dejar la compuerta Trivy del CI sin excepciones
de Angular.

## Versión objetivo (registro npm, consultado 2026-11-13)

| Paquete | `latest` | Elegida | Publicada | Motivo |
|---|---|---|---|---|
| `@angular/core` y demás `@angular/*` del framework | 22.2.6 (2026-11-12) | **22.2.4** | 2026-10-29 | 22.2.5 y 22.2.6 tienen menos de dos semanas |
| `@angular/cli`, `@angular/build` | 22.2.x | **22.2.4** | 2026-10-22 | ídem |
| `angular-eslint` | 22.6.0 | **22.6.0** | 2026-10-11 | |

Angular 22 exige Node `^22.22.3 || ^24.15.0 || >=26` y TypeScript `>=6.0 <6.1`; por eso también sube
Node en el `Dockerfile` (etapa de build) y en el CI.

## Pasos (un commit por salto mayor)

1. 18 → 19: `ng update @angular/core@19 @angular/cli@19`, `ng update angular-eslint@19`.
2. 19 → 20: `ng update @angular/core@20 @angular/cli@20`, `ng update angular-eslint@20` y la migración
   opcional `use-application-builder` (builder `@angular/build`, también para Karma).
3. 20 → 21: `ng update @angular/core@21 @angular/cli@21`, `ng update angular-eslint@21`.
4. 21 → 22: `ng update @angular/core@22.2.4 @angular/cli@22.2.4`, angular-eslint 22.6.0;
   versiones fijas (sin `^`) en `package.json`; Node 22.23.4 en `Dockerfile` y CI. Se retira `lucide-angular`
   (sin uso, su peer no admite Angular 22).
5. Quitar de `.trivyignore` las entradas que ya no aplican y correr Trivy con la misma configuración
   de la compuerta del CI.

En cada paso: `npm run lint` (0 errores) y `npm run verify` (Karma + umbrales de cobertura + build de
producción). El detalle de migraciones, arreglos manuales y resultados está en
[VALIDATION.md](VALIDATION.md).

## Estado

Hecho: Angular 22.2.4 con `verify` y `lint` en verde y Trivy sin excepciones. Ver [VALIDATION.md](VALIDATION.md).

## Fuera de alcance

- Build de la imagen Docker (pesado en el portátil): lo valida el CI (`docker build` + Trivy de imagen).
- Suite E2E de Playwright: vive en la rama `fix/VAL-oleada3-e2e-playwright`, no en `develop`.
- Migraciones opcionales de `ng update` que no se ejecutaron (`provide-initializer`, `router-current-navigation`,
  `migrate-karma-to-vitest`): no son necesarias para compilar ni para la seguridad; se listan en VALIDATION.md.
