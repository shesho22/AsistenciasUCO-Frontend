import { TEXTO_CARGANDO, TEXTO_SIN_DATOS, textoCifra, textoPeriodo } from './cifra-indicador';

describe('textoCifra (CIERRE-W3I)', () => {
  it('mientras carga no pinta 0 ni "sin datos"', () => {
    expect(textoCifra(0, 'cargando')).toBe(TEXTO_CARGANDO);
    expect(textoCifra(null, 'cargando')).toBe(TEXTO_CARGANDO);
  });
  it('si la consulta fallo muestra "Sin datos" aunque haya un valor viejo', () => {
    expect(textoCifra(5, 'error')).toBe(TEXTO_SIN_DATOS);
  });
  it('una respuesta sin valor muestra "Sin datos"', () => {
    expect(textoCifra(null, 'listo')).toBe(TEXTO_SIN_DATOS);
    expect(textoCifra(undefined, 'listo')).toBe(TEXTO_SIN_DATOS);
  });
  it('una respuesta con valor pinta la cifra del servidor, incluido el 0, con su sufijo', () => {
    expect(textoCifra(0, 'listo')).toBe('0');
    expect(textoCifra(5007, 'listo')).toBe('5007');
    expect(textoCifra(82.5, 'listo', '%')).toBe('82.5%');
  });
});

describe('textoPeriodo (F-DEC-01)', () => {
  it('mientras carga no afirma que no haya periodo', () => {
    expect(textoPeriodo('cargando', null)).toBe(TEXTO_CARGANDO);
  });
  it('si la consulta fallo no declara nada sobre el periodo', () => {
    expect(textoPeriodo('error', '2026-2')).toBe(TEXTO_SIN_DATOS);
  });
  it('"Sin período vigente" solo con una respuesta sin periodo', () => {
    expect(textoPeriodo('listo', null)).toBe('Sin período vigente');
    expect(textoPeriodo('listo', undefined)).toBe('Sin período vigente');
  });
  it('con una respuesta con periodo muestra su nombre', () => {
    expect(textoPeriodo('listo', '2026-2')).toBe('2026-2');
  });
});
