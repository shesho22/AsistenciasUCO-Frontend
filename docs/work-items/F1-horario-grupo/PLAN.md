---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-01
---

# PLAN — F1: horario semanal del grupo (frontend)

## Decisión

John (2026-10-30): el **coordinador define el horario** del grupo: varias franjas, sin traslapes entre ellas. El docente solo lo consulta. Los cambios del docente irán por la aprobación de sesiones (F6).

## Hallazgos

- La creación y edición de grupos solo existía en la pantalla del **docente** (`/app/docente/grupos`). El backend solo permite `POST /grupos` y `PUT /grupos/{id}` a COORDINADOR y ADMINISTRADOR, así que nadie podía crear un grupo desde la app.
- `CourseService.crearGrupo` y `actualizarGrupo` enviaban campos que el backend no declara (`code`, `name`, `section`, `room`, `schedule`) en lugar de `codigo`, `nombre`, `idDocente`, etc. Por eso tampoco habrían funcionado.
- El horario escrito en el formulario nunca se enviaba.

## Cambios

1. **Pantalla nueva del coordinador** `CoordinatorGroupsComponent` (`/app/coordinador/grupos`, menú "Grupos y Horarios"):
   - lista los grupos del programa con el docente y el horario (`GET /grupos`, ahora con `franjas`);
   - crea grupos: asignatura de los planes del programa, período, código, nombre, docente activo del programa y franjas;
   - edita código, nombre, docente, cupo y franjas;
   - antes de enviar valida campos obligatorios, que la hora de fin sea mayor que la de inicio y que las franjas no se crucen. Las reglas definitivas (`HOR_002`, `HOR_003` y `HOR_004`) las aplica la BD, y sus mensajes se muestran en un toast.
2. **`CourseService`:**
   - `crearGrupo` y `actualizarGrupo` usan el contrato real (`GrupoCoordinadorPayload`) y envían `franjas: [{dia, horaInicio, horaFin}]`; sin `franjas` el horario no cambia;
   - `getCoordinatorCourses` y `getDeanCourses` mapean `franjas` y el texto `schedule` ("Lunes 08:00-10:00, …").
3. **Modelos:** `FranjaHorario` y `Course.franjas` en `course.model.ts`; `GrupoApiDto.franjas`.
4. **Docente:**
   - se quitan "Nuevo grupo", "Editar grupo" y `TeacherGrupoFormComponent`; el componente y su spec se eliminan;
   - el docente consulta su horario en la lista y en la pestaña Horarios del hub.

## Validación (2026-11-01)

- `npm run test:ci` (Karma ChromeHeadless con cobertura): **1356 de 1356 SUCCESS**.
- Cobertura: Statements 91.27 %, Branches 75.77 %, Functions 90.95 % y Lines 92.23 %.
- `ng build`: bundle generado sin errores.
