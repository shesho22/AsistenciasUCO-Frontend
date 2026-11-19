# VALIDATION — HU008-oferta-grupos-estudiante

| Comando | Resultado |
|---|---|
| `npm run test:ci` (2026-10-27) | `TOTAL: 1267 SUCCESS`, exit 0 |
| Cobertura de líneas del código nuevo frente a `develop` (lcov × diff) | 60/62 = 96,8 % (SonarCloud exige ≥ 80 %). Las 2 líneas sin cubrir son ramas del mock. |
| `npm run coverage:realtime:check` | `PASSED` |
| `npx ng build --configuration=production` | exit 0 |
| GitHub Actions / SonarCloud | Pendiente: la rama está en commits locales, sin subir |

## Limitaciones

- La prueba manual en pantalla queda pendiente (MV-008).
- En modo Security Baseline, la ruta nueva requiere reaprovisionar el PDP (Alejo).
- No hay commit RED separado.
