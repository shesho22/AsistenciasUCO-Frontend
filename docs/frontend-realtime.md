# Realtime (SSE) en asistencia

## Endpoint, scope y autenticación

```http
GET {environment.apiUrl}/realtime/stream?grupoId={UUID}
Accept: text/event-stream
Authorization: Bearer <JWT>
X-Correlation-Id: <UUID>
```

Hay dos canales con el mismo formato, heartbeat y reconexión:

| Canal | Endpoint | Quién lo abre | Para qué |
| :--- | :--- | :--- | :--- |
| Grupo | `GET /realtime/stream?grupoId={UUID}` | Las pantallas de un grupo (`startForGroup`) | Aula: toma, QR, contador de presentes, sesiones del grupo |
| Usuario (REDIS-001, TD-084) | `GET /realtime/stream/usuario` | `DashboardLayoutComponent` mientras hay sesión (`startForUser` / `stopUser`) | Contadores del menú en cualquier pantalla: solicitudes de sesión (coordinador y docente), faltas avisadas, alertas y revisiones |

Cada canal usa su propia instancia de `FetchSseRealtimeTransport` (`REALTIME_TRANSPORT` y `REALTIME_USUARIO_TRANSPORT`), así abrir
o cambiar de grupo no cierra el del usuario. `RealtimeService.events()` une ambos y descarta por `eventId` el evento que llega por
los dos (ventana de 200 ids). El backend solo envía al canal del usuario lo que le corresponde: eventos de los que es
destinatario y, a titulares y roles con ámbito, las solicitudes de sesión de sus grupos.

El token vive exclusivamente en la cabecera `Authorization`; nunca se incluye en la URL. El adapter usa `credentials: 'omit'` y `@microsoft/fetch-event-source`, porque `EventSource` nativo no permite enviar el Bearer token.

## Capas y lifecycle

```text
AttendanceControlComponent
  -> AttendanceRealtimeSyncService.connectGroup(grupoId)
  -> RealtimeService.startForGroup(grupoId)
  -> RealtimeTransport.start({ grupoId })
  -> FetchSseRealtimeTransport
  -> backend
```

`DashboardLayoutComponent` solo abre el canal del usuario. La pantalla de asistencia es la propietaria del stream del grupo porque solo allí existe el `grupoId` requerido:

- seleccionar el mismo grupo es idempotente;
- seleccionar otro grupo aborta el stream anterior antes de abrir el nuevo;
- una generación de conexión impide que el loop abortado vuelva a reconectar;
- destruir `AttendanceControlComponent` llama `disconnect()` y cancela fetch y backoff;
- en modo mock no se abre conexión real.

## Evento de negocio

El único evento consumido por esta vertical es:

```ts
type: 'ASISTENCIAS_SESION_ACTUALIZADAS'

interface AttendanceSessionUpdatedRealtimePayload {
  grupo: string;
  sesion: string;
  totalRegistros: number;
}
```

`AttendanceRealtimeSyncService` filtra por el grupo y la sesión visibles y aplica `auditTime(250ms)`. El payload no se usa para mutar filas: cualquier evento válido dispara un nuevo GET de estudiantes y asistencias, y el backend vuelve a ser la fuente de verdad.

## Reconexión y resincronización

El transporte conserva el refresh de token, el backoff `1s, 2s, 5s, 10s, 30s`, el `403` terminal y la cancelación con `AbortController`.

El sync observa `connectionState$` con una máquina de estado (`scan`), no con `pairwise()`: recuerda que se observó `RECONNECTING` y, en el **primer** `CONNECTED` posterior, emite exactamente un refetch de la sesión visible y limpia la marca. Los `CONNECTING` (o `RECONNECTING` repetidos) intermedios no la pierden:

```text
RECONNECTING -> CONNECTED                                  -> 1 refetch
RECONNECTING -> CONNECTING -> CONNECTED                    -> 1 refetch
RECONNECTING -> CONNECTING -> RECONNECTING -> CONNECTING -> CONNECTED -> 1 refetch
DISCONNECTED -> CONNECTING -> CONNECTED (conexión inicial) -> 0 refetch
```

Esto cubre `offline -> online`: `onOnline` reinicia el backoff a 0 (reintento inmediato) sin marcar la reconexión como conexión inicial, porque el transporte separa `backoffAttempt` (temporización) de `isReconnecting` (semántica: mientras dure, los intentos se anuncian `RECONNECTING`, no `CONNECTING`). Defecto MV001-R01: antes el reintento se anunciaba `CONNECTING` y el par `RECONNECTING -> CONNECTED` nunca ocurría.

### Stream zombie y liveness (MV001-R02)

MV001-R01 cubre el caso en que el transporte detecta formalmente `RECONNECTING`. MV001-R02 cubre el stream SSE congelado dentro de `fetchEventSource()` (offline real desde DevTools) que nunca abandona `CONNECTED`:

- **HEARTBEAT LIVENESS = 25 s (backend).** `@microsoft/fetch-event-source` 2.0.1 invoca `onmessage` también para mensajes sin `data`; el transporte llama `markStreamActivity()` en `onopen`, en **cualquier** `onmessage` (incluido el heartbeat) y en eventos de negocio, y solo después descarta el mensaje sin `data` (el heartbeat nunca llega a `events$`).
- **STALE WATCHDOG frontend:** `SSE_STALE_TIMEOUT_MS = 40 000`. Estando `CONNECTED`, 40 s sin actividad SSE → `forceReconnectCurrentScope('stale-stream')`. Timer atado a `groupId + generation`; se limpia en `stop()`, `start()`, `offline`, reconnect forzado y fin de stream.
- **`online` fuerza recovery:** `forceReconnectCurrentScope` (privado, distinto de `start()` idempotente) conserva el grupo, emite `RECONNECTING`, backoff a 0, invalida la generation, aborta el `AbortController` anterior y abre una nueva; el loop viejo muere por generation mismatch. Guard `recoveryAttemptPending`: eventos `online` seguidos no abren más de un stream.
- **RECONNECT → HTTP reconciliation:** el primer `CONNECTED` posterior emite exactamente un refresh HTTP (`GET estudiantes` + `GET asistencias`). No hay polling de negocio: el watchdog solo mide liveness del transporte.
- Depuración: `console.debug('[Realtime] …')` solo si `!environment.production`.

No se requiere replay SSE ni `Last-Event-ID`: después de una reconexión siempre se consulta la fuente de verdad por HTTP.

## Persistencia batch

El command canónico es `POST /api/v1/asistencias/lote`. Tras una respuesta exitosa, el cliente que guardó también vuelve a consultar el backend; no depende de recibir su propio evento SSE.

## Smoke real

`npm run e2e:realtime:smoke` requiere:

```text
API_URL
E2E_ACCESS_TOKEN
E2E_GROUP_ID
```

El script conecta a `/realtime/stream?grupoId=...` y espera `ASISTENCIAS_SESION_ACTUALIZADAS`. Si también se definen `E2E_SESSION_ID` y `E2E_ATTENDANCE_RECORDS_JSON`, abre primero el SSE, ejecuta el POST batch y valida que `payload.grupo` y `payload.sesion` coincidan. No usa `/realtime/emit` ni imprime el token.

## Cobertura

`npm run coverage:realtime:check` exige, para `src/app/core/realtime/**` y el sync de asistencia, LINE >= 90% y BRANCH >= 80%.
