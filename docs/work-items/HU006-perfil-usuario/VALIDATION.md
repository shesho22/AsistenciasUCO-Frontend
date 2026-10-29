# VALIDATION — HU006-perfil-usuario

| Comando | Resultado |
|---|---|
| `npm run test:ci` (2026-10-27) | `TOTAL: 1263 SUCCESS`, exit 0 |
| Cobertura de líneas en código nuevo frente a `develop` (lcov × diff) | 20/22 = 90,9 % (SonarCloud exige ≥ 80 %; las 2 líneas sin cubrir son ramas del mock) |
| `npm run coverage:realtime:check` | `PASSED` |
| `npx ng build --configuration=production` | exit 0 |
| GitHub Actions / SonarCloud | Pendiente: rama en commits locales, sin subir |

## Incidencia

Angular 18 no admite `as` en un `@else if`. La plantilla se reestructuró con un `@if` anidado. La falla se detectó en las pruebas y se corrigió antes del commit.

## Limitaciones

- Falta la prueba manual en pantalla (MV-008).
- No hay commit RED separado.
