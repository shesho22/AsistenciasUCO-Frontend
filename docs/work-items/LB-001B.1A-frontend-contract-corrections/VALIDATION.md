# VALIDATION — LB-001B.1A frontend contract corrections

Fecha: 2026-09-22 (America/Bogota).
Rama: `develop`. Working tree con 32 rutas modificadas/nuevas (19 modificadas, 1 borrada, 12 nuevas) al momento de esta validación, correspondientes a la implementación GREEN de este work item (no había commit previo de cierre).

## 1. Revisión de alcance (diff real vs. PLAN.md)

Se inspeccionó `git status --short` y `git diff` completo de cada ruta modificada/nueva, contrastando contra el "Alcance autorizado" y "Contrato TARGET aprobado" de `PLAN.md`.

Resultado: **el diff corresponde al alcance declarado**. Detalle por archivo:

| Archivo | Decisión cubierta | Verificación |
|---|---|---|
| `src/app/core/mappers/attendance.mapper.ts` / `.spec.ts` | DR-002 | `studentsFromRoster` cambia default `attendance?.estado ?? 'AN'` → `?? null`; `studentToDTO` lanza si `status === null`. El residuo `(dto.estado_asistencia as AttendanceStatus) \|\| 'AN'` de `studentFromDTO()` (línea 49) permanece intacto, tal como exige la exclusión explícita de `attendance.mapper.ts` de este alcance. |
| `src/app/core/models/attendance.model.ts` | DR-002 | `status` ahora admite `null`. |
| `src/app/features/attendance/attendance-control/attendance-control.component.ts` + `components/attendance-control-table.component.ts` | DR-002, DR-005, DR-007 | Batch solo envía estados no nulos; UI muestra "Sin registrar"; navegación por teclado tolera `status === null`; no hay captura de causa/observación de `EX`. |
| `src/app/features/attendance/attendance-control/components/attendance-excuse-modal.component.ts` (borrado) | DR-005 | Sin referencias restantes en `src` (verificado con grep); consistente con "EX sin causa/observación no persistida". |
| `src/app/core/services/session.service.ts` / `.spec.ts`, `session.service.contract.spec.ts` (nuevo) | DR-003 | Nuevo `splitLocalDateTime` separa `fechaHoraInicio/Fin` por regex de string (`YYYY-MM-DDTHH:mm[:ss[.SSS]]`), sin `Date`; lanza error en formato no soportado. |
| `src/app/app.routes.ts`, `src/app/app.routes.spec.ts` (nuevo), `src/app/core/guards/role.guard.spec.ts` (nuevo) | DR-008 | Ruta `/app/asistencia` pasa de `roles: ['DOCENTE','DECANO','ADMINISTRADOR','ADMIN']` a `roles: ['DOCENTE']`. |
| `src/app/features/dashboard/overview/components/overview-hero.component.ts` | DR-008 | Se retiran los enlaces visibles "Auditoría de Asistencias" para roles DECANO/ADMIN (ya no aplican). |
| `src/app/core/interceptors/auth.interceptor.ts`, `.spec.ts` (nuevo) | TD-031 | Reemplaza `BehaviorSubject`/flag por `refreshInFlight$` compartido con `shareReplay`; refresco único, reintento tras éxito, expiración tras fallo definitivo. |
| `src/app/core/interceptors/error.interceptor.ts` | TD-031 | Retira el manejo de 401 (ahora exclusivo de `auth.interceptor.ts`) para evitar expiración duplicada/prematura; conserva el toast de 403. |
| `src/app/core/services/student.service.ts`, `.spec.ts` (nuevo), `src/app/core/validation/request-form-validation.util.spec.ts` (nuevo) | TD-032 | Elimina fallback la contraseña por defecto (valor retirado; ver historial); valida contraseña con `getPasswordValidationError` y rechaza vacío antes de llamar backend. |
| `src/app/features/auth/register/register.component.ts`, `.spec.ts` (nuevo) | TD-032 | Elimina default la asignación `password` por defecto (valor retirado; ver historial) y `effectivePassword` fallback. |
| `src/app/features/attendance/attendance-control/attendance-realtime-sync.service.ts`, `.spec.ts` | TD-033 | Feedback de estados terminales `UNAUTHORIZED`/`ERROR` sin duplicados. |
| `src/app/features/attendance/attendance-control/attendance-control.component.spec.ts`, `attendance-control.workflows.spec.ts` (nuevo), `attendance-control-table.component.spec.ts` (nuevo) | TD-033, DR-007, DR-002, DR-005 | Cobertura de fallo de carga de sesiones (toast) vs. lista vacía válida; filtro `codigoEstado === 'A'`. |
| `src/app/shared/components/toast/toast.component.ts`, `.spec.ts` (nuevo) | TD-033 (soporte) | Agrega `{ allowSignalWrites: true }` al `effect()` que gestiona el auto-dismiss, requerido por los nuevos flujos de feedback de error que escriben señales desde ese efecto. |
| `src/app/features/teacher/teacher-grupos/components/teacher-grupo-sabana.component.ts` | DR-002 (extensión de "no inventar datos") | Retira la síntesis de `AN`/`SJC` por paridad de ID cuando `sesion.status === 'CONCLUIDA'`; usa únicamente `rec?.status ?? '—'`. No toca `ClassSession.status` en sí (permanece `'PROGRAMADA'` sintetizado, fuera de alcance por DR-001). |
| `src/app/core/api/errors/api-error.util.spec.ts` (nuevo) | TD-033 (soporte) | Cobertura de utilidades ya existentes (`getApiErrorMessage`, etc.) usadas por el feedback de errores; no modifica `api-error.util.ts`. |
| `docs/frontend-features-pending.md` | DR-005 (documentación) | Registra explícitamente que captura/persistencia de causa/observación de `EX` queda como historia futura. |

