export type UserRole = 'ADMINISTRADOR' | 'DECANO' | 'COORDINADOR' | 'DOCENTE' | 'ESTUDIANTE';

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
