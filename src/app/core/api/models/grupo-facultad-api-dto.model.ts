/** Elemento de `GET /decano/grupos` (CULM-001 B2NM): un grupo con los nombres de todos sus programas. */
export interface GrupoFacultadApiDto {
  idGrupo: string;
  codigo: string;
  nombre: string;
  idPeriodoAcademico: string;
  idAsistencia?: string | null;
  idAsignatura: string;
  nombreAsignatura: string;
  idDocente: string;
  capacidadMaximaPermitida: number;
  estudiantesActivos: number;
  cuposDisponibles: number;
  /** Nombre tal como lo entrega el backend (sin la segunda i). */
  grupoEstaHablitado: boolean;
  programas: string[];
}
