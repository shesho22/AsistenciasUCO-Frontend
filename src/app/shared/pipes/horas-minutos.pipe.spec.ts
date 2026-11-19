import { HorasMinutosPipe } from './horas-minutos.pipe';
import { formatearHorasMinutos } from './horas-minutos.util';

describe('formatearHorasMinutos', () => {
  it('cero horas', () => expect(formatearHorasMinutos(0)).toBe('0 min'));
  it('menos de una hora', () => expect(formatearHorasMinutos(0.75)).toBe('45 min'));
  it('horas exactas', () => expect(formatearHorasMinutos(2)).toBe('2 h'));
  it('horas y minutos', () => expect(formatearHorasMinutos(3.48)).toBe('3 h 29 min'));
  it('redondea al minuto más cercano', () => {
    expect(formatearHorasMinutos(0.999)).toBe('1 h');
    expect(formatearHorasMinutos(1.9999)).toBe('2 h');
  });
  it('valores ausentes o inválidos', () => {
    expect(formatearHorasMinutos(null)).toBe('—');
    expect(formatearHorasMinutos(undefined)).toBe('—');
    expect(formatearHorasMinutos(NaN)).toBe('—');
    expect(formatearHorasMinutos(-1)).toBe('—');
  });
});

describe('HorasMinutosPipe', () => {
  it('delega en la función pura', () => {
    const pipe = new HorasMinutosPipe();
    expect(pipe.transform(3.48)).toBe('3 h 29 min');
    expect(pipe.transform(null)).toBe('—');
  });
});
