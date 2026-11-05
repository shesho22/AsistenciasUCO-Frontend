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

/**
 * HU061: consolidado de asistencia por grupo. La cohorte es el período académico del grupo (decisión de John,
 * 2026-11-04); el coordinador ve su programa, el decano su facultad y el administrador su institución.
 */
export interface ConsolidadoGrupoItem {
  idGrupo: string;
  codigoGrupo: number | null;
  nombreGrupo: string | null;
  idPeriodoAcademico: string | null;
  nombrePeriodoAcademico: string | null;
  idPrograma: string | null;
  nombrePrograma: string | null;
  idAsignatura: string | null;
  nombreAsignatura: string | null;
  idDocente: string | null;
  nombreDocente: string | null;
  estudiantesActivos: number;
  sesionesEjecutadas: number;
  asistencias: number;
  faltasSinJustaCausa: number;
  excusas: number;
  /** Sobre sesiones ejecutadas × estudiantes activos. */
  porcentajeAsistencia: number;
  porcentajeInasistencia: number;
  estudiantesRiesgo: number;
  estudiantesPerdida: number;
}

export interface FiltroConsolidado {
  idPeriodoAcademico?: string | null;
  idPrograma?: string | null;
  idAsignatura?: string | null;
  idDocente?: string | null;
  pagina: number;
  tamano: number;
}

/** HU172: un evento del rastro de auditoría (solo lectura, solo administrador). */
export interface EventoAuditoriaItem {
  id: string;
  ocurridoEn: string;
  idActor: string | null;
  tipoActor: string;
  nombreActor: string | null;
  accion: string;
  tipoRecurso: string;
  idRecurso: string | null;
  resultado: 'SUCCESS' | 'FAILURE' | string;
  idTraza: string | null;
  metodoHttp: string;
  ruta: string;
  estadoHttp: number;
  ipCliente: string | null;
  codigoError: string | null;
  metadatos: string | null;
  accionAsistencia: boolean;
}

/** Rango [desde, hasta) en ISO-8601 con zona; sin rango el backend usa los últimos 7 días (máximo 90). */
export interface FiltroAuditoria {
  desde?: string | null;
  hasta?: string | null;
  accion?: string | null;
  resultado?: string | null;
  soloAsistencia?: boolean | null;
  pagina: number;
  tamano: number;
}

/** HU147: componentes de formación (BAS, INS, ESP); fijos por regla de negocio. */
export interface ComponenteFormacionItem {
  idComponente: string;
  codigo: string;
  nombre: string;
  totalAsignaturas: number;
}

/** HU155: estado de un catálogo de negocio de solo consulta (estados de solicitudes o del estudiante en el grupo). */
/** HU005/HU016: categoría (motivo) para justificar una inasistencia; catálogo de solo consulta. */
export interface CategoriaJustificacionItem {
  id: string;
  codigo: string;
  /** Texto que el formulario de reclamo envía como `categoria` (contrato vigente del radicado). */
  nombre: string;
  descripcion: string | null;
}

export interface EstadoSistemaItem {
  catalogo: 'SOLICITUD' | 'ESTUDIANTE_GRUPO';
  id: string;
  codigo: string;
  nombre: string;
}
