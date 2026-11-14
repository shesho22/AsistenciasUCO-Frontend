import { User, effectiveRoles, hasAnyRole } from './user.model';

describe('roles efectivos del usuario', () => {
  const base = (role: User['role'], roles?: User['roles']): Pick<User, 'role' | 'roles'> => ({ role, roles });

  it('incluye siempre el rol principal sin duplicados', () => {
    expect(effectiveRoles(base('ADMINISTRADOR', ['ADMINISTRADOR']))).toEqual(['ADMINISTRADOR']);
    expect(effectiveRoles(base('DOCENTE', ['DOCENTE', 'ESTUDIANTE']))).toEqual(['DOCENTE', 'ESTUDIANTE']);
    expect(effectiveRoles(base('DECANO'))).toEqual(['DECANO']);
  });

  it('hasAnyRole acepta si algún rol efectivo está permitido y rechaza si ninguno lo está', () => {
    const usuario = base('COORDINADOR', ['COORDINADOR', 'DOCENTE']);

    expect(hasAnyRole(usuario, ['DOCENTE'])).toBeTrue();
    expect(hasAnyRole(usuario, ['ESTUDIANTE', 'DECANO'])).toBeFalse();
    expect(hasAnyRole(base('ADMINISTRADOR'), ['ADMINISTRADOR'])).toBeTrue();
    // VAL SEG-14: el alias legado ADMIN se retiró; un rol fuera del catálogo no equivale a ADMINISTRADOR.
    expect(hasAnyRole(base('ADMIN' as User['role']), ['ADMINISTRADOR'])).toBeFalse();
    expect(hasAnyRole(usuario, [])).toBeFalse();
  });
});
