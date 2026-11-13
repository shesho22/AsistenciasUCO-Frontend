import { EstadoSolicitudRevision } from '../models/role-management.model';

/** Variante visual de la insignia de un reclamo; `RETIRADA` es neutra (no es pendiente, aprobada ni rechazada). */
export function varianteEstadoReclamo(estado: EstadoSolicitudRevision | string | undefined): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (estado) {
    case 'APROBADA':
      return 'success';
    case 'RECHAZADA':
      return 'danger';
    case 'PENDIENTE':
      return 'warning';
    default:
      return 'neutral';
  }
}

/** Con qué resultado se aprobó un reclamo; `null` si no aplica (pendiente, rechazado o aprobación sin resultado informado). */
export function etiquetaResultadoAprobacion(resultado: string | null | undefined): string | null {
  switch (resultado) {
    case 'PRESENTE':
      return 'Aprobado: estuvo presente';
    case 'JUSTIFICADA':
      return 'Aprobado: ausencia justificada';
    default:
      return null;
  }
}

/** Texto legible de la insignia (nunca el codigo crudo del backend); un estado desconocido se muestra tal cual. */
export function etiquetaEstadoReclamo(estado: EstadoSolicitudRevision | string | undefined): string {
  switch (estado) {
    case 'PENDIENTE':
      return 'Pendiente';
    case 'APROBADA':
      return 'Aprobada';
    case 'RECHAZADA':
      return 'Rechazada';
    case 'RETIRADA':
      return 'Retirada';
    default:
      return estado ?? '';
  }
}
