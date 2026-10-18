import {
  SessionTimeZoneError,
  formatInstantInTimeZone,
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

  it('permite cruzar medianoche y compara instantes, no strings de hora', () => {
    expect(localSessionToInstants({
      date: '2026-07-15',
      startTime: '23:30',
      endTime: '01:30',
      timeZone: 'America/Bogota',
    })).toEqual({
      fechaHoraInicio: '2026-07-15T23:30:00-05:00',
      fechaHoraFin: '2026-07-16T01:30:00-05:00',
    });
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

