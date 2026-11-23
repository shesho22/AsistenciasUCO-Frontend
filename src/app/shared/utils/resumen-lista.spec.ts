import { resumirLista } from './resumen-lista';

describe('resumirLista', () => {
  it('devuelve vacio para null, undefined y texto en blanco', () => {
    for (const valor of [null, undefined, '', '   ']) {
      expect(resumirLista(valor)).toEqual({ principal: '', adicionales: 0, completo: '' });
    }
  });

  it('un solo elemento no tiene adicionales', () => {
    expect(resumirLista('Sistemas')).toEqual({ principal: 'Sistemas', adicionales: 0, completo: 'Sistemas' });
  });

  it('toma el primero como principal y cuenta el resto', () => {
    const r = resumirLista('Sistemas, Derecho, Medicina');
    expect(r.principal).toBe('Sistemas');
    expect(r.adicionales).toBe(2);
    expect(r.completo).toBe('Sistemas, Derecho, Medicina');
  });

  it('respeta un separador distinto y descarta elementos vacios', () => {
    const r = resumirLista('A|B||C', '|');
    expect(r.principal).toBe('A');
    expect(r.adicionales).toBe(2);
  });
});
