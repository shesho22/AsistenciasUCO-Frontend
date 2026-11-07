---
status: active
type: work-item
scope: frontend
owner: fullstack-team
last-reviewed: 2026-11-06
---

# CERT-F3-CORRECCIONES — Correcciones de la certificación de Fase 3

El contrato y la validación de las 3 capas están en el work item homónimo del backend.

## Cambios

- **HU051, HU053-HU055 (hub del grupo del docente):** *(CULM-001 A.1 retiró las solicitudes de ingreso; el botón pasó a "Padrón" y el 409 ya no remite a solicitud.)*
  - Desde la unificación de la vista del grupo en `/app/asistencia`, `TeacherGrupoHubComponent` (padrón con retiro y solicitudes de ingreso) no se podía abrir.
  - Se agrega el botón "Padrón y solicitudes" en `GroupSessionsOverviewComponent`. Es el único cambio en la pantalla de Sergio.
  - El botón navega a `/app/docente/grupos?grupo=<id>`, y `TeacherGruposComponent` abre el hub de ese grupo. Un id ajeno deja la lista.
- **Cupos sin inventar:**
  - El padrón, el horario y la lista de grupos ya no usan "35" por defecto; sin cupo muestran "—".
  - Las solicitudes no muestran "0 de 0" cuando no hay filas.
  - `course.service` mapea `capacidadMaximaPermitida` de `/docente/asignaturas` a `cupoMaximo`.
- **Padrón actualizado:** aceptar una solicitud emite `matriculaCambiada` y el hub recarga el padrón.
- **HU108 (malla del decano):** el selector de semestres de `DeanPlanMallaComponent` ya no va de 1 a `totalSemestres` (o a 10 inventados): cubre hasta el mayor entre `totalSemestres` y el semestre más alto de las asignaturas, para que ARQ-402 (S8) se pueda filtrar.
- **HU145 (cronograma del decano):** `DeanCronogramaComponent` usa `resolveSessionInstant` con los campos aditivos `fechaHoraInicioUtc`/`fechaHoraFinUtc`/`estadoTemporal`, igual que el cronograma del coordinador. Antes mostraba 13:00 donde el coordinador veía 08:00.
- **Plan del coordinador (créditos y asignaturas):** `normalizarPlanEstudio` toma `totalAsignaturas` y `totalCreditos` del backend; sin dato deja `null` y la tarjeta muestra "—" en vez de 0. La cabecera de la malla suma los créditos de las asignaturas cargadas. Crear o eliminar una asignatura actualiza también los créditos.
- **HU061 (consolidado):** la columna se llama "Sesiones ejecutadas" y explica que solo cuenta las sesiones vencidas con asistencia registrada. Por eso puede dar 0 aunque el cronograma muestre sesiones programadas.
- **HU154 (tipos de programa):** `CatalogoSoloConsultaComponent` recibe `cargando`; mientras llega la primera respuesta muestra "Cargando…" y no "No hay tipos de programa registrados".
- **Gestión de Coordinadores (decano):** la tarjeta muestra la facultad y los conteos reales que ahora envía `/decano/coordinadores` (`nombreFacultad`, `totalDocentes`, `totalGrupos`). Si faltan, ya no inventa "Sin Facultad Asignada" ni "0 / 0": oculta la facultad y muestra "—".
- **Mensaje del 409 `ERR_MATRICULA_DUPLICADA` para el docente:** `AttendanceControlComponent` (pantalla de Sergio, cambio mínimo y anotado) muestra `MENSAJE_MATRICULA_DUPLICADA_DOCENTE`: si el estudiante fue retirado, el reingreso va por solicitud de ingreso (decisión de John 2026-10-28). El texto del catálogo de la BD le habla al estudiante y no se cambia, porque también lo usa la matrícula autónoma.
- **Retiro de "Aula" (decisión de John 2026-11-06: las aulas no se piden):** se quitan los textos y los campos visibles "Aula / Aula no informada / Por definir" de: descripciones del decano ("Mi Facultad", "Grupos Académicos", detalle del grupo), columna "Horario & Aula" y filtro de Grupos Académicos, detalle del grupo del decano, inicio del estudiante (próxima clase y materias), detalle de la materia, inscripción, lista de materias y horario del estudiante. En pantallas de Sergio, cambios mínimos anotados para avisarle: `group-info-modal` (bloque "Aula Asignada") y `coordinator-subjects` (texto, placeholder y línea "Aula"). No se toca `attendance-control.component.ts` (solo tenía un comentario y choca con su PR #51) ni "Proyección en Aula" del modal QR (QR es de Sergio). Los campos `aula`/`room` de modelos, mappers y mocks quedan sin uso visible; retirarlos del modelo es una limpieza aparte.
- **HU159 (coordinador):** "Ver ficha" en cada estudiante de `CoordinatorStudentsComponent` abre `app-coordinator-ficha-modal`, con historial y "Corregir datos". Antes solo se llegaba desde las alertas de Indicadores. Es el único cambio en esa pantalla de Sergio.

## Rollback

Revertir el commit del work item.
