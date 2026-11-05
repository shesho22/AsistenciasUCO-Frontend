# HU136-docentes-institucion — Docentes de la institución (administrador) y retiro de las mutaciones de instituciones

El contrato y la validación de las 3 capas están en el work item homónimo del backend.

## Cambios

- **HU136:** `/app/admin/docentes` (menú "Docentes" del administrador) reutiliza `DeanDocentesComponent` con `data.comoAdministrador`, el mismo patrón que la búsqueda de asignaturas de HU143.
  - En modo administrador cambian los textos y se agrega el filtro por facultad (`cargarFacultades`).
  - El selector de programas sale de `CatalogService.getProgramasAcademicos()` y se acota a la facultad elegida.
  - Consulta `GET /admin/docentes` con `ConsultasTransversalesService.getDocentesInstitucion()`.
  - Ajuste aprobado por John: filtro "Vínculo" (con vínculo activo por defecto, sin vínculo activo o todos) y etiqueta "Sin vínculo activo" en los docentes retirados de todos sus programas.
  - El modo decano (HU128) no cambia.
- **HU161/HU162/HU164 descartadas:**
  - Se retiran `crearInstitucion`, `actualizarInstitucion` y `toggleEstadoInstitucion` de `AdminManagementService`; ninguna pantalla los usaba.
  - Se retiran también sus simulaciones del interceptor de mocks.
  - Se conserva `getInstituciones`.

## Rollback

Revertir el commit del work item.
