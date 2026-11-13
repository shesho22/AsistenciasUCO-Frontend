import { EstadoSolicitudSesion } from './sesion-estado.model';

/** DEC-065 (2): fila de la bandeja de solicitudes del coordinador. Los textos de estado los entrega el backend. */
export interface SolicitudSesionItem {
  idSesion: string;
  nombreSesion: string;
  codigoSesion: string;
  idGrupo: string;
  nombreGrupo: string;
  nombreAsignatura: string;
  idPrograma: string;
  nombrePrograma: string;
  idDocente: string;
  nombreDocente: string;
  /** ISO-8601 UTC. */
  fechaHoraInicio: string | null;
  fechaHoraFin: string | null;
  estadoSolicitud: EstadoSolicitudSesion;
  nombreEstadoSolicitud: string;
  fechaSolicitudUtc: string | null;
  fechaResolucionUtc: string | null;
  observacion: string | null;
}

export interface FiltroSolicitudesSesion {
  soloPendientes: boolean;
  programaId?: string | null;
  grupoId?: string | null;
  pagina: number;
  tamano: number;
}

/** Cuerpo de la aprobación; la observación es opcional (máximo 250). */
export interface AprobarSolicitudSesionRequest {
  observacion?: string;
}

/** Cuerpo del rechazo; el motivo sale del catálogo de motivos de cancelación del coordinador. */
export interface RechazarSolicitudSesionRequest {
  codigoMotivo: string;
  observacion?: string;
}
