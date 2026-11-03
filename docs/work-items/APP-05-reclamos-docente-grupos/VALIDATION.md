---
status: active
type: validation
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-03
---

# VALIDATION — APP-05 Reclamos docentes por grupo

## Alcance implementado

- `SolicitudRevisionItem` y `ClaimMapper` conservan el `grupoId` real informado por el DTO.
- `AttendanceClaimService.getReclamosDocentePorGrupo` usa el GET contractual de docente con `pagina` y `tamano=100`, consume páginas secuencialmente y solo emite tras verificar el total, la cantidad de filas, IDs únicos y UUID `grupoId` presentes. Filtra por igualdad de UUID normalizada; no agrega parámetro `grupoId` ni endpoint.
- `TeacherGruposComponent` y `AttendanceControlComponent` usan `getReclamosDocentePorGrupo`, filtran defensivamente por UUID, evitan cargas duplicadas, cancelan la consulta previa al cambiar de grupo e ignoran callbacks obsoletos. Los errores no se convierten en listas vacías y hay reintento visible.
- Hub/panel y `GroupClaimsModal` separan carga, lista vacía confirmada, 403, 501, red y otros errores; el conteo aparece solo tras carga completa.
- La bandeja general docente conserva su código y contrato.

## Pruebas automatizadas

| Fase | Comando / evidencia | Resultado |
|---|---|---|
| RED original | Comando focal definido en `TEST_PLAN.md`; ejecutado sobre base `b2a27d23013877638b566b667f950162e33bc594` antes de producción | Exit code 1 durante compilación por las superficies APP-05 ausentes; Karma no ejecutó assertions. Seis specs congelados en `TEST_PLAN.md`. |
| GREEN original | Comando focal del service, mapper, TeacherGrupo y bandeja general definido en `TEST_PLAN.md` | Exit code 0; `TOTAL: 104 SUCCESS`, 0 fallos, ChromeHeadless 156.0.0.0. |
| RED adicional | Specs AttendanceControl y GroupClaimsModal antes de producción | Exit code 1 por símbolos de estado y retry ausentes; Karma no ejecutó assertions. Hashes en `TEST_PLAN.md`. |
| GREEN adicional | `npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/features/attendance/attendance-control/attendance-control.component.spec.ts --include=src/app/features/attendance/attendance-control/components/group-claims-modal.component.spec.ts` | Exit code 0; `TOTAL: 28 SUCCESS`, 0 fallos, ChromeHeadless 156.0.0.0. El runner imprimió un `NG0205` del router sin fallo asociado; detalle en `TEST_PLAN.md`. |
| Integridad RED | SHA-256 actual de las ocho pruebas focales | Las seis originales y las dos adicionales coinciden con sus snapshots RED en `TEST_PLAN.md`. |
| Formato | `git -c core.whitespace=cr-at-eol diff --check` | Sin errores de whitespace al reconocer CRLF versionado en el modal. |


La primera ejecución GREEN original encontró una expectativa del texto de vacío legacy y la primera ejecución del diálogo repitió el mismo problema. Se corrigió solo el copy de producción; las ejecuciones focales finales pasaron. No se ejecutó suite masiva, build, CI remoto ni pruebas de proveedor.

## Validación en navegador integrado

### Observación manual con DOCENTE

- El usuario inició sesión manualmente; no se capturaron credenciales, tokens, cookies ni se conservaron datos personales.
- En `/app/docente/grupos` se mostró un grupo. Al abrirlo y usar `Reclamos`, el diálogo del runtime mostró `0 Registros` y su texto de lista vacía.
- Desde `Abrir Bandeja Completa`, la bandeja general mostró 7 resultados en `Todos los reclamos` (una página: 1–7 de 7), 0 en `Solo Pendientes` y 4 en `Solo Aprobados`. No se ejecutaron acciones de resolver ni modificar reclamos.
- Esta observación confirma una discrepancia entre el diálogo y la bandeja agregada. El conteo general por sí solo no confirma la pertenencia de cada fila al grupo seleccionado; no se almacenaron nombres, UUID ni capturas con PII.

### Límites de la observación

- NOT_RUN: validar el comportamiento corregido en el bundle de este branch. El navegador ya autenticado mostró el runtime existente; no se inició ni reinició el frontend y no se confirmó que ese bundle incluyera estos cambios.
- NOT_RUN: seleccionar un segundo grupo y comprobar su resultado; el listado mostró solo un grupo.
- NOT_RUN: inspección de Network/DevTools y captura sanitizada de status/body. La interfaz CUA disponible expone DOM, capturas y clics, no la pestaña Network; por ello no se reportan status HTTP, URL observada ni cuerpo de respuesta. La bandeja visual no sustituye evidencia HTTP.
- NOT_RUN: validar en navegador respuestas 403, 501, desconexión o 5xx. Esos estados sí tienen cobertura automatizada en los componentes; su proveedor/ruta real no se certifica con mocks.
- No se aprobaron, rechazaron, eliminaron ni radicaron solicitudes.

