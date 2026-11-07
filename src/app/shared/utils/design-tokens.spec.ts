import { readDesignToken } from './design-tokens';

describe('readDesignToken', () => {
  afterEach(() => document.documentElement.style.removeProperty('--token-prueba'));

  it('devuelve el valor resuelto del token declarado en :root', () => {
    document.documentElement.style.setProperty('--token-prueba', ' rebeccapurple ');
    expect(readDesignToken('--token-prueba')).toBe('rebeccapurple');
  });

  it('devuelve la referencia var() cuando el token no existe', () => {
    expect(readDesignToken('--token-inexistente')).toBe('var(--token-inexistente)');
  });

  it('devuelve la referencia var() si getComputedStyle falla', () => {
    spyOn(window, 'getComputedStyle').and.throwError('sin estilos');
    expect(readDesignToken('--color-primary-700')).toBe('var(--color-primary-700)');
  });
});
