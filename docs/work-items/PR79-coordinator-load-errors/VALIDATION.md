---
status: active
type: validation
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-08
---

# VALIDATION — PR79

## Línea base y cambio

- Base remota: origin/develop 7cd38312838c2fc3456ab3b48f734d0106e28fcf.
- Rama personal: fix/coordinator-load-error-pr79.
- Fuente de cambio: PR #79 merge commit 632ed3545eadbff35673a390c557aa33ea97c10f.
- Ocho archivos de código/test, 174 inserciones y 13 eliminaciones; coinciden con el diff remoto de #79.
- package-lock.json: modificación local previa conservada; SHA-256 de trabajo 6C04C28B3AC095FA78660F6197E8A2C1032FC049AF644739A3D3E1D8BB4EA432; sigue fuera del staging y del alcance.

## Evidencia remota de base

PR #78, head 9a0c77e94ba9adffd8f604302cfc8b75feae4e66: build-test-verify, SonarCloud y SonarCloud Code Analysis concluyeron success; Sonar reportó una issue nueva. PR #79 no tiene checks asociados porque se fusionó a una rama intermedia.

## Pruebas y calidad local — 2026-11-08

| Check | Resultado | Alcance y límite |
|---|---|---|
| RED focal | FAIL esperado, exit 1 | Ver hashes/resultados en TEST_PLAN.md. Compilación utility: faltaban error() y reintentar(); tests de pantalla reprodujeron estado vacío engañoso. Una corrida conjunta de materias quedó parcial por afterAll sin manejar. |
| GREEN focal Chrome Headless | PASS, exit 0; 33/33 | Los cuatro specs autorizados: asistencias, consolidado, materias y ListadoPaginado. |
| npm run verify | PASS, exit 0 | lint:tokens OK; Chrome Headless 1983/1983; cobertura statements 93.10%, branches 78.63%, functions 93.50%, lines 94.10%; gate realtime PASS (LINE 95.18%, BRANCH 85.23%); check-retiro-solicitudes OK; build production completado. |
| Build warnings | WARN | Tailwind omitió 2 reglas selector group-open por sub-selector vacío; el build terminó correctamente. |
| Revisión independiente | PASS, sin hallazgos | Revisión estática, solo lectura; no ejecutó pruebas. |
| Validación manual Angular | NOT_RUN | La página local abrió en /login. No había sesión coordinador autenticada. La skill computer-use prohíbe automatizar el diálogo de autenticación; no se enviaron credenciales ni solicitudes mutantes. |
| Git/alcance | PASS | package-lock.json permanece con el hash anterior, sin staging. No se modificó API, DB ni autorización. |

## Estado de publicación

- Commit: pendiente.
- PR personal a develop: pendiente de push y creación.
- Merge/despliegue: no ejecutados.
- CI de este nuevo PR: pendiente de creación y resultado remoto.
