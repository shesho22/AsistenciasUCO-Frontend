import { FechaCortaPipe, FechaHoraCortaPipe, HoraCortaPipe, RangoHorarioPipe } from './fecha-hora.pipes';

describe('pipes de fecha y hora (formato unico)', () => {
  const BOGOTA = 'America/Bogota';
  const instante = '2026-11-12T13:00:00Z'; // 08:00 en Bogota (UTC-5)

  describe('fechaCorta', () => {
    const pipe = new FechaCortaPipe();
    it('formatea dia abreviado, numero y mes', () => {
      expect(pipe.transform(instante, BOGOTA)).toBe('jue 12 nov');
    });
    it('respeta la zona: el mismo instante cambia de dia', () => {
      expect(pipe.transform('2026-11-12T02:00:00Z', BOGOTA)).toBe('mié 11 nov');
      expect(pipe.transform('2026-11-12T02:00:00Z', 'UTC')).toBe('jue 12 nov');
    });
    it('una fecha sin hora no se desplaza por UTC', () => {
      expect(pipe.transform('2026-11-12')).toBe('jue 12 nov');
    });
    it('sin dato o invalido devuelve guion', () => {
      expect(pipe.transform(null)).toBe('—');
      expect(pipe.transform(undefined)).toBe('—');
      expect(pipe.transform('')).toBe('—');
      expect(pipe.transform('no-es-fecha')).toBe('—');
    });
  });

  describe('horaCorta', () => {
    const pipe = new HoraCortaPipe();
    it('muestra hh:mm en la zona indicada, sin segundos ni UTC', () => {
      const r = pipe.transform(instante, BOGOTA);
      expect(r).toBe('08:00');
      expect(r).not.toContain('UTC');
    });
    it('recorta LocalTime con segundos', () => {
      expect(pipe.transform('08:00:00')).toBe('08:00');
      expect(pipe.transform('14:30:15.250')).toBe('14:30');
      expect(pipe.transform('09:05')).toBe('09:05');
    });
    it('usa formato 24 horas', () => {
      expect(pipe.transform('2026-11-12T22:15:00Z', 'UTC')).toBe('22:15');
    });
    it('sin dato devuelve guion', () => {
      expect(pipe.transform(null)).toBe('—');
      expect(pipe.transform('xx')).toBe('—');
    });
  });

  describe('rangoHorario', () => {
    const pipe = new RangoHorarioPipe();
    it('une inicio y fin con guion largo', () => {
      expect(pipe.transform('08:00:00', '10:00:00')).toBe('08:00–10:00');
      expect(pipe.transform(instante, '2026-11-12T15:00:00Z', BOGOTA)).toBe('08:00–10:00');
    });
    it('sin fin muestra solo el inicio', () => {
      expect(pipe.transform('08:00:00', null)).toBe('08:00');
    });
    it('sin inicio devuelve guion', () => {
      expect(pipe.transform(null, '10:00:00')).toBe('—');
    });
  });

  describe('fechaHoraCorta', () => {
    const pipe = new FechaHoraCortaPipe();
    it('combina fecha y hora locales', () => {
      expect(pipe.transform(instante, BOGOTA)).toBe('jue 12 nov, 08:00');
    });
    it('no muestra segundos ni UTC', () => {
      const r = pipe.transform('2026-11-12T13:00:45Z', BOGOTA);
      expect(r).not.toMatch(/:\d{2}:\d{2}/);
      expect(r).not.toContain('UTC');
    });
    it('sin dato devuelve guion', () => {
      expect(pipe.transform(null)).toBe('—');
    });
  });
});
