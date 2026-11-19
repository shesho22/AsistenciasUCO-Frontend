---
status: active
type: normative
scope: frontend
work-item: LB-001B.5 / LB-001B.5A / MV-001A / LB-001C.2B
authority: docs/contracts/external/backend/BACKEND_GOLDEN_PATH_CONTRACT.md (SHA-256 9b4830b468b58b49793658454a7b34deec20d2d9681943aa8f1e3942b15d8c62)
---

# Contrato frontend del Golden Path (LB-001B.5 / LB-001B.5A / MV-001A)

Insumo para LB-001C junto con `external/backend/BACKEND_GOLDEN_PATH_CONTRACT.md`. **No es OpenAPI.** Describe lo que el frontend hace hoy (AS-IS verificado por tests), no una decisión nueva. Ante conflicto manda el contrato backend.

Flujo: docente → horario → grupo → sesiones → estudiantes → asistencias → guardar lote → SSE → refresh HTTP.

## 1. Rutas y roles

| Ruta | Roles (`roleGuard`) | Nota |
|---|---|---|
| `/app/asistencia` | `DOCENTE` | Pantalla operativa de registro. `DECANO`, `ADMIN`, `ADMINISTRADOR`, `COORDINADOR` y `ESTUDIANTE` no acceden (el backend responde 403 en horarios, sesiones y lote). |
| `/app/docente/grupos` | `DOCENTE` | Gestión de grupos y sesiones (crear/editar sesión). Las acciones de sesión sin contrato (QR/PIN, cancelar) están deshabilitadas por feature (§4.2). |
| `/app/docente/horarios` | `DOCENTE` | Horario semanal (`GET /docente/horarios`). Sin aula (§4.1). |

Los enlaces a `/app/asistencia` (menú, dashboard, hub de grupos) solo se muestran al rol `DOCENTE`.

## 2. Servicios y endpoints

| Servicio | Método | Endpoint |
|---|---|---|
| `CourseService` | `getCurrentTeacherCourses()` | `GET /api/v1/docente/horarios` |
| `GroupService` | `getStudentsByGroup(grupoId)` | `GET /api/v1/grupos/{grupoId}/estudiantes` |
| `SessionService` → `SessionV2Service` | `getSessionsByGroup(grupoId)` | `GET /api/v2/sesiones/grupo/{grupoId}` |
| `SessionService` → `SessionV2Service` | `getSession(sesionId)` | `GET /api/v2/sesiones/{sesionId}` |
| `SessionService` → `SessionV2Service` | `createSession` | `POST /api/v2/sesiones` |
| `SessionService` → `SessionV2Service` | `updateSession` | `PATCH /api/v2/sesiones/{sesionId}` → `ApiDataResponse<Void>` |
| `AttendanceService` | `getAttendancesByGroup(grupoId, sesionId?)` | `GET /api/v1/grupos/{grupoId}/asistencias?sesionId=` |
| `AttendanceService` | `saveBatchAttendance` | `POST /api/v1/asistencias/lote` |
| `RealtimeService` → `FetchSseRealtimeTransport` | `startForGroup(grupoId)` | `GET /api/v1/realtime/stream?grupoId=` |

Modo real: `USE_MOCKS=false` (valor por defecto de `environment.useMocks`). Con `false` ningún servicio del Golden Path cae a mocks, ni siquiera ante un error HTTP (test `golden-path-real-mode.spec.ts`). Los mocks solo existen para desarrollo y tests con `USE_MOCKS=true`; el transporte realtime no conecta en modo mock.

## 3. Requests

