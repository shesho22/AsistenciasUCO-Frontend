/** Minutos de la sesión de un estudiante, tal como los calcula el backend (no se recalculan en el cliente). */
export interface MinutosSesionEstudiante {
  minutosSesion?: number | null;
  minutosAsistidos?: number | null;
  minutosExcusa?: number | null;
}

/** Texto corto del estado de una sesión: "Parcial: X de Y minutos" cuando el backend reporta PARCIAL. */
export function etiquetaEstadoSesion(estado: string, minutos?: MinutosSesionEstudiante | null): string {
  switch (estado) {
    case 'PRESENTE':
      return 'Presente';
    case 'AUSENTE':
      return 'Ausente';
    case 'RETARDO':
      return 'Retardo';
    case 'JUSTIFICADA':
      return 'Justificada';
    case 'PARCIAL':
      return minutos?.minutosAsistidos != null && minutos.minutosSesion != null
        ? `Parcial: ${minutos.minutosAsistidos} de ${minutos.minutosSesion} minutos`
        : 'Parcial';
    default:
      return 'No disponible';
  }
}

/** "· Z min justificados" cuando hay minutos con excusa; cadena vacía si no. */
export function detalleExcusaSesion(minutos?: MinutosSesionEstudiante | null): string {
  const excusa = minutos?.minutosExcusa ?? 0;
  return excusa > 0 ? `${excusa} min justificados` : '';
}
