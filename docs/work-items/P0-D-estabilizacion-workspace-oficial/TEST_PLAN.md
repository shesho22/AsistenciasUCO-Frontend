# TEST PLAN — P0-D Frontend

| ID | Requisito | Prueba | Resultado |
|---|---|---|---|
| P0D-FE-R1 | Fixtures cumplen DTOs reales | Specs Dean y Admin | `PASS_LOCAL` |
| P0D-FE-R2 | Flujo de creación selecciona la sesión creada | Workflow Attendance | `PASS_LOCAL` |
| P0D-FE-R3 | Suite completa no pierde pruebas | `npm run test:ci` | `389/389 SUCCESS` |
| P0D-FE-R4 | Sonar no se omite silenciosamente | Preflight de variables/secret | `NOT_RUN_REMOTE` |
| P0D-FE-R5 | Trivy publica inventario sin falsear ausencia de findings | SARIF filesystem/imagen | `NOT_RUN_REMOTE; REPORT_ONLY` |

La ejecución local no sustituye los checks remotos del PR oficial. No se
modificaron expectativas para ocultar errores `afterAll`.
