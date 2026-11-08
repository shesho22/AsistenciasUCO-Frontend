import { Subject } from 'rxjs';
import { RealtimeConnectionState } from './model/realtime-connection-state.model';
import { onRealtimeReconnect } from './realtime-reconnect-trigger';

describe('onRealtimeReconnect (CULM-001 C.1 §4.1, §4.8, N-2)', () => {
  let states$: Subject<RealtimeConnectionState>;

  beforeEach(() => {
    states$ = new Subject<RealtimeConnectionState>();
  });

  it('C-F-12 ignora la transición inicial CONNECTING -> CONNECTED (no es reconexión)', () => {
    const emitted: void[] = [];
    onRealtimeReconnect(states$).subscribe((v) => emitted.push(v));

    states$.next('CONNECTING');
    states$.next('CONNECTED');

    expect(emitted.length).toBe(0);
  });

  it('C-F-13 emite cuando CONNECTED sigue a RECONNECTING', () => {
    const emitted: void[] = [];
    onRealtimeReconnect(states$).subscribe((v) => emitted.push(v));

    states$.next('CONNECTING');
    states$.next('CONNECTED');
    states$.next('RECONNECTING');
    states$.next('CONNECTED');

    expect(emitted.length).toBe(1);
  });

  it('C-F-14 emite cuando CONNECTED sigue a ERROR', () => {
    const emitted: void[] = [];
    onRealtimeReconnect(states$).subscribe((v) => emitted.push(v));

    states$.next('CONNECTING');
    states$.next('ERROR');
    states$.next('CONNECTED');

    expect(emitted.length).toBe(1);
  });

  it('C-F-15 no emite durante transiciones a desconectado o reconectando', () => {
    const emitted: void[] = [];
    onRealtimeReconnect(states$).subscribe((v) => emitted.push(v));

    states$.next('CONNECTED');
    states$.next('RECONNECTING');
    states$.next('DISCONNECTED');
    states$.next('CONNECTING');

    expect(emitted.length).toBe(0);
  });
});
