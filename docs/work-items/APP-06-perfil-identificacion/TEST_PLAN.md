---
status: active
type: test-plan
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-03
---

# TEST_PLAN — APP-06 Identificación en el perfil

## REQUISITO → CONTRATO

- R-01: el documento visible (tipo y número) proviene solo de `GET /api/v1/usuarios/perfil`.
- R-02: resumen, "Datos Institucionales" y "Expediente y vínculos" muestran el mismo documento, nombre y correo.
- R-03: `null` se presenta como "Sin registrar"; error HTTP/red y 2xx sin datos como "No disponible" con mensaje; nunca se confunden.
- R-04: un solo GET por pantalla, sin parámetros de usuario.
- R-05: sin persistencia de datos personales en el navegador.
- R-06: modo consulta conservado; sin PUT ni edición en sesión real.

## Casos

| ID | Requisito del encargo | Comportamiento | Archivo | RED (649219a) |
|---|---|---|---|---|
| ID-01 / ID-05 | 5, 10 | Un GET, método GET, sin params, URL exacta | profile.identificacion.spec.ts | PASS (caracterización) |
| ID-02 | 1, 2 | Resumen `CC 1017000001`, tipo `Cédula de ciudadanía (CC)`, número; nunca el del token | profile.identificacion.spec.ts | FAIL |
| ID-03 | 3 | `null` → "Sin registrar" en resumen, tipo, número y expediente; sin alerta | profile.identificacion.spec.ts | FAIL |
| ID-04 | 4 | Resumen = expediente; nombre y correo del perfil institucional; formulario con nombres del perfil | profile.identificacion.spec.ts | FAIL |
| ID-06 (×2) | 6 | 401 y 403 → "No disponible" + alerta; no "Sin registrar" | profile.identificacion.spec.ts | FAIL |
| ID-07 | 7 | 404 → "No disponible" + mensaje de recurso no encontrado | profile.identificacion.spec.ts | FAIL |
| ID-08 | 8 | status 0 → mensaje de conexión | profile.identificacion.spec.ts | FAIL |
| ID-09 | 9 | 2xx `datos: null` → "No disponible" y aviso sin datos | profile.identificacion.spec.ts | FAIL |
| ID-10 | 10 | Nueva carga con GET en curso no repite la petición; "Consultando…" | profile.identificacion.spec.ts | FAIL |
| ID-11 | 11 | localStorage/sessionStorage sin número, nombre ni correo | profile.identificacion.spec.ts | PASS (caracterización) |
| ID-12 | 12 | Sesión real: botones Editar deshabilitados, sin PUT, "Modo Consulta" | profile.identificacion.spec.ts | PASS (caracterización) |
| ST-01..ST-06 | 2, 3, 6, 10 | Store: espera a `cargar()`, formato del contrato, tipo/número parciales, sin duplicados en curso o cargado, reintento tras error con código `FORBIDDEN`, `limpiar()` cancela y descarta | perfil-institucional.store.spec.ts | Nuevo con la implementación |
| PL-06..PL-08 | 3, 9, 8 | Expediente: `null` → "Sin registrar"; sin datos ≠ error; "Reintentar" repite el GET | profile-links.component.spec.ts | Nuevo con la implementación |
| PL-01..PL-05 | regresión HU006 | Casos HU006 existentes sin cambios de aserciones | profile-links.component.spec.ts | Solo se añadió el provider del store |
| ProfileComponent (11) | regresión | Spec existente sin cambios | profile.component.spec.ts | PASS |

## Secuencia

1. RED: `npx ng test --watch=false --browsers=ChromeHeadlessCI --include='src/app/features/profile/**/*.spec.ts'` sobre 649219a → `TOTAL: 9 FAILED, 19 SUCCESS` (fallos por aserción, sin errores de compilación).
2. GREEN: mismo comando + store spec → `TOTAL: 37 SUCCESS`.
3. Regresión y CI local: `npm run verify`.
4. Integridad: `git diff 649219a HEAD -- src/app/features/profile/profile.identificacion.spec.ts` vacío (spec RED no modificado).
