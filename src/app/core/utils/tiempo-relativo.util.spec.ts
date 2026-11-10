import { formatearHace } from './tiempo-relativo.util';

describe('formatearHace (DEC-065 (2))', () => {
  const ahora = new Date('2026-11-10T12:00:00Z');

  it('devuelve «—» si falta o es inválido', () => {
    expect(formatearHace(null, ahora)).toBe('—');
    expect(formatearHace(undefined, ahora)).toBe('—');
    expect(formatearHace('no-es-fecha', ahora)).toBe('—');
  });

  it('menos de un minuto o futuro: hace un momento', () => {
    expect(formatearHace('2026-11-10T11:59:40Z', ahora)).toBe('hace un momento');
    expect(formatearHace('2026-11-10T12:30:00Z', ahora)).toBe('hace un momento');
  });

  it('minutos, horas y días', () => {
    expect(formatearHace('2026-11-10T11:55:00Z', ahora)).toBe('hace 5 min');
    expect(formatearHace('2026-11-10T09:00:00Z', ahora)).toBe('hace 3 h');
    expect(formatearHace('2026-11-09T11:00:00Z', ahora)).toBe('hace 1 día');
    expect(formatearHace('2026-11-05T12:00:00Z', ahora)).toBe('hace 5 días');
  });
});