**Hallazgo a reportar (no bloqueante):** el `TEST_PLAN.md` original solo congeló SHA-256 de 9 archivos de test; la implementación GREEN agregó specs adicionales no listados allí (`api-error.util.spec.ts`, `session.service.contract.spec.ts`, `request-form-validation.util.spec.ts`, `attendance-control.workflows.spec.ts`, `attendance-control-table.component.spec.ts`, `toast.component.spec.ts`). Todos son consistentes con las decisiones del `PLAN.md` (ver tabla arriba) y no contradicen ningún TARGET; se documentan aquí porque el TEST_PLAN no los previó nominalmente.

No se encontraron cambios ajenos al alcance (ruido de otra tarea).

## 2. Suite de verificación ejecutada

Repo: `C:\Users\josev\OneDrive\Documentos\Front_Asistecias\AsistenciasUCO-Frontend`. `node_modules` no existía; se ejecutó `npm ci` primero (969 paquetes, sin errores de instalación).

### 2.1 `npm run test:ci`
Comando real: `ng test --watch=false --browsers=ChromeHeadless --code-coverage`.

Resultado: **exit code 0**. `Chrome Headless 153.0.0.0 (Windows 10): Executed 151 of 151 SUCCESS` (`TOTAL: 151 SUCCESS`). Un `WARN` esperado de `auth.service.spec.ts` ("No se pudo hidratar el perfil...: Error: network down") corresponde a un caso de prueba que simula fallo de red intencionalmente; no es un fallo de test.

Cobertura reportada:

```
Statements   : 77.78% ( 1096/1409 )
Branches     : 62.64% ( 436/696 )
Functions    : 68.38% ( 225/329 )
Lines        : 78.62% ( 1067/1357 )
```

Comparación contra la última evidencia conocida (Lines ≥ 78.62% / Branches ≥ 62.64%): **cumple exactamente el piso** (Lines 78.62% = piso, Branches 62.64% = piso). No hay regresión.

### 2.2 `npm run coverage:realtime:check`
Comando real: `node scripts/check-realtime-coverage.mjs`.

Resultado: **exit code 0**, `[coverage:realtime] PASSED`.
```
TOTAL LINE: 95.62% (131/137)  threshold >= 90%
TOTAL BRANCH: 87.50% (49/56)  threshold >= 80%
```

### 2.3 `npm run build -- --configuration=production`
Comando real: `ng build --configuration=production`.

Resultado: **exit code 0**. `Application bundle generation complete. [11.854 seconds]`. Sin errores ni warnings de compilación. Output en `dist/gestio-asistencia-frontend`.

Los tres comandos anteriores equivalen a `npm run verify` (`test:ci && coverage:realtime:check && build -- --configuration=production`), ejecutados de forma descompuesta para capturar evidencia independiente de cada etapa.

### 2.4 Búsqueda de fallbacks/literales de contraseña productivos
Comando: `grep -rn "<contraseña por defecto retirada>" src --include="*.ts" | grep -v "\.spec\.ts"`.

Resultado: **0 coincidencias** fuera de archivos de test (exit code 1 de grep = sin matches). Confirma TD-032.

### 2.5 Higiene de git
- `git diff --check`: exit code 0, sin errores de espacios en blanco/conflictos.
- `git status --short`: 32 rutas (19 `M`, 1 `D`, 12 `??`), consistente con lo declarado por el usuario al iniciar la tarea.
- Backend (`C:\Users\josev\AsistenciasUCO\AsistenciasUCO`, rama `sergio`): **no se tocó**; esta validación operó exclusivamente sobre el repo frontend. `PLAN.md` lo declara `READ ONLY` y así se mantuvo.

## Conclusión

**Resultado global: PASS.** Los 151 tests pasan, la cobertura no es inferior a la última evidencia conocida (iguala el piso exacto en Lines y Branches), el build de producción compila sin errores, no hay literales de contraseña productiva remanentes, y el diff revisado corresponde al alcance autorizado en `PLAN.md` (DR-002, DR-003, DR-005, DR-007, DR-008, TD-031, TD-032, TD-033).
