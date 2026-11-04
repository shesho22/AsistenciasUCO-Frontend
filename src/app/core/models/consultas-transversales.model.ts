/**
 * HU112 (programas y créditos), HU128 (docentes por programa), HU143 (búsqueda de asignaturas) y HU157 (buscador de
 * estudiantes del administrador y ficha unificada con historial). Solo lectura.
 */
export interface ProgramaCreditosItem {
  idPrograma: string;
  nombrePrograma: string;
  nombreTipoPrograma: string | null;
  nombreModalidad: string | null;
  nombreJornada: string | null;
  programaActivo: boolean;
  /** Nulo si el programa todavía no tiene plan de estudio (totales en 0). */
  idPlanEstudio: string | null;
  inpPlanEstudio: number | null;
  planActivo: boolean;
  totalSemestres: number;
  totalAsignaturas: number;
  totalCreditos: number;
}

export interface DocenteFacultadItem {
  idDocente: string;
  numeroIdentificacion: string | null;
  nombreCompleto: string;
  correo: string | null;
  activo: boolean;
  programas: string | null;
  totalProgramas: number;
  totalGrupos: number;
}

export interface AsignaturaInstitucionItem {
  idAsignatura: string;
  codigo: string;
  nombre: string;
  creditos: number | null;
  nombreArea: string | null;
  nombreComponente: string | null;
  codigoSemestre: string | null;
  idPlanEstudio: string;
  inpPlanEstudio: number | null;
  idPrograma: string;
  nombrePrograma: string;
  idFacultad: string;
  nombreFacultad: string;
  activa: boolean;
}

export interface EstudianteInstitucionItem {
  idEstudiante: string;
  numeroIdentificacion: string | null;
  nombreCompleto: string;
  correo: string | null;
  activo: boolean;
  facultades: string | null;
  programas: string | null;
  totalGrupos: number;
}

export interface ResumenAsistencia {
  sesionesEjecutadas: number;
  asistencias: number;
  faltasSinJustaCausa: number;
  excusas: number;
  porcentajeInasistencia: number | null;
  codigoPermanencia: string | null;
}

/** Una matrícula del historial; el grupo, el período y el resumen son nulos si el programa no tiene grupos. */
export interface MatriculaHistorial {
  idFacultad: string;
  nombreFacultad: string;
  idPrograma: string;
  nombrePrograma: string;
  inpPlanEstudio: number | null;
  idPeriodoAcademico: string | null;
  codigoPeriodo: string | null;
  nombrePeriodo: string | null;
  idGrupo: string | null;
  codigoGrupo: number | null;
  idAsignatura: string | null;
  nombreAsignatura: string | null;
  codigoEstadoEstudiante: string | null;
  nombreEstadoEstudiante: string | null;
  resumen: ResumenAsistencia | null;
}

export interface FichaUnificadaEstudiante {
  idEstudiante: string;
  tipoIdentificacion: string | null;
  numeroIdentificacion: string | null;
  nombreCompleto: string;
  correo: string | null;
  activo: boolean;
  matriculas: MatriculaHistorial[];
}

/** Filtro común de los listados paginados: el backend aplica sus valores por defecto a lo que llegue vacío. */
export interface FiltroListado {
  busqueda?: string | null;
  estaActivo?: boolean | null;
  idPrograma?: string | null;
  idFacultad?: string | null;
  estaActiva?: boolean | null;
  pagina: number;
  tamano: number;
}
