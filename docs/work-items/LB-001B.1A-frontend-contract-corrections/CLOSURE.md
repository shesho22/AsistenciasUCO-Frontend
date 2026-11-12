# CLOSURE — LB-001B.1A frontend contract corrections

Fecha de cierre: 2026-09-22 (America/Bogota).
Estado: **CERRADO — DoD cumplido**. Evidencia completa en `VALIDATION.md`.

## Qué se resolvió

- **DR-002** — Ausencia de asistencia ya no se sintetiza como `AN`. `AttendanceMapper.studentsFromRoster` produce `status: null` ("Sin registrar") cuando no hay fila persistida; `studentToDTO` rechaza serializar un estado nulo. El batch solo envía `AN|SJC|EX` explícitos. Extendido también a `teacher-grupo-sabana.component.ts`, que dejó de inventar `AN`/`SJC` por paridad de ID de estudiante en sesiones `CONCLUIDA`.
- **DR-003 (parcial, según alcance)** — `SessionService` mapea `fechaHoraInicio/Fin` a `date`/`startTime`/`endTime` mediante split de string por regex, sin `Date` ni conversión de zona horaria; formato no soportado lanza error explícito.
- **DR-005** — Se eliminó `attendance-excuse-modal.component.ts`; marcar `EX` solo cambia el estado, sin captura ni persistencia de causa/observación. Documentado como historia futura en `docs/frontend-features-pending.md`.
- **DR-007** — El control de asistencia y la tabla asociada solo operan sobre matrícula con `codigoEstado === 'A'`.
- **DR-008** — Ruta `/app/asistencia` ahora declara únicamente `roles: ['DOCENTE']`; se retiraron los enlaces visibles de "Auditoría de Asistencias" para DECANO/ADMIN en `overview-hero.component.ts`.
- **TD-031** — `auth.interceptor.ts` reemplaza el mecanismo de cola por flag/`BehaviorSubject` por un `refreshInFlight$` compartido (`shareReplay`); un único refresh en vuelo, reintento con token nuevo tras éxito, expiración de sesión solo tras fallo definitivo. `error.interceptor.ts` deja de manejar 401 (evita expiración duplicada/prematura) y conserva el toast de 403 sin refrescar.
- **TD-032** — Se eliminaron los fallbacks de contraseña productiva por defecto (valor retirado; ver historial) en `register.component.ts` y `student.service.ts`; ambos exigen contraseña válida antes de invocar backend. Verificado por búsqueda estática (0 coincidencias fuera de specs).
- **TD-033** — Fallo de carga de sesiones y estados realtime terminales (`UNAUTHORIZED`/`ERROR`) muestran feedback observable (toast) sin duplicados; se distingue explícitamente de una lista vacía válida.

## Qué queda (deuda técnica y fases futuras, no cubiertas aquí)

- **DR-001** (estado de sesión) y **DR-004** (campos de sesión/presentación fantasma: `descripcion`/`aula`/`tipo`/`topic`/`docenteName`/`status` no persistidos por la DB) — explícitamente fuera de alcance de LB-001B.1A; planificados en LB-001B.1B (ver `PLAN.md` de esa fase, creado en este mismo cierre).
- **`attendance.mapper.ts` — residuo `(dto.estado_asistencia as AttendanceStatus) || 'AN'`** en `studentFromDTO()` (línea 49): queda intacto por decisión explícita de esta tarea (fuera de alcance de LB-001B.1A). Se registra como deuda técnica nueva a corregir en una fase posterior, no en LB-001B.1B (que tampoco la toca, ver su PLAN.md).
- DR-006 (estado legacy), DR-009/TD-030: no abordados, fuera del alcance autorizado desde el inicio.
- El `TEST_PLAN.md` original no había previsto nominalmente 6 archivos de spec que se añadieron durante la implementación GREEN (soporte de utilidades y contrato de `SessionService`); son consistentes con el TARGET aprobado (ver detalle en `VALIDATION.md` sección 1), pero quedan señalados como desviación menor de proceso, no de producto.

## Evidencia de DoD

- Suite de tests: 151/151 `SUCCESS`, exit code 0 (`npm run test:ci`, capturado 2026-09-22).
- Cobertura: Lines 78.62% / Branches 62.64% (iguala exactamente el piso previo conocido, sin regresión).
- Cobertura realtime dedicada: Line 95.62% / Branch 87.50% (umbral 90%/80%, `PASSED`).
- Build de producción: exit code 0, sin errores.
- Sin literales de contraseña productiva remanentes en código de producción.
- `git diff --check` limpio; backend (`AsistenciasUCO`, rama `sergio`) no modificado.

Detalle completo de comandos y salidas en `VALIDATION.md` (mismo directorio).

## Referencia a continuación

LB-001B.1B (limpieza de campos de sesión fantasma / `docenteName`/`status` en pantallas ampliadas) se planifica en `docs/work-items/LB-001B.1B-db-source-of-truth-cleanup/PLAN.md`, sin implementación en este cierre.
