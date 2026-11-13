# VAL-oleada3-baul-secretos (Frontend) - PLAN

Fecha: 2026-11-13. Rama local `fix/VAL-oleada3-baul-secretos` desde `origin/develop`.
Ítem de `informes/LISTA_CHEQUEO_VALIDACION_2026-11-12.md`: SEC-12 (id real de la aplicación como valor por defecto en
`docker-entrypoint.d/40-env-js.sh`). El resto del ítem está en el backend.

## Cambios

| Archivo | Cambio |
|---|---|
| `docker-entrypoint.d/40-env-js.sh` | `SECURITY_BASELINE_APPLICATION_ID` sin valor por defecto. Con `SECURITY_PROVIDER=baseline` y el id vacío, el contenedor no arranca y explica qué falta (igual que con un `SECURITY_PROVIDER` inválido). En modo `legacy` no se exige. |
| `docker-compose.yml` | El valor por defecto pasa a vacío; el id se toma del `.env` (ver `.env.example`). |
| `src/environments/environment.ts` | El respaldo de `security.applicationId` pasa a `''`; el id lo entrega `env.js`. |

`.env.example` conserva el id como ejemplo (es el lugar de los ejemplos). `public/assets/env.js` no se toca ni se sube.

## Rollback

Revertir el commit.
