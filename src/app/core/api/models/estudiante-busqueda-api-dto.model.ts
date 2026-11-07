/**
 * `EstudianteBusquedaDTO` de `GET /api/v1/grupos/{grupoId}/estudiantes/busqueda` (A.2-15, DEC-027): datos mínimos del
 * estudiante hallado por documento exacto. El correo real nunca sale; solo `correoEnmascarado`.
 */
export interface EstudianteBusquedaApiDto {
  idEstudiante: string;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  nombreCompleto: string;
  numeroIdentificacion: number;
  correoEnmascarado: string;
  /** Código del estado de su matrícula en ese grupo (`A` activa, `I` retirada) o `null` si no tiene. */
  codigoEstadoMatriculaGrupo: string | null;
}
