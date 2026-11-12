# PC-puntos-control-tomas: tomas por puntos de control (frontend FE-1 y FE-2)

Rama local: `feature/PC-tomas-puntos-control`. Diseño: `informes/DISENO_TOMAS_PUNTOS_CONTROL_2026-11-11.md` (sección D). Contrato HTTP que manda: `informes/CONTRATO_HTTP_PUNTOS_CONTROL_2026-11-12.md`.

## Objetivo

Cada toma es un punto de control; la clase se parte en tramos y el backend calcula los minutos y el estado de cada estudiante. El frontend deja de calcular horas (se quita la suma de `horasToma`), muestra lo que entrega el backend y ofrece reclamar una toma concreta.

## Contrato usado

| Endpoint | Uso en el frontend |
|---|---|
| `GET /sesiones/{id}/tomas` | Agrega `fechaPuntoControlUtc`, `ordenPuntoControl`, `minutosTramoAnterior`, `minutosTramoSiguiente`, `esEditable`, `editableHastaUtc`. `horasToma` queda obsoleto y no se usa. |
| `GET /sesiones/{id}/tomas/resumen` (nuevo) | `TomaAsistenciaService.consultarResumenSesion`; alimenta la columna "Asistencia" del resumen de la sesión. |
| `POST /tomas/{id}/asistencias` | 409 `TOM_012`: se muestra el mensaje del backend, se descartan los cambios y se recargan las tomas. |
| `GET /docente/reclamos/{id}` | `idToma`, `numeroToma`, `fechaPuntoControlUtc`, `resultadoAprobacion`, `estadoToma`, `minutosSesion`, `minutosAsistidos`. |
| `PATCH /docente/reclamos/{id}` | `resultado` = `PRESENTE` o `JUSTIFICADA`, solo con `APROBADA`. Errores `ERR_RESULTADO_APROBACION_INVALIDO` y `ERR_APROBACION_PRESENTE_SIN_TOMA` se muestran con el mensaje del backend. |
| `GET /estudiante/materias/{id}/sesiones` | Minutos por sesión y `tomas[]` (estado, hora, `reclamable`, solicitud y resultado). `estadoAsistencia` ya viene de la BD. |
| `POST /asistencias/revisiones` | `tomaId` opcional; sin él, reclamo por sesión como antes. `ERR_TOMA_NO_RECLAMABLE` y `ERR_RECLAMO_TOMA_DUPLICADO` (409) se muestran junto al formulario y refrescan la sesión. |
| `GET /estudiante/reclamos` | `idToma`, `numeroToma`, `fechaPuntoControlUtc`, `resultadoAprobacion`. |

## Cambios por pantalla

### Docente: toma de asistencia (FE-1)

- `TomaAsistenciasComponent`: cabecera "Punto de control: HH:mm · X min antes · Y min después"; los controles se bloquean con `!esEditable` (ya no con la ventana de la sesión); aviso de edición ("Puedes corregirla hasta las HH:mm." / "Puedes corregirla hasta que abras la siguiente toma." / "Esta toma ya no se puede corregir porque se abrió la toma siguiente. Las correcciones se hacen por reclamo."); `TOM_012` al guardar descarta lo marcado y pide recargar.
- `TomaFaltantesComponent`: entrada `esEditable` en lugar de `ventanaAbierta`; solo lectura si no es editable; `TOM_012` bloquea la marcación y recarga.
- `TomaCierreDialogComponent`: nuevo texto del cierre.
- `SessionTomasPanelComponent`: hora en cada pestaña y línea "Puntos de control: Toma 1 a las HH:mm · ..."; el tope se toma de `maximoTomas` (20 desde el backend).
- `ResumenSesionTomasComponent`: recibe `sesionId`, consulta `consultarResumenSesion` y reemplaza "Horas asistidas" por "Asistencia" ("Presente · X de Y min", "Ausente", "Justificada", "Parcial: X de Y minutos", "No disponible", más "Z min justificados"). La matriz por toma se conserva. Cabecera "Toma N · HH:mm".

