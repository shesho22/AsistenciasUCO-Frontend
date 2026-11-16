import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RolConEntidad, hasAnyRole, sinEntidadAsignada } from '../models/user.model';

/** HU178: ruta del aviso único de cada rol cuando aún no tiene su entidad a cargo (facultad o programa). */
export const RUTA_SIN_ENTIDAD: Readonly<Record<RolConEntidad, string>> = {
  DECANO: '/app/decano/sin-facultad',
  COORDINADOR: '/app/coordinador/sin-programa',
};

/** HU178: roles que esperan el perfil antes de abrir el panel principal. */
const ROLES_CON_ENTIDAD: readonly RolConEntidad[] = ['DECANO', 'COORDINADOR'];

/**
 * Tiempo máximo que una navegación espera el perfil. Si el perfil no llega, la vista se abre como antes y el backend
 * sigue aplicando la regla de ámbito: la espera nunca deja la navegación colgada.
 */
const ESPERA_MAXIMA_PERFIL_MS = 5_000;

async function esperarPerfil(auth: AuthService): Promise<void> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<void>((resolve) => {
    temporizador = setTimeout(resolve, ESPERA_MAXIMA_PERFIL_MS);
  });
  try {
    await Promise.race([auth.perfilListo(), limite]);
  } finally {
    clearTimeout(temporizador);
  }
}

/**
 * HU178: las vistas que dependen de la entidad a cargo del rol (facultad del decano, programa del coordinador) llevan al
 * aviso único cuando el perfil (`GET /usuarios/perfil`) confirma que el usuario no tiene el vínculo de ese rol. Así no se
 * piden datos que el backend rechazaría con 403 en cada pantalla. La regla de ámbito no cambia: el backend la sigue
 * aplicando; esto solo decide qué se muestra.
 */
export function conEntidadAsignadaGuard(rol: RolConEntidad): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const usuario = auth.currentUser();
    if (!usuario || !hasAnyRole(usuario, [rol])) {
      return true;
    }
    await esperarPerfil(auth);
    const hidratado = auth.currentUser();
    return hidratado && sinEntidadAsignada(hidratado, rol) ? router.createUrlTree([RUTA_SIN_ENTIDAD[rol]]) : true;
  };
}

/** HU178: Mi facultad, Seguimiento, Directorio y los detalles de grupo y de plan del decano. */
export const decanoConFacultadGuard = conEntidadAsignadaGuard('DECANO');

/** HU178: Programa, Asistencia, Planes de estudio y Estudiantes del coordinador. */
export const coordinadorConProgramaGuard = conEntidadAsignadaGuard('COORDINADOR');

/**
 * HU178: el panel principal del decano y del coordinador espera el perfil para saber si debe mostrar el aviso en lugar
 * de consultar los indicadores de una entidad que no tiene. Nunca redirige.
 */
export const esperarPerfilGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const usuario = auth.currentUser();
  if (usuario && hasAnyRole(usuario, ROLES_CON_ENTIDAD)) {
    await esperarPerfil(auth);
  }
  return true;
};