**Sesiones UTC V2 (AS-IS vigente, migración aprobada MAINT-003F/MAINT-004).** UTC V2 es el único flujo normal de creación, edición, listado y consulta de sesiones en modo real: no hay bandera `USE_SESSIONS_V2` (ni en `localStorage` ni en `window.env`) y no hay fallback silencioso a V1. Los instantes viajan como RFC 3339 con offset (hasta 7 decimales) y se calculan con la zona de presentación activa (`SessionTimeZoneService`: automática del navegador o IANA manual; la selección es de presentación, no una versión de API). Se rechazan horas iguales, inexistentes o ambiguas; una sesión que cruza medianoche es válida. El resto de esta sección conserva el texto histórico de V1 solo para las rutas V1 que siguen existiendo en el servidor como compatibilidad.

**Crear sesión** — exactamente `{ grupo, nombre, fechaHoraInicio, fechaHoraFin }` (`POST /api/v2/sesiones`).

**Actualizar sesión** — exactamente `{ nombre, fechaHoraInicio, fechaHoraFin }`. **PATCH Sesion consume `ApiDataResponse<Void>`** = `{ "exitoso": true, "datos": null }` (backend §C.8): `SessionService.updateSession()` devuelve `Observable<ApiVoidDataResponse>` (`ApiDataResponse<null>`), el consumidor solo usa `exitoso` y recarga la lista por `GET /sesiones/grupo/{grupoId}`. **No** se fabrica `idTransaccion`, `mensajeUsuario` ni una `ClassSession`.

No se envían `tema`, `topic`, `descripcion`, `aula`, `room`, `tipo`, `status` ni `docente` (el backend responde 400 `FIELD_UNKNOWN`).

`Sesion.nombre`: 1..50 caracteres (tras `trim`). El frontend lo valida **antes** de enviar (`core/validation/session-name.util.ts`): `maxlength=50` en los dos formularios, botón deshabilitado, mensaje «entre 1 y 50 caracteres», y `SessionService` rechaza localmente sin llamar al backend.

**SESSION UPDATE HTTP METHOD:** `PATCH /api/v2/sesiones/{sesionId}` (LB-001C.2B; migrado a V2 en MAINT-004; antes `/api/v1`). `PUT`: solo compatibilidad backend (deprecated); consumidor frontend removido, sin fallback PATCH→PUT. PATCH aquí modifica la subrepresentación mutable de Sesión: los tres atributos siguen siendo obligatorios (sin campos opcionales, merge ni JSON Patch).

**Guardar lote** — `{ sesionId, registros: [ { estudianteId, estado } ] }`, con `estado ∈ {AN, SJC, EX}`. Sin `causa`, `observacion`, `aula`, `docente` ni `correlationId` en el body.

## 4. Modelo de sesión (respuesta consumida)

`SesionV2ApiDto`: `sesion, grupo, nombre, numero, codigo, numeroSemana, codigoGrupo, nombreGrupo, fechaHoraInicio, fechaHoraFin` (ambas nulas si `estadoTemporal=INDETERMINADA`), más `estadoTemporal` y `procedenciaTemporal` → `ClassSession { id, courseId, sessionNumber, title (= nombre), date, startTime, endTime, records, fechaHoraInicio, fechaHoraFin, estadoTemporal, procedenciaTemporal }` (fecha y hora de presentación calculadas en la zona activa). El DTO V1 `SesionConsultadaApiDto` fue retirado del frontend por no tener consumidores. `nombre` no se copia a ningún otro campo; la sesión no tiene tipo, aula ni tema en el frontend.

**Sesion no posee lifecycle/status en frontend.** El backend no expone estado de sesión (backend §C.2), así que el frontend no define ni deriva `PROGRAMADA`, `EN_CURSO`, `CONCLUIDA` ni equivalentes, y tampoco los sustituye por otro estado inventado. No existe el gate `isSessionConcluded` ni los textos «Clase Activa», «Asistencia Consolidada», «Sesión Finalizada y Consolidada» o «Registro Cerrado» (`SESSION_SYNTHETIC_LIFECYCLE_COUNT = 0`). Los controles de asistencia dependen **solo** de `features.sessionsEnabled`, `features.attendanceEnabled`, `isSaving` y de la existencia de grupo/sesión (marcado masivo); ante una operación inválida la autoridad es backend/DB. El botón de guardado se llama «Guardar Asistencia» (sin «consolidar»). Los rótulos «En curso»/«Programada» del widget «Próxima clase» del dashboard se derivan del reloj y del horario semanal, no de la Sesion.

