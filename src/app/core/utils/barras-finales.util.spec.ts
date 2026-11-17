import { quitarBarrasFinales } from './barras-finales.util';

describe('quitarBarrasFinales', () => {
  const casos: ReadonlyArray<readonly [string, string]> = [
    ['', ''],
    ['/', ''],
    ['///', ''],
    ['a', 'a'],
    ['a/', 'a'],
    ['a//', 'a'],
    ['/a/b/', '/a/b'],
    ['a/b', 'a/b'],
    ['/a//b///', '/a//b'],
    ['http://localhost:8080/api/v1/', 'http://localhost:8080/api/v1'],
  ];

  for (const [entrada, esperado] of casos) {
    it(`devuelve "${esperado}" para "${entrada}"`, () => {
      expect(quitarBarrasFinales(entrada)).toBe(esperado);
    });
  }
});
