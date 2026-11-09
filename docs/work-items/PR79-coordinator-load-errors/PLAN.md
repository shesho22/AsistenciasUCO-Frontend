---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-08
---

# PR79 — Integración de errores de carga del coordinador en develop

## Identidad y autorización

- Fecha/base: 2026-11-08, America/Bogota; origin/develop = 7cd38312838c2fc3456ab3b48f734d0106e28fcf.
- Autorización: instrucción explícita del usuario en el prompt maestro, fases 2 y 18: verificar PR #79 y preparar su integración a develop mediante rama/PR personal si aún falta. No se autoriza el merge del PR.
- PR de origen: #79 cerrado y fusionado a fix/coordinador-errores-carga-listas, merge commit 632ed3545eadbff35673a390c557aa33ea97c10f; su base fue 9a0c77e94ba9adffd8f604302cfc8b75feae4e66. develop contiene la base por PR #78, pero no el cambio #79.
- Diff del cambio pendiente: ocho archivos del coordinador y ListadoPaginado, 174 inserciones y 13 eliminaciones; cotejado contra los archivos de PR #79.
- El único cambio local preexistente es package-lock.json; se conserva y está fuera del alcance. Su blob no cambió entre el HEAD local previo y origin/develop.

## AS-IS y evidencia

| Hecho | Fuente | Evidencia y límite |
|---|---|---|
| #79 diferencia error de carga y lista vacía en asistencias, consolidado y materias; agrega alerta y reintento | GitHub PR #79, head 0a79823c61596c10c5873037a4742731f309f9a9 | PR fusionado únicamente en la rama intermedia |
| #78 integra la base de #79 en develop | GitHub PR #78, head 9a0c77e94ba9adffd8f604302cfc8b75feae4e66, merge de develop 7cd38312838c2fc3456ab3b48f734d0106e28fcf | build-test-verify, SonarCloud y SonarCloud Code Analysis concluyeron success; Sonar reporta una issue nueva |
| #79 no tiene checks asociados y su merge no está incluido en develop | GitHub PR #79 y comparación de refs | Solo autoriza integrar este cambio en una rama personal para revisión |
| El Frontend local tenía package-lock.json modificado | git status antes de la rama nueva | Hash de trabajo guardado en la evidencia local; nunca se edita ni se incluye |

## TARGET

En una rama personal basada en el develop remoto actual, aplicar el cambio de PR #79 sin duplicar #78. Los fallos de solicitudes del coordinador deben exponerse como error accesible con reintento; un error no debe presentarse como vacío. Una respuesta vacía exitosa conserva su estado vacío. La paginación continúa en servidor y se reintenta sobre la página actual.

## Clase de cambio y alcance

- Change class: BEHAVIOR_CHANGE.
- PRIMARY_VARIABLE: COORDINATOR_LOAD_FAILURE_PRESENTATION.
- ALLOWED_PATHS:
  - src/app/features/coordinator/coordinator-attendance/coordinator-attendance.component.ts
  - src/app/features/coordinator/coordinator-attendance/coordinator-attendance.component.spec.ts
  - src/app/features/coordinator/coordinator-consolidado/consolidado-asistencia.component.ts
  - src/app/features/coordinator/coordinator-consolidado/consolidado-asistencia.component.spec.ts
  - src/app/features/coordinator/coordinator-subjects/coordinator-subjects.component.ts
  - src/app/features/coordinator/coordinator-subjects/coordinator-subjects.component.spec.ts
  - src/app/shared/utils/listado-paginado.ts
  - src/app/shared/utils/listado-paginado.spec.ts
  - docs/work-items/PR79-coordinator-load-errors/**
- FORBIDDEN_PATHS: package-lock.json; endpoints, DTOs, OpenAPI, DB/SQL, security/role rules, mocks/data fixtures, unrelated frontend pages, CI/workflows, P0-D and MAINT-004 plans, organization repositories.
- CONTRACTS: no HTTP, DTO, DB or security contract change. Reuse existing error classification and app-error-carga.
- PROVIDERS: Angular HTTP consumer and UI state only.
- EXTERNAL_ENVIRONMENT: DB and provider integrations are not required for unit/component tests. Browser validation is limited to an available authenticated coordinator session and backend.
- SECURITY_IMPACT: no authorization or role change.
- OBSERVABILITY_IMPACT: none.
- TEST_LEVEL_REQUIRED: reproduce RED from the unchanged PR #79 specs; focal component tests; frontend verify; manual coordinator flow only if the authorized local stack is available.
- ROLLBACK: revert the integration PR commit.
- CONSUMERS: coordinator attendance, consolidated attendance, subjects and shared paginated list.
- STOP_CONDITIONS: unexpected public-contract change, unrelated diff, package-lock.json change/loss, failing test outside the documented change, or unavailable base evidence.

## Alcance y no alcance

Alcance: transportar únicamente el diff de #79 a una nueva rama desde develop, comprobar RED/GREEN y preparar un PR personal para revisión.

No alcance: merge, despliegue, cambios de API/Backend/DB, correcciones adicionales, cambio global de paginación ni validación de los otros cuatro roles.

## Archivos afectados

EXISTENTES: los ocho archivos listados en ALLOWED_PATHS. NUEVOS: PLAN.md, TEST_PLAN.md, VALIDATION.md de este work item. RETIRAR: ninguno.

## Contrato, riesgos y dependencias

La conducta está descrita por los tests existentes de #79 y las respuestas de error ya usadas por classifyLoadError. El cambio no modifica la respuesta que envía Angular. La rama se basa en el develop remoto actual. El package-lock.json local preexistente debe seguir sin cambios y sin staging.

## Definition of Ready

READY (2026-11-08) para RED/GREEN y PR de revisión. El usuario nombró explícitamente el PR pendiente; su diff y base están verificados; #78 aporta el estado verde del baseline remoto; los tests conductuales están versionados en el PR de origen; no se requiere DB ni contrato nuevo. La autorización no incluye merge ni despliegue.
