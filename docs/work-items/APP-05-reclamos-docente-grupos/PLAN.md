---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-03
---

# APP-05 — Reclamos docentes por grupo

## Identidad y objetivo

- Fecha / rol: 2026-11-03 / implementación frontend.
- Base: Frontend develop b2a27d2; Backend develop 9b765b076a5f5940d69d84c6ab2bc0cf9aa890fb; DB develop fe1ccd710aed4f84416bdfe03da36976797ce7df.
- Objetivo: mostrar los reclamos del grupo docente seleccionado, con conteos, paginación completa y estados fieles al resultado HTTP.
- Criterios: filtrar por UUID grupoId real; jamás asociar por nombre/código; contar todas las páginas; mostrar vacío solo ante respuesta completa vacía; cancelar/ignorar respuestas de otro grupo; conservar bandeja general paginada.
- Fuente del hallazgo: Backend docs/work-items/SEC-BASELINE-019-upgrade-performance/PLAN-CORRECCIONES-POR-ROL.md, APP-05.

## Fuentes y contrato congelado

- Backend docs/contracts/HTTP_AS_IS_MATRIX.md, snapshot 9b765b0: GET /api/v1/docente/reclamos, parámetros existentes estado, pagina, tamano; envelope ApiListResponse<ReclamoDocenteDTO>.
- Backend DocentePortalController.consultarReclamos y DTO/respuesta ReclamoDocenteDTO / ReclamoDocenteResponse: incluye grupoId UUID; identidad y ownership salen del usuario autenticado.
- DB schema/stored-procedures/usp_consultar_solicitudes_revision_docente.sql, snapshot fe1ccd7: paginación 1..100, total y UUID idGrupo; filtro de titularidad docente y orden determinista.
- El endpoint no define filtro HTTP por grupo. La UI obtendrá cada página de la consulta autorizada existente y filtrará por igualdad de UUID del DTO. No se añade grupoId a la URL ni endpoint nuevo. Si la escala o consistencia operacional exige filtro/snapshot en servidor, se abrirá dependencia contractual con owner Backend/DB.
- La matriz HTTP actual y el código/SQL de estos snapshots muestran la lectura implementada. Notas LB-004 que la describen como 501 corresponden a un estado previo; se conserva esa limitación como historial, y una respuesta 501 en runtime se representa explícitamente.

## AS-IS y evidencia

| Hecho | Archivo + símbolo / contrato + versión | Evidencia y límites |
|---|---|---|
| La ficha de grupo llama la sobrecarga sin argumentos y consume solo la página inicial | src/app/features/teacher/teacher-grupos/teacher-grupos.component.ts, cargarReclamosGrupo | No pasa el ID; usa el primer tamaño por defecto. |
| Los resultados no se filtran por el grupo seleccionado | TeacherGruposComponent.verHubGrupo / cargarReclamosGrupo | courseId se acepta pero no se usa. |
| Un error HTTP se convierte en [] | cargarReclamosGrupo | El panel y badge muestran 0 aunque el servidor haya fallado. |
| La ruta de grupos abre el diálogo de AttendanceControl; la carga se corta cuando teacherClaimsEnabled es false y el filtro compara materiaId/código/nombre | attendance-control.component.ts, cargarReclamosDocente/filteredGroupClaims | En navegador el diálogo indicó 0 registros; la bandeja general mostró 7 registros para el grupo visible. Evidencia sanitizada, sin nombres ni UUID. environment.ts base tiene teacherClaimsEnabled=false. |
| El diálogo trata toda lista sin filas como éxito vacío y el badge siempre imprime reclamos().length | group-claims-modal.component.ts | No distingue error HTTP/red/no disponible del vacío. |
| El mapper descarta grupoId | claim.mapper.ts, fromReclamoDocente | El DTO TS ya permite grupoId; el backend lo devuelve. |
| Panel y badge confunden carga/no disponible con lista vacía | teacher-grupo-reclamos.component.ts, teacher-grupo-hub.component.ts | El panel solo distingue un booleano de carga. |
| Bandeja general ya consulta página/estado y distingue 403/501/red/5xx | teacher-claims.component.ts y sus tests | Se preserva sin alterar su contrato ni su lógica. |

## TARGET

- Retener el grupoId UUID del DTO en el modelo de UI.
- Consultar secuencialmente pagina=1..N, tamano=100 usando solo parámetros documentados; exigir total/páginas internamente coherentes y UUID de grupo presente. Un conjunto incompleto/inestable se presenta como error, nunca como conteo parcial.
- Filtrar únicamente por UUID, normalizado a minúsculas; no comparar nombres o números.
- Cancelar la suscripción anterior al cambiar de grupo/salir, proteger callbacks con generación/UUID y evitar duplicar una carga activa o ya completada. Retry explícito puede repetirla.
- La vista distingue IDLE, LOADING, lista cargada vacía, 403, 501, error de red y otros errores. Solo LOADED muestra números.
- Mantener TeacherClaimsComponent y su bandeja general paginada/filtros sin cambios funcionales.
- Corregir también la ruta APP-05 alcanzada por el usuario: AttendanceControl consulta por UUID del grupo mediante el servicio paginado; GroupClaimsModal muestra conteo solo tras carga completa y separa error de vacío.
- Ignorar la bandera obsoleta `teacherClaimsEnabled` para esta lectura; no cambiar el valor global ni otros consumidores.

## Clase de cambio y alcance de rutas