### 4.1 Aula / room

**No hay aula/room derivada de HorarioDocente.** `HorarioDocenteApiDto` no declara `aula` (backend §C, fila 1) y `CourseService.getCurrentTeacherCourses()` **no** asigna `Course.room` (ni siquiera un marcador «No disponible»; un `aula` que llegara en el JSON se ignora). `Course.room` y `HorarioDocenteItem.aula` son opcionales. Las superficies del Golden Path no presentan aula: tarjeta y búsqueda de grupos, hub del grupo, pestaña «Horario», cronograma de sesiones, detalle de sesión, `/app/docente/horarios` y tarjetas/próxima clase del dashboard docente (`GOLDEN_PATH_SYNTHETIC_ROOM_COUNT = 0`).

`OUT_OF_GOLDEN_PATH` (legado, sin tocar; leen `Course.room` opcional o su propio mapper y, sin aula, muestran el campo vacío): formulario de crear/editar grupo (`POST/PUT /grupos`, con su valor por defecto «Aula A-101»), verticales decano, coordinador y estudiante (`dean-faculty`, `coordinator-docentes`, `coordinator-students`, `student-courses`, `student-course-enroll-form`, `overview-student`), `teacher-assignment.mapper.ts`, catálogo admin de espacios y los mocks (`USE_MOCKS=true`, `crearGrupo` mock con «Aula Por Asignar»).

### 4.2 Acciones de sesión fuera del contrato

**No se presentan acciones de sesión no contractuales dentro del Golden Path.** Tienen decisión explícita `OUT_OF_GOLDEN_PATH` en `environment.features` (ambas `false`) hasta que exista un contrato propio:

| Acción | Feature | UI ocultada | Método legado (sin uso desde el Golden Path) |
|---|---|---|---|
| QR / PIN por sesión, «Proyectar Auto-Registro», «QR Asistencia» | `sessionQrEnabled` | menú «Acciones» de cada sesión en `GroupSessionsOverviewComponent`, cabecera de `TeacherGrupoHubComponent`, `TeacherGruposListComponent` | `SessionService.getQrToken` |
| Cancelar sesión | `sessionCancelEnabled` | menú «Acciones» de cada sesión en `GroupSessionsOverviewComponent` (modal de `SesionAccionesComponent`) | `SessionService.cancelarSesion` |
| Cerrar sesión | — (sin UI) | — | `SessionService.closeSession` |

Con la feature apagada los componentes ocultan el botón (input `false` por defecto) y quien maneja la acción no la ejecuta (`AttendanceControlComponent` para el QR y `SesionAccionesComponent` para la cancelación; no se invocan `getQrToken`/`cancelarSesion`). Los métodos siguen en `SessionService` marcados `@deprecated OUT_OF_GOLDEN_PATH`. Deuda no bloqueante: definir su contrato backend antes de reactivarlos. Tampoco pertenecen al contrato y no fueron tocadas en 5A: crear/editar grupo, QR de matrícula, reclamos y sábana de `/app/docente/grupos`.

## 5. Asistencia

