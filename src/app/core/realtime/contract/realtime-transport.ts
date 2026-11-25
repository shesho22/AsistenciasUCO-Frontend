import { InjectionToken } from '@angular/core';
import { Observable, EMPTY, of } from 'rxjs';
import { RealtimeEvent } from '../model/realtime-event.model';
import { RealtimeConnectionState } from '../model/realtime-connection-state.model';

/**
 * Puerto entre `RealtimeService` y el mecanismo de transporte real
 * (SSE hoy, potencialmente WebSocket mañana). Las features solo conocen
 * `RealtimeService`; ni siquiera `RealtimeService` conoce los detalles de
 * fetch/SSE/reconexión, que viven exclusivamente en el adapter.
 */
export interface RealtimeTransport {
  readonly events$: Observable<RealtimeEvent>;
  readonly connectionState$: Observable<RealtimeConnectionState>;

  /** Idempotente para el mismo alcance; cambia de stream si cambia el scope. */
  start(scope: RealtimeSubscriptionScope): void;

  /** Aborta el transporte y cancela cualquier reintento pendiente. */
  stop(): void;
}

/**
 * Alcance del stream: el canal de un grupo (`/realtime/stream?grupoId=`) o el canal del usuario autenticado
 * (`/realtime/stream/usuario`, REDIS-001 TD-084), que se abre una vez por sesión para los contadores del menú.
 */
export type RealtimeSubscriptionScope = { grupoId: string } | { canal: 'usuario' };

export const REALTIME_TRANSPORT = new InjectionToken<RealtimeTransport>(
  'REALTIME_TRANSPORT',
  {
    providedIn: 'root',
    factory: () => ({
      events$: EMPTY,
      connectionState$: of('DISCONNECTED' as RealtimeConnectionState),
      start: () => {},
      stop: () => {},
    }),
  }
);

/**
 * REDIS-001 (TD-084): segundo transporte, independiente del de grupo, para el canal del usuario. Así abrir o cambiar
 * el grupo no cierra el canal del menú. Por defecto no conecta (pruebas y entornos sin backend).
 */
export const REALTIME_USUARIO_TRANSPORT = new InjectionToken<RealtimeTransport>(
  'REALTIME_USUARIO_TRANSPORT',
  {
    providedIn: 'root',
    factory: () => ({
      events$: EMPTY,
      connectionState$: of('DISCONNECTED' as RealtimeConnectionState),
      start: () => {},
      stop: () => {},
    }),
  }
);
