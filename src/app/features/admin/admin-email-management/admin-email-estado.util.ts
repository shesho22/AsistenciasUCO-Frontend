/** Clases del distintivo de estado de un correo de la cola. */
export function claseDistintivoEstado(codigo: string): string {
  switch (codigo) {
    case 'ENTREGADA':
      return 'bg-success-100 text-success-800 border border-success-200';
    case 'PENDIENTE':
      return 'bg-warning-100 text-warning-800 border border-warning-200';
    case 'RESERVADA':
      return 'bg-info-100 text-info-800 border border-info-200';
    case 'FALLIDA_REINTENTABLE':
      return 'bg-warning-100 text-warning-900 border border-warning-300';
    case 'FALLIDA_DEFINITIVA':
      return 'bg-danger-100 text-danger-800 border border-danger-200';
    default:
      return 'bg-warm-100 text-warm-700';
  }
}

/** Clase del punto de color del estado de un correo de la cola. */
export function clasePuntoEstado(codigo: string): string {
  switch (codigo) {
    case 'ENTREGADA':
      return 'bg-success-500';
    case 'PENDIENTE':
    case 'FALLIDA_REINTENTABLE':
      return 'bg-warning-500';
    case 'RESERVADA':
      return 'bg-info-500';
    case 'FALLIDA_DEFINITIVA':
      return 'bg-danger-500';
    default:
      return 'bg-warm-400';
  }
}

/** Solo los correos fallidos se pueden reintentar. */
export function puedeReintentarEstado(codigoEstado: string): boolean {
  return codigoEstado === 'FALLIDA_DEFINITIVA' || codigoEstado === 'FALLIDA_REINTENTABLE';
}
