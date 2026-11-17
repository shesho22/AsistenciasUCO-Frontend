import { TEXTO_CARGANDO, TEXTO_SIN_DATOS, textoCifra } from './cifra-indicador';

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
