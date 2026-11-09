import { CancelacionSesion, EstadoSesion } from './sesion-estado.model';

/** Longitud máxima de la observación (contrato DEC-064: ≤ 250). */
export const OBSERVACION_CANCELACION_MAX = 250;

export interface MotivoCancelacionCoordinador {
  codigo: string;
  nombre: string;
}

export interface CancelarSesionCoordinadorRequest {
  codigoMotivo: string;
  observacion?: string;
}

/** `datos` de `POST /coordinador/sesiones/{id}/cancelacion`. */
export interface SesionCanceladaPorCoordinador {
  idSesion: string;
  idGrupo: string;
  estado: EstadoSesion;
  cancelacion: CancelacionSesion | null;
  estudiantesActivos: number;
}
