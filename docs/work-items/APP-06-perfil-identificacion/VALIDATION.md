---
status: active
type: validation
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-03
---

# VALIDATION — APP-06 Identificación en el perfil

## Sincronización

| Copia | Rama / referencia | SHA | Acción |
|---|---|---|---|
| Frontend personal | `develop` = `origin/develop` | `5f60dccf26ea370b0a42be3b30d92e9bb941fdb8` | Fast-forward desde `b2a27d2` (4 commits APP-05, PR #33) |
| Backend personal | `develop` = `origin/develop` | `9b765b076a5f5940d69d84c6ab2bc0cf9aa890fb` | Ya actualizado; `.codex/` y evidencias FIX-003 sin seguimiento preservadas |
| DB personal | `develop` = `origin/develop` | `fe1ccd710aed4f84416bdfe03da36976797ce7df` | Ya actualizado |

Backend y DB sin cambios de archivos ni ramas nuevas.

## Cambios

- `PerfilInstitucionalStore` (nuevo): estado en memoria del GET de perfil, provisto por `ProfileComponent`; un GET por pantalla; reintento explícito tras error; limpieza en `DestroyRef`.
- `ProfileComponent`: provee el store; deja de llamar `AuthService.fetchProfileFromBackend` (bandera obsoleta); resumen y "Datos Institucionales" muestran tipo y número desde la API (`data-testid` estables) y el correo/nombres del perfil institucional.
- `ProfileLinksComponent`: lee el mismo store; `null` → "Sin registrar"; estado "sin datos" distinto del error; botón "Reintentar".
- Sin cambios en `AuthService`, interceptores, guards, environments, contrato HTTP ni edición.

## Pruebas automatizadas

| Fase | Comando | Resultado |
|---|---|---|
| RED (649219a) | `npx ng test --watch=false --browsers=ChromeHeadlessCI --include='src/app/features/profile/**/*.spec.ts'` | Exit 1; `TOTAL: 9 FAILED, 19 SUCCESS`. Fallaron ID-02, ID-03, ID-04, ID-06 (401, 403), ID-07, ID-08, ID-09 e ID-10 por aserción. |
| GREEN (7587811) | Mismo `--include` (incluye store spec) | Exit 0; `TOTAL: 37 SUCCESS`. |
| Integridad RED | `git diff 649219a HEAD -- src/app/features/profile/profile.identificacion.spec.ts` | Sin diferencias. |
| Suite + cobertura + build | `npm run verify` | Exit 0; `TOTAL: 1416 SUCCESS` (1395 previos + 21 nuevos). Statements 91.33 %, branches 76.33 %, functions 91.08 %, lines 92.29 %. Realtime PASSED (line 95.06 %, branch 84.52 %). Build de producción exit 0. |

En la suite aparecieron `NG0205: Injector has already been destroyed` (stack en `@angular/router`, igual que en APP-05) y un `Credenciales inválidas` esperado de otro spec; ninguno está asociado a fallos ni al perfil.

## Validación en navegador integrado (ESTUDIANTE)

Runtime reutilizado: `ng serve` existente en `http://localhost:4200` desde este workspace (sirve la rama activa) y backend existente en `http://localhost:8080`. No se iniciaron contenedores ni servicios.

- El usuario inició sesión manualmente con rol ESTUDIANTE; no se solicitaron ni capturaron credenciales, tokens ni cookies.
- Se abrió "Mi Perfil Institucional" (`/app/perfil`) desde el enlace de la aplicación. Insignia de rol: ESTUDIANTE.
- Las comprobaciones se hicieron por DOM con `data-testid`, comparando contra el cuerpo de la respuesta sin copiar valores a esta evidencia:

| Comprobación | Resultado |
|---|---|
| Resumen muestra el documento con formato `CÓDIGO NÚMERO` | PASS |
| Tipo de identificación con formato `Nombre (CÓDIGO)` | PASS |
| Documento, tipo y número iguales a los de la respuesta API | PASS |
| Resumen = expediente (documento); nombre y correo iguales en resumen, datos institucionales y expediente | PASS |
| Nombre y correo iguales a los de la respuesta API | PASS |
| Vínculos: la API devolvió `vinculos: []` y la pantalla muestra "No tienes vínculos académicos registrados." | PASS (dato real vacío, sin inventar valores) |
| Sin alertas de error | PASS |
| Modo Consulta; los 4 botones "Editar" deshabilitados | PASS |
| Red: `GET http://localhost:8080/api/v1/usuarios/perfil` → 200 (más preflight `OPTIONS` → 200), sin query | PASS |
| Recarga completa de `/app/perfil` (navegación nueva, 6 s): un solo XHR a `/api/v1/usuarios/perfil`, status 200, sin query; mismas comprobaciones | PASS |
| localStorage y sessionStorage sin claves; `indexedDB.databases()` vacío; sin datos personales | PASS |

- F5 en el panel no recargó la página (la entrada de navegación siguió siendo la original); por eso la recarga se hizo navegando a la misma URL. El listado de red del panel no registró la petición posterior a la recarga; el status y la URL de esa segunda consulta se tomaron de la Performance Resource Timing API (`responseStatus`).
- No se guardaron capturas de pantalla; no se versionó PII.

### NOT_RUN

- Otro rol: no había sesión legítima de otro rol disponible y no se crean usuarios. El componente es común a todos los roles; su regresión se cubre con las specs existentes de `ProfileComponent` y `ProfileLinksComponent` (PASS).
- Respuestas reales 401/403/404/red/2xx sin datos en navegador: cubiertas por ID-06..ID-09 y ST-05; no se forzaron en el runtime.
- Documento `null` en datos reales: el estudiante validado tiene documento registrado; cubierto por ID-03 y PL-06.

## CI remoto

Pendiente de la ejecución en el PR (se actualiza tras GitHub Actions).

## Limitaciones

- La bandera `USER_PROFILE_ENDPOINT_ENABLED` y `AuthService.fetchProfileFromBackend` siguen existiendo para login/refresh; retirarlas es una decisión aparte de Infra/Frontend.
- La edición del perfil sigue fuera de alcance (`PUT` BLOCKED_BY_DB).
