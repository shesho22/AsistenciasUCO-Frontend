/** Vinculo docente-programa tal como lo expone `GET /api/v1/coordinador/docentes` (HU062/HU089). */
export interface DocentePrograma {
  idDocentePrograma: string;
  idDocente: string;
  idUsuario: string;
  codigoTipoIdentificacion: string;
  numeroIdentificacion: number;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  nombreCompleto: string;
  correo: string;
  idTipoVinculacion: string;
  codigoTipoVinculacion: string;
  nombreTipoVinculacion: string;
  fechaVinculacionUtc: string;
  totalGruposPrograma: number;
  estaActivo: boolean;
}

/** Candidato del picker de docentes existentes (datos minimos, sin correo). */
export interface DocenteCandidato {
  idDocente: string;
  idUsuario: string;
  codigoTipoIdentificacion: string;
  numeroIdentificacion: number;
  nombreCompleto: string;
}

export interface TipoVinculacionItem {
  id: string;
  codigo: string;
  nombre: string;
}

export interface DocentesProgramaFiltro {
  pagina: number;
  tamano: number;
  busqueda?: string;
  estaActivo?: boolean;
  idTipoVinculacion?: string;
}

export interface VincularDocenteExistentePayload {
  idDocente: string;
  idTipoVinculacion: string;
}

export interface VincularDocenteNuevoPayload {
  idTipoIdentificacion: string;
  numeroIdentificacion: string;
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  correo: string;
  password: string;
  idTipoVinculacion: string;
}

export type VincularDocentePayload = VincularDocenteExistentePayload | VincularDocenteNuevoPayload;

/** HU092: solo los campos presentes se modifican; "" limpia segundo nombre/apellido. Correo y documento no se editan. */
export interface ActualizarDocentePayload {
  idTipoVinculacion?: string;
  primerNombre?: string;
  segundoNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
}

/** Estado del periodo del grupo segun la fecha local institucional (HU094). */
export type EstadoPeriodoHistorial = 'VIGENTE' | 'FINALIZADO' | 'PROXIMO';

/** Grupo dictado por el docente en el programa (`GET /coordinador/docentes/{id}/ficha`, HU094). */
export interface GrupoHistorialDocente {
  idGrupo: string;
  codigoGrupo: number;
  nombreGrupo: string;
  idAsignatura: string;
  nombreAsignatura: string;
  idPeriodoAcademico: string;
  codigoPeriodoAcademico: number;
  nombrePeriodoAcademico: string;
  fechaInicioPeriodo: string;
  fechaFinPeriodo: string;
  estadoPeriodo: EstadoPeriodoHistorial;
  capacidadMaxima: number;
  estudiantesActivos: number;
  estudiantesFinalizados: number;
  estudiantesCanceladosVoluntad: number;
  estudiantesCanceladosInasistencia: number;
}

/** Resumen de carga sobre TODO el historial del docente en el programa (no depende de la pagina). */
export interface ResumenCargaDocente {
  totalGrupos: number;
  totalPeriodos: number;
  gruposVigentes: number;
  estudiantesActivosVigentes: number;
}

export interface FichaDocente {
  docente: DocentePrograma;
  resumen: ResumenCargaDocente;
  historial: GrupoHistorialDocente[];
  totalHistorial: number;
}

/** Vinculos activos e inactivos de un tipo de vinculacion en el programa (HU095). */
export interface ResumenTipoVinculacion {
  idTipoVinculacion: string;
  codigoTipoVinculacion: string;
  nombreTipoVinculacion: string;
  totalActivos: number;
  totalInactivos: number;
  total: number;
}

/** Consolidado del directorio docente del programa (`GET /coordinador/docentes/resumen`, HU095). */
export interface ResumenDocentesPrograma {
  totalDocentes: number;
  totalActivos: number;
  totalInactivos: number;
  porTipoVinculacion: ResumenTipoVinculacion[];
}

export interface FichaDocenteFiltro {
  pagina: number;
  tamano: number;
  idPeriodoAcademico?: string;
}
