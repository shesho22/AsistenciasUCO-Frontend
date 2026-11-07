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

/** Texto de la insignia: el estado tal como llega, salvo `RETIRADA`, que se presenta como "Retirada". */
export function etiquetaEstadoReclamo(estado: EstadoSolicitudRevision | string | undefined): string {
  return estado === 'RETIRADA' ? 'Retirada' : (estado ?? '');
}
