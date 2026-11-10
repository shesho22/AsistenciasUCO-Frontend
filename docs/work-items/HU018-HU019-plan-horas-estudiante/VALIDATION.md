---
status: active
type: work-item
scope: frontend
owner: fullstack-team
last-reviewed: 2026-11-10
---

# VALIDATION — HU018-HU019

Corrida local del 2026-11-10 (02:25). Este código va en el mismo árbol de trabajo que las correcciones de `CERT-CULM001-CORRECCIONES`, así que la corrida las incluye. Los pasos de `npm run verify` se corrieron uno por uno y en el mismo orden, porque `ng serve` y el lab seguían arriba.

| Paso | Resultado |
|---|---|
| `lint:tokens` (tokens de diseño y nombres accesibles de controles) | OK |
| `test:ci` | 2691 de 2691 SUCCESS; statements 93.06 %, branches 79.38 %, functions 93.51 %, lines 94.04 % |
| `coverage:realtime:check` | line 95.26 %, branch 86.81 %: PASSED |
| `check:retiro-solicitudes`, `check:registro-individual` y `check:hu-en-ui` | OK |
| `build --configuration=production` | exit 0, con la advertencia de presupuesto que ya existía (el aviso salta en 500 kB y el error en 1 MB). El bundle inicial pasa de 518.09 kB a 519.19 kB: 1.1 kB más, del plan de ejemplo del modo de datos simulados, que vive en el interceptor inicial. La pantalla del plan y la barra de horas van en chunks diferidos |

Pruebas nuevas de este work item: 16 (5 de la barra de horas, 2 del mapper, 1 del servicio, 7 de la pantalla del plan y 1 del modo de datos simulados).

La validación de la BD y del backend y la revisión en pantalla están en el `VALIDATION.md` del work item homónimo del backend.
