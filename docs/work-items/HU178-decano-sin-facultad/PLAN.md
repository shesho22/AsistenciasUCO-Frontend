# HU178 — Decano sin facultad y coordinador sin programa: informar el estado en vez de mostrar errores

Registrada el 2026-11-15 en la prueba manual de IDENT-002 (HU-CATALOG de Infra) para el decano; ampliada el 2026-11-16
al coordinador sin programa, que tenía el mismo defecto. La regla de ámbito no cambia: un decano sin facultad no ve datos
de ninguna facultad y un coordinador sin programa no ve datos de ningún programa. Lo que cambia es cómo se presenta.

## Problema

Con `test500123456@uco.edu.co` (decano sin facultad) en el laboratorio:

- Cada vista del decano fallaba en rojo: el backend rechaza las consultas con 403.
- La barra superior mostraba «Facultad de Ingeniería». Salía de `AuthService.getDepartmentForRole`, que tenía ese
  nombre quemado para cualquier DECANO.

Con `paula.pasaporte.prueba@uco.edu.co` (coordinadora creada con «Sin programa por ahora»):

- Programa, Asistencia, Planes de estudio y Estudiantes fallaban en rojo con el toast «No fue posible resolver el
  programa del coordinador autenticado.» (403, `ACC_APP_006`).
- La barra superior mostraba «Ingeniería de Sistemas», también quemado en `getDepartmentForRole` para cualquier
  COORDINADOR.

## Lo que responde el backend (laboratorio, 2026-11-16)

Decano sin facultad:

| Consulta | Respuesta |
|---|---|
| `GET /auth/me` | 200, rol DECANO |
| `GET /usuarios/perfil` | 200, `vinculos: []` |
| `GET /decano/coordinadores`, `/decano/programas`, `/decano/estructura`, `/decano/estudiantes` | 403, `code: FORBIDDEN` |
| `GET /decano/indicadores`, `/decano/grupos` | 403, `code: KPI_003` |
| `GET /decano/docentes`, `/decano/asignaturas`, `/decano/consolidado-asistencia` | 200 vacío |
| `GET /decano/revisiones-cancelacion`, `GET /coordinador/periodos-academicos` | 200 |

Coordinador sin programa: `GET /usuarios/perfil` responde 200 sin vínculo COORDINADOR, y los casos de uso del programa
(`ConsultarDocentesPrograma`, `ConsultarAsistenciaPrograma`, `ConsultarResumenDocentes`, `GestionarPlanEstudio`,
`GestionarAsignatura`, …) responden 403 con `ACC_APP_006`. Revisiones de cancelación no depende del programa.

El código `ACC_APP_011` que menciona la HU para el decano no llega al cliente: el backend lanza `ForbiddenException` con
el código genérico `FORBIDDEN`, el mismo de cualquier 403. Distinguir «sin facultad» de un 403 cualquiera exigiría leer
el texto del mensaje, que AGENTS.md prohíbe.

## Decisión: camino b (el perfil informa) sin cambios en el backend, un solo mecanismo para los dos roles

`GET /usuarios/perfil` (HU006) ya informa de forma explícita qué entidad tiene a cargo cada rol
(`usp_consultar_perfil_usuario`): el vínculo `DECANO` trae la facultad (`Facultad.decano`) y el vínculo `COORDINADOR`
trae el programa (`Programa.coordinador`). Sin ese vínculo, el usuario no tiene la entidad. Es la misma fuente que usa el
backend para su ámbito, así que no hace falta un indicador nuevo ni tocar el backend.

Se descartó el camino a (reconocer el código del 403 en cada vista) porque `ACC_APP_006` y `ACC_APP_011` no llegan al
cliente: son la clave del texto en el catálogo de mensajes (`messageCode`), mientras que el `code` de `ApiErrorResponse`
es `FORBIDDEN` para todos los `ACC_APP_*` (`MensajeUsuarioErrorCode` los define con `SecurityErrorCode.FORBIDDEN`).
Distinguirlos exigiría leer el texto, que AGENTS.md prohíbe. Además habría que pedir y fallar cada pantalla para luego
taparlo. Con el perfil se decide antes de pedir nada y el mecanismo es el mismo para ambos roles.

