---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-03
---

# APP-06 — Identificación en el perfil del estudiante

## Identidad y objetivo

- Fecha / rol: 2026-11-03 / implementación frontend.
- Base: Frontend develop 5f60dccf26ea370b0a42be3b30d92e9bb941fdb8 (incluye APP-05, PR #33); Backend develop 9b765b076a5f5940d69d84c6ab2bc0cf9aa890fb; DB develop fe1ccd710aed4f84416bdfe03da36976797ce7df.
- Rama: `fix/app06-perfil-identificacion`.
- Objetivo: que "Mi Perfil Institucional" muestre el tipo y número de identificación reales del usuario autenticado, leídos del GET institucional, con el resumen y el expediente en correspondencia.
- Fuente del hallazgo: Backend docs/work-items/SEC-BASELINE-019-upgrade-performance/PLAN-CORRECCIONES-POR-ROL.md, APP-06 (P1, Frontend): "Perfil estudiante oculta identificación por bandera obsoleta. Mostrar dato de API correctamente sin almacenamiento persistente".

## Fuentes y contrato congelado

- Backend docs/contracts/HTTP_AS_IS_MATRIX.md, snapshot 9b765b0: `GET /api/v1/usuarios/perfil`, AUTENTICADO, solo el usuario del token (sin parámetro de id), inexistente = 404, `ApiDataResponse<PerfilUsuarioDTO>`. `PUT /api/v1/usuarios/perfil` sigue BLOCKED_BY_DB (`FeatureUnavailableException`).
- Backend docs/work-items/HU006-perfil-usuario/CONTRACT.md: `codigoTipoIdentificacion`, `nombreTipoIdentificacion`, `numeroIdentificacion` (número), nombres, `nombreCompleto`, `correo`, `correoConfirmado`, `estaActivo`, `vinculos`.
- Frontend docs/work-items/HU006-perfil-usuario/PLAN.md: pantalla de solo lectura; `AuthService` y `USER_PROFILE_ENDPOINT_ENABLED` no cambian; la sección HU006 consulta el endpoint directamente con `PerfilService`.
- Sin cambio HTTP/JSON: solo se consume el GET existente, sin parámetros.

## AS-IS

| Hecho | Archivo + símbolo | Efecto |
|---|---|---|
| El resumen y "Datos Institucionales" leen `AuthService.currentUser` | profile.component.ts, plantilla (`user()?.numeroIdentificacion`, `user()?.email`) | El documento proviene del token (claim `numeroIdentificacion`), que normalmente no existe → "Sin registrar" o vacío. |
| La hidratación desde la API depende de la bandera obsoleta | auth.service.ts, `fetchProfileFromBackend` (`!environment.features.userProfileEndpointEnabled` → retorna el usuario del token) | Con la bandera apagada (valor por defecto) el GET implementado nunca se consulta para el resumen. |
| El expediente HU006 sí consulta el GET | profile-links.component.ts → `PerfilService.consultar()` | Una sección mostraba el documento y la otra "Sin registrar". |
| Activar la bandera haría dos GET y mezclaría token + API | `fetchProfileFromBackend` (fetch propio) + `ProfileLinksComponent` (HttpClient) | Consultas duplicadas y datos combinados con `||`. |
| El expediente mostraba `null` como texto vacío | profile-links.component.ts, `{{ p.codigoTipoIdentificacion }} {{ p.numeroIdentificacion }}` | Dato ausente indistinguible. |

## TARGET

- Un `PerfilInstitucionalStore` (signals, `@Injectable()` sin `providedIn`) provisto en `ProfileComponent`: un solo GET por pantalla, compartido por el resumen y `<app-profile-links>`. Vive solo en memoria y se limpia con el `DestroyRef` del componente (navegación o cierre de sesión).
- Estados: `INACTIVO`, `CARGANDO`, `CARGADO`, `SIN_DATOS` (2xx sin `datos`) y `ERROR` (código semántico + mensaje de `getApiErrorMessage`).
- Documento solo desde la API: "<código> <número>"; tipo "<nombre> (<código>)". `null` → "Sin registrar"; error o sin datos → "No disponible"; en curso → "Consultando…". Nunca del token ni de valores por defecto.
- Nombres y correo de la pantalla toman el perfil institucional cuando llega; mientras tanto (o ante error) conservan los de la sesión, como antes.
- `ProfileComponent` deja de llamar `AuthService.fetchProfileFromBackend`. `AuthService`, la bandera, login, refresh, interceptores, guards y Keycloak no cambian.
- Edición: sin cambios; deshabilitada fuera del modo mock (`canEditProfile = isMockMode`). No se llama al PUT.

## Clase de cambio y alcance de rutas

- Change class: BEHAVIOR_CHANGE (solo Frontend).
- PRIMARY_VARIABLE: identificación visible = identificación del GET institucional, idéntica en resumen y expediente.
- ALLOWED_PATHS:
  - src/app/features/profile/profile.component.ts
  - src/app/features/profile/components/profile-links.component.ts y su spec
  - src/app/features/profile/perfil-institucional.store.ts y su spec (nuevos)
  - src/app/features/profile/profile.identificacion.spec.ts (nuevo)
  - docs/work-items/APP-06-perfil-identificacion/{PLAN.md,TEST_PLAN.md,VALIDATION.md}
- FORBIDDEN_PATHS: Backend, DB, componente externo de seguridad, `AuthService`, interceptores, guards, environments/bandera `USER_PROFILE_ENDPOINT_ENABLED`, contrato HTTP, evidencias HU006 históricas.
- SECURITY_IMPACT: ninguno; el GET sigue sin parámetros de usuario y con el Bearer del interceptor.
- PRIVACY: sin localStorage/sessionStorage/IndexedDB, sin logs de la respuesta; evidencia sin número real, nombres ni correo.
- CONSUMERS: ruta `/app/perfil`, compartida por todos los roles (único consumidor de `ProfileComponent` y `ProfileLinksComponent`).
- ROLLBACK: revertir los commits APP-06 de esta rama.

## No alcance

- `PUT /api/v1/usuarios/perfil`, edición institucional, nuevas rutas o campos.
- Retirar la bandera o cambiar `fetchProfileFromBackend` (sigue usado en login/refresh).
- Datos semilla o vínculos institucionales.

## Riesgos

- Componentes futuros que usen `<app-profile-links>` fuera de `ProfileComponent` deben proveer el store (falla explícita de DI, no un GET oculto).
- Un número de identificación que excediera `Number.MAX_SAFE_INTEGER` perdería precisión en el JSON; el contrato actual (BIGINT de cédula) está dentro del rango.
