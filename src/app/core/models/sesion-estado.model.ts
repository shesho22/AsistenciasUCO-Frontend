/** Estado de una sesión de clase (CULM-001 B.1, `EstadoSesion` del backend). */
export type EstadoSesion = 'PROGRAMADA' | 'CANCELADA';

/**
 * DEC-065 (2): estado de la solicitud de una sesión extraordinaria. `null` = sesión programada o manual anterior
 * (no requirió aval).
 */
export type EstadoSolicitudSesion = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export type TipoCancelacionSesion = 'DOCENTE' | 'FESTIVO' | 'COORDINADOR';

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

/** Campos de solicitud que entregan las listas de sesiones del docente y del coordinador. */
export interface SolicitudSesionInfo {
  estadoSolicitud?: EstadoSolicitudSesion | null;
  pendienteAprobacion?: boolean | null;
}

/** DEC-065 (2): la sesión espera el aval del coordinador; no admite toma de asistencia ni ventana QR/PIN. */
export function estaPendienteAprobacion(sesion: SolicitudSesionInfo | null | undefined): boolean {
  return sesion?.pendienteAprobacion === true || sesion?.estadoSolicitud === 'PENDIENTE';
}

export function estaRechazada(sesion: SolicitudSesionInfo | null | undefined): boolean {
  return sesion?.estadoSolicitud === 'RECHAZADA';
}

export const TEXTO_SESION_PENDIENTE = 'Disponible cuando la coordinación apruebe la sesión.';

/** Marca la sesión como aprobada sin mutar la lista; solo cambia una sesión que estaba pendiente. */
export function marcarSesionAprobada<T extends { id: string } & SolicitudSesionInfo>(
  sesiones: readonly T[],
  sesionId: string
): T[] {
  const lista = sesiones as T[];
  const indice = lista.findIndex((s) => s.id === sesionId);
  if (indice < 0 || !estaPendienteAprobacion(lista[indice])) return lista;
  return lista.map((s, i) => (i === indice ? { ...s, estadoSolicitud: 'APROBADA' as const, pendienteAprobacion: false } : s));
}
