import {
  SessionTimeZoneError,
  formatInstantInTimeZone,
  horarioDentroDelMismoDia,
  localDateTimeToExplicitInstant,
  localSessionToInstants,
  normalizeRfc3339ToUtc,
} from './session-timezone.util';

describe('session-timezone.util', () => {
  it('convierte Bogotá y Berlín verano/invierno usando la base IANA', () => {
    expect(localDateTimeToExplicitInstant('2026-07-15', '20:00', 'America/Bogota'))
      .toBe('2026-07-15T20:00:00-05:00');
    expect(localDateTimeToExplicitInstant('2026-07-16', '03:00', 'Europe/Berlin'))
      .toBe('2026-07-16T03:00:00+02:00');
    expect(localDateTimeToExplicitInstant('2026-01-16', '02:00', 'Europe/Berlin'))
      .toBe('2026-01-16T02:00:00+01:00');
  });

  it('muestra el mismo instante en zonas distintas sin reinterpretarlo', () => {
    const instant = '2026-07-16T01:00:00Z';
    expect(formatInstantInTimeZone(instant, 'America/Bogota'))
      .toEqual({ date: '2026-07-15', time: '20:00' });
    expect(formatInstantInTimeZone(instant, 'Europe/Berlin'))
      .toEqual({ date: '2026-07-16', time: '03:00' });
  });

  it('DEC-072: inicio y fin quedan el mismo día local con su offset real', () => {
    expect(localSessionToInstants({
      date: '2026-07-15',
      startTime: '20:30',
      endTime: '22:00',
      timeZone: 'America/Bogota',
    })).toEqual({
      fechaHoraInicio: '2026-07-15T20:30:00-05:00',
      fechaHoraFin: '2026-07-15T22:00:00-05:00',
    });
  });

  it('DEC-072: rechaza una hora de fin anterior a la de inicio en lugar de pasarla al día siguiente', () => {
    // Antes de DEC-072 (2026-11-13) 23:30 → 01:30 se convertía en una sesión que terminaba el día siguiente.
    let error: unknown;
    try {
      localSessionToInstants({ date: '2026-07-15', startTime: '23:30', endTime: '01:30', timeZone: 'America/Bogota' });
    } catch (e) {
      error = e;
    }
    expect(error instanceof SessionTimeZoneError).toBeTrue();
    expect((error as SessionTimeZoneError).code).toBe('END_BEFORE_START');
    expect((error as Error).message).toMatch(/medianoche/);
  });

  it('DEC-072: horarioDentroDelMismoDia exige fin estrictamente posterior y ambos valores', () => {
    expect(horarioDentroDelMismoDia('08:00', '10:00')).toBeTrue();
    expect(horarioDentroDelMismoDia('20:30', '10:00')).toBeFalse();
    expect(horarioDentroDelMismoDia('08:00', '08:00')).toBeFalse();
    expect(horarioDentroDelMismoDia('', '10:00')).toBeFalse();
    expect(horarioDentroDelMismoDia('08:00', '')).toBeFalse();
  });

  it('rechaza inicio y fin iguales en lugar de convertirlos silenciosamente en 24 horas', () => {
    expect(() => localSessionToInstants({
      date: '2026-07-15',
      startTime: '08:00',
      endTime: '08:00',
      timeZone: 'America/Bogota',
    })).toThrowError(/24 horas/);
  });

  it('rechaza una hora inexistente y una hora ambigua por DST', () => {
    expect(() => {
      try {
        localDateTimeToExplicitInstant('2026-03-29', '02:30', 'Europe/Berlin');
      } catch (error) {
        expect((error as SessionTimeZoneError).code).toBe('INVALID_LOCAL_TIME');
        throw error;
      }
    }).toThrow();
    expect(() => {
      try {
        localDateTimeToExplicitInstant('2026-10-25', '02:30', 'Europe/Berlin');
      } catch (error) {
        expect((error as SessionTimeZoneError).code).toBe('AMBIGUOUS_LOCAL_TIME');
        throw error;
      }
    }).toThrow();
  });

  it('conserva hasta siete decimales al normalizar un offset explícito', () => {
    expect(normalizeRfc3339ToUtc('2026-07-15T20:00:00.1234567-05:00'))
      .toBe('2026-07-16T01:00:00.1234567Z');
  });

  it('rechaza minutos imposibles en un offset RFC3339', () => {
    expect(() => normalizeRfc3339ToUtc('2026-07-15T20:00:00+05:99'))
      .toThrowError(/Offset RFC3339 inválido/);
  });

  it('expone códigos accionables para los errores temporales', () => {
    try {
      localSessionToInstants({ date: '2026-07-15', startTime: 'no', endTime: '10:00', timeZone: 'UTC' });
      fail('debía fallar');
    } catch (error) {
      expect(error).toEqual(jasmine.any(SessionTimeZoneError));
      expect((error as SessionTimeZoneError).code).toBe('INVALID_INPUT');
    }
  });
});

