import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import {
  Observable,
  catchError,
  defer,
  finalize,
  from,
  of,
  shareReplay,
  switchMap,
  throwError,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

// ─────────────────────────────────────────────────────────────────────────────
// Cola anti-race-condition para renovaciones de token concurrentes.
// Estas variables viven fuera de la función (módulo-scope) para que sean
// compartidas entre todas las invocaciones del interceptor funcional.
// ─────────────────────────────────────────────────────────────────────────────
let refreshInFlight$: Observable<string> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  if (!isApiRequest(req.url)) {
    return next(req);
  }

  // Security Baseline: peticiones a la API institucional viajan con credenciales (cookies de sesión BFF).
  const reqWithCredentials = req.clone({ withCredentials: true });

  // Limpia tokens mock heredados si ya no estamos en modo mock.
  const currentToken = authService.token();
  if (currentToken && !authService.isMockMode() && currentToken.startsWith('mock-')) {
    authService.clearSession();
    return next(reqWithCredentials);
  }

  if (authService.isMockMode()) {
    return next(currentToken ? attachToken(reqWithCredentials, currentToken) : reqWithCredentials);
  }

  if (!authService.isAuthenticated()) {
    return next(reqWithCredentials);
  }

  return from(authService.getValidAccessToken(30)).pipe(
    switchMap((token) => {
      const activeToken = token || authService.token();
      if (!activeToken) {
        return next(reqWithCredentials);
      }
      return next(attachToken(reqWithCredentials, activeToken));
    }),
    catchError((err) => {
      if (err?.status === 401) {
        return handle401(reqWithCredentials, next, authService);
      }
      return throwError(() => err);
    })
  );
};

/**
 * Maneja un 401 inesperado tras enviar el token.
 * Serializa la renovación con BehaviorSubject para que las peticiones
 * concurrentes no disparen múltiples refreshes ("tormenta de renovaciones").
 */
function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService
): Observable<HttpEvent<unknown>> {
  if (!refreshInFlight$) {
    refreshInFlight$ = defer(() => from(authService.refreshAccessToken())).pipe(
      catchError(() => of(false)),
      switchMap((refreshed) => {
        const newToken = refreshed ? authService.token() : null;
        if (!newToken) {
          authService.notifySessionExpired();
          return throwError(
            () => new Error('No se pudo renovar el token de sesión')
          );
        }
        return of(newToken);
      }),
      finalize(() => {
        refreshInFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
  }

  return refreshInFlight$.pipe(
    switchMap((token) =>
      next(attachToken(req, token)).pipe(
        catchError((error) => {
          if (error?.status === 401) {
            authService.notifySessionExpired();
          }
          return throwError(() => error);
        })
      )
    )
  );
}

/**
 * La API es stateless y Bearer-only: la única credencial es Authorization. Nunca se activa
 * `withCredentials`, para que el navegador no adjunte cookies en peticiones cross-origin.
 */
function attachToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    withCredentials: true,
    headers: req.headers.set('Authorization', `Bearer ${token}`),
  });
}

function normalizeHost(hostname: string): string {
  return hostname === '127.0.0.1' ? 'localhost' : hostname;
}

function isApiRequest(url: string): boolean {
  try {
    const requestUrl = new URL(url, window.location.origin);
    const apiUrl = new URL(environment.apiUrl, window.location.origin);
    return (
      requestUrl.protocol === apiUrl.protocol &&
      normalizeHost(requestUrl.hostname) === normalizeHost(apiUrl.hostname) &&
      requestUrl.port === apiUrl.port &&
      requestUrl.pathname.startsWith(apiUrl.pathname)
    );
  } catch {
    return false;
  }
}
