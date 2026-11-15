import { ApplicationConfig, EnvironmentInjector, ErrorHandler, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, withXsrfConfiguration, withXhr } from '@angular/common/http';
import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { correlationInterceptor } from './core/interceptors/correlation.interceptor';
import { roleScopeInterceptor } from './core/interceptors/role-scope.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { mockBackendLazyInterceptor } from './core/interceptors/mock-backend-lazy.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth.service';
import { REALTIME_TRANSPORT } from './core/realtime/contract/realtime-transport';
import { FetchSseRealtimeTransport } from './core/realtime/adapter/sse/fetch-sse-realtime-transport';
import { GlobalErrorHandler } from './core/errors/global-error-handler';

/**
 * VAL MSG-06 / EST-10: el servicio y la tabla de codigos remotos solo se descargan si MessageUcoLab esta configurado;
 * sin aplicacion y ambiente la SPA usa sus textos locales y el bundle inicial no los carga.
 */
export function iniciarCatalogoMensajesUi(injector: EnvironmentInjector) {
  return () => {
    if (!environment.messages.applicationId || !environment.messages.environmentId) {
      return;
    }
    void import('./core/messages/catalogo-mensajes-ui.service')
      .then((m) => injector.get(m.CatalogoMensajesUiService).iniciar())
      .catch(() => undefined);
  };
}

export function initializeKeycloak(authService: AuthService) {
  return () => authService.initKeycloak();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // VAL OBS-14: errores no capturados (incluidos los de ventana y promesas) pasan por el manejador global.
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withXhr(), 
      withInterceptors([
        correlationInterceptor,
        // Corta en el cliente las lecturas a prefijos que el rol autenticado no puede usar (evita 403 evitables).
        roleScopeInterceptor,
        authInterceptor,
        // Siempre está registrado, pero decide por petición si el modo mock está
        // activo. Así cambiar de modo en runtime no deja un pipeline inconsistente.
        mockBackendLazyInterceptor,
        errorInterceptor,
      ]),
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN',
      })
    ),
    { provide: REALTIME_TRANSPORT, useClass: FetchSseRealtimeTransport },
    // VAL MSG-06: los textos de la interfaz se leen de MessageUcoLab (sin bloquear el arranque).
    {
      provide: APP_INITIALIZER,
      useFactory: iniciarCatalogoMensajesUi,
      multi: true,
      deps: [EnvironmentInjector],
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeKeycloak,
      multi: true,
      deps: [AuthService],
    },
  ],
};
