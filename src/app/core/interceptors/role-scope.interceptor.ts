import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { UserRole, effectiveRoles } from '../models/user.model';

/**
 * Espejo de las reglas por prefijo de `SecurityConfig` (backend). Las lecturas (GET) de un prefijo que el rol
 * autenticado no puede usar se cortan en el cliente con un 403 local: la pantalla recibe el mismo error de siempre,
 * pero sin una peticion que el servidor rechazaria (ruido de 403 en la red y en los logs de seguridad).
 *
 * El backend sigue siendo la autoridad: solo se interceptan GET, nunca escrituras, y un rol sin sesion o
 * un prefijo desconocido pasan sin cambios.
 */
export const ROLE_SCOPE_RULES: ReadonlyArray<{ prefix: string; roles: readonly UserRole[] }> = [
  { prefix: 'admin', roles: ['ADMINISTRADOR'] },
  { prefix: 'decano', roles: ['DECANO', 'ADMINISTRADOR'] },
  { prefix: 'coordinador', roles: ['COORDINADOR', 'ADMINISTRADOR'] },
  { prefix: 'docente', roles: ['DOCENTE'] },
  { prefix: 'docentes', roles: ['COORDINADOR', 'ADMINISTRADOR'] },
  { prefix: 'estudiante', roles: ['ESTUDIANTE'] },
  { prefix: 'estudiantes', roles: ['DOCENTE', 'COORDINADOR', 'ADMINISTRADOR'] },
];

/**
 * Lecturas (GET) que `SecurityConfig` concede por encima de la regla del prefijo (catalogos institucionales de solo
 * lectura y consultas academicas compartidas). Deben coincidir con `access-catalog.json`: sin ellas el interceptor
 * respondia un 403 local a un DECANO que el servidor SI autoriza (AUTH-03, AUTH-04, INT-05).
 */
export const ROLE_SCOPE_READ_EXCEPTIONS: ReadonlyArray<{
  prefix: string;
  subrutas: readonly string[];
  roles: readonly UserRole[];
}> = [
  { prefix: 'admin', subrutas: ['areas'], roles: ['ADMINISTRADOR', 'DECANO', 'COORDINADOR'] },
  {
    prefix: 'coordinador',
    subrutas: ['planes-estudio', 'periodos-academicos', 'asignaturas'],
    roles: ['DECANO', 'COORDINADOR', 'ADMINISTRADOR'],
  },
];

function normalizarRol(role: UserRole): UserRole {
  return role === 'ADMIN' ? 'ADMINISTRADOR' : role;
}

/** Primer y segundo segmento de la ruta relativa a `apiUrl`, o `null` si la URL no es del API v1. */
function segmentosApi(url: string): { primero: string; segundo: string | null } | null {
  try {
    const request = new URL(url, window.location.origin);
    const api = new URL(environment.apiUrl, window.location.origin);
    const base = `${api.pathname.replace(/\/+$/, '')}/`;
    if (request.origin !== api.origin || !request.pathname.startsWith(base)) {
      return null;
    }
    const [primero, segundo] = request.pathname.slice(base.length).split('/');
    return primero ? { primero, segundo: segundo || null } : null;
  } catch {
    return null;
  }
}

export function rolPuedeLeer(role: UserRole | readonly UserRole[], segmento: string): boolean {
  const regla = ROLE_SCOPE_RULES.find((r) => r.prefix === segmento);
  const roles = (Array.isArray(role) ? role : [role]).map(normalizarRol);
  return !regla || roles.some((r) => regla.roles.includes(r));
}

/** Como `rolPuedeLeer`, pero respeta las excepciones de lectura de `SecurityConfig` (por segundo segmento). */
export function rolPuedeLeerRuta(role: UserRole | readonly UserRole[], segmento: string, subruta: string | null): boolean {
  if (rolPuedeLeer(role, segmento)) {
    return true;
  }
  const roles = (Array.isArray(role) ? role : [role]).map(normalizarRol);
  return ROLE_SCOPE_READ_EXCEPTIONS.some(
    (e) => e.prefix === segmento && subruta !== null && e.subrutas.includes(subruta) && roles.some((r) => e.roles.includes(r))
  );
}

export const roleScopeInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') {
    return next(req);
  }
  const usuario = inject(AuthService).currentUser();
  const segmentos = segmentosApi(req.url);
  if (!usuario || segmentos === null || rolPuedeLeerRuta(effectiveRoles(usuario), segmentos.primero, segmentos.segundo)) {
    return next(req);
  }
  return throwError(
    () => new HttpErrorResponse({ status: 403, statusText: 'Forbidden', url: req.url })
  );
};
