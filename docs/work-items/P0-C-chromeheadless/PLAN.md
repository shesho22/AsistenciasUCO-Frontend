---
status: active
type: work-item
scope: frontend-tooling
owner: frontend-team
last-reviewed: 2026-10-20
---

# P0-C — ChromeHeadless reproducible

## Objetivo

Diagnosticar y corregir únicamente el launcher local que impide capturar
ChromeHeadlessCI. Se preservan tests, cobertura y el contrato de la aplicación.

## AS-IS

`karma.conf.js` define `ChromeHeadlessCI` con flags de sandbox desactivado y
`npm run verify` construye el bundle, pero Chrome no captura después de dos
timeouts de 60 segundos.

## Alcance permitido

`karma.conf.js`, configuración de launcher/timeout justificada y esta carpeta
de work item. No modificar specs, eliminar suites, cambiar thresholds ni
alterar código funcional.

## DoR

`READY_WITH_SCOPED_EXTERNAL_BLOCKERS`: falta identificar la instalación real de
Chrome y la causa del timeout; el test RED ambiental está documentado.
