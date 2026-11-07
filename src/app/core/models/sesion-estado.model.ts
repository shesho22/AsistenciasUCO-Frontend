/** Estado de una sesión de clase (CULM-001 B.1, `EstadoSesion` del backend). */
export type EstadoSesion = 'PROGRAMADA' | 'CANCELADA';

export type TipoCancelacionSesion = 'DOCENTE' | 'FESTIVO';

/** Detalle de la cancelación; `null` en la sesión cuando no está cancelada. */
export interface CancelacionSesion {
  tipo: TipoCancelacionSesion;
  motivo: string | null;
  nombreFestivo: string | null;
  fechaCancelacionUtc: string | null;
}

/** `datos` de `PATCH /docente/sesiones/{id}/cancelar`. */
export interface SesionCancelada {
  idSesion: string;
  idGrupo: string;
  estado: EstadoSesion;
  cancelacion: CancelacionSesion | null;
  estudiantesNotificados: number;
}

/** Longitud del motivo de cancelación (CONTRACT B 3.2.1: 10..500, se recorta). La BD vuelve a validar (SES_013). */
export const MOTIVO_CANCELACION_MIN = 10;
export const MOTIVO_CANCELACION_MAX = 500;

export function estaCancelada(sesion: { estado?: EstadoSesion | null } | null | undefined): boolean {
  return sesion?.estado === 'CANCELADA';
}

/**
 * Texto de apoyo de una sesión cancelada: "Día festivo: <nombre>" o el motivo del docente.
 * Solo compone valores entregados por el backend; no los traduce ni los interpreta.
 */
export function detalleCancelacion(cancelacion: CancelacionSesion | null | undefined): string {
  if (!cancelacion) return '';
  if (cancelacion.tipo === 'FESTIVO') {
    return cancelacion.nombreFestivo ? `Día festivo: ${cancelacion.nombreFestivo}` : 'Día festivo';
  }
  return cancelacion.motivo ?? '';
}

/**
 * Marca una sesión como cancelada sin mutar la lista. Una sesión ya cancelada conserva su cancelación: el evento
 * SSE no trae el motivo y no debe pisar el que ya conoce el docente por la respuesta HTTP.
 */
export function marcarSesionCancelada<T extends { id: string; estado?: EstadoSesion | null; cancelacion?: CancelacionSesion | null }>(
  sesiones: readonly T[],
  sesionId: string,
  cancelacion: CancelacionSesion
): T[] {
  const lista = sesiones as T[];
  const indice = lista.findIndex((s) => s.id === sesionId);
  if (indice < 0 || estaCancelada(lista[indice])) return lista;
  return lista.map((s, i) => (i === indice ? { ...s, estado: 'CANCELADA' as const, cancelacion } : s));
}