### Docente: reclamos (FE-2)

- `TeacherClaimsComponent` (detalle): muestra "Toma N · HH:mm · estado" y "Asistencia de la sesión: X de Y min"; botones "Estuvo presente" (solo con toma), "Ausencia justificada" y "Rechazar"; un reclamo aprobado muestra su resultado.
- `GroupClaimsModalComponent` y `AttendanceControlComponent.resolverReclamoGrupo`: mismas dos salidas de aprobación.
- `TeacherGrupoReclamosComponent`: muestra "Reclamo de la toma N".

### Estudiante (FE-2)

- `StudentCourseDetailComponent`: insignia con `etiquetaEstadoSesion` ("Parcial: X de Y minutos", "· Z min justificados"); desplegable "Tomas" con "Toma N · HH:mm · estado"; botón "Reclamar esta toma" por toma `reclamable`; estado y resultado del reclamo de la toma. Con tomas, el botón de reclamar la sesión completa no se muestra; sin tomas se conserva.
- `StudentCoursesComponent`: `iniciarReclamoToma`, `tomaReclamar`, envío de `tomaId`, errores nuevos; se retira la conversión PARCIAL a AUSENTE (el estado original queda sin definir para una sesión parcial reclamada por sesión).
- `StudentClaimFormComponent`: "Sesión #n · Toma N (HH:mm)" en lugar de "Estado Actual" cuando se reclama una toma.
- `StudentClaimsComponent` (Mis Reclamos): toma reclamada y "Aprobado: estuvo presente" / "Aprobado: ausencia justificada".

## Modelos, mapeadores y utilidades

- `core/models/toma-asistencia.model.ts`: campos nuevos de `TomaAsistencia`, `ResumenTomasEstudiante`, `EstadoSesionEstudiante`.
- `core/models/role-management.model.ts`: `TomaSesionEstudiante`, `ResultadoAprobacionReclamo`, `EstadoTomaEstudiante`; `SesionMateriaDetalle` con minutos y `tomas`; `SolicitudRevisionItem` con toma y resultado; `DetalleReclamoDocenteItem` con `estadoToma` y minutos.
- `core/api/models/estudiante-portal-api-dto.model.ts`, `resolver-reclamo-request.model.ts`.
- `core/mappers/student-portal.mapper.ts` (minutos, `tomas[]`, `reclamable` por toma), `claim.mapper.ts`.
- `core/services/toma-asistencia.service.ts` (`consultarResumenSesion`), `attendance-claim.service.ts` (`tomaId`, `resultado`).
- Nuevo `core/utils/estado-sesion-estudiante.util.ts` (etiquetas del estado y minutos justificados); `reclamo-estado.util.ts` (`etiquetaResultadoAprobacion`); `radicacion-intento.util.ts` (la toma entra en la huella del intento).
- Modo mock: las sesiones del estudiante traen minutos y tomas (estado según la sesión; las ausentes son reclamables); radicar con `tomaId` y aprobar con `resultado` se reflejan en la toma. Las rutas de tomas del docente no tenían datos simulados y no se agregaron.

## Desviaciones del diseño

- `TomaFaltantesComponent` y `TomaAsistenciasComponent` ya no usan `ventanaAbierta` para bloquear (solo `esEditable`); `ventanaAbierta` sigue gobernando "Proyectar QR / PIN" y "Nueva toma".
- Se agregó el evento `startClaimToma` en el detalle de la materia en lugar de cambiar el tipo de `startClaim`, para no romper el reclamo por sesión.
- La reclamabilidad de la sesión con tomas se deriva de las tomas (alguna `reclamable`), no de la solicitud previa de la sesión.
- Los textos de los botones docentes son "Estuvo presente" y "Ausencia justificada" (el diseño decía "Sí estuvo presente").
- El listado docente de reclamos no declara los campos de toma en el contrato; si el backend no los envía, la línea "Reclamo de la toma N" simplemente no aparece.