## Limitaciones

- El backend no ofrece filtro contractual por grupo. Para cada consulta de grupo se recorren las páginas completas del listado autorizado: una petición por cada 100 filas. No se cambió Backend, DB ni el ownership.
- El cliente falla cerrado ante total ausente/cambiante, página corta, fila sin UUID de grupo o ID duplicado. Eso evita publicar conteos parciales; el panel muestra el estado de error.
- Las pruebas automatizadas focales son GREEN. La observación DOCENTE confirma el defecto en el runtime disponible, pero la versión corregida y las respuestas HTTP siguen sin validación de navegador. El cambio puede prepararse en PR borrador; no declararlo funcionalmente listo para integrar ni cerrar APP-05 hasta completar esos gates.

## Corrección focal del CI — PR #33

### Hallazgo y cambio

- CI de referencia: [run 41584016293](https://github.com/shesho22/AsistenciasUCO-Frontend/actions/runs/41584016293), head `a62ff3df56c51c2bccc67c5a760d269e4735a329`: 1391/1395 PASS y 4 FAIL en `attendance-control.workflows.spec.ts`.
- Causa: el `SpyObj<AttendanceClaimService>` de ese spec conservaba `getReclamosDocente`, pero `AttendanceControlComponent` ya llama `getReclamosDocentePorGrupo`.
- Corrección exclusiva del fixture: se añadió `getReclamosDocentePorGrupo` al `SpyObj` y se configuró `of([])` como respuesta válida. El mock `getReclamosDocente` permanece. No se cambiaron expectativas, código de producción ni specs deshabilitados.

### Estado de las copias oficiales

Fetch acotado de referencias remotas, sin checkout ni actualización de archivos de trabajo:

| Copia | Rama local / referencia remota comprobada | SHA |
|---|---|---|
| Frontend personal | APP-05 / `origin/fix/app05-reclamos-docente-grupos` | `a62ff3df56c51c2bccc67c5a760d269e4735a329` |
| Frontend | `develop` / `origin/develop` | `b2a27d23013877638b566b667f950162e33bc594` |
| Backend | `develop` / `origin/develop` | `9b765b076a5f5940d69d84c6ab2bc0cf9aa890fb` |
| DB | `develop` / `legacy-db/develop` | `fe1ccd710aed4f84416bdfe03da36976797ce7df` |

Backend y DB no recibieron cambios de archivos. Se conservaron sin alteración las rutas no seguidas preexistentes de Backend: `.codex/` y `docs/work-items/FIX-003-role-registration-idempotency/evidence/`.

### Validación local — 2026-11-03 (America/Bogota)

| Alcance | Comando | Resultado |
|---|---|---|
| Solo el spec reportado por CI | `npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/features/attendance/attendance-control/attendance-control.workflows.spec.ts` | Exit 0; 18/18 PASS; ChromeHeadless 156.0.0.0 (Windows 10). Incluye las cuatro pruebas que fallaban en CI. |
| Regresión focal APP-05 | Mismos 8 specs congelados en este `TEST_PLAN.md` más `attendance-control.workflows.spec.ts`, ejecutados en una sola llamada | Exit 0; 150/150 PASS. |
| Suite completa, cobertura y build | `npm run verify` (ejecutado una vez) | Exit 0; 1395/1395 PASS. Cobertura: statements 91.22 %, branches 76.08 %, functions 90.94 %, lines 92.17 %. |
| Gate específico realtime | Incluido en `npm run verify`: `npm run coverage:realtime:check` | PASSED; line 95.06 % (umbral 90 %), branch 84.52 % (umbral 80 %). |
| Build productivo | Incluido en `npm run verify`: `npm run build -- --configuration=production` | Exit 0; bundle generado en `dist/gestio-asistencia-frontend`. |

Durante la regresión focal volvió a aparecer `NG0205: Injector has already been destroyed` asociado al Router; no causó fallos y el exit code fue 0. La suite completa finalizó 1395/1395. También se imprimieron avisos de validación de fixtures en pruebas del student portal; no hubo fallos asociados.

### Estado posterior

- En esta validación local, la corrección queda limitada a `attendance-control.workflows.spec.ts`; esta actualización preserva la evidencia previa de APP-05.
- Pendiente: commit/push del nuevo SHA, CI remoto asociado y validación manual en el navegador integrado con la versión del branch. La observación DOCENTE anterior permanece histórica; no certifica el runtime corregido.
