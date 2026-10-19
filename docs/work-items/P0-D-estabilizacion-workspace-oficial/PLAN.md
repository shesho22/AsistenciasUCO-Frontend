---
status: active
type: normative
scope: frontend-ci-and-regression
owner: frontend-team
last-reviewed: 2026-10-18
---

# P0-D — Estabilización del workspace oficial Frontend

## Objetivo

Reconciliar la regresión observada en el PR oficial sin cambiar contratos,
debilitar pruebas ni reinterpretar UTC v2. Preparar el workflow para exigir la
configuración oficial de Sonar y publicar inventarios Trivy report-only.

## Alcance

Permitido: fixtures/specs que reproducen el fallo observado, el adaptador de
selección de la sesión creada ya definido por el contrato existente, el
workflow CI, la configuración no personal de Sonar y este work item.

Prohibido: cambios de endpoints o DTOs públicos, eliminación de pruebas,
reducción de cobertura, secretos, merge, push o despliegue.

## Estado DoR

READY_FOR_LOCAL_VALIDATION: sí.

READY_FOR_REMOTE_CI: no; requiere revisar el diff, configurar variables/secret
oficiales de Sonar y ejecutar el workflow remoto en un PR autorizado.

## Evidencia AS-IS

- PR oficial #1: head `e33ca3bd`, base `develop` `bd2120f5`; su run remoto
  anterior falló durante la suite de 389 pruebas.
- Worktree P0-D: rama `codex/p0-d-frontend-develop-stabilization`, basado en
  `bd2120f5`; se preservan los cuatro specs afectados y el flujo de creación
  de sesión.
- Suite local: `npm ci` y `npm run test:ci`, `389/389 SUCCESS`.

## Dictamen previsto

FRONTEND_CI=LOCAL_PASS_389_389; REMOTE_PR_CI_NOT_RERUN.

No se afirma PASS de Sonar, Trivy, CodeQL o Dependency Review sin ejecución
remota verificable.
