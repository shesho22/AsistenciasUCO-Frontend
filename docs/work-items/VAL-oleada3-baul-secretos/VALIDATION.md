# VAL-oleada3-baul-secretos (Frontend) - VALIDATION

Fecha: 2026-11-13.

| Prueba | Resultado |
|---|---|
| `sh -n docker-entrypoint.d/40-env-js.sh` | OK |
| Copia del entrypoint con rutas de nginx cambiadas a una carpeta temporal: `SECURITY_PROVIDER=baseline` sin id | exit 1 con el mensaje "SECURITY_BASELINE_APPLICATION_ID es obligatorio con SECURITY_PROVIDER=baseline" |
| Igual, con `SECURITY_BASELINE_APPLICATION_ID=application-test` | exit 0; `env.js` contiene `application-test` |
| Igual, `SECURITY_PROVIDER=legacy` sin id | exit 0 |
| `docker compose -f docker-compose.yml config` con y sin la variable | con valor: se conserva; sin valor: `""` (ya no el id real) |
| `npx eslint src/environments/environment.ts` | 0 errores (15 advertencias `no-explicit-any` previas) |
| `npm run test:docker-runtime` | NOT_RUN (necesita construir la imagen); ese script ya pasa el id explícito, así que sigue siendo compatible |
| Pruebas unitarias (Karma) | NOT_RUN: en este equipo `ng test` falla antes de empezar (no encuentra el builder `@angular-devkit/build-angular:karma`), problema del entorno local ajeno al cambio. `npx tsc -p tsconfig.app.json` muestra un error previo en `form-field.component.ts` (`afterRender`), ajeno al cambio. |

Diff revisado: no agrega secretos. `public/assets/env.js` (modificado localmente) no se sube.
