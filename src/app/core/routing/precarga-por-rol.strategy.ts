import { Injectable, inject } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { EMPTY, Observable, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserRole, effectiveRoles } from '../models/user.model';

/** Tiempo máximo que se espera a que el navegador quede desocupado antes de precargar una pantalla. */
export const ESPERA_MAXIMA_OCIO_MS = 2000;

/** Espera a que el navegador esté desocupado (o, sin `requestIdleCallback`, a la siguiente vuelta del bucle de eventos). */
export function cuandoEsteDesocupado(): Observable<void> {
  return new Observable<void>((suscriptor) => {
    const avisar = () => {
      suscriptor.next();
      suscriptor.complete();
    };
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(avisar, { timeout: ESPERA_MAXIMA_OCIO_MS });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(avisar, 0);
    return () => clearTimeout(id);
  });
}

/**
 * Precarga en segundo plano solo las rutas marcadas explícitamente con `data.precargar: true`.
 * La mayoría de pantallas se descarga cuando el usuario la visita para no competir con el render de la pantalla actual.
 * - Sin sesión no precarga nada (la pantalla de inicio no necesita las del aplicativo).
 * - Una ruta con `data.roles` se precarga solo si alguno es rol efectivo del usuario; las de otros roles nunca se descargan.
 * - Una ruta sin `data.roles` también debe tener `data.precargar: true`.
 * Es solo rendimiento: la autorización sigue en los guards y en el backend.
 */
@Injectable({ providedIn: 'root' })
export class PrecargaPorRolStrategy implements PreloadingStrategy {
  private readonly auth = inject(AuthService);

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (route.data?.['precargar'] !== true) return EMPTY;
    const usuario = this.auth.currentUser();
    if (!usuario) return EMPTY;
    const permitidos = route.data?.['roles'] as readonly UserRole[] | undefined;
    if (permitidos?.length) {
      const roles = effectiveRoles(usuario);
      if (!permitidos.some((rol) => roles.includes(rol))) return EMPTY;
    }
    return cuandoEsteDesocupado().pipe(switchMap(() => load()));
  }
}
