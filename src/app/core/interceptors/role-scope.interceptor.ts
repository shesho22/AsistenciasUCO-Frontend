import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { UserRole, effectiveRoles } from '../models/user.model';
import { quitarBarrasFinales } from '../utils/barras-finales.util';

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
  // VAL SEG-14 (CULM-001 A.2-3, DEC-022 §2): el ADMINISTRADOR no opera las vistas de decano ni de coordinador.
  { prefix: 'decano', roles: ['DECANO'] },
  { prefix: 'coordinador', roles: ['COORDINADOR'] },
  { prefix: 'docente', roles: ['DOCENTE'] },
  { prefix: 'docentes', roles: ['COORDINADOR', 'ADMINISTRADOR'] },
  { prefix: 'estudiante', roles: ['ESTUDIANTE'] },
  { prefix: 'estudiantes', roles: ['DOCENTE', 'COORDINADOR', 'ADMINISTRADOR'] },
];

/**
 * Lecturas (GET) que `SecurityConfig` concede por encima de la regla del prefijo (catalogos institucionales de solo
 * lectura y consultas academicas compartidas). Deben coincidir con `access-catalog.json`: sin ellas el interceptor
 * respondia un 403 local a un DECANO que el servidor SI autoriza (AUTH-03, AUTH-04, INT-05).
 *
 * `patron` se evalua sobre la ruta que sigue al prefijo (sin barra inicial ni query), en el mismo orden que los
 * `requestMatchers` del backend:
 * - `GET /admin/areas[/**]`: ADMINISTRADOR, DECANO y COORDINADOR.
 * - `GET /coordinador/periodos-academicos` (exacta): DECANO, COORDINADOR y ADMINISTRADOR (pantallas de administracion).
 * - `GET /coordinador/{planes-estudio,periodos-academicos,asignaturas}[/**]`: DECANO y COORDINADOR, salvo
 *   `planes-estudio/{id}/asignaturas-asociables`, que es solo del COORDINADOR (CULM-001 B2NM).
 */
export const ROLE_SCOPE_READ_EXCEPTIONS: ReadonlyArray<{
  prefix: string;
  patron: RegExp;
  roles: readonly UserRole[];
}> = [
  { prefix: 'admin', patron: /^areas(\/.*)?$/, roles: ['ADMINISTRADOR', 'DECANO', 'COORDINADOR'] },
  { prefix: 'coordinador', patron: /^periodos-academicos$/, roles: ['DECANO', 'COORDINADOR', 'ADMINISTRADOR'] },
  {
    prefix: 'coordinador',
    patron: /^(?!planes-estudio\/[^/]+\/asignaturas-asociables$)(planes-estudio|periodos-academicos|asignaturas)(\/.*)?$/,
    roles: ['DECANO', 'COORDINADOR'],
  },
];

/** Primer segmento de la ruta relativa a `apiUrl` y el resto de la ruta, o `null` si la URL no es del API v1. */
function segmentosApi(url: string): { primero: string; resto: string | null } | null {
  try {
    const request = new URL(url, window.location.origin);
    const api = new URL(environment.apiUrl, window.location.origin);
    const base = `${quitarBarrasFinales(api.pathname)}/`;
    if (request.origin !== api.origin || !request.pathname.startsWith(base)) {
      return null;
    }
    const relativa = quitarBarrasFinales(request.pathname.slice(base.length));
    const corte = relativa.indexOf('/');
    const primero = corte < 0 ? relativa : relativa.slice(0, corte);
    const resto = corte < 0 ? '' : relativa.slice(corte + 1);
    return primero ? { primero, resto: resto || null } : null;
  } catch {
    return null;
  }
}

function comoLista(role: UserRole | readonly UserRole[]): readonly UserRole[] {
  return Array.isArray(role) ? role : [role as UserRole];
}

export function rolPuedeLeer(role: UserRole | readonly UserRole[], segmento: string): boolean {
  const regla = ROLE_SCOPE_RULES.find((r) => r.prefix === segmento);
  return !regla || comoLista(role).some((r) => regla.roles.includes(r));
}

/**
 * Como `rolPuedeLeer`, pero respeta las excepciones de lectura de `SecurityConfig`. `resto` es la ruta que sigue al
 * prefijo (p. ej. `planes-estudio/p-1/malla`), o `null` si la peticion es al prefijo solo.
 */
export function rolPuedeLeerRuta(role: UserRole | readonly UserRole[], segmento: string, resto: string | null): boolean {
  if (rolPuedeLeer(role, segmento)) {
    return true;
  }
  const roles = comoLista(role);
  return ROLE_SCOPE_READ_EXCEPTIONS.some(
    (e) => e.prefix === segmento && resto !== null && e.patron.test(resto) && roles.some((r) => e.roles.includes(r))
  );
}

export const roleScopeInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') {
    return next(req);
  }
  const usuario = inject(AuthService).currentUser();
  const segmentos = segmentosApi(req.url);
  if (!usuario || segmentos === null || rolPuedeLeerRuta(effectiveRoles(usuario), segmentos.primero, segmentos.resto)) {
    return next(req);
  }
  return throwError(
    () => new HttpErrorResponse({ status: 403, statusText: 'Forbidden', url: req.url })
  );
};