- Estados públicos: `AN | SJC | EX`. Sin alias (`A`, `F`, `J`, `T`, …). Un estado desconocido en lectura **falla cerrado** (`AttendanceMapper` lanza y se muestra error de carga).
- **Ausencia de fila ≠ `AN`.** El estado UI local es `null` y se muestra **«Sin registrar»**. Nunca se rellena el roster con `AN`.
- Los controles (estado por estudiante, «Todos Presentes/Ausentes», «Guardar Asistencia», atajos de teclado) se habilitan según §4; no hay modo «solo lectura» por estado de sesión.
- Lectura: se combinan los estudiantes del grupo (solo `codigoEstado === 'A'`, decisión del consumidor, DR-007) con las asistencias persistidas (match por `idEstudiante` / `estudiante`). Sin match → `null`. No se asume orden del listado (DR-010 Opción A, sin paginación).
- **Batch parcial:** solo viajan los registros que el usuario seleccionó o modificó desde la carga («marcar todos» cuenta como selección explícita). Lo ya persistido sin cambios y lo «Sin registrar» no se envían. No hay lote si no hay selecciones. Un refresco (p. ej. por SSE) conserva las selecciones locales aún no guardadas; tras guardar se limpian y se recarga por HTTP.

## 6. Errores

El comportamiento se decide por `ApiErrorResponse.code` (`core/api/errors/api-error.util.ts`), nunca por el texto de `message` ni por `DBCODE` / `SEC_*` / `ATT_*` / `SES_*` (no llegan al frontend).

| `code` | Comportamiento |
|---|---|
| `UNAUTHORIZED` | Refresh y reintento (§8); si falla, sesión expirada → `/login`. Mensaje: sesión caducada. |
| `FORBIDDEN` | Toast «Acceso denegado» (`errorInterceptor`) y mensaje de permisos. Sin reintento. |
| `VALIDATION_ERROR` | Con `details[]`: «Campo 'x': …»; sin detalles: mensaje genérico. |
| `INVALID_REQUEST` | Mensaje genérico de solicitud no interpretable. |
| `RESOURCE_NOT_FOUND` | «Recurso no encontrado». |
| `CONFLICT` | Mensaje de conflicto de estado. |
| `FEATURE_UNAVAILABLE` | «No disponible por el momento». |
| `INTERNAL_ERROR` / `ERR_DB_UNCLASSIFIED` | Mensaje genérico de servidor (no se muestra el `message` técnico). |
| `ERR_*` (catálogo de feature) | Se muestra el `message` del envelope (el backend es dueño de ese texto). |

Sin envelope (401/403 de la cadena de seguridad, TD-021) el código se deriva del **status HTTP** (`0→NETWORK_ERROR`, `400`, `401`, `403`, `404`, `409`, `501`, `≥500`). `ApiErrorResponse.correlationId` queda disponible vía `getApiCorrelationId()` para soporte.

## 7. Correlación

`correlationInterceptor` (primero en la cadena `correlation → auth → error`) añade `X-Correlation-Id` = `crypto.randomUUID()` a cada request a la API. El reintento tras 401 reutiliza el mismo header (misma request clonada). El stream SSE envía su propio UUID por conexión.

## 8. 401 / refresh

Orden real de interceptores: `correlationInterceptor`, `authInterceptor`, `errorInterceptor`. Ante un 401 de la API, `authInterceptor` hace **un** refresh compartido entre peticiones concurrentes y reintenta con el token nuevo; **no destruye la sesión antes de intentar el refresh**. Si el refresh falla → `notifySessionExpired()` (una sola vez) → `/login`. Un 403 nunca dispara refresh. (TD-031 cerrado; cubierto por `auth.interceptor.spec.ts`.)

### 8.1 AUTH RELOAD — F5 restaura la sesión (MV001-A01)

**F5 restaura la sesión mediante un refresh token session-scoped**; ya no expulsa a `/login` (defecto MV001-A01: tras F5 los signals de `AuthService` quedaban en `null` y el guard redirigía al login).

| Dato | Dónde vive |
|---|---|
| Access token | **Solo memoria** (signal). Nunca `localStorage` ni `sessionStorage`. |
| Refresh token | Memoria **+** `sessionStorage['gestio_session_refresh_token']` (por pestaña: sobrevive a F5, desaparece al cerrar la pestaña). Único dato de sesión persistido. |
| `currentUser` | Solo memoria; se reconstruye desde los claims del JWT. |
| Password | Nunca se guarda. |

