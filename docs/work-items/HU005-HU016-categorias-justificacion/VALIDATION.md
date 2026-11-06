# VALIDATION — HU005-HU016-categorias-justificacion

| Comando | Resultado |
|---|---|
| `npm run verify` (2026-11-05) | `TOTAL: 1503 SUCCESS`; statements 91.72 %, lines 92.5 %; build de producción exit 0 |

La primera corrida falló en 2 specs (NG0600): el efecto que preselecciona la categoría necesita `{ allowSignalWrites: true }` en Angular 18, igual que otros componentes del proyecto.

La validación de las 3 capas está en el `VALIDATION.md` del work item homónimo del backend. Prueba en pantalla: MV-015 del ledger del backend.
