---
status: active
type: work-item
scope: frontend
owner: fullstack-team
last-reviewed: 2026-11-10
---

# VALIDATION — CERT-CULM001-CORRECCIONES

Los pasos de `npm run verify` se corrieron uno por uno y en el mismo orden, porque `ng serve` y el lab seguían arriba.

## Corrida con las correcciones de la recertificación (2026-11-10, 02:15)

| Paso | Resultado |
|---|---|
| `test:ci` | 2675 de 2675 SUCCESS; statements 93.03 %, branches 79.36 %, functions 93.44 %, lines 94.02 % |

Las compuertas de fuente y el build de producción se corrieron después sobre este mismo código más el de HU018/HU019, que va encima en el mismo árbol de trabajo. Su resultado está en el `VALIDATION.md` de `HU018-HU019-plan-horas-estudiante`: todo en verde.

Una prueba nueva de este work item usaba una clave de ejemplo con `#2026`, que `lint:tokens` toma por un color literal. Se cambió el ejemplo y la compuerta pasa.

## Corrida anterior (2026-11-10, 00:47), antes de la recertificación

| Paso | Resultado |
|---|---|
| `lint:tokens` (tokens de diseño y nombres accesibles de controles) | OK |
| `test:ci` | 2664 de 2664 SUCCESS; statements 92.97 %, branches 79.14 %, functions 93.43 %, lines 93.95 % |
| `coverage:realtime:check` | line 95.26 %, branch 86.81 %: PASSED |
| `check:retiro-solicitudes`, `check:registro-individual` y `check:hu-en-ui` | OK |
| `build --configuration=production` | exit 0, con una advertencia de presupuesto: el bundle inicial pesa 518.09 kB y el aviso salta en 500 kB (el error es 1 MB). Los cambios de este work item van en chunks diferidos (se comprobó en `dist/`: el login, "Mis materias" y la admisión), así que la advertencia no viene de ellos |

La re-prueba en pantalla está en el `VALIDATION.md` del work item homónimo del backend.