Como respaldo sí se usan los únicos códigos canónicos de «rol sin ámbito» que el backend entrega en `code`
(`DbCodeTranslator`): `KPI_001` (coordinador sin programa), `KPI_003` (decano sin facultad) y `KPI_004`
(administrador sin institución), que responden los indicadores.

## Qué se hizo en el frontend

| Pieza | Cambio |
|---|---|
| `User.vinculos` (`user.model.ts`) | Vínculos del perfil (`rol`, `nombreEntidad`); `undefined` mientras el perfil no llega |
| `RolConEntidad`, `sinEntidadAsignada(user, rol)`, `entidadACargo(user, rol)` | Reglas puras para `DECANO` y `COORDINADOR`: sin vínculo del rol con el perfil ya cargado = sin entidad. Si el perfil no llegó no se presume. El vínculo de un rol no cubre al otro |
| `AuthService` | Ya no quema «Facultad de Ingeniería» ni «Ingeniería de Sistemas»: muestra «Decanatura» o «Coordinación de programa» hasta tener el perfil y luego el nombre de la entidad del vínculo o «Sin facultad asignada» / «Sin programa asignado». `perfilListo()` permite esperar la hidratación en curso |
| `conEntidadAsignadaGuard(rol)` (`entidad-asignada.guard.ts`) | Espera el perfil (máximo 5 s) y, si falta la entidad, lleva al aviso del rol. `decanoConFacultadGuard` en Mi facultad, Seguimiento, Directorio, `decano/grupos/:grupoId` y `decano/programas/:planId`; `coordinadorConProgramaGuard` en Programa (todas sus pestañas), Asistencia, Planes de estudio (lista, formularios y malla) y Estudiantes |
| `SinEntidadAsignadaComponent` (`shared/components/sin-entidad-asignada`) | Aviso informativo (estado vacío, `role="status"`), no un error. El rol llega por `data.rol` de la ruta: `/app/decano/sin-facultad` y `/app/coordinador/sin-programa` |
| Panel principal | `esperarPerfilGuard` espera el perfil del decano y del coordinador; sin entidad ven el mismo aviso y no se consultan indicadores, coordinadores, docentes, planes ni estudiantes |
| Respaldo por código (`sin-ambito.util.ts`) | `rolSinAmbito(error)` reconoce `KPI_001`/`KPI_003`/`KPI_004`. `classifyLoadError` los clasifica como `SIN_AMBITO` (antes caían en «Servicio no disponible») y `ErrorCargaComponent` muestra el aviso del rol, sin alerta roja ni Reintentar. Los indicadores del decano, del coordinador y del administrador muestran el aviso en lugar del toast rojo |
| Mensajes | `UI_DEAN_SIN_FACULTAD_001/_002` (remotos `UI136`, `UI137`), `UI_COORDINATOR_SIN_PROGRAMA_001/_002` (`UI138`, `UI139`) y `UI_ADMIN_SIN_INSTITUCION_001/_002` (`UI140`, `UI141`) en `mensajes-ui.ts` |

No se bloquean las vistas que no dependen de la entidad y responden 200: Períodos Académicos y Revisiones de
Cancelación del decano, y Revisiones de Cancelación del coordinador.

Si el perfil falla o no informa vínculos, la navegación sigue como antes (falla abierta): el backend sigue siendo quien
aplica la regla de ámbito.

## Auditoría de estados controlados (cinco roles, laboratorio 2026-11-16)

Se recorrieron en el laboratorio todas las vistas y pestañas del menú con usuarios recién creados o sin ámbito del
conjunto de datos de prueba, registrando las respuestas HTTP distintas de 2xx, `app-error-carga`, `role="alert"`, los
toasts y los textos «No fue posible…» / «No se pudo…». También se revisó el backend en busca de códigos canónicos que
describan una situación esperada (`MensajeUsuarioErrorCode`, `DbCodeTranslator`).

