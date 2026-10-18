import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { routes } from './app.routes';
import { correlationInterceptor } from './core/interceptors/correlation.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { mockBackendInterceptor } from './core/interceptors/mock-backend.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth.service';
import { REALTIME_TRANSPORT } from './core/realtime/contract/realtime-transport';
import { FetchSseRealtimeTransport } from './core/realtime/adapter/sse/fetch-sse-realtime-transport';

export function initializeKeycloak(authService: AuthService) {
  return () => authService.initKeycloak();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([
        correlationInterceptor,
        authInterceptor,
        // Siempre está registrado, pero decide por petición si el modo mock está
        // activo. Así cambiar de modo en runtime no deja un pipeline inconsistente.
        mockBackendInterceptor,
        errorInterceptor,
      ]),
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN',
      })
    ),
    { provide: REALTIME_TRANSPORT, useClass: FetchSseRealtimeTransport },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeKeycloak,
      multi: true,
      deps: [AuthService],
    },
  ],
};
