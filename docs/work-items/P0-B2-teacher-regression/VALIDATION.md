# VALIDATION — P0-B2 teacher regression

Fecha de corte inicial: 2026-10-20 (America/Bogota).

## Estado inicial

La rama `jose-valencia/lb-004d-f1-support-binding` estaba limpia en
`fac2f640`; el cambio de grupos sin horario está presente y no se modificó
durante la preparación de este work item.

## Resultados

| Comprobación | Resultado | Evidencia |
|---|---|---|
| `npm run coverage:realtime:check` | `PASS` | exit code 0; LINE 95.06% (231/243) y BRANCH 84.52% (71/84), sobre los umbrales 90%/80%. |
| `npm run build -- --configuration=production` | `PASS` | exit code 0; bundle Angular generado en `dist/gestio-asistencia-frontend`. |
| `npm run verify` | `BLOCKED_BY_ENVIRONMENT` | el bundle de tests se generó, pero ChromeHeadlessCI no capturó en 60 s y agotó 2 reintentos; no se cuentan specs ni cobertura como PASS en esta ejecución. |
| Evidencia previa del mismo checkout | `PASS_PREVIOUSLY_RECORDED` | antes de esta repetición se registró `807/807` en Chrome Headless, statements 87.76%, branches 70.68%, lines 88.99%; queda conservada como evidencia histórica, no sustituye el fallo actual. |

No se ejecutó E2E real contra backend, Keycloak y DB; no se infiere de Karma
ni de los mocks HTTP.

