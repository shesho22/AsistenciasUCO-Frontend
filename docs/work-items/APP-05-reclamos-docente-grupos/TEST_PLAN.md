---
status: active
type: test-plan
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-03
---

# TEST_PLAN — APP-05 Reclamos docentes por grupo

## REQUISITO → CONTRATO

- R-01: la vista usa el UUID del grupo seleccionado y solo muestra/contabiliza filas cuyo grupoId DTO coincide.
- R-02: con endpoint paginado, la lista de grupo no trata la página inicial como el conjunto total.
- R-03: ausencia real y fallo HTTP/red/no disponible son estados distintos; no se convierte un error en cero.
- R-04: cambiar de grupo durante una solicitud descarta/cancela la anterior.
- R-05: la bandeja general conserva páginas, filtro, total del servidor y estados existentes.
- Contrato congelado: GET /api/v1/docente/reclamos con estado, pagina, tamano; grupoId solo en DTO; ownership DOCENTE vigente.

## Casos focales

| ID | Comportamiento observable | Nivel | RED esperado |
|---|---|---|---|
| APP05-MAP-01 | Mapper conserva el grupoId UUID | Mapper unit | Campo ausente en modelo mapeado |
| APP05-SVC-01 | Dos páginas, reclamos de dos grupos; retorna solo el UUID solicitado | Service HTTP | Método no existe / página 2 ignorada |
| APP05-SVC-02 | Grupo sin reclamos retorna [] solo tras completar todas las páginas | Service HTTP | Página inicial se confunde con totalidad |
| APP05-SVC-03 | No se emite parámetro HTTP grupoId; URL conserva estado/página/tamaño existentes | Service HTTP | Query inventada |
| APP05-SVC-04 | Grupo faltante/inválido, IDs duplicados o total/página inconsistentes fallan cerrados | Service HTTP | Conteo parcial presentado como válido |
| APP05-SVC-05 | HTTP 403/501 y conexión propagan error | Service HTTP | Error transformado en [] |
| APP05-UI-01 | Carga, vacío, 403, 501, red y 5xx se distinguen; badge no muestra 0 ante error | Component | Panel/badge vacío engañoso |
| APP05-UI-02 | Cambio rápido de grupo deja visible solo respuesta del grupo actual | Component | Emisión tardía del grupo previo cambia datos |
| APP05-UI-03 | Carga/reintento no crea suscripciones duplicadas | Component | Dos GET para un mismo grupo activo |
| APP05-REG-01 | Bandeja general conserva paginación, filtros, total y respuestas de error existentes | Service + component regression | Página/filtro reemplazados o alterados |
| APP05-ATT-01 | Diálogo alcanzable desde asistencia ignora el feature flag obsoleto y consulta por UUID del grupo | AttendanceControl component | No emite GET por bandera falsa |
| APP05-ATT-02 | Fila con grupoId exacto se muestra; otros grupos/materias parecidas no se asocian | AttendanceControl component | Asociación por materia/código/nombre |
| APP05-ATT-03 | 403/501/red/5xx no muestran vacío ni conteo 0; permiten reintento | AttendanceControl + GroupClaimsModal | Error aparece como lista vacía |
| APP05-ATT-04 | El modal solo declara vacío/cuenta cuando la carga completa está LOADED | GroupClaimsModal component | Badge vacío/0 durante carga o error |

## Secuencia

1. Congelar este plan; añadir pruebas focales sin cambiar producción.
2. Ejecutar únicamente los specs de mapper, service, TeacherGrupos, Hub, panel de grupo y bandeja general. Registrar el RED esperado.
3. Guardar RED_SNAPSHOT con commit base, hashes de specs, comando, exit code y fallo esperado.
4. Implementar solo después de RED; no editar pruebas RED durante GREEN.
5. Repetir los specs focales; ampliar a regresión docente/build productivo solo si los cambios lo requieren.
6. Validar con DOCENTE en navegador integrado y solo lectura. Separar lo observado en el runtime abierto de la verificación de la versión del branch; si no se sirve el bundle corregido o no hay inspector HTTP, registrar NOT_RUN para esos resultados.

## RED_SNAPSHOT

