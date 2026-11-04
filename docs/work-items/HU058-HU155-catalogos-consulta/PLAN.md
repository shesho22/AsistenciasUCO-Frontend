# HU058-HU155-catalogos-consulta — Nivel formativo en los cursos del docente y estados del sistema

Contrato y validación de las 3 capas: work item homónimo del backend.

## Cambios

- **HU058 (pantalla de Sergio, cambio acotado):**
  - `TeacherGruposListComponent` tiene un filtro "Nivel formativo" (Todos / pregrado / postgrado) con el catálogo real `GET /api/v1/tipos-programa`, y la tarjeta muestra el tipo del grupo.
  - `TeacherGruposComponent` carga el catálogo con `CatalogService.getTiposPrograma()`. Si falla, el filtro no se muestra.
  - `Course` y `AsignaturaDocenteApiDto` suman `idTipoPrograma` y `nombreTipoPrograma`; `CourseService` los copia de `GET /docente/asignaturas`.
- **HU155 y HU167:** `AdminEstadosComponent` (`/app/admin/estados`, menú "Estados del Sistema"). Muestra dos tablas de solo consulta (estados de solicitudes y del estudiante en el grupo) sobre `CatalogoSoloConsultaComponent`, que gana `seccion` (encabezado h2) y `conEstado` (oculta la columna Activo/Inactivo).
- **Servicio y mock:** `ConsultasTransversalesService.getEstadosSistema()` y su simulación en `mock-consultas-transversales.ts`.

## Rollback

Revertir el commit del work item.
