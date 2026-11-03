# VALIDATION — HU112-HU128-HU143-HU157-consultas-transversales

Validación local (Windows 10, Node 24.19) del 2026-11-02 con `npm run verify` (test:ci, coverage:realtime:check y build de producción en secuencia).

| Comando | Resultado |
|---|---|
| `npm run test:ci` | `TOTAL: 1410 SUCCESS` (statements 91.49 %, lines 92.4 %) |
| `npm run coverage:realtime:check` | líneas 95.06 % (≥ 90 %), ramas 84.52 % (≥ 80 %) |
| `ng build --configuration=production` | exit 0 |
| Cobertura de los archivos nuevos (lcov) | 100 % de líneas en servicio, `ListadoPaginado`, `HistorialEstudianteComponent`, `DeanDocentesComponent`, `DeanAsignaturasComponent`, `DeanProgramasCreditosComponent` y mock; 96.2 % en `AdminEstudiantesComponent` |
| GitHub Actions (`build-test-verify`, SonarCloud) | PENDIENTE: se ejecuta en el PR |

Hallazgo corregido durante la validación: el compilador de Angular generaba una variable inexistente con `??` dentro del `track` de `@for` (`ReferenceError: tmp_52_0`). La identidad de la fila pasó al método `clave()`.

Limitación: la prueba en pantalla con usuarios reales y el PDP reaprovisionado queda en MV-012 del backend.