- **Login:** guarda el refresh token que devuelva Keycloak. Si no devuelve uno no se fabrica ninguno y se descarta cualquier refresh token residual.
- **Rotación:** `refreshAccessToken()` persiste el `refresh_token` recibido (memoria + `sessionStorage`); si Keycloak no rota conserva el vigente.
- **`initKeycloak()` (APP_INITIALIZER):** (1) access token vigente en memoria → autenticado; (2) si no (F5): refresh token de memoria o, si no hay, el de `sessionStorage` → `refreshAccessToken`; con éxito el access token queda en memoria, `currentUser` se reconstruye del JWT, el inicializador termina autenticado y `authGuard` deja pasar la ruta actual; (3) si el refresh falla (rechazo del IdP, error de red o JWT sin rol institucional válido) elimina el refresh token de `sessionStorage`, limpia la memoria y retorna `false`. **No navega**: el guard resuelve la ruta (→ `/login` si de verdad no hay sesión).
- **Limpieza:** `logout()`, `clearSession()` y `notifySessionExpired()` borran memoria y `sessionStorage`; los mensajes `LOGOUT` / `SESSION_EXPIRED` del `BroadcastChannel` dejan a la pestaña receptora sin refresh token persistido. Si `sessionStorage` no está disponible (bloqueado/lleno) la sesión vive solo en memoria, sin restauración tras F5.
- **Invariantes verificados por test:** `localStorage` no contiene `gestio_access_token`, `gestio_refresh_token` ni la clave de sesión; `sessionStorage` no contiene access token, password ni usuario; las claves legacy se siguen purgando al arrancar.
- **Compromiso local de SPA (documentado):** persistir el refresh token en `sessionStorage` lo expone a un XSS; se acepta para esta línea base a cambio de F5 sin re-login. Duplicar una pestaña copia su `sessionStorage`: si el realm activara rotación con revocación del refresh token, ambas pestañas competirían por el mismo token. **Deuda futura `AUTH-PKCE/BFF HARDENING`:** migrar a OIDC Authorization Code + PKCE o a un BFF con cookie `httpOnly` si entra al alcance productivo. No se hace en MV-001A.
- **TD-049 `USER_PROFILE_VERTICAL_NOT_IMPLEMENTED` — `OUT_OF_GOLDEN_PATH`, `NON_BLOCKING`:** `GET /api/v1/usuarios/perfil` responde `501 FEATURE_UNAVAILABLE`. La hidratación del perfil es opcional: la identidad primaria son los claims del JWT y un fallo (501, red) devuelve `null` sin cerrar sesión, sin bloquear la navegación ni el Golden Path (`GET /docente/horarios` → 200). Cubierto por test (login y restauración tras F5 con perfil 501).

## 9. Temporal (AS-IS, sin decisión — `READY_FOR_LB001C_TEMPORAL_DECISION`)

- Horario: `horaInicio` / `horaFin` (`LocalTime`, texto) se muestran recortados a `HH:mm`; `dia` como texto. Sin zona.
- Sesión: request y response usan `LocalDateTime` ISO **sin zona** (`YYYY-MM-DDTHH:mm[:ss[.f]]`). El frontend envía `${fecha}T${HH:mm}:00` y parsea con una regex estricta; un formato distinto produce error explícito. **No** convierte zonas horarias ni asume `America/Bogota`.
- `fechaHoraFin` de una sesión se construye con la **misma fecha** que el inicio (limitación AS-IS del formulario: una sesión no cruza medianoche).
- `RealtimeEvent.occurredAt`: ISO-8601 UTC (`Z`); solo se valida como string.
- Ambigüedad pendiente para LB-001C: el backend persiste UTC pero el wire de sesión es local sin zona; el frontend no puede saber en qué zona interpretarlo.

## 10. Realtime

