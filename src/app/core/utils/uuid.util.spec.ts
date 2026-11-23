import { isUuid } from './uuid.util';

describe('isUuid', () => {
  it('acepta un UUID canónico en minúsculas y en mayúsculas', () => {
    expect(isUuid('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d')).toBeTrue();
    expect(isUuid('A1B2C3D4-E5F6-7A8B-9C0D-1E2F3A4B5C6D')).toBeTrue();
  });

  it('rechaza vacíos, nulos, no textos y la cadena "undefined"', () => {
    expect(isUuid(undefined)).toBeFalse();
    expect(isUuid(null)).toBeFalse();
    expect(isUuid('')).toBeFalse();
    expect(isUuid('undefined')).toBeFalse();
    expect(isUuid(12345)).toBeFalse();
    expect(isUuid({})).toBeFalse();
  });

  it('rechaza UUID mal formados (longitud, guiones, caracteres no hexadecimales o espacios)', () => {
    expect(isUuid('a1b2c3d4e5f67a8b9c0d1e2f3a4b5c6d')).toBeFalse();
    expect(isUuid('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6')).toBeFalse();
    expect(isUuid('g1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d')).toBeFalse();
    expect(isUuid(' a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d')).toBeFalse();
  });
});
