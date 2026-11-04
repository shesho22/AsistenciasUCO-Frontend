import { ClassSession } from '../models/attendance.model';

/**
 * SES-01: ventana de registro ordinario de asistencia, [inicio, fin) sobre los instantes v2.
 *
 * Solo una sesión CONFIRMADA con ambos instantes RFC3339 abre la ventana; la comparación es por
 * instante (independiente de la zona del navegador). El reloj del navegador solo decide qué se
 * muestra: el backend y la DB vuelven a validar con su propio reloj y rechazan con 409.
 */
export type AttendanceWindowState = 'ABIERTA' | 'NO_INICIADA' | 'CERRADA' | 'INDETERMINADA';

type SessionWindow = Pick<ClassSession, 'estadoTemporal' | 'fechaHoraInicio' | 'fechaHoraFin'>;

export const ATTENDANCE_WINDOW_MESSAGES: Record<Exclude<AttendanceWindowState, 'ABIERTA'>, string> = {
  NO_INICIADA: 'La sesión aún no ha iniciado; la asistencia solo se registra durante la sesión.',
  CERRADA: 'La sesión ya finalizó; la asistencia solo puede modificarse mediante un reclamo.',
  INDETERMINADA: 'El horario de la sesión no está confirmado; no es posible registrar asistencia.',
};

const ATTENDANCE_WINDOW_ERROR_CODES = new Set([
  'ERR_SESION_NO_INICIADA',
  'ERR_SESION_CERRADA',
  'ERR_SESION_HORARIO_INDETERMINADO',
]);

function windowInstants(session: SessionWindow | null | undefined): { startMs: number; endMs: number } | null {
  if (!session || session.estadoTemporal !== 'CONFIRMADA' || !session.fechaHoraInicio || !session.fechaHoraFin) {
    return null;
  }
  const startMs = Date.parse(session.fechaHoraInicio);
  const endMs = Date.parse(session.fechaHoraFin);
  return Number.isNaN(startMs) || Number.isNaN(endMs) ? null : { startMs, endMs };
}

export function getAttendanceWindowState(
  session: SessionWindow | null | undefined,
  nowMs: number
): AttendanceWindowState {
  const instants = windowInstants(session);
  if (!instants) return 'INDETERMINADA';
  if (nowMs < instants.startMs) return 'NO_INICIADA';
  return nowMs < instants.endMs ? 'ABIERTA' : 'CERRADA';
}

/** Milisegundos hasta que la ventana cambie de estado (apertura o cierre); null si ya no cambiará. */
export function msUntilAttendanceWindowChange(
  session: SessionWindow | null | undefined,
  nowMs: number
): number | null {
  const instants = windowInstants(session);
  if (!instants) return null;
  if (nowMs < instants.startMs) return instants.startMs - nowMs;
  if (nowMs < instants.endMs) return instants.endMs - nowMs;
  return null;
}

/** Códigos 409 con los que backend/DB rechazan un registro fuera de la ventana. */
export function isAttendanceWindowErrorCode(code: string): boolean {
  return ATTENDANCE_WINDOW_ERROR_CODES.has(code);
}
