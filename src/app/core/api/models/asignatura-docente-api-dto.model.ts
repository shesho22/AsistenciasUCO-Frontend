/**
 * Espejo exacto de `AsignaturaDocenteDTO` (GET /api/v1/docente/asignaturas).
 * Una fila por asignación académica (asignatura + grupo) del docente autenticado.
 */
export interface AsignaturaDocenteApiDto {
  idAsignatura: string;
  nombreAsignatura: string;
  idGrupo: string;
  nombreGrupo: string;
  idPrograma: string;
  nombrePrograma: string;
}
