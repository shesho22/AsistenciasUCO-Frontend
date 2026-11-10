import { ClassSession } from './attendance.model';
import { DEFINICION_CONTEO_SESIONES, resumirSesiones, sesionDeHoy } from './sesiones-resumen.util';

const AHORA = new Date('2026-09-14T15:00:00Z');

function sesion(id: string, parcial: Partial<ClassSession> = {}): ClassSession {
  return {
    id, courseId: 'g1', sessionNumber: 1, title: id, date: '2026-09-14', startTime: '08:00', endTime: '10:00', records: [],
    ...parcial,
  };
}
const utc = (inicio: string, fin: string): Partial<ClassSession> => ({ fechaHoraInicio: inicio, fechaHoraFin: fin });

describe('resumirSesiones (F3-DOC-03)', () => {
  it('sin sesiones: 0 programadas, 0 ejecutadas, 0 canceladas', () => {
    const r = resumirSesiones([], AHORA);
    expect(r).toEqual(jasmine.objectContaining({ programadas: 0, ejecutadas: 0, canceladas: 0 }));
    expect(r.texto).toBe('0 programadas · 0 ejecutadas · 0 canceladas');
  });

  it('programadas es el total del grupo; ejecutadas son las no canceladas ya terminadas; canceladas las canceladas', () => {
    const lista = [
      sesion('pasada-1', utc('2026-09-07T13:00:00Z', '2026-09-07T15:00:00Z')),
      sesion('pasada-2', utc('2026-09-08T13:00:00Z', '2026-09-08T15:00:00Z')),
      sesion('cancelada-pasada', { ...utc('2026-09-09T13:00:00Z', '2026-09-09T15:00:00Z'), estado: 'CANCELADA' }),
      sesion('futura', utc('2026-09-21T13:00:00Z', '2026-09-21T15:00:00Z')),
      sesion('cancelada-futura', { ...utc('2026-09-22T13:00:00Z', '2026-09-22T15:00:00Z'), estado: 'CANCELADA' }),
    ];
    const r = resumirSesiones(lista, AHORA);
    expect(r.programadas).toBe(5);
    expect(r.ejecutadas).toBe(2);
    expect(r.canceladas).toBe(2);
    expect(r.texto).toBe('5 programadas · 2 ejecutadas · 2 canceladas');
  });

  it('una sesion en curso todavia no esta ejecutada', () => {
    const r = resumirSesiones([sesion('en-curso', utc('2026-09-14T14:00:00Z', '2026-09-14T16:00:00Z'))], AHORA);
    expect(r.ejecutadas).toBe(0);
  });

  it('usa fecha y hora locales cuando no hay instantes UTC', () => {
    const r = resumirSesiones([sesion('local-pasada', { date: '2026-09-01' }), sesion('local-futura', { date: '2026-12-01' })], AHORA);
    expect(r.ejecutadas).toBe(1);
  });

  it('una sesion con horario no confirmado no se cuenta como ejecutada', () => {
    const r = resumirSesiones([sesion('x', { date: '', estadoTemporal: 'INDETERMINADA' })], AHORA);
    expect(r.programadas).toBe(1);
    expect(r.ejecutadas).toBe(0);
  });

  it('singulariza cuando el conteo es uno', () => {
    const r = resumirSesiones([sesion('a', { ...utc('2026-09-07T13:00:00Z', '2026-09-07T15:00:00Z'), estado: 'CANCELADA' })], AHORA);
    expect(r.texto).toBe('1 programada · 0 ejecutadas · 1 cancelada');
    const e = resumirSesiones([sesion('b', utc('2026-09-07T13:00:00Z', '2026-09-07T15:00:00Z'))], AHORA);
    expect(e.texto).toBe('1 programada · 1 ejecutada · 0 canceladas');
  });

  it('la definicion explica cada cifra', () => {
    expect(DEFINICION_CONTEO_SESIONES).toContain('Programadas');
    expect(DEFINICION_CONTEO_SESIONES).toContain('Ejecutadas');
    expect(DEFINICION_CONTEO_SESIONES).toContain('Canceladas');
  });
});

describe('sesionDeHoy', () => {
  it('devuelve la sesion en curso con tipo EN_CURSO', () => {
    const lista = [
      sesion('proxima', utc('2026-09-15T13:00:00Z', '2026-09-15T15:00:00Z')),
      sesion('en-curso', utc('2026-09-14T14:00:00Z', '2026-09-14T16:00:00Z')),
    ];
    expect(sesionDeHoy(lista, AHORA)).toEqual({ sesion: lista[1], tipo: 'EN_CURSO' });
  });

  it('sin sesion en curso devuelve la proxima mas cercana con tipo PROXIMA', () => {
    const lista = [
      sesion('lejana', utc('2026-09-30T13:00:00Z', '2026-09-30T15:00:00Z')),
      sesion('cercana', utc('2026-09-15T13:00:00Z', '2026-09-15T15:00:00Z')),
      sesion('pasada', utc('2026-09-01T13:00:00Z', '2026-09-01T15:00:00Z')),
    ];
    expect(sesionDeHoy(lista, AHORA)).toEqual({ sesion: lista[1], tipo: 'PROXIMA' });
  });

  it('ignora las sesiones canceladas', () => {
    const lista = [
      sesion('cancelada-en-curso', { ...utc('2026-09-14T14:00:00Z', '2026-09-14T16:00:00Z'), estado: 'CANCELADA' }),
      sesion('proxima', utc('2026-09-16T13:00:00Z', '2026-09-16T15:00:00Z')),
    ];
    expect(sesionDeHoy(lista, AHORA)?.sesion.id).toBe('proxima');
  });

  it('sin sesiones vigentes devuelve null', () => {
    expect(sesionDeHoy([], AHORA)).toBeNull();
    expect(sesionDeHoy([sesion('pasada', utc('2026-09-01T13:00:00Z', '2026-09-01T15:00:00Z'))], AHORA)).toBeNull();
  });

  it('ignora sesiones sin horario confirmado', () => {
    expect(sesionDeHoy([sesion('x', { date: '', estadoTemporal: 'INDETERMINADA' })], AHORA)).toBeNull();
  });
});
