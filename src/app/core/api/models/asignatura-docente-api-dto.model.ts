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
  /** Estudiantes con matrícula activa en el grupo (uv_grupo); ausente en backends anteriores. */
  estudiantesActivos?: number | null;
  /** Cupo máximo del grupo (uv_grupo); ausente en backends anteriores. */
  capacidadMaximaPermitida?: number | null;
  /** HU058: tipo de programa (nivel formativo) del grupo; nulo si el grupo no tiene programa. */
  idTipoPrograma?: string | null;
  nombreTipoPrograma?: string | null;
}
