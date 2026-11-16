import { User, effectiveRoles, entidadACargo, hasAnyRole, sinEntidadAsignada } from './user.model';

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

describe('HU178: decano sin facultad y coordinador sin programa', () => {
  const con = (
    role: User['role'],
    vinculos?: User['vinculos'],
    roles?: User['roles']
  ): Pick<User, 'role' | 'roles' | 'vinculos'> => ({ role, roles, vinculos });

  it('es verdadero cuando el perfil ya llegó y no trae el vínculo del rol', () => {
    expect(sinEntidadAsignada(con('DECANO', []), 'DECANO')).toBeTrue();
    expect(
      sinEntidadAsignada(con('DECANO', [{ rol: 'DOCENTE', nombreEntidad: 'Ingeniería de Sistemas' }]), 'DECANO')
    ).toBeTrue();
    expect(sinEntidadAsignada(con('COORDINADOR', []), 'COORDINADOR')).toBeTrue();
    expect(
      sinEntidadAsignada(con('COORDINADOR', [{ rol: 'DOCENTE', nombreEntidad: 'Derecho' }]), 'COORDINADOR')
    ).toBeTrue();
  });

  it('es falso cuando el perfil trae el vínculo del rol (facultad del decano, programa del coordinador)', () => {
    expect(sinEntidadAsignada(con('DECANO', [{ rol: 'DECANO', nombreEntidad: 'Facultad de Ciencias' }]), 'DECANO')).toBeFalse();
    expect(
      sinEntidadAsignada(con('COORDINADOR', [{ rol: 'COORDINADOR', nombreEntidad: 'Derecho' }]), 'COORDINADOR')
    ).toBeFalse();
  });

  it('el vínculo de un rol no cubre al otro', () => {
    const ambos = con('DECANO', [{ rol: 'DECANO', nombreEntidad: 'Facultad de Ciencias' }], ['DECANO', 'COORDINADOR']);

    expect(sinEntidadAsignada(ambos, 'DECANO')).toBeFalse();
    expect(sinEntidadAsignada(ambos, 'COORDINADOR')).toBeTrue();
  });

  it('es falso mientras el perfil no ha llegado (vínculos desconocidos): no se presume la falta de entidad', () => {
    expect(sinEntidadAsignada(con('DECANO', undefined), 'DECANO')).toBeFalse();
    expect(sinEntidadAsignada(con('COORDINADOR', undefined), 'COORDINADOR')).toBeFalse();
  });

  it('es falso para quien no tiene el rol', () => {
    expect(sinEntidadAsignada(con('DOCENTE', []), 'DECANO')).toBeFalse();
    expect(sinEntidadAsignada(con('DOCENTE', []), 'COORDINADOR')).toBeFalse();
  });

  it('considera el rol entre los roles efectivos, no solo el principal', () => {
    expect(sinEntidadAsignada(con('ADMINISTRADOR', [], ['ADMINISTRADOR', 'DECANO']), 'DECANO')).toBeTrue();
    expect(sinEntidadAsignada(con('DOCENTE', [], ['DOCENTE', 'COORDINADOR']), 'COORDINADOR')).toBeTrue();
  });

  it('entidadACargo devuelve el nombre de la entidad del vínculo del rol o null', () => {
    expect(entidadACargo(con('DECANO', [{ rol: 'DECANO', nombreEntidad: 'Facultad de Ciencias' }]), 'DECANO')).toBe(
      'Facultad de Ciencias'
    );
    expect(entidadACargo(con('COORDINADOR', [{ rol: 'COORDINADOR', nombreEntidad: 'Derecho' }]), 'COORDINADOR')).toBe(
      'Derecho'
    );
    expect(entidadACargo(con('COORDINADOR', [{ rol: 'DECANO', nombreEntidad: 'Facultad de Ciencias' }]), 'COORDINADOR')).toBeNull();
    expect(entidadACargo(con('DECANO', []), 'DECANO')).toBeNull();
    expect(entidadACargo(con('DECANO', undefined), 'DECANO')).toBeNull();
  });
});
