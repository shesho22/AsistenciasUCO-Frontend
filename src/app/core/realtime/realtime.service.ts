import { Injectable, inject } from '@angular/core';
import { Observable, filter } from 'rxjs';
import { REALTIME_TRANSPORT, RealtimeTransport } from './contract/realtime-transport';
import { RealtimeEvent, RealtimeEventType } from './model/realtime-event.model';
import { RealtimeConnectionState } from './model/realtime-connection-state.model';

/**
 * Fachada semántica sobre el transporte realtime. Las features solo
 * conocen esta clase: no `fetch`, no `AbortController`, no chunks crudos,
 * no cabecera `Authorization`, no política de reconexión.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly transport = inject<RealtimeTransport>(REALTIME_TRANSPORT);

  readonly connectionState$: Observable<RealtimeConnectionState>;

  constructor() {
    this.connectionState$ = this.transport.connectionState$;
  }

  /** Todos los eventos de negocio recibidos, sin filtrar por tipo. */
  events(): Observable<RealtimeEvent> {
    return this.transport.events$;
  }

  /** Suscripción filtrada por `type` (match exacto, sin normalizar casing). */
  listenType<T = unknown>(type: RealtimeEventType | string): Observable<RealtimeEvent<T>> {
    return this.transport.events$.pipe(
      filter((evt): evt is RealtimeEvent<T> => evt.type === type)
    );
  }

  /** Conecta al stream del grupo; repetir el mismo grupo es idempotente. */
  startForGroup(grupoId: string): void {
    this.transport.start({ grupoId });
  }

  /** Termina la conexión y cancela cualquier reintento pendiente. */
  stop(): void {
    this.transport.stop();
  }
}
