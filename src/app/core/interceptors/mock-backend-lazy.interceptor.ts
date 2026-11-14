import { HttpInterceptorFn } from '@angular/common/http';
import { EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Carga diferida del backend simulado; se exporta para poder sustituirla en las pruebas. */
export const cargadorBackendSimulado = {
  cargar: () => import('./mock-backend.interceptor').then((m) => m.mockBackendInterceptor),
};

/**
 * VAL EST-10: puerta del backend simulado. El simulador y sus datos (~77 kB) ya no viajan en el bundle inicial: solo
 * se descargan la primera vez que una petición ocurre con el modo simulado activo. Con el modo real, la petición pasa
 * sin cambios y sin cargar nada. La decisión sigue siendo por petición (cambiar de modo en caliente no deja un
 * pipeline inconsistente) y el simulador corre en el mismo contexto de inyección que el interceptor.
 */
export const mockBackendLazyInterceptor: HttpInterceptorFn = (req, next) => {
  if (!inject(AuthService).isMockMode()) {
    return next(req);
  }
  const injector = inject(EnvironmentInjector);
  return from(cargadorBackendSimulado.cargar()).pipe(
    switchMap((simulador) => runInInjectionContext(injector, () => simulador(req, next)))
  );
};