- Estado: RED de compilación, exit code 1. El bundle de Angular se generó; el compilador detectó las superficies de comportamiento aún ausentes (grupoId de modelo, método de consulta completa por grupo, estado de carga y output de reintento). Karma no lanzó ChromeHeadless porque falló la compilación. No se afirma ejecución de assertions runtime en esta fase.
- Base Frontend: b2a27d23013877638b566b667f950162e33bc594; rama fix/app05-reclamos-docente-grupos.
- Comando GREEN original: `npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/core/mappers/claim.mapper.spec.ts --include=src/app/core/services/attendance-claim.service.spec.ts --include=src/app/features/teacher/teacher-grupos/teacher-grupos.component.spec.ts --include=src/app/features/teacher/teacher-grupos/components/teacher-grupo-hub.component.spec.ts --include=src/app/features/teacher/teacher-grupos/components/teacher-grupo-reclamos.component.spec.ts --include=src/app/features/teacher/teacher-claims/teacher-claims.component.spec.ts`.
- Apéndice RED adicional APP-05: congelar `attendance-control.component.spec.ts` y `group-claims-modal.component.spec.ts` antes de producción en esas rutas.
- SHA-256 de los specs congelados:
  - claim.mapper.spec.ts: 2EDA935B9C3B902CC9C354E0F08358032855AB9FE263BE206719FC2E42834199
  - attendance-claim.service.spec.ts: 5DF673F14D27BA3EC7713C6491A1D755742D3ABC22E59F3292C96EFB56110DFE
  - teacher-grupos.component.spec.ts: AE421F8131E72D79156EE9ACF427055A45334FE921026F21F031FB30339ECE97
  - teacher-grupo-hub.component.spec.ts: A992CBFFAA27C4D6D4153C60222AEABFD674B4119560F4B7C45ED891035E84E2
  - teacher-grupo-reclamos.component.spec.ts: 45805D9884C2E83B19D6DA0AD28BD7191BB85EB892086A7313BF1CA2FD38A111
  - teacher-claims.component.spec.ts: A4568055683C466A8FFFFB7409F63CDFF191729F33AEAE8F29EE4E760399A269
- Implementación GREEN debe ejecutar de nuevo los mismos specs; cualquier cambio posterior a estos archivos requiere dictamen de contrato de pruebas y un nuevo RED antes de GREEN.

## GREEN_SNAPSHOT

- Fecha: 2026-11-03 (America/Bogota).
- Comando exacto: `npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/core/mappers/claim.mapper.spec.ts --include=src/app/core/services/attendance-claim.service.spec.ts --include=src/app/features/teacher/teacher-grupos/teacher-grupos.component.spec.ts --include=src/app/features/teacher/teacher-grupos/components/teacher-grupo-hub.component.spec.ts --include=src/app/features/teacher/teacher-grupos/components/teacher-grupo-reclamos.component.spec.ts --include=src/app/features/teacher/teacher-claims/teacher-claims.component.spec.ts`.
- Resultado final: exit code 0; `TOTAL: 104 SUCCESS`, 0 fallos; ChromeHeadless 156.0.0.0. Incluye mapper, servicio HTTP, padre/hub/panel de grupos y regresión de bandeja general.
- Una ejecución intermedia reportó una expectativa legacy del texto vacío; se ajustó únicamente el copy de producción. Las pruebas RED no se editaron; hashes actuales coinciden con RED_SNAPSHOT.
- Advertencia preexistente del runner: un spec de `getHorarioDocente` no contiene expectativas; no afectó los 104 resultados exitosos.
- No se ejecutó suite completa, build de producción ni CI remoto.
## RED_SNAPSHOT_ADICIONAL — diálogo de reclamos del grupo

- Estado: RED de compilación, exit code 1. Faltaban `AttendanceControlComponent.estadoCargaReclamos` y `GroupClaimsModalComponent.reintentar`; Karma no ejecutó assertions.
- Este RED es adicional al GREEN original de TeacherGrupo y no modifica los seis hashes originales.
- Comando exacto: `npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/features/attendance/attendance-control/attendance-control.component.spec.ts --include=src/app/features/attendance/attendance-control/components/group-claims-modal.component.spec.ts`.
- SHA-256 congelados:
  - `attendance-control.component.spec.ts`: `87DE59EBC152FF8F91620D375CA96DA0A6C6C3DBBE16379E4AA40C2997150E76`
  - `group-claims-modal.component.spec.ts`: `E7797440FB454B46353C1F725303C9E876CEF459629836B563660F0D2381B33B`
- La expectativa de las pruebas no se cambió después del snapshot; se restauró la línea de formato original y las huellas volvieron a coincidir exactamente.

## GREEN_SNAPSHOT_ADICIONAL — diálogo de reclamos del grupo

- Fecha: 2026-11-03 (America/Bogota).
- Comando exacto: `npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/features/attendance/attendance-control/attendance-control.component.spec.ts --include=src/app/features/attendance/attendance-control/components/group-claims-modal.component.spec.ts`.
- Resultado final: exit code 0; `TOTAL: 28 SUCCESS`, 0 fallos, ChromeHeadless 156.0.0.0.
- Una primera ejecución GREEN tuvo 1 assertion fallida porque producción conservaba el copy anterior del vacío; se corrigió solo el texto de producción y la repetición terminó 28/28.
- El runner imprimió además `NG0205: Injector has already been destroyed` asociado al router durante la suite AttendanceControl; no produjo fallo ni alteró exit code. Debe conservarse como observación, no como PASS de esa ruta de navegación.
- Huellas SHA-256 actuales de los dos specs coinciden con el RED_SNAPSHOT_ADICIONAL.