- Change class: BEHAVIOR_CHANGE (solo Frontend).
- PRIMARY_VARIABLE: correspondencia exacta entre grupo seleccionado y reclamos visibles/contados.
- ALLOWED_PATHS:
  - src/app/core/models/role-management.model.ts
  - src/app/core/mappers/claim.mapper.ts y su spec
  - src/app/core/services/attendance-claim.service.ts y su spec
  - src/app/features/teacher/teacher-grupos/teacher-grupos.component.ts y su spec
  - src/app/features/teacher/teacher-grupos/components/teacher-grupo-hub.component.ts y su spec
  - src/app/features/teacher/teacher-grupos/components/teacher-grupo-reclamos.component.ts y su spec
  - src/app/features/attendance/attendance-control/attendance-control.component.ts y su spec
  - src/app/features/attendance/attendance-control/components/group-claims-modal.component.ts y su spec
  - docs/work-items/APP-05-reclamos-docente-grupos/{PLAN.md,TEST_PLAN.md,VALIDATION.md}
- FORBIDDEN_PATHS: Backend, DB, Security-UCO, OpenAPI/HTTP contract, controladores/autorización, datos reales y pantallas no relacionadas. AttendanceControl y GroupClaimsModal se añaden como consumidores APP-05 alcanzados por la validación manual.
- CONTRACTS: solo consumo del GET existente; sin cambio HTTP/JSON.
- PROVIDERS: Backend + DB ya existentes; no se crean ni reinician.
- EXTERNAL_ENVIRONMENT: navegador integrado local, solo lectura; requiere sesión DOCENTE manual para el cierre funcional.
- SECURITY_IMPACT: sin nuevos permisos; preservar Bearer, ownership del SP y filtros de titularidad.
- OBSERVABILITY_IMPACT: no agregar logs ni persistir reclamos.
- TEST_LEVEL_REQUIRED: specs de mapper/service/component; regresión de bandeja general; navegador integrado real.
- ROLLBACK: revertir exclusivamente el PR/commit Frontend APP-05.
- CONSUMERS: TeacherGruposComponent → TeacherGrupoHubComponent → TeacherGrupoReclamosComponent; bandeja general es regresión protegida.
- Ruta visible: AttendanceControlComponent → AttendanceClaimService.getReclamosDocentePorGrupo → GroupClaimsModalComponent.
- Scope update 2026-11-03: el navegador comprobó que /app/docente/grupos abre /app/asistencia y GroupClaimsModal; el diálogo devolvió cero mientras la bandeja general mostró registros. El plan fuente ya registra el cero por bandera obsoleta; se amplían solo estos consumidores Frontend, sin backend/DB ni contrato nuevo.
- STOP_CONDITIONS: grupoId ausente/inválido; total/página incoherentes; HTTP 403/501/red/5xx; contrato requerido no disponible. El cambio dependiente no se oculta con datos vacíos ni se amplía el API por suposición.

## Alcance

1. Carga completa paginada de reclamos docentes y filtro local exacto por grupoId.
2. Estado visual correcto para carga, vacío, fallo de autorización, no disponibilidad y fallo HTTP/red.
3. Conteo solo después de una carga completa válida.
4. Cancelación/guardas contra respuesta obsoleta al cambiar grupo.
5. Pruebas focales y validación de lectura con DOCENTE en infraestructura existente.

## No alcance

- Filtro HTTP por grupo, nuevo endpoint, cambios a backend/DB, cambios de ownership o RBAC.
- Resolver/crear/modificar reclamos, cambios a la bandeja general, correcciones del proveedor de seguridad.
- Crear reclamos o fixtures en datos institucionales.

## Archivos afectados

- EXISTENTES: los paths permitidos bajo src/app enumerados arriba.
- NUEVOS: docs/work-items/APP-05-reclamos-docente-grupos/{PLAN.md,TEST_PLAN.md,VALIDATION.md}.
- RETIRAR: ninguno.

## Riesgos y dependencias

- Consultar todas las páginas genera una petición secuencial por cada 100 filas. Se documentará el conteo real y cualquier límite operacional observado; un filtro/snapshot server-side requeriría contrato aprobado aparte.
- Datos que cambien durante la paginación pueden invalidar la completitud; el frontend falla cerrado si los totales cambian o detecta páginas/IDs duplicados.
- El estado 501 puede seguir ocurriendo en el runtime local aunque el snapshot de código/SQL incluya el provider; navegador obligatorio y sanitizado.
- Datos reales ausentes para un escenario se anotan NOT_RUN; nunca se crean fixtures institucionales.

## Rollback y stop conditions

Detener el alcance dependiente y registrar BLOCKED_BY_MISSING_EVIDENCE si runtime/API no entrega el contrato necesario. No cambiar pruebas RED para ajustarlas a la solución; contradicción con el contrato implica TEST_CONTRACT_CONFLICT y dictamen separado.

## Deuda conocida y validación manual

- Sin nueva deuda declarada. Se registra la limitación de no tener filtro de grupo server-side como dependencia potencial, no como contrato inventado.
- Validación manual obligatoria en navegador integrado, sesión DOCENTE, únicamente consultas; evidencia sin PII, cookies ni tokens.

## Definition of Ready

READY para el cambio frontend acotado: requisito provisto; snapshots identificados; controller, DTO y SP actuales confirman paginación, total, grupoId y ownership; no hace falta ampliar HTTP; consumers y paths identificados; TEST_PLAN cubre los estados observables; rollback es reversible. La aprobación del provider/runtime y la validación con usuario real son gates de cierre, no se presumen PASS.
