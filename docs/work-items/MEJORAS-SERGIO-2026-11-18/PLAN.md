# MEJORAS-SERGIO-2026-11-18 — 13 mejoras de interfaz y funcionalidad

Origen: observaciones de Sergio sobre `localhost:4200`; John ordenó ejecutarlas todas ("hay que ejecutar todas esas mejoras y
cambios"). Rama `feat/mejoras-sergio-2026-11-18` en los tres repositorios (BD, backend y frontend). Este documento es el plan
común; los repositorios de BD y backend tienen su propio work item con el mismo nombre.

## Investigación previa (AS-IS)

| # | Ruta / tema | Qué existe hoy | Capas |
|---|---|---|---|
| 1 | Tipo de vinculación del docente | Tabla `TipoVinculacion`, columna `DocentePrograma.tipoVinculacion` (NOT NULL + FK), vista `uv_tipo_vinculacion`, columnas en `uv_docente_programa` / `uv_auth_docente_programa`, parámetro `DOCENTE/TIPO_VINCULACION_DEFECTO`, mensajes `DOC_004` y `ERR_TIPO_VINCULACION_INVALIDO`; SP de vincular, actualizar, consultar directorio, resumen (HU095, agrupado por tipo) y perfil (detalle del rol DOCENTE). Backend: feature `tipovinculacion` (`GET /api/v1/tipos-vinculacion`), campo en DTO/requests/proyecciones del directorio, validadores, filtro `idTipoVinculacion` y resumen `porTipoVinculacion`. Frontend: filtro, chips, insignia, selects del alta y de la edición. | BD, BE, FE |
| 2 | Aviso a estudiantes al aprobar una solicitud de sesión | **Ya existe de punta a punta.** `usp_aprobar_solicitud_sesion` deja la sesión visible; `AprobarSolicitudSesionUseCaseImpl` consulta `usp_consultar_destinatarios_solicitud_sesion` y encola UNA notificación `SESION_MANUAL_CREADA_ESTUDIANTE` (plantilla sembrada en `60_sesiones_manuales_plantillas.sql`) por el `NotificacionPort` (outbox), más el aviso al docente y el evento SSE. El modal del coordinador ya dice que se notificará a los estudiantes. | verificación |
| 3 | `/app/decano/mi-facultad/programas` | `DeanProgramasTabComponent` apila cabecera, árbol de estructura, cabecera de programas, gestión y tabla de créditos. | FE |
| 4 | `/app/decano/directorio/docentes` | El backend ya entrega `codigoTipoIdentificacion`; el directorio del decano solo pinta el número. | FE |
| 5 | `/app/decano/directorio/estudiantes` | `usp_consultar_estudiantes_facultad_paginado` no devuelve el tipo de documento; el backend tampoco lo expone. | BD, BE, FE |
| 6 | `/app/decano/grupos/:id` | Cada sesión es una fila alta (semana, fecha, hora, título, estado apilados). | FE |
| 7 | `/app/coordinador/planes-estudio` | `app-action-menu` abre siempre hacia abajo con `position: absolute`; la tarjeta (`app-card`) tiene `overflow-hidden` y el menú queda recortado. | FE |
| 8 | `/app/coordinador/estudiantes` | Tarjetas; "Estado Financiero: Al Día" está escrito a mano y "Promedio Ponderado" sale de `promedioAcumulado` (solo mocks). La búsqueda en BD y backend no encontró columnas, vistas, SP, DTO ni casos de uso de estado financiero o promedio: el retiro es solo del frontend (modelo, mocks y pruebas). | FE |
| 9 | `/app/docente/horarios` | Bloques sin acción; `GET /docente/horarios` ya entrega `idGrupo` y `/app/docente/grupos?grupo=<id>` ya abre el hub del grupo. | FE |
| 10 | `/app/asistencia` cancelar sesión | **El flujo ya existe**: HU047 (CULM-001 B.1) — el docente titular cancela directamente con motivo (`PATCH /docente/sesiones/{id}/cancelar` → `usp_cancelar_sesion`, motivo 10..500, `SES_011/012/013/016`), y el backend encola `SESION_CANCELADA` a los estudiantes activos + evento SSE. Ya se usa desde el hub del grupo (`/app/docente/grupos`). Las "revisiones de cancelación" (`usp_decidir_revision_cancelacion`, migración 31) son otra cosa: la cancelación de la MATRÍCULA por inasistencia, que decide el coordinador. | FE |
| 11 | `/app/coordinador/programa/materias` | Grupos ofertados, nómina del grupo elegido y catálogo curricular apilados. | FE |
| 12 | `/app/coordinador/programa/docentes` | Tarjetas con insignia de tipo de vinculación. | FE (+1) |
| 13 | `/app/coordinador/planes-estudio/:id/malla` | Al agregar un semestre la página actualiza su copia local, pero la caché del servicio (`planes()`) queda vieja; la página de nueva asignatura usa esa caché y no ofrece el semestre nuevo hasta recargar (F5). | FE |

## Decisiones

- **Ítem 2:** no se duplica nada. Se verifica con las pruebas existentes (`AprobarSolicitudSesionUseCaseImplTest`) y se documenta. No hay cambio de código.
- **Ítem 10:** la regla vigente (HU047) es que el **docente titular cancela directamente** su sesión con motivo y los estudiantes
  reciben el aviso `SESION_CANCELADA` cuando la cancelación queda registrada. No existe un flujo "docente solicita / coordinador
  aprueba" para sesiones (el coordinador solo cancela por su cuenta, DEC-064, o decide solicitudes de sesiones extraordinarias).
  Se expone ese mismo flujo en la tabla de `/app/asistencia` reutilizando `TeacherSesionCancelarModalComponent` y
  `SessionService.cancelarSesion` (sin cambios de BD ni backend).
- **Ítems 1 y 12:** retiro completo con la migración **50** (idempotente, up/down): `DROP` de la FK, de la columna, de la vista, de la
  tabla, del parámetro y de los mensajes; los cuerpos de SP y vistas los despliega `deploy_schema.ps1` (mismo criterio que 48/49) y el
  down restaura tabla, catálogo, columna (con DF al tipo por defecto `CAT`), FK, parámetro, mensajes y los cuerpos previos. El resumen
  HU095 queda en una fila (`totalActivos`, `totalInactivos`). El perfil muestra la facultad del programa en lugar del tipo.
- **Ítem 5:** `usp_consultar_estudiantes_facultad_paginado` agrega `codigoTipoIdentificacion` al final del resultset (cambio aditivo).
- **Ítem 8:** "Estado financiero" y "Promedio ponderado" solo existían en el frontend; se retiran de la vista, el modelo y los mocks.
- **Ítems 3, 11:** subpestañas locales (componente compartido `app-subpestanas`) y nómina del grupo en ventana emergente (`app-modal`).
- **Ítem 7:** el menú calcula si cabe debajo y, si no, abre hacia arriba; las tarjetas de planes dejan de recortar su contenido.

## Rollback

Revertir los commits de la rama en cada repositorio. En BD ejecutar `migrations/50_..._down.sql` y luego `deploy_schema.ps1` del
commit anterior (como en 48/49).

## Correcciones de la revisión del frontend (2026-11-18)

| Ítem | Hallazgo | Corrección |
|---|---|---|
| 11 | La nómina («Ver inscritos») no manejaba error ni carga (un 403/500 se veía como «No hay estudiantes»), una respuesta tardía de otro grupo pisaba la lista, el foco no volvía al botón al cerrar y la insignia de estado salía vacía. | `app-modal` siempre montado con `[isOpen]`; señales `cargandoInscritos`/`errorInscritos` con `role="status"` y `app-error-carga` (Reintentar); la consulta anterior se cancela (`Subscription`); las filas usan `EstudianteGrupoDTO` real (`codigoEstado` A/CVP/CI/F y `nombreEstado`). |
| 11 | Lista de grupos vacía con contador en 1; «Ocupación de cupos» en `undefined / undefined`. | El backend actual (`CoordinadorAsistenciaProgramaController` → `ApiPageResponse`) devuelve `elementos`, igual que espera `CourseService`: el frontend es correcto y la diferencia es del jar viejo en ejecución (`datos`). `KpisCoordinadorDTO` actual trae `matriculadosActivos`, `cupoTotal`, `gruposActivos` y `tasaAforo` con esos nombres; se agrega guarda: un campo ausente se muestra «—». |
| 6 | El paginador se ocultaba al elegir 50 por página y la consulta pedía `tamano: 50` (grupos con más sesiones quedaban truncados). | `DeanFacultadService.getTodasLasSesionesGrupo` recorre las páginas con el máximo del backend (100); el paginador se ve con más sesiones que el tamaño mínimo (10; opciones 10/20/50); aviso si lo recibido no completa `totalElementos`. |
| 9 | `<button>` con `<div>`, `<h4>` y `<p>` dentro; `aria-label` sin hora ni aula; mock sin `idGrupo`. | Contenido de frase (`<span class="block">`), `aria-label` con materia, grupo, día, horario y aula; `MOCK_HORARIOS_DOCENTE` con `idGrupo`. |
| 8, 12 | «Ver ficha», «Editar datos» y «Desactivar/Reactivar» repetidos sin nombre de la persona. | `aria-label` «Ver ficha de …», «Editar datos de …», «Desactivar a …» (texto visible primero). |
| 3 | `@switch` destruía el estado de cada subpestaña de Programas. | Cada sección se monta al abrirla por primera vez y luego se oculta con `[hidden]` (conserva estado sin cargar las tres al entrar). |
| 1 | HU090 seguía contando 53 pruebas en la matriz. | `scripts/matriz-hu-pruebas.mjs` lista HU090 como **retirada el 2026-11-18** y no la cuenta. |
