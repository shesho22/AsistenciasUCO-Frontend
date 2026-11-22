import { StorageSerializer } from './storage-serializer.util';

describe('StorageSerializer', () => {
  const clave = 'storage-serializer-spec';

  beforeEach(() => {
    localStorage.removeItem(clave);
    spyOn(console, 'warn');
  });

  afterEach(() => localStorage.removeItem(clave));

  it('serializa y deserializa un objeto', () => {
    expect(StorageSerializer.serialize(clave, { a: 1 })).toBeTrue();
    expect(StorageSerializer.deserialize(clave, { a: 0 })).toEqual({ a: 1 });
  });

  it('deserialize devuelve el valor de respaldo si la clave no existe', () => {
    expect(StorageSerializer.deserialize(clave, 'respaldo')).toBe('respaldo');
  });

  it('deserialize devuelve el respaldo si el JSON está dañado', () => {
    localStorage.setItem(clave, '{no-json');
    expect(StorageSerializer.deserialize(clave, 'respaldo')).toBe('respaldo');
  });

  it('serialize devuelve false si el almacenamiento falla', () => {
    const espia = spyOn(Storage.prototype, 'setItem').and.throwError('cuota excedida');
    expect(StorageSerializer.serialize(clave, { a: 1 })).toBeFalse();
    espia.and.callThrough();
  });

  it('serializeWithMapper guarda los DTO y deserializeWithMapper los devuelve como modelos', () => {
    const ok = StorageSerializer.serializeWithMapper(clave, [{ n: 1 }, { n: 2 }], (m) => ({ dto: m.n }));
    expect(ok).toBeTrue();
    expect(JSON.parse(localStorage.getItem(clave) ?? '[]')).toEqual([{ dto: 1 }, { dto: 2 }]);
    expect(StorageSerializer.deserializeWithMapper<{ dto: number }, number>(clave, (d) => d.dto * 10)).toEqual([10, 20]);
  });

  it('deserializeWithMapper devuelve el respaldo si no hay datos, hay un arreglo vacío o no es un arreglo', () => {
    expect(StorageSerializer.deserializeWithMapper<number, number>(clave, (d) => d, [7])).toEqual([7]);
    localStorage.setItem(clave, '[]');
    expect(StorageSerializer.deserializeWithMapper<number, number>(clave, (d) => d, [7])).toEqual([7]);
    localStorage.setItem(clave, '{"a":1}');
    expect(StorageSerializer.deserializeWithMapper<number, number>(clave, (d) => d, [7])).toEqual([7]);
    localStorage.setItem(clave, 'null');
    expect(StorageSerializer.deserializeWithMapper<number, number>(clave, (d) => d)).toEqual([]);
  });

  it('removeItem elimina la clave y tolera un fallo del almacenamiento', () => {
    localStorage.setItem(clave, '1');
    StorageSerializer.removeItem(clave);
    expect(localStorage.getItem(clave)).toBeNull();

    const espia = spyOn(Storage.prototype, 'removeItem').and.throwError('bloqueado');
    expect(() => StorageSerializer.removeItem(clave)).not.toThrow();
    expect(console.warn).toHaveBeenCalled();
    espia.and.callThrough();
  });
});