- `GET /api/v1/realtime/stream?grupoId=…`, `Authorization: Bearer` por header (nunca en la URL), `X-Correlation-Id`, `credentials: omit`.
- Evento consumido: `ASISTENCIAS_SESION_ACTUALIZADAS`, envelope `{ eventId, type, occurredAt, correlationId, payload }`, `payload { grupo, sesion, totalRegistros }`. Los eventos con forma inválida, o con `event` ≠ `data.type`, se descartan.
- **HTTP es la fuente de verdad; SSE es solo señal.** Al recibir un evento del grupo **y** sesión visibles (coalescido 250 ms), el frontend vuelve a llamar `GET /grupos/{id}/asistencias` (más estudiantes). No se aplica el payload al estado. Tras una reconexión también refresca por HTTP (**REALTIME RECOVERY**, abajo).
- Estados: `DISCONNECTED | CONNECTING | CONNECTED | RECONNECTING | UNAUTHORIZED | ERROR`.

### REALTIME RECOVERY — tras reconexión siempre refresh HTTP (MV001-R01)

**Regla:** si la conexión realtime ha entrado en `RECONNECTING`, el **primer** `CONNECTED` posterior produce **exactamente un** refresh HTTP de la sesión visible (`GET /grupos/{id}/asistencias` + estudiantes), aunque entre ambos aparezcan `CONNECTING` o más `RECONNECTING`. Tras emitirlo, la marca se limpia (no hay dos refreshes por la misma reconexión).

| Secuencia de estados | Refresh |
|---|---|
| `RECONNECTING → CONNECTED` | 1 |
| `RECONNECTING → CONNECTING → CONNECTED` | 1 |
| `RECONNECTING → CONNECTING → RECONNECTING → CONNECTING → CONNECTED` | 1 |
| `DISCONNECTED → CONNECTING → CONNECTED` (conexión inicial) | 0 |

- `AttendanceRealtimeSyncService` lo implementa con una pequeña máquina de estado RxJS (`scan`): recuerda que se observó `RECONNECTING` y limpia la marca al primer `CONNECTED`. **No** depende del par consecutivo `RECONNECTING → CONNECTED` (`pairwise`): el transporte real emitía `RECONNECTING → CONNECTING → CONNECTED` tras `offline → online` y por eso no se recuperaba el cambio perdido. La marca es por suscripción y solo se limpia en `CONNECTED`.
- Un evento `ASISTENCIAS_SESION_ACTUALIZADAS` posterior sigue produciendo su refresh normal (coalescido 250 ms), independiente del refresh de reconexión.
- **Sin replay SSE ni `Last-Event-ID`:** los eventos perdidos durante la desconexión se recuperan solo por HTTP (fuente de verdad).
- Semántica del transporte: `backoffAttempt` (solo temporización) está separado de `isReconnecting` (semántica). `online` reinicia el backoff a 0 **sin** convertir la reconexión en conexión inicial: mientras `isReconnecting`, cada intento se anuncia `RECONNECTING`, nunca `CONNECTING`; `isReconnecting` se limpia solo con `CONNECTED`, `start()` o `stop()`.

### Liveness y stream zombie (MV001-R02)

- `HEARTBEAT LIVENESS = 25 s` (comentario SSE del backend). Todo `onmessage`, incluso sin `data`, cuenta como actividad y **no** se publica como evento de negocio.
- `STALE WATCHDOG` frontend: `CONNECTED` sin actividad SSE durante 40 s → reconexión forzada (`CONNECTED → RECONNECTING → CONNECTED`), no error terminal.
- `online` con stream activo fuerza una nueva generation aunque el fetch anterior siga bloqueado (sin depender de `wake`); nunca hay dos streams concurrentes.
- `RECONNECT → HTTP reconciliation`: un único refresh HTTP tras el primer `CONNECTED`; sin polling de negocio.

### Reconexión

