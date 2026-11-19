# Acciones por sesión en el historial de la toma de asistencia (2026-11-18)

## Pedido

John (2026-11-18): quitar el cronograma de la vista del grupo del docente (`/app/docente/grupos?grupo=…`), porque
`/app/asistencia?courseId=…` ya muestra el cronograma en «Historial y Cronograma de Sesiones». Las funciones que se
gestionaban en ese cronograma pasan a esa sección, dentro de un botón «Acciones» por sesión que despliega las acciones
posibles para esa sesión.

Cambio solo de frontend: los endpoints ya existían (`PATCH /sesiones/{id}`, `PATCH /docente/sesiones/{id}/cancelar`,
`GET /sesiones/grupo/{id}`, asistencias de la sesión).

## Antes y después

| Acción | Antes (pestaña «Cronograma» del hub) | Ahora (menú «Acciones» de la fila en `/app/asistencia`) |
|---|---|---|
| Tomar asistencia | Navegaba a `/app/asistencia?courseId&sessionId` | Abre la toma de la sesión (vista Detalle) |
| QR / PIN (`sessionQrEnabled`) | Navegaba a la toma | Abre la toma de la sesión; ahí «Proyectar QR» respeta la ventana de asistencia y confirma antes de cerrar una toma abierta |
| Detalles | Modal `TeacherSesionDetalleModalComponent` | El mismo modal, desde `SesionAccionesComponent` |
| Ajustar horario | Formulario de página `TeacherSesionFormComponent` | `AttendanceNewSessionModalComponent` con el input `sesion` |
| Cancelar (`sessionCancelEnabled`, HU047) | Modal `TeacherSesionCancelarModalComponent` | El mismo modal, desde `SesionAccionesComponent` |
| Solicitar sesión extraordinaria | Botón del cronograma | Ya existía como «+ Nueva Sesión» (ahora con el aviso DEC-065 (2) de solicitud pendiente) |

Reglas que se conservan:

- En el menú, una sesión cancelada o pendiente de aprobación no se toma ni se proyecta (opciones deshabilitadas); la pendiente muestra «Disponible cuando la coordinación apruebe la sesión.». El clic en la fila sigue abriendo la vista de la sesión, que ya bloquea la toma de una cancelada.
- Una sesión cancelada no se reprograma ni se vuelve a cancelar.
- DEC-072: no se guarda un horario que cruce la medianoche, salvo que la sesión ya guardada lo tenga y no se toque.
- Si la zona horaria cambia con el ajuste abierto, el horario se recarga en la zona nueva, se conserva el título y se avisa (`UI_TEACHER_GRUPOS_007`).
- El PATCH de horario no devuelve la sesión: la lista se recarga por HTTP. La cancelación marca la sesión con la
  respuesta del backend, sin recargar; los errores `SES_011/012/013/016` se muestran dentro del modal.
- El clic en el resto de la fila sigue abriendo la toma; el clic dentro del menú no.

## Cambios

- `ActionMenuComponent`: input `flotante` (panel `fixed` debajo del botón o encima si no cabe; se cierra al desplazar
  cualquier contenedor o al redimensionar). Evita que la tabla con `overflow` recorte el menú de las últimas filas.
- `GroupSessionsOverviewComponent`: columna «Acciones» con el menú por sesión (`accionesDe`, `accionSesion`), banderas
  `qrHabilitado` y `cancelacionHabilitada`; la etiqueta de estado muestra también las solicitudes pendientes.
- `SesionAccionesComponent` (nuevo): modales y llamadas de detalle, ajuste de horario y cancelación.
- `AttendanceNewSessionModalComponent`: modo ajuste (`sesion`), con precarga en la zona activa y DEC-072.
- `AttendanceControlComponent`: `onAccionSesion`, `recargarSesionesDelGrupo`, `onSesionCancelada`; el aviso de
  creación usa `mensajeUsuario`/`mensaje` del backend o el aviso de solicitud pendiente (DEC-065 (2)).
- `TeacherGrupoHubComponent`: sin la pestaña «Cronograma» (queda Planilla, Reclamos y Matrícula).
- `TeacherGruposComponent`: sin el formulario de sesión ni los modales de detalle y cancelación (se mantiene el SSE de
  cancelaciones y aprobaciones del grupo abierto).
- Retirados: `TeacherGrupoSesionesComponent` y `TeacherSesionFormComponent` (con sus specs); sus pruebas se migraron a
  `sesion-acciones.component.spec.ts`, `attendance-new-session-modal.component.spec.ts`,
  `group-sessions-overview.component.spec.ts` y `attendance-control.cancelada.spec.ts`.

## Integración con las mejoras de Sergio (#155, 2026-11-19)

- El ítem 10 de `MEJORAS-SERGIO-2026-11-18` había agregado un botón «Cancelar» suelto por fila en la misma tabla, con su
  propio modal en `AttendanceControlComponent`. Es la misma acción (HU047, mismo endpoint, motivo y avisos) que ya ofrece
  el menú «Acciones»; para que haya un solo lugar por sesión se conserva la del menú (`SesionAccionesComponent`) y se
  retira el botón suelto. Sus casos (solo en no canceladas, éxito con notificados, rechazo `SES_012` en el modal) quedan
  cubiertos en `sesion-acciones.component.spec.ts`, `group-sessions-overview.component.spec.ts` y
  `attendance-control.cancelada.spec.ts`.
- El ítem 7 (el menú «Más» abre hacia arriba si no cabe debajo) se combina con `flotante`: los menús no flotantes usan la
  regla del ítem 7 y el flotante calcula su posición en la ventana.
