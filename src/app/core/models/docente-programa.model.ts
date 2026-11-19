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

export interface DocentesProgramaFiltro {
  pagina: number;
  tamano: number;
  busqueda?: string;
  estaActivo?: boolean;
}

/** MEJORAS-SERGIO-2026-11-18: el vinculo ya no lleva tipo de vinculacion (retirado en BD, backend y frontend). */
export interface VincularDocenteExistentePayload {
  idDocente: string;
}

export interface VincularDocenteNuevoPayload {
  idTipoIdentificacion: string;
  numeroIdentificacion: string;
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  correo: string;
}

export type VincularDocentePayload = VincularDocenteExistentePayload | VincularDocenteNuevoPayload;

/** HU092: solo los campos presentes se modifican; "" limpia segundo nombre/apellido. Correo y documento no se editan. */
export interface ActualizarDocentePayload {
  primerNombre?: string;
  segundoNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  /** HU159: corrección del documento (opcional; si viene, exige motivo). */
  idTipoIdentificacion?: string;
  numeroIdentificacion?: number;
  motivo?: string;
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

/** Consolidado del directorio docente del programa (`GET /coordinador/docentes/resumen`, HU095). */
export interface ResumenDocentesPrograma {
  totalDocentes: number;
  totalActivos: number;
  totalInactivos: number;
}

export interface FichaDocenteFiltro {
  pagina: number;
  tamano: number;
  idPeriodoAcademico?: string;
}
