# HU094-HU095-directorio-docentes-coordinador — Ficha del docente y consolidado del directorio del coordinador

## Objetivo

- **HU094:** desde "Gestión de Docentes", el coordinador abre la ficha de un docente de su programa. La ficha muestra los datos del vínculo, un resumen de carga (grupos dictados, períodos, grupos vigentes y estudiantes activos) y el historial paginado de los grupos que dictó o dicta, con el estado del período.
- **HU095:** el directorio muestra los contadores del programa (total, activos e inactivos) y uno por tipo de vinculación. Un clic en un tipo, o el selector, filtra el directorio en el servidor.

## Alcance y límites

- El contrato HTTP, las decisiones y la validación de las 3 capas están en el work item homónimo del backend (`docs/work-items/HU094-HU095-directorio-docentes-coordinador/`).
- Endpoints nuevos:
  - `GET /api/v1/coordinador/docentes/{idDocente}/ficha`
  - `GET /api/v1/coordinador/docentes/resumen`
- El directorio existente ahora envía `idTipoVinculacion`, un parámetro que el backend ya aceptaba.
- **Desviación:** la ficha deja de mostrar horario y aula de los cursos del período actual. Antes los leía del portal del docente y los filtraba en el navegador. Ahora muestra el historial completo que entrega el servidor.

## Pantallas, servicios y simulación

| Elemento | Cambio |
|---|---|
| `CoordinatorDocenteFichaModalComponent` (`features/coordinator/coordinator-docentes/components`) | Nuevo: cabecera, resumen de carga, historial con insignia VIGENTE/FINALIZADO/PRÓXIMO, paginación de 5 en el servidor, estado vacío y error visible |
| `CoordinatorDocentesComponent` | Reemplaza el modal que filtraba cursos con `CourseService` por la ficha nueva ("Ver ficha e historial"). Agrega los contadores de HU095, los chips por tipo (clic para filtrar y segundo clic para quitar el filtro) y un selector de tipo de vinculación. El consolidado se relee tras vincular, editar o cambiar el estado de un docente. |
| `CoordinatorManagementService` | `getFichaDocente(idDocente, {pagina, tamano, idPeriodoAcademico?})` y `getResumenDocentes()` |
| `docente-programa.model.ts` | `FichaDocente`, `GrupoHistorialDocente`, `ResumenCargaDocente`, `ResumenDocentesPrograma`, `ResumenTipoVinculacion` |
| `mock-backend.interceptor` | `GET .../docentes/resumen` y `GET .../docentes/{id}/ficha` |
