import { TestBed } from '@angular/core/testing';
import { FetchEventSourceInit } from '@microsoft/fetch-event-source';
import { AttendanceRealtimeSyncService } from './attendance-realtime-sync.service';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { REALTIME_TRANSPORT } from '../../../core/realtime/contract/realtime-transport';
import { FetchSseRealtimeTransport } from '../../../core/realtime/adapter/sse/fetch-sse-realtime-transport';
import { SSE_FETCH_EVENT_SOURCE } from '../../../core/realtime/adapter/sse/sse-fetch-event-source.token';
import { AuthService } from '../../../core/services/auth.service';

interface Call {
  init: FetchEventSourceInit;
}

/**
 * Cubre la brecha de los unit tests: transporte real → RealtimeService →
 * AttendanceRealtimeSyncService, sin mockear connectionState$.
 */
describe('Recuperación realtime integrada (MV001-R02)', () => {
  const calls: Call[] = [];
  let transport: FetchSseRealtimeTransport;
  let sync: AttendanceRealtimeSyncService;

  const flush = () => new Promise<void>((r) => setTimeout(r, 0));

  async function open(call: Call): Promise<void> {
    await call.init.onopen!({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/event-stream' }),
    } as Response);
    await flush();
  }

  beforeEach(() => {
    calls.length = 0;
    const auth = jasmine.createSpyObj<AuthService>('AuthService', [
      'getValidAccessToken',
      'refreshAccessToken',
      'token',
    ]);
    auth.getValidAccessToken.and.resolveTo('tok');
    auth.token.and.returnValue('tok');

    TestBed.configureTestingModule({
      providers: [
        FetchSseRealtimeTransport,
        { provide: AuthService, useValue: auth },
        { provide: REALTIME_TRANSPORT, useExisting: FetchSseRealtimeTransport },
        {
          provide: SSE_FETCH_EVENT_SOURCE,
          // El fetch anterior nunca termina: stream zombie.
          useValue: (_: RequestInfo, init: FetchEventSourceInit) => {
            calls.push({ init });
            return new Promise<void>(() => undefined);
          },
        },
      ],
    });
    transport = TestBed.inject(FetchSseRealtimeTransport);
    sync = TestBed.inject(AttendanceRealtimeSyncService);
    expect(TestBed.inject(RealtimeService)).toBeTruthy();
  });

  afterEach(() => transport.stop());

  it('conexión inicial no refresca; recuperación forzada emite exactamente un refresh', async () => {
    let refreshes = 0;
    const sub = sync.watch(() => 'g1', () => 's1').subscribe(() => refreshes++);

    sync.connectGroup('g1');
    await flush();
    await open(calls[0]);
    expect(refreshes).toBe(0);

    window.dispatchEvent(new Event('online'));
    await flush();
    await flush();
    expect(calls).toHaveSize(2);
    expect(calls[0].init.signal?.aborted).toBeTrue();
    expect(refreshes).toBe(0);

    await open(calls[1]);
    expect(refreshes).toBe(1);

    // Heartbeat en el stream nuevo: no es evento ni refresh.
    calls[1].init.onmessage!({ id: '', event: '', data: '' });
    await flush();
    expect(refreshes).toBe(1);
    sub.unsubscribe();
  });
});
