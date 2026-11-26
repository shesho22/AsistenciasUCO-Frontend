import { Injectable, inject } from '@angular/core';
import { Observable, defer, filter, merge } from 'rxjs';
import {
  REALTIME_TRANSPORT,
  REALTIME_USUARIO_TRANSPORT,
  RealtimeTransport,
} from './contract/realtime-transport';
import { RealtimeEvent } from './model/realtime-event.model';
import { RealtimeConnectionState } from './model/realtime-connection-state.model';

/** Cuántos `eventId` recientes se recuerdan para no entregar dos veces un evento que llega por ambos canales. */
const VENTANA_DUPLICADOS = 200;

/**
 * Fachada semántica sobre el transporte realtime. Las features solo
 * conocen esta clase: no `fetch`, no `AbortController`, no chunks crudos,
 * no cabecera `Authorization`, no política de reconexión.
 *
 * Hay dos canales: el del grupo abierto (`startForGroup`) y el del usuario (`startForUser`, REDIS-001 TD-084), que el
 * layout abre una vez por sesión para los contadores del menú.
 *
 * - `events()` y `listenType()` entregan solo el canal del grupo: las pantallas de un grupo no deben reaccionar a avisos
 *   de otros grupos que llegan por el canal del usuario.
 * - `allEvents()` une ambos canales y descarta el mismo evento repetido; es para vistas que no dependen de un grupo
 *   (contadores del menú, «Mis alertas»).
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly transport = inject<RealtimeTransport>(REALTIME_TRANSPORT);
  private readonly transportUsuario = inject<RealtimeTransport>(REALTIME_USUARIO_TRANSPORT);

  /** Estado del canal del grupo (el que muestran las pantallas de aula). */
  readonly connectionState$: Observable<RealtimeConnectionState>;
  /** Estado del canal del usuario; el layout lo usa para recontar el menú al reconectar y reabrir el canal caído. */
  readonly userConnectionState$: Observable<RealtimeConnectionState>;

  constructor() {
    this.connectionState$ = this.transport.connectionState$;
    this.userConnectionState$ = this.transportUsuario.connectionState$;
  }

  /** Eventos de negocio del canal del grupo abierto, sin filtrar por tipo. */
  events(): Observable<RealtimeEvent> {
    return this.transport.events$;
  }

  /** Eventos de ambos canales (grupo y usuario), sin filtrar por tipo y sin duplicados. Solo para vistas sin grupo. */
  allEvents(): Observable<RealtimeEvent> {
    return defer(() => {
      const vistos = new Set<string>();
      return merge(this.transport.events$, this.transportUsuario.events$).pipe(
        filter((evento) => {
          const id = evento?.eventId;
          if (!id) return true;
          if (vistos.has(id)) return false;
          vistos.add(id);
          if (vistos.size > VENTANA_DUPLICADOS) {
            const masAntiguo = vistos.values().next().value;
            if (masAntiguo !== undefined) vistos.delete(masAntiguo);
          }
          return true;
        })
      );
    });
  }

  /**
   * Suscripción al canal del grupo filtrada por `type` (match exacto, sin normalizar casing). Valores conocidos: ver
   * `RealtimeEventType`.
   */
  listenType<T = unknown>(type: string): Observable<RealtimeEvent<T>> {
    return this.events().pipe(
      filter((evt): evt is RealtimeEvent<T> => evt.type === type)
    );
  }

  /** Conecta al stream del grupo; repetir el mismo grupo es idempotente. */
  startForGroup(grupoId: string): void {
    this.transport.start({ grupoId });
  }

  /** Conecta al canal del usuario autenticado; repetirlo es idempotente. No afecta al canal del grupo. */
  startForUser(): void {
    this.transportUsuario.start({ canal: 'usuario' });
  }

  /** Termina la conexión del grupo y cancela cualquier reintento pendiente. El canal del usuario sigue abierto. */
  stop(): void {
    this.transport.stop();
  }

  /** Cierra el canal del usuario (al cerrar sesión o salir del layout). */
  stopUser(): void {
    this.transportUsuario.stop();
  }
}
