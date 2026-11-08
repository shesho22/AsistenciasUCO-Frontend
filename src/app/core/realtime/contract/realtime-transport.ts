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

  /** Idempotente para el mismo grupo; cambia de stream si cambia el scope. */
  start(scope: RealtimeSubscriptionScope): void;

  /** Aborta el transporte y cancela cualquier reintento pendiente. */
  stop(): void;
}

export interface RealtimeSubscriptionScope {
  grupoId: string;
}

export const REALTIME_TRANSPORT = new InjectionToken<RealtimeTransport>(
  'REALTIME_TRANSPORT',
  {
    providedIn: 'root',
    factory: () => ({
      events$: EMPTY,
      connectionState: undefined as any,
      connectionState$: of('DISCONNECTED' as RealtimeConnectionState),
      start: () => {},
      stop: () => {},
    }),
  }
);
