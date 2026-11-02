---
status: active
type: work-item
scope: frontend
owner: frontend-team
last-reviewed: 2026-11-02
---

# PLAN — F3: el docente crea sus propios grupos (frontend)

## Decisión

John (2026-11-01): el docente crea sus grupos para no cargar todo al coordinador. Alcance: el docente **crea** el grupo a su nombre y define su **horario inicial**; los cambios posteriores del docente irán por la aprobación del coordinador (F6) y el coordinador edita directo. La BD y el backend lo hacen cumplir (ramas `feature/F3-docente-crea-grupo` de esos repos).

## Cambios

1. **Formulario "Nuevo grupo" del docente** (`TeacherGrupoFormComponent`, abierto desde el botón de `TeacherGruposListComponent` en `TeacherGruposComponent`, vista `FORM_GRUPO`):
   - asignatura (de las asignaturas de los programas con vínculo activo), código, nombre y horario inicial;
   - el grupo queda a nombre del propio docente (`idDocente` viene de la oferta) y no se envía período (la DB toma el más reciente);
   - valida el formato antes de enviar; las reglas de negocio (`SEC_002`, `HOR_002`, `HOR_003`, `HOR_004`) las responde el backend y se muestran en un toast.
2. **`CourseService.getOfertaCreacionGrupos()`:** `GET /docente/oferta-creacion-grupos` → `{idDocente, asignaturas[]}` (modelo `OfertaCreacionGruposDocenteApiDto`); `crearGrupo` queda documentado para COORDINADOR y DOCENTE.
3. **Editor de franjas compartido** (`FranjasEditorComponent`, `shared/components/franjas-editor`) y validaciones en `core/validation/franjas.util.ts` (`DIAS_SEMANA`, `franjaNueva`, `validarFranjas`): los usan el formulario del coordinador (refactorizado) y el del docente, para no duplicar el código.

## Pruebas

- `franjas-editor.component.spec.ts` (editor y `validarFranjas`), `teacher-grupo-form.component.spec.ts` (oferta, validaciones, payload a nombre del docente), `teacher-grupos.component.spec.ts` (abrir formulario, crear, rechazo), `teacher-grupos-list.component.spec.ts` (botón) y `course.service.spec.ts` (oferta y creación sin período).
- `coordinator-groups.component.spec.ts` se ajustó al editor compartido.

## Validación

Ver `VALIDATION.md`.
