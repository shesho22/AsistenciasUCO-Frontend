import { diasDeSemana, etiquetaDia, etiquetaSemana, lunesDeSemana, sumarDias } from './semana.util';

describe('semana.util (ATA D7)', () => {
  it('el lunes de cualquier día de la semana es el mismo lunes', () => {
    for (const dia of ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21']) {
      expect(lunesDeSemana(dia)).toBe('2026-11-16');
    }
  });

  it('el domingo pertenece a la semana que termina en él', () => {
    expect(lunesDeSemana('2026-11-22')).toBe('2026-11-16');
    expect(lunesDeSemana('2026-11-23')).toBe('2026-11-23');
  });

  it('suma y resta días cruzando meses y años', () => {
    expect(sumarDias('2026-11-28', 5)).toBe('2026-12-03');
    expect(sumarDias('2026-12-30', 3)).toBe('2027-01-02');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
    expect(sumarDias('2026-11-16', 0)).toBe('2026-11-16');
  });

  it('la semana tiene siete días consecutivos desde el lunes', () => {
    expect(diasDeSemana('2026-11-16')).toEqual([
      '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22',
    ]);
  });

  it('etiqueta el día y la semana en español', () => {
    expect(etiquetaDia('2026-11-16')).toContain('lunes');
    expect(etiquetaDia('2026-11-16')).toContain('16');
    expect(etiquetaSemana('2026-11-16')).toContain('2026');
    expect(etiquetaSemana('2026-11-16')).toContain('–');
  });
});