- Fallo de red o cierre del servidor → `RECONNECTING`, backoff `1s, 2s, 5s, 10s, 30s` (+ jitter ≤ 250 ms).
- Evento `offline` del navegador: se aborta el stream, estado `RECONNECTING` y no se sondea. Evento `online`: reconexión **forzada** e inmediata (nueva generation, backoff a 0), anunciada como `RECONNECTING`. No requiere que otro usuario guarde: al reconectar el sync refresca por HTTP (arriba).
- Si el access token no puede renovarse por falta de red (o `getValidAccessToken` falla) pero la sesión existe, el bucle **espera y reintenta**; solo sin sesión (`token()` nulo) termina en `DISCONNECTED`.
- `401` → un refresh; si tiene éxito reconecta, si no → `UNAUTHORIZED` (terminal, toast «sesión expirada»).
- `403` → `ERROR` **terminal**, sin reintentos (toast «se perdió la conexión…»).
- `stop()` cancela pausas, listeners y reintentos.

## 11. Verificación

Tests: `npm run test:ci` (Karma/Jasmine, ChromeHeadless). Build: `npm run build -- --configuration=production`. MV-001 (E2E real Frontend + Backend + Keycloak + SQL Server + SSE): checklist en `docs/work-items/LB-001B.5-frontend-final-verification/MV-001-CHECKLIST.md`; evidencia, defectos `MV001-R01` / `MV001-R02` / `MV001-A01` y repetición manual pendiente en `docs/work-items/MV-001-golden-path-real-e2e/MV-001-REPORT.md`.

Conteos de residuos (LB-001B.5A), reproducibles desde la raíz del frontend; el resultado esperado es **sin coincidencias**:

```bash
# SESSION_SYNTHETIC_LIFECYCLE_COUNT = 0 (todo src, sin specs)
grep -rnE "isSessionConcluded|Clase Activa|Asistencia Consolidada|Sesión Finalizada|Registro Cerrado|Historial Inmutable|['\"]PROGRAMADA['\"]|['\"]EN_CURSO['\"]|['\"]CONCLUIDA['\"]|Guardar y Consolidar" src --include=*.ts --exclude=*.spec.ts

# GOLDEN_PATH_SYNTHETIC_ROOM_COUNT = 0 (superficies Golden Path: sin aula sintética ni presentada)
grep -rnE "Aula del grupo|Aula:|Espacio Físico|'No disponible'|'Aula Principal'" \
  src/app/core/services/course.service.ts src/app/core/services/session.service.ts \
  src/app/features/attendance src/app/features/teacher src/app/features/dashboard/overview/components/overview-teacher.component.ts \
  --include=*.ts --exclude=*.spec.ts
```

Los residuos de aula que quedan en el resto de `src` son exclusivamente los `OUT_OF_GOLDEN_PATH` de §4.1.

## 12. Deuda no bloqueante observada (fuera del alcance de 5A)

- Definir contrato backend para QR/PIN, cancelar y cerrar sesión antes de reactivar `features.sessionQrEnabled` / `sessionCancelEnabled` (§4.2).
- Valores por defecto sintéticos ajenos a Sesion/aula, aún presentes: `cupoMaximo || 35` (aforo del grupo), insignia «Grupo Activo» del hub, «Horas / Semana» = bloques × 2 en `/app/docente/horarios`.
- El detalle de sesión (`Detalles`) muestra `records` siempre vacío en modo real (no consulta asistencias).
- **AUTH-PKCE/BFF HARDENING:** el refresh token vive en `sessionStorage` (§8.1, compromiso local de SPA); migrar a Authorization Code + PKCE o BFF con cookie `httpOnly` si entra al alcance productivo.
- **TD-049** `USER_PROFILE_VERTICAL_NOT_IMPLEMENTED` (`GET /usuarios/perfil` → 501): `OUT_OF_GOLDEN_PATH`, `NON_BLOCKING` (§8.1).
