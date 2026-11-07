import { ClassSession } from '../models/attendance.model';
import {
  ATTENDANCE_WINDOW_MESSAGES,
  getAttendanceWindowState,
  isAttendanceWindowErrorCode,
  msUntilAttendanceWindowChange,
} from './session-attendance-window.util';

/** Sesión institucional 08:00-10:00 America/Bogota = 13:00-15:00 UTC (instantes v2 confirmados). */
const session: Pick<ClassSession, 'estadoTemporal' | 'fechaHoraInicio' | 'fechaHoraFin'> = {
  estadoTemporal: 'CONFIRMADA',
  fechaHoraInicio: '2026-11-03T13:00:00Z',
  fechaHoraFin: '2026-11-03T15:00:00Z',
};
const at = (iso: string) => Date.parse(iso);

describe('session-attendance-window.util (SES-01)', () => {
  it('07:59:59 Bogotá: la sesión aún no inicia', () => {
    expect(getAttendanceWindowState(session, at('2026-11-03T12:59:59Z'))).toBe('NO_INICIADA');
  });

  it('08:00:00 Bogotá: el inicio pertenece a la ventana', () => {
    expect(getAttendanceWindowState(session, at('2026-11-03T13:00:00Z'))).toBe('ABIERTA');
  });

  it('09:59:59.999 Bogotá: el último instante antes del fin sigue abierto', () => {
    expect(getAttendanceWindowState(session, at('2026-11-03T14:59:59.999Z'))).toBe('ABIERTA');
  });

  it('10:00:00 Bogotá: el fin exacto ya está cerrado (sin tolerancia)', () => {
    expect(getAttendanceWindowState(session, at('2026-11-03T15:00:00Z'))).toBe('CERRADA');
  });

  it('12:00 Bogotá: dos horas después sigue cerrada', () => {
    expect(getAttendanceWindowState(session, at('2026-11-03T17:00:00Z'))).toBe('CERRADA');
  });

  it('el mismo instante con offset distinto (Berlín) produce la misma decisión', () => {
    const berlin = { ...session, fechaHoraInicio: '2026-11-03T14:00:00+01:00', fechaHoraFin: '2026-11-03T16:00:00+01:00' };
    expect(getAttendanceWindowState(berlin, at('2026-11-03T14:59:59Z'))).toBe('ABIERTA');
    expect(getAttendanceWindowState(berlin, at('2026-11-03T15:00:00Z'))).toBe('CERRADA');
  });

  it('procedencia INDETERMINADA, sin instantes o con instantes inválidos nunca abre la ventana', () => {
    const now = at('2026-11-03T14:00:00Z');
    expect(getAttendanceWindowState({ ...session, estadoTemporal: 'INDETERMINADA' }, now)).toBe('INDETERMINADA');
    expect(getAttendanceWindowState({ ...session, estadoTemporal: undefined }, now)).toBe('INDETERMINADA');
    expect(getAttendanceWindowState({ ...session, fechaHoraFin: null }, now)).toBe('INDETERMINADA');
    expect(getAttendanceWindowState({ ...session, fechaHoraInicio: 'no-es-fecha' }, now)).toBe('INDETERMINADA');
    expect(getAttendanceWindowState(null, now)).toBe('INDETERMINADA');
  });

  it('calcula el tiempo hasta el próximo cambio de ventana y ninguno tras el cierre', () => {
    expect(msUntilAttendanceWindowChange(session, at('2026-11-03T12:59:00Z'))).toBe(60_000);
    expect(msUntilAttendanceWindowChange(session, at('2026-11-03T14:59:00Z'))).toBe(60_000);
    expect(msUntilAttendanceWindowChange(session, at('2026-11-03T15:00:00Z'))).toBeNull();
    expect(msUntilAttendanceWindowChange({ ...session, estadoTemporal: 'INDETERMINADA' }, at('2026-11-03T14:00:00Z'))).toBeNull();
  });

  it('reconoce solo los códigos 409 de ventana del backend', () => {
    expect(isAttendanceWindowErrorCode('ERR_SESION_CERRADA')).toBeTrue();
    expect(isAttendanceWindowErrorCode('ERR_SESION_NO_INICIADA')).toBeTrue();
    expect(isAttendanceWindowErrorCode('ERR_SESION_HORARIO_INDETERMINADO')).toBeTrue();
    expect(isAttendanceWindowErrorCode('FORBIDDEN')).toBeFalse();
    expect(isAttendanceWindowErrorCode('')).toBeFalse();
  });

  it('tiene un mensaje claro para cada estado bloqueado', () => {
    expect(ATTENDANCE_WINDOW_MESSAGES.CERRADA).toContain('reclamo');
    expect(ATTENDANCE_WINDOW_MESSAGES.NO_INICIADA).toContain('no ha iniciado');
    expect(ATTENDANCE_WINDOW_MESSAGES.INDETERMINADA).toContain('no está confirmado');
  });

  it('B1-F-15 una sesión cancelada bloquea la toma aunque su ventana horaria esté abierta', () => {
    const cancelada = { ...session, estado: 'CANCELADA' as const };
    expect(getAttendanceWindowState(cancelada, at('2026-11-03T14:00:00Z'))).toBe('CANCELADA');
    expect(getAttendanceWindowState({ ...session, estado: 'PROGRAMADA' }, at('2026-11-03T14:00:00Z'))).toBe('ABIERTA');
    expect(msUntilAttendanceWindowChange(cancelada, at('2026-11-03T12:00:00Z'))).toBeNull();
    expect(ATTENDANCE_WINDOW_MESSAGES.CANCELADA).toContain('cancelada');
  });
});
