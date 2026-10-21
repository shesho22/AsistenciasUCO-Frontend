import { RadicacionIntento, huellaRadicacion } from './radicacion-intento.util';

describe('RadicacionIntento', () => {
  const base = { sesionId: 's-1', categoria: 'Otro', justificacion: 'motivo' };

  it('mantiene el identificador para la misma huella (reintento técnico)', () => {
    const intento = new RadicacionIntento();
    const a = intento.idPara(huellaRadicacion(base));
    expect(intento.idPara(huellaRadicacion(base))).toBe(a);
  });

  it('cambia el identificador si cambia sesión, categoría, justificación o soporte', () => {
    const intento = new RadicacionIntento();
    const original = intento.idPara(huellaRadicacion(base));
    const variantes = [
      { ...base, sesionId: 's-2' },
      { ...base, categoria: 'Laboral' },
      { ...base, justificacion: 'otro motivo' },
      { ...base, soporteId: 'f-1' },
    ];
    let previo = original;
    for (const variante of variantes) {
      const id = intento.idPara(huellaRadicacion(variante));
      expect(id).not.toBe(previo);
      previo = id;
    }
  });

  it('reiniciar produce una solicitud nueva aunque el contenido sea idéntico', () => {
    const intento = new RadicacionIntento();
    const a = intento.idPara(huellaRadicacion(base));
    intento.reiniciar();
    expect(intento.idPara(huellaRadicacion(base))).not.toBe(a);
  });

  it('la huella distingue un soporte ausente de uno presente y no confunde separadores', () => {
    expect(huellaRadicacion(base)).not.toBe(huellaRadicacion({ ...base, soporteId: 'x' }));
    expect(huellaRadicacion({ ...base, categoria: 'a|b', justificacion: 'c' })).not.toBe(
      huellaRadicacion({ ...base, categoria: 'a', justificacion: 'b|c' })
    );
  });
});
