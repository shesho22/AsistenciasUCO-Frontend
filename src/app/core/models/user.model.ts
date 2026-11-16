export type UserRole = 'ADMINISTRADOR' | 'DECANO' | 'COORDINADOR' | 'DOCENTE' | 'ESTUDIANTE';

/** Vínculo institucional del perfil (GET /usuarios/perfil, HU006): la entidad a cargo según el rol (DECANO: facultad). */
export interface VinculoInstitucional {
  rol: string;
  nombreEntidad: string;
}

export interface User {
  id: string;
  tipoIdentificacionId?: string;
  numeroIdentificacion?: number | string;
  primerNombre?: string;
  segundoNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  /** Roles institucionales efectivos confirmados por el backend; `role` es el de mayor jerarquía. */
  roles?: UserRole[];
  avatarUrl?: string;
  institutionName: string;
  department?: string;
  /**
   * HU178: vínculos del perfil. `undefined` mientras el perfil no llega (o si no los informa); una lista sin vínculo
   * DECANO (o COORDINADOR) confirma que el decano no tiene facultad (o el coordinador no tiene programa) asignada.
   */
  vinculos?: VinculoInstitucional[];
  telefono?: string;
  correoAlternativo?: string;
  status: 'active' | 'inactive';
}


/**
 * Roles efectivos del usuario sin duplicados; siempre incluye el rol principal. VAL SEG-14: el alias `ADMIN` se
 * retiró; los roles son exactamente los del catálogo de acceso del backend.
 */
export function effectiveRoles(user: Pick<User, 'role' | 'roles'>): UserRole[] {
  return Array.from(new Set([user.role, ...(user.roles ?? [])]));
}

/** Verdadero si algún rol efectivo del usuario está entre los permitidos (ergonomía de UI, no seguridad). */
export function hasAnyRole(user: Pick<User, 'role' | 'roles'>, allowed: readonly UserRole[]): boolean {
  const roles = effectiveRoles(user);
  return allowed.some((role) => roles.includes(role));
}

/**
 * HU178: roles cuyo ámbito depende de una entidad a cargo que informa el perfil con un vínculo del mismo rol: la facultad
 * del decano (`Facultad.decano`) y el programa del coordinador (`Programa.coordinador`).
 */
export type RolConEntidad = 'DECANO' | 'COORDINADOR';

/**
 * HU178: el usuario tiene el rol y su perfil ya confirmó que no tiene la entidad a cargo (sin vínculo de ese rol). Si el
 * perfil aún no llega no se presume: la regla de ámbito la sigue aplicando el backend.
 */
export function sinEntidadAsignada(user: Pick<User, 'role' | 'roles' | 'vinculos'>, rol: RolConEntidad): boolean {
  return hasAnyRole(user, [rol]) && Array.isArray(user.vinculos) && !user.vinculos.some((v) => v.rol === rol);
}

/** HU178: nombre de la entidad a cargo del rol según el perfil, o `null` si no la tiene o aún no se conoce. */
export function entidadACargo(user: Pick<User, 'vinculos'>, rol: RolConEntidad): string | null {
  return user.vinculos?.find((v) => v.rol === rol)?.nombreEntidad ?? null;
}
