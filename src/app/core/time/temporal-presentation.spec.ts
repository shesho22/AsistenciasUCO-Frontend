import {
  SessionTimeZoneError,
  formatCivilDate,
  localDateTimeToExplicitInstant,
  presentTemporalValue,
  resolveSessionInstant,
  timeZoneOffsetLabel,
} from './session-timezone.util';

/**
 * APP-04: matriz de aceptación temporal. Un instante real (`Z` u offset) se presenta en la zona IANA efectiva;
 * una hora sin zona no se reinterpreta y una fecha civil no se desplaza.
 */
describe('APP-04 presentación temporal', () => {
  it('CASO 1: el mismo instante se ve 10:00 en Bogotá, 15:00 en Londres y 16:00 en Berlín', () => {
    const instant = '2026-11-03T15:00:00Z';
    expect(presentTemporalValue(instant, 'America/Bogota'))
      .toEqual({ date: '2026-11-03', time: '10:00', kind: 'INSTANTE', utc: '2026-11-03T15:00:00Z' });
    expect(presentTemporalValue(instant, 'Europe/London')?.time).toBe('15:00');
    expect(presentTemporalValue(instant, 'Europe/Berlin')?.time).toBe('16:00');
  });

  it('CASO 2: al cruzar medianoche cambia la fecha y la hora, no solo el reloj', () => {
    const instant = '2026-07-16T01:00:00Z';
    expect(presentTemporalValue(instant, 'America/Bogota')).toEqual(
      jasmine.objectContaining({ date: '2026-07-15', time: '20:00' })
    );
    expect(presentTemporalValue(instant, 'Europe/London')).toEqual(
      jasmine.objectContaining({ date: '2026-07-16', time: '02:00' })
    );
    expect(presentTemporalValue(instant, 'Europe/Berlin')).toEqual(
      jasmine.objectContaining({ date: '2026-07-16', time: '03:00' })
    );
  });

  it('CASO 2: un offset explícito equivale al mismo instante con Z', () => {
    expect(presentTemporalValue('2026-07-15T20:00:00-05:00', 'Europe/Berlin')).toEqual(
      jasmine.objectContaining({ date: '2026-07-16', time: '03:00', utc: '2026-07-16T01:00:00Z' })
    );
  });

  it('CASO 3: una fecha civil conserva el día en cualquier zona', () => {
    expect(formatCivilDate('2026-12-25')).toBe('25/12/2026');
    expect(formatCivilDate('2026-12-25T00:00:00Z')).toBeNull();
    expect(formatCivilDate('2026-02-30')).toBeNull();
    expect(formatCivilDate(null)).toBeNull();
  });

  it('CASO 4: Londres y Berlín aplican verano e invierno con la base IANA', () => {
    expect(presentTemporalValue('2026-07-01T12:00:00Z', 'Europe/London')?.time).toBe('13:00');
    expect(presentTemporalValue('2026-01-15T12:00:00Z', 'Europe/London')?.time).toBe('12:00');
    expect(presentTemporalValue('2026-07-01T12:00:00Z', 'Europe/Berlin')?.time).toBe('14:00');
    expect(presentTemporalValue('2026-01-15T12:00:00Z', 'Europe/Berlin')?.time).toBe('13:00');
    expect(timeZoneOffsetLabel('Europe/London', '2026-07-01T12:00:00Z')).toBe('UTC+01:00');
    expect(timeZoneOffsetLabel('Europe/London', '2026-01-15T12:00:00Z')).toBe('UTC');
    expect(timeZoneOffsetLabel('America/Bogota', '2026-11-03T15:00:00Z')).toBe('UTC-05:00');
  });

  it('CASO 4: rechaza la hora inexistente y la ambigua de Londres sin elegir un offset', () => {
    const codeOf = (fn: () => unknown): string | undefined => {
      try {
        fn();
        return undefined;
      } catch (error) {
        return error instanceof SessionTimeZoneError ? error.code : 'OTHER';
      }
    };
    expect(codeOf(() => localDateTimeToExplicitInstant('2026-03-29', '01:30', 'Europe/London')))
      .toBe('INVALID_LOCAL_TIME');
    expect(codeOf(() => localDateTimeToExplicitInstant('2026-10-25', '01:30', 'Europe/London')))
      .toBe('AMBIGUOUS_LOCAL_TIME');
  });

  it('UTC V2: conserva los siete decimales del instante canónico al presentarlo', () => {
    expect(presentTemporalValue('2026-11-03T15:00:00.1234567Z', 'Europe/Berlin')?.utc)
      .toBe('2026-11-03T15:00:00.1234567Z');
  });

  it('una hora sin zona no se reinterpreta: se presenta literal y marcada SIN_ZONA', () => {
    const naive = '2026-08-17T13:00:00';
    expect(presentTemporalValue(naive, 'America/Bogota'))
      .toEqual({ date: '2026-08-17', time: '13:00', kind: 'SIN_ZONA' });
    expect(presentTemporalValue(naive, 'Europe/Berlin'))
      .toEqual({ date: '2026-08-17', time: '13:00', kind: 'SIN_ZONA' });
  });

  it('valores ausentes o inválidos no se presentan', () => {
    expect(presentTemporalValue(null, 'Europe/Berlin')).toBeNull();
    expect(presentTemporalValue('', 'Europe/Berlin')).toBeNull();
    expect(presentTemporalValue('ayer', 'Europe/Berlin')).toBeNull();
    expect(presentTemporalValue('2026-11-03T15:00:00+25:00', 'Europe/Berlin')).toBeNull();
  });

  it('prefiere el instante UTC confirmado y nunca promueve un horario INDETERMINADO', () => {
    expect(resolveSessionInstant('2026-08-17T13:00:00', '2026-08-17T13:00:00Z', 'CONFIRMADA'))
      .toBe('2026-08-17T13:00:00Z');
    expect(resolveSessionInstant('2026-08-17T13:00:00', null, 'INDETERMINADA')).toBe('2026-08-17T13:00:00');
    expect(resolveSessionInstant('2026-08-17T13:00:00', '2026-08-17T13:00:00Z', 'INDETERMINADA'))
      .toBe('2026-08-17T13:00:00');
    expect(resolveSessionInstant('2026-08-17T13:00:00', undefined, undefined)).toBe('2026-08-17T13:00:00');
    expect(resolveSessionInstant(null, null, null)).toBeNull();
  });
});
