import { Observable } from 'rxjs';
import { filter, map, pairwise } from 'rxjs/operators';
import { RealtimeConnectionState } from './model/realtime-connection-state.model';

/**
 * Emite una notificación cuando la conexión SSE se recupera tras una caída
 * (transiciones desde RECONNECTING o ERROR hacia CONNECTED).
 * Ignora la primera conexión normal (CONNECTING -> CONNECTED).
 * §4.1, §4.8, N-2, O-5.
 */
export function onRealtimeReconnect(
  connectionState$: Observable<RealtimeConnectionState>
): Observable<void> {
  return connectionState$.pipe(
    pairwise(),
    filter(
      ([prev, curr]) =>
        curr === 'CONNECTED' && (prev === 'RECONNECTING' || prev === 'ERROR')
    ),
    map(() => void 0)
  );
}
