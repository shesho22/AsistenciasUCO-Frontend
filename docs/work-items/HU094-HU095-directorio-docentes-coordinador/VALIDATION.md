# VALIDATION — HU094-HU095-directorio-docentes-coordinador

| Comando | Resultado |
|---|---|
| `npm run test:ci` (2026-10-27) | `TOTAL: 1267 SUCCESS`, exit 0 |
| Cobertura de líneas en código nuevo frente a `develop` (lcov × diff) | 90/90 = 100 % (SonarCloud exige ≥ 80 %) |
| `npm run coverage:realtime:check` | `PASSED` |
| `npx ng build --configuration=production` | exit 0 |
| GitHub Actions / SonarCloud | pendiente: rama en commits locales, sin subir |

**Limitaciones:**
- La prueba manual en pantalla queda pendiente (MV-008).
- En modo Security Baseline, las 2 rutas nuevas requieren reaprovisionar el PDP (Alejo).
- Las specs se escribieron junto con el código, sin un commit RED separado.
