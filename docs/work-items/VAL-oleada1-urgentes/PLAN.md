---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-12
---

# PLAN — VAL-oleada1-urgentes (frontend)

Origen: `informes/LISTA_CHEQUEO_VALIDACION_2026-11-12.md`. Rama `fix/VAL-oleada1-urgentes` (desde develop).

| Ítem | Brecha | Cambio |
|---|---|---|
| EST-03 | 3 bugs typescript:S2871 y 1 typescript:S3923 | `sort()` con comparador `localeCompare(..., 'es')` en `study-plan-mesh.component.ts` (caracteresDisponibles), `coordinator-subjects.component.ts` (caracteresDisponibles, con `String()` por el tipo) y `admin-system.component.ts` (gruposDisponibles). `claim.mapper.ts`: la rama con ramas idénticas del ternario pasa a una asignación directa de `dto.categoria`. Specs nuevos en cada archivo. |
| EST-04 | CI no esperaba el quality gate | `frontend-ci.yml`: `-Dsonar.qualitygate.wait=true` y `-Dsonar.qualitygate.timeout=300`; la acción pasa de `@master` a `@v5.0.0`. |
| SEG-12 | La SPA arrancaba en legacy sin `SECURITY_PROVIDER` | Defecto `baseline` en `src/environments/environment.ts` y `docker-entrypoint.d/40-env-js.sh`. Legacy debe fijarse explícito en `env.js` (documentado en `docs/frontend-backend-contract.md` y en el comentario de `environment.ts`). `public/assets/env.js` no se tocó. Los specs que asumían legacy lo fijan explícito. |

Fuera de alcance: `public/assets/env.js` (tenía un cambio local previo ajeno a este trabajo), repos Infra y BD.

## ROL-05: retiro de POST /api/v1/usuarios

Decisión de John (2026-11-12): el backend retira `POST /api/v1/usuarios`, que creaba usuarios y cuentas de identidad para cualquier autenticado, sin ejecutor ni ámbito. En el frontend no había pantalla viva que lo usara: la ruta `/register` ya redirigía a `/login` y `RegisterComponent` no se cargaba desde ningún lado. Se retira el código muerto que apuntaba a esa ruta:

| Archivo | Motivo |
|---|---|
| `src/app/features/auth/register/register.component.ts` y su spec | Pantalla de autorregistro sin ruta; era el único consumidor de `UserService.createUser`. |
| `src/app/core/services/user.service.ts` y su spec | Su único método hacía `POST {apiUrl}/usuarios`. |
| `src/app/core/api/models/crear-usuario-request.model.ts` | Solo lo usaban los dos anteriores. |

Se conserva la redirección `register → login` en `app.routes.ts` para enlaces viejos. El alta de usuarios sigue por las pantallas con ámbito (decanos, coordinadores, docentes del programa, admisión y matrícula de estudiantes), que usan otras rutas.

### Validación ROL-05

`npx ng test --watch=false --include=src/app/app.routes.spec.ts --include='src/app/features/auth/**/*.spec.ts'`: 78 de 78 PASS (en la primera corrida falló una vez un spec de `login.component`, ajeno al cambio; la segunda corrida pasó completa). La búsqueda de `/usuarios`, `CrearUsuarioRequest` y `UserService` en `src` no deja referencias.

### Seguimiento: contraseñas citadas en documentos (2026-11-12)

`LB-001B.1A-frontend-contract-corrections/CLOSURE.md` y `VALIDATION.md` citaban la contraseña por defecto que TD-032 eliminó del código; se reemplazó por "valor retirado; ver historial". Búsqueda final de contraseñas literales en `.md`, `.ps1`, `.py`, `.yml` y `.sh` versionados: sin casos. El valor sigue en el historial de git.