| Rol / usuario | Vista | Código | Antes | Después | Clasificación |
|---|---|---|---|---|---|
| Decano sin facultad (`test500123456`) | Mi facultad (Programas, Coordinadores, Áreas), Seguimiento (Indicadores, Consolidado, Cronograma), Directorio (todas las pestañas), detalle de grupo y de plan | 403 `FORBIDDEN` (`ACC_APP_011`), `KPI_003` | Tarjeta roja «Sin autorización», «No fue posible cargar…» y toasts | Aviso «Aún no tiene una facultad asignada» (`/app/decano/sin-facultad`); no se consulta nada | Estado controlado |
| Decano sin facultad | Panel principal | `KPI_003`, `FORBIDDEN` | Panel con cifras vacías tras 403 | Mismo aviso; no se consultan indicadores ni coordinadores | Estado controlado |
| Decano sin facultad | Períodos, Revisiones de cancelación | — (200) | Sin error | Sin cambio | Correcto |
| Decano sin facultad | Barra superior | — | «Facultad de Ingeniería» (quemado) | «Sin facultad asignada» | Defecto |
| Coordinador sin programa (`paula.pasaporte.prueba`) | Programa (Grupos, Materias, Docentes, Períodos), Asistencia, Planes de estudio (lista, formularios, malla), Estudiantes | 403 `FORBIDDEN` (`ACC_APP_006`), `KPI_001` | Toast «No fue posible resolver el programa…» y tarjeta roja «Sin autorización» | Aviso «Aún no tiene un programa asignado» (`/app/coordinador/sin-programa`); no se consulta nada | Estado controlado |
| Coordinador sin programa | Panel principal | `KPI_001`, `FORBIDDEN` | Cifras vacías tras 403 | Mismo aviso; no se consultan planes, docentes, estudiantes ni indicadores | Estado controlado |
| Coordinador sin programa | Revisiones de cancelación | — (200) | Sin error | Sin cambio | Correcto |
| Coordinador sin programa | Barra superior | — | «Ingeniería de Sistemas» (quemado) | «Sin programa asignado» | Defecto |
| Decano / Coordinador / Administrador | Indicadores (respaldo si el perfil no informa) | `KPI_003` / `KPI_001` / `KPI_004` | Toast rojo con el mensaje del backend; en `classifyLoadError`, «Servicio no disponible» | Aviso informativo del rol, sin toast | Estado controlado |
| Docente sin grupos (`julian.hoyos`) | Grupos, Horarios, Reclamos, Asistencia, Panel, Perfil | — (todo 200) | Listas vacías | Sin cambio | Correcto |
| Estudiante sin grupos (`miguel.rojas`) | Mis materias (Horarios, Materias), Alertas, Reclamos, Panel, Perfil | — (todo 200) | Listas vacías | Sin cambio | Correcto |
| Administrador (`admin.institucional`) | Personas, Estructura, Indicadores, Períodos, Seguridad, Mensajes, Panel | — (todo 200) | Sin error | Sin cambio | Correcto |
| Administrador | Configuración (Parámetros), Sistema | Catálogo de Parámetros caído | «No se pudo cargar la administración de parámetros… no está disponible por ahora» | Sin cambio | Error real (servicio externo detenido) |

Otros códigos revisados y clasificados como error real o regla de validación, no como estado vacío: `ACC_APP_001`,
`_002`, `_008`…`_017` (permiso de verdad sobre un recurso ajeno), `ACC_APP_003`/`_004`/`_005` (falta la fila de
Docente, Estudiante o Usuario, algo que la interfaz no permite crear), `NOF_APP_*` y `PER_001` (404 de un identificador
concreto, no «aún no existe»), `VCE_*`, `ACT_002`, `MQR_*`, `FES_001`, `PAG_001` (validaciones o conflictos de una
acción). Un docente o estudiante sin grupos y sin período recibe 200 con listas vacías: no hay códigos de «sin período».

## Pendiente fuera de esta HU

- Backend: si se quiere que un 403 de «coordinador sin programa» o «decano sin facultad» se reconozca también fuera de
  los indicadores (por ejemplo, si el perfil fallara), `ACC_APP_006` y `ACC_APP_011` deberían salir con un `code` propio
  en `ApiErrorResponse` en lugar de `FORBIDDEN`. Es un cambio de contrato (OpenAPI/WORM); el frontend ya cubre el caso
  con el perfil.
