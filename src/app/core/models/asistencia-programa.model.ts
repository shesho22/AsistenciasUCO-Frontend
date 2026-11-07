import { CancelacionSesion, EstadoSesion } from './sesion-estado.model';

/** HU064/HU060/HU061: consultas de solo lectura del coordinador sobre su programa. */
export interface GrupoProgramaItem {
  id: string;
  codigo: number | null;
  nombre: string;
  idAsignatura: string | null;
  nombreAsignatura: string;
  idDocente: string | null;
  capacidadMaxima: number | null;
  estudiantesActivos: number | null;
  cuposDisponibles: number | null;
  habilitado: boolean;
  inicioPeriodo: string | null;
  finPeriodo: string | null;
}

export interface SesionGrupoItem {
  id: string;
  idGrupo: string;
  codigoGrupo: number | null;
  nombreGrupo: string;
  nombre: string;
  numero: number | null;
  codigo: string;
  numeroSemana: number | null;
  /** v1: `LocalDateTime` sin zona; se presenta literal, nunca se reinterpreta (APP-04). */
  fechaHoraInicio: string | null;
  fechaHoraFin: string | null;
  /** APP-04 (aditivo): instantes UTC con `Z`, presentes solo si `estadoTemporal = CONFIRMADA`. */
  fechaHoraInicioUtc?: string | null;
  fechaHoraFinUtc?: string | null;
  estadoTemporal?: 'CONFIRMADA' | 'INDETERMINADA' | null;
  /** CULM-001 B.1 (aditivo): estado de la sesion y detalle de la cancelacion. */
  estado?: EstadoSesion;
  cancelacion?: CancelacionSesion | null;
}

export interface AsistenciaSesionItem {
  idDetalleAsistencia: string;
  idSesion: string;
  nombreSesion: string;
  idEstudiante: string | null;
  numeroIdentificacion: string | null;
  nombreCompleto: string;
  asistio: boolean;
  codigoRazonCausa: string | null;
  nombreRazonCausa: string | null;
  fechaHoraInicio: string | null;
  fechaHoraFin: string | null;
}

