import { TestBed } from '@angular/core/testing';
import { FetchEventSourceInit } from '@microsoft/fetch-event-source';
import { FetchSseRealtimeTransport, SSE_STALE_TIMEOUT_MS } from './fetch-sse-realtime-transport';
import { SSE_FETCH_EVENT_SOURCE, FetchEventSourceFn } from './sse-fetch-event-source.token';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../../environments/environment';
import { RealtimeEvent } from '../../model/realtime-event.model';
import { RealtimeConnectionState } from '../../model/realtime-connection-state.model';

interface RecordedCall {
  input: RequestInfo;
  init: FetchEventSourceInit;
  resolve: () => void;
  reject: (err: unknown) => void;
}

function createFakeFetchEventSource(): { fn: FetchEventSourceFn; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const fn: FetchEventSourceFn = (input, init) => {
    return new Promise<void>((resolve, reject) => {
      calls.push({ input, init, resolve, reject });
    });
  };
  return { fn, calls };
}

function fakeResponse(status: number, contentType = ''): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(contentType ? { 'content-type': contentType } : {}),
  } as Response;
}

/** Replica cómo la librería real encadena onopen -> onerror -> reject. */
async function openWith(call: RecordedCall, response: Response): Promise<void> {
  try {
    await call.init.onopen!(response);
  } catch (err) {
    try {
      call.init.onerror?.(err);
      // Si onerror no relanza (no es nuestro caso), no rechazamos.
    } catch (rethrown) {
      call.reject(rethrown);
    }
  }
}

function flushAsync(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function validEvent(overrides: Partial<RealtimeEvent> = {}): RealtimeEvent {
  return {
    eventId: 'evt-1',
    type: 'ASISTENCIAS_SESION_ACTUALIZADAS',
    occurredAt: '2026-09-15T10:00:00Z',
    correlationId: null,
    payload: { grupo: 'g1', sesion: 's1', totalRegistros: 1 },
    ...overrides,
  };
}

describe('FetchSseRealtimeTransport', () => {
  let transport: FetchSseRealtimeTransport;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let fake: { fn: FetchEventSourceFn; calls: RecordedCall[] };

  function setup(): void {
    fake = createFakeFetchEventSource();
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'getValidAccessToken',
      'refreshAccessToken',
      'token',
    ]);
    authServiceSpy.getValidAccessToken.and.resolveTo('token-abc');
    authServiceSpy.token.and.returnValue('token-abc');
    authServiceSpy.refreshAccessToken.and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        FetchSseRealtimeTransport,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SSE_FETCH_EVENT_SOURCE, useValue: fake.fn },
      ],
    });

    transport = TestBed.inject(FetchSseRealtimeTransport);
  }

  afterEach(() => {
    transport.stop();
  });

  it('construye la URL /realtime/stream correcta', async () => {
    setup();
    transport.start({ grupoId: 'g1' });
    await flushAsync();

    expect(fake.calls.length).toBe(1);
    expect(fake.calls[0].input).toBe(
      `${environment.apiUrl}/realtime/stream?grupoId=g1`
    );
  });

  it('nunca agrega el token como query param', async () => {
    setup();
    transport.start({ grupoId: 'g1' });
    await flushAsync();

    const url = String(fake.calls[0].input);
    expect(url).not.toContain('token-abc');
    expect(url).toContain('?grupoId=g1');
  });

  it('envía el header Authorization Bearer correcto', async () => {
    setup();
    transport.start({ grupoId: 'g1' });
    await flushAsync();

    expect(fake.calls[0].init.headers?.['Authorization']).toBe('Bearer token-abc');
  });

  it('envía X-Correlation-Id y credentials: omit', async () => {
    setup();
    transport.start({ grupoId: 'g1' });
    await flushAsync();

    expect(fake.calls[0].init.headers?.['X-Correlation-Id']).toBeTruthy();
    expect(fake.calls[0].init.credentials).toBe('omit');
  });

  it('en modo mock no conecta', async () => {
    setup();
    spyOnProperty(environment, 'useMocks', 'get').and.returnValue(true);

    transport.start({ grupoId: 'g1' });
    await flushAsync();

    expect(fake.calls.length).toBe(0);
  });

  it('sin token disponible no conecta', async () => {
    setup();
    authServiceSpy.token.and.returnValue(null);
    authServiceSpy.getValidAccessToken.and.resolveTo(null);

    transport.start({ grupoId: 'g1' });
    await flushAsync();

    expect(fake.calls.length).toBe(0);
  });

  it('conexión exitosa emite el estado CONNECTED', async () => {
    setup();
    const states: RealtimeConnectionState[] = [];
    transport.connectionState$.subscribe((s) => states.push(s));

    transport.start({ grupoId: 'g1' });
    await flushAsync();
    await openWith(fake.calls[0], fakeResponse(200, 'text/event-stream'));
    await flushAsync();

    expect(states).toContain('CONNECTED');
  });

  it('un evento válido se emite en events$', async () => {
    setup();
    const received: RealtimeEvent[] = [];
    transport.events$.subscribe((evt) => received.push(evt));

    transport.start({ grupoId: 'g1' });
    await flushAsync();
    const call = fake.calls[0];
    await openWith(call, fakeResponse(200, 'text/event-stream'));

    const evt = validEvent();
    call.init.onmessage?.({
      id: evt.eventId,
      event: evt.type,
      data: JSON.stringify(evt),
    });

    expect(received.length).toBe(1);
    expect(received[0]).toEqual(evt);
  });

  it('un payload inválido se descarta sin romper el stream', async () => {
    setup();
    const received: RealtimeEvent[] = [];
    transport.events$.subscribe((evt) => received.push(evt));
    spyOn(console, 'warn');

    transport.start({ grupoId: 'g1' });
    await flushAsync();
    const call = fake.calls[0];
    await openWith(call, fakeResponse(200, 'text/event-stream'));

    call.init.onmessage?.({ id: '1', event: 'ASISTENCIAS_SESION_ACTUALIZADAS', data: 'not-json{{' });
    call.init.onmessage?.({ id: '2', event: 'ASISTENCIAS_SESION_ACTUALIZADAS', data: JSON.stringify({ foo: 'bar' }) });

    expect(received.length).toBe(0);
    expect(console.warn).toHaveBeenCalled();
  });

  it('un mensaje sin campo data (heartbeat) no se convierte en evento', async () => {
    setup();
    const received: RealtimeEvent[] = [];
    transport.events$.subscribe((evt) => received.push(evt));

    transport.start({ grupoId: 'g1' });
    await flushAsync();
    const call = fake.calls[0];
    await openWith(call, fakeResponse(200, 'text/event-stream'));

    call.init.onmessage?.({ id: '', event: '', data: '' });

    expect(received.length).toBe(0);
  });

  it('event SSE y data.type inconsistentes se descartan', async () => {
    setup();
    const received: RealtimeEvent[] = [];
    transport.events$.subscribe((evt) => received.push(evt));
    spyOn(console, 'warn');

    transport.start({ grupoId: 'g1' });
    await flushAsync();
    const call = fake.calls[0];
    await openWith(call, fakeResponse(200, 'text/event-stream'));

    const evt = validEvent();
    call.init.onmessage?.({
      id: evt.eventId,
      event: 'OTRO_TIPO',
      data: JSON.stringify(evt),
    });

    expect(received.length).toBe(0);
    expect(console.warn).toHaveBeenCalled();
  });

  it('stop() aborta el transporte', async () => {
    setup();
    transport.start({ grupoId: 'g1' });
    await flushAsync();
    const call = fake.calls[0];

    transport.stop();

    expect(call.init.signal?.aborted).toBeTrue();
  });

  it('stop() no deja temporizadores de reconexión pendientes', async () => {
    setup();
    transport.start({ grupoId: 'g1' });
    await flushAsync();
    const call = fake.calls[0];

    transport.stop();
    call.reject(new TypeError('network error'));
    await flushAsync();

    const callsAfterStop = fake.calls.length;
    // Si quedara un timer de reconexión vivo, dispararía una nueva llamada.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fake.calls.length).toBe(callsAfterStop);
  });

  it('un fallo de red pasa a RECONNECTING', async () => {
    setup();
    const states: RealtimeConnectionState[] = [];
    transport.connectionState$.subscribe((s) => states.push(s));

    transport.start({ grupoId: 'g1' });
    await flushAsync();
    fake.calls[0].reject(new TypeError('network error'));
    await flushAsync();

    expect(states).toContain('RECONNECTING');
  });

  it('401 intenta refrescar el token una vez y reconecta', async () => {
    setup();
    authServiceSpy.getValidAccessToken.and.resolveTo('token-old');
    authServiceSpy.refreshAccessToken.and.callFake(async () => {
      authServiceSpy.getValidAccessToken.and.resolveTo('token-new');
      return true;
    });

    transport.start({ grupoId: 'g1' });
    await flushAsync();
    await openWith(fake.calls[0], fakeResponse(401));
    await flushAsync();
    await flushAsync();

    expect(authServiceSpy.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fake.calls.length).toBe(2);
    expect(fake.calls[1].init.headers?.['Authorization']).toBe('Bearer token-new');
  });

  it('401 con refresh fallido termina en UNAUTHORIZED sin loop infinito', async () => {
    setup();
    authServiceSpy.refreshAccessToken.and.resolveTo(false);
    const states: RealtimeConnectionState[] = [];
    transport.connectionState$.subscribe((s) => states.push(s));

    transport.start({ grupoId: 'g1' });
    await flushAsync();
    await openWith(fake.calls[0], fakeResponse(401));
    await flushAsync();
    await flushAsync();

    expect(states).toContain('UNAUTHORIZED');
    expect(authServiceSpy.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fake.calls.length).toBe(1);
  });

  it('403 es un error terminal, sin reintentos', async () => {
    setup();
    const states: RealtimeConnectionState[] = [];
    transport.connectionState$.subscribe((s) => states.push(s));

    transport.start({ grupoId: 'g1' });
    await flushAsync();
    await openWith(fake.calls[0], fakeResponse(403));
    await flushAsync();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(states).toContain('ERROR');
    expect(fake.calls.length).toBe(1);
  });

  it('start() es idempotente: no abre dos streams simultáneos', async () => {
    setup();
    transport.start({ grupoId: 'g1' });
    transport.start({ grupoId: 'g1' });
    await flushAsync();

    expect(fake.calls.length).toBe(1);
  });

  it('cambiar de grupo aborta el stream anterior y abre el nuevo scope', async () => {
    setup();
    transport.start({ grupoId: 'g1' });
    await flushAsync();
    const previousCall = fake.calls[0];

    transport.start({ grupoId: 'g2' });
    await flushAsync();

    expect(previousCall.init.signal?.aborted).toBeTrue();
    expect(fake.calls.length).toBe(2);
    expect(fake.calls[1].input).toBe(
      `${environment.apiUrl}/realtime/stream?grupoId=g2`
    );
  });

  it('el loop abortado de otro grupo no vuelve a reconectar', async () => {
    setup();
    transport.start({ grupoId: 'g1' });
    await flushAsync();
    const previousCall = fake.calls[0];

    transport.start({ grupoId: 'g2' });
    await flushAsync();
    previousCall.resolve();
    await flushAsync();

    expect(fake.calls.length).toBe(2);
  });

  describe('reconexión offline → online (LB-001B.5)', () => {
    async function connect(call: RecordedCall): Promise<void> {
      await openWith(call, fakeResponse(200, 'text/event-stream'));
      await flushAsync();
    }

    it('CONNECTED → pérdida de red → RECONNECTING → online → CONNECTED sin intervención', async () => {
      setup();
      const states: RealtimeConnectionState[] = [];
      transport.connectionState$.subscribe((s) => states.push(s));

      transport.start({ grupoId: 'g1' });
      await flushAsync();
      await connect(fake.calls[0]);
      expect(states[states.length - 1]).toBe('CONNECTED');

      window.dispatchEvent(new Event('offline'));
      await flushAsync();
      expect(fake.calls[0].init.signal?.aborted).toBeTrue();
      expect(states[states.length - 1]).toBe('RECONNECTING');
      const callsWhileOffline = fake.calls.length;
      fake.calls[0].resolve();
      await new Promise((r) => setTimeout(r, 30));
      expect(fake.calls.length).toBe(callsWhileOffline);

      window.dispatchEvent(new Event('online'));
      await flushAsync();
      await flushAsync();
      expect(fake.calls.length).toBe(callsWhileOffline + 1);

      await connect(fake.calls[fake.calls.length - 1]);
      expect(states[states.length - 1]).toBe('CONNECTED');
    });

    it('tras reconectar, los eventos vuelven a fluir (no requiere que otro usuario guarde)', async () => {
      setup();
      const events: RealtimeEvent[] = [];
      transport.events$.subscribe((e) => events.push(e));

      transport.start({ grupoId: 'g1' });
      await flushAsync();
      await connect(fake.calls[0]);
      window.dispatchEvent(new Event('offline'));
      fake.calls[0].resolve();
      await flushAsync();
      window.dispatchEvent(new Event('online'));
      await flushAsync();
      await flushAsync();
      const reopened = fake.calls[fake.calls.length - 1];
      await connect(reopened);

      reopened.init.onmessage!({
        id: 'evt-1',
        event: 'ASISTENCIAS_SESION_ACTUALIZADAS',
        data: JSON.stringify(validEvent()),
        retry: undefined,
      } as any);

      expect(events.length).toBe(1);
    });

    it('fallo de red mientras se pide el token (refresh sin red) no mata el loop', async () => {
      setup();
      authServiceSpy.token.and.returnValue('stale-token');
      authServiceSpy.getValidAccessToken.and.resolveTo(null);
      const states: RealtimeConnectionState[] = [];
      transport.connectionState$.subscribe((s) => states.push(s));

      transport.start({ grupoId: 'g1' });
      await flushAsync();
      expect(fake.calls.length).toBe(0);
      expect(states[states.length - 1]).toBe('RECONNECTING');

      authServiceSpy.getValidAccessToken.and.resolveTo('fresh-token');
      window.dispatchEvent(new Event('online'));
      await flushAsync();
      await flushAsync();

      expect(fake.calls.length).toBe(1);
      expect(fake.calls[0].init.headers?.['Authorization']).toBe('Bearer fresh-token');
    });

    it('getValidAccessToken que lanza tampoco mata el loop', async () => {
      setup();
      authServiceSpy.getValidAccessToken.and.rejectWith(new TypeError('Failed to fetch'));
      const states: RealtimeConnectionState[] = [];
      transport.connectionState$.subscribe((s) => states.push(s));

      transport.start({ grupoId: 'g1' });
      await flushAsync();
      expect(states[states.length - 1]).toBe('RECONNECTING');

      authServiceSpy.getValidAccessToken.and.resolveTo('token-abc');
      window.dispatchEvent(new Event('online'));
      await flushAsync();
      await flushAsync();
      expect(fake.calls.length).toBe(1);
    });

    it('sin sesión (token null) termina en DISCONNECTED sin reintentar', async () => {
      setup();
      authServiceSpy.token.and.returnValue(null);
      authServiceSpy.getValidAccessToken.and.resolveTo(null);
      const states: RealtimeConnectionState[] = [];
      transport.connectionState$.subscribe((s) => states.push(s));

      transport.start({ grupoId: 'g1' });
      await flushAsync();
      window.dispatchEvent(new Event('online'));
      await flushAsync();

      expect(states[states.length - 1]).toBe('DISCONNECTED');
      expect(fake.calls.length).toBe(0);
    });

    it('un fallo de red con navegador online reintenta con backoff y se puede despertar', async () => {
      setup();
      transport.start({ grupoId: 'g1' });
      await flushAsync();
      fake.calls[0].reject(new TypeError('network error'));
      await flushAsync();
      expect(fake.calls.length).toBe(1);

      window.dispatchEvent(new Event('online'));
      await flushAsync();
      await flushAsync();
      expect(fake.calls.length).toBe(2);
    });

    it('stop() desregistra los listeners online/offline y no reabre', async () => {
      setup();
      transport.start({ grupoId: 'g1' });
      await flushAsync();
      transport.stop();
      window.dispatchEvent(new Event('online'));
      await flushAsync();
      expect(fake.calls.length).toBe(1);
    });

    it('403 sigue siendo terminal aunque vuelva la red', async () => {
      setup();
      transport.start({ grupoId: 'g1' });
      await flushAsync();
      await openWith(fake.calls[0], fakeResponse(403));
      await flushAsync();
      window.dispatchEvent(new Event('online'));
      await flushAsync();
      expect(fake.calls.length).toBe(1);
    });
  });

  describe('semántica de reconexión (MV001-R01)', () => {
    async function connect(call: RecordedCall): Promise<void> {
      await openWith(call, fakeResponse(200, 'text/event-stream'));
      await flushAsync();
    }

    function statesAfterFirstConnected(states: RealtimeConnectionState[]): RealtimeConnectionState[] {
      return states.slice(states.indexOf('CONNECTED') + 1);
    }

    /** Conecta, pierde la red (la librería resuelve el fetch abortado) y la recupera. */
    async function connectThenOfflineThenOnline(): Promise<void> {
      transport.start({ grupoId: 'g1' });
      await flushAsync();
      await connect(fake.calls[0]);
      window.dispatchEvent(new Event('offline'));
      fake.calls[0].resolve();
      await flushAsync();
      window.dispatchEvent(new Event('online'));
      await flushAsync();
      await flushAsync();
    }

    it('E. offline → online reconecta como RECONNECTING, sin CONNECTING ni DISCONNECTED intermedios', async () => {
      setup();
      const states: RealtimeConnectionState[] = [];
      transport.connectionState$.subscribe((s) => states.push(s));

      await connectThenOfflineThenOnline();
      await connect(fake.calls[fake.calls.length - 1]);

      const afterFirstConnected = statesAfterFirstConnected(states);
      expect(afterFirstConnected).not.toContain('CONNECTING');
      expect(afterFirstConnected).not.toContain('DISCONNECTED');
      expect(afterFirstConnected[afterFirstConnected.length - 2]).toBe('RECONNECTING');
      expect(afterFirstConnected[afterFirstConnected.length - 1]).toBe('CONNECTED');
    });

    it('con el reintento tras online en vuelo, el estado sigue siendo RECONNECTING', async () => {
      setup();
      const states: RealtimeConnectionState[] = [];
      transport.connectionState$.subscribe((s) => states.push(s));

      await connectThenOfflineThenOnline();

      expect(fake.calls.length).toBe(2);
      expect(states[states.length - 1]).toBe('RECONNECTING');
    });

    it('un 401 durante el reintento de una reconexión conserva RECONNECTING', async () => {
      setup();
      const states: RealtimeConnectionState[] = [];
      transport.connectionState$.subscribe((s) => states.push(s));

      await connectThenOfflineThenOnline();
      await openWith(fake.calls[1], fakeResponse(401));
      await flushAsync();
      await flushAsync();

      expect(fake.calls.length).toBe(3);
      expect(statesAfterFirstConnected(states)).not.toContain('CONNECTING');
    });

    it('online reinicia el backoff sin marcar la reconexión como conexión inicial', async () => {
      setup();
      const states: RealtimeConnectionState[] = [];
      transport.connectionState$.subscribe((s) => states.push(s));

      await connectThenOfflineThenOnline();
      // El intento reabierto falla otra vez: sigue siendo una reconexión.
      fake.calls[1].reject(new TypeError('network error'));
      await flushAsync();

      expect(statesAfterFirstConnected(states)).not.toContain('CONNECTING');
      expect(states[states.length - 1]).toBe('RECONNECTING');
    });

    it('un fallo de red posterior a una reconexión exitosa vuelve a ser RECONNECTING', async () => {
      setup();
      const states: RealtimeConnectionState[] = [];
      transport.connectionState$.subscribe((s) => states.push(s));

      await connectThenOfflineThenOnline();
      await connect(fake.calls[1]);
      fake.calls[1].reject(new TypeError('network error'));
      await flushAsync();

      expect(states[states.length - 1]).toBe('RECONNECTING');
    });

    it('tras stop() y start() la conexión vuelve a ser inicial (CONNECTING, no RECONNECTING)', async () => {
      setup();
      const states: RealtimeConnectionState[] = [];
      transport.connectionState$.subscribe((s) => states.push(s));

      transport.start({ grupoId: 'g1' });
      await flushAsync();
      await connect(fake.calls[0]);
      window.dispatchEvent(new Event('offline'));
      await flushAsync();
      expect(states[states.length - 1]).toBe('RECONNECTING');

      transport.stop();
      expect(states[states.length - 1]).toBe('DISCONNECTED');
      transport.start({ grupoId: 'g1' });
      await flushAsync();

      expect(states[states.length - 1]).toBe('CONNECTING');
    });

    it('un fallo inicial de red seguido de éxito no vuelve a emitir CONNECTING', async () => {
      setup();
      const states: RealtimeConnectionState[] = [];
      transport.connectionState$.subscribe((s) => states.push(s));

      transport.start({ grupoId: 'g1' });
      await flushAsync();
      fake.calls[0].reject(new TypeError('network error'));
      await flushAsync();
      window.dispatchEvent(new Event('online'));
      await flushAsync();
      await flushAsync();
      await connect(fake.calls[1]);

      expect(states.filter((s) => s === 'CONNECTING').length).toBe(1);
      expect(states[states.length - 1]).toBe('CONNECTED');
    });

    it('la conexión inicial emite CONNECTING y luego CONNECTED (sin RECONNECTING)', async () => {
      setup();
      const states: RealtimeConnectionState[] = [];
      transport.connectionState$.subscribe((s) => states.push(s));

      transport.start({ grupoId: 'g1' });
      await flushAsync();
      await connect(fake.calls[0]);

      expect(states).toEqual(['DISCONNECTED', 'CONNECTING', 'CONNECTED']);
    });
  });

  describe('recuperación de stream zombie (MV001-R02)', () => {
    async function connect(call: RecordedCall): Promise<void> {
      await openWith(call, fakeResponse(200, 'text/event-stream'));
      await flushAsync();
    }

    async function micro(): Promise<void> {
      for (let i = 0; i < 10; i++) {
        await Promise.resolve();
      }
    }

    async function connectMicro(call: RecordedCall): Promise<void> {
      await openWith(call, fakeResponse(200, 'text/event-stream'));
      await micro();
    }

    const heartbeat = { id: '', event: '', data: '' };

    it('A. online con el stream anterior aún bloqueado fuerza una nueva conexión', async () => {
      setup();
      const states: RealtimeConnectionState[] = [];
      transport.connectionState$.subscribe((s) => states.push(s));

      transport.start({ grupoId: 'g1' });
      await flushAsync();
      await connect(fake.calls[0]);

      // El fetch anterior NUNCA resuelve ni rechaza (stream zombie).
      window.dispatchEvent(new Event('online'));
      await flushAsync();
      await flushAsync();

      expect(fake.calls[0].init.signal?.aborted).toBeTrue();
      expect(fake.calls.length).toBe(2);
      expect(fake.calls[1].init.signal?.aborted).toBeFalse();
      expect(states[states.length - 1]).toBe('RECONNECTING');

      await connect(fake.calls[1]);
      expect(states[states.length - 1]).toBe('CONNECTED');
    });

    it('online sin stream en curso no abre nada', async () => {
      setup();
      window.dispatchEvent(new Event('online'));
      await flushAsync();
      expect(fake.calls.length).toBe(0);
    });

    describe('watchdog', () => {
      beforeEach(() => {
        setup();
        jasmine.clock().install();
      });
      afterEach(() => {
        transport.stop();
        jasmine.clock().uninstall();
      });

      async function startConnected(): Promise<void> {
        transport.start({ grupoId: 'g1' });
        await micro();
        await connectMicro(fake.calls[0]);
      }

      it('B. sin heartbeat ni eventos el stream se marca stale y se reabre', async () => {
        const states: RealtimeConnectionState[] = [];
        transport.connectionState$.subscribe((s) => states.push(s));
        await startConnected();

        jasmine.clock().tick(SSE_STALE_TIMEOUT_MS + 1);
        await micro();

        expect(fake.calls[0].init.signal?.aborted).toBeTrue();
        expect(fake.calls.length).toBe(2);
        expect(states.slice(-1)[0]).toBe('RECONNECTING');

        await connectMicro(fake.calls[1]);
        expect(states.slice(-2)).toEqual(['RECONNECTING', 'CONNECTED']);
      });

      it('no dispara antes del timeout', async () => {
        await startConnected();
        jasmine.clock().tick(SSE_STALE_TIMEOUT_MS - 1000);
        await micro();
        expect(fake.calls.length).toBe(1);
      });

      it('C. el heartbeat rearma el watchdog y no llega a events$', async () => {
        const events: RealtimeEvent[] = [];
        transport.events$.subscribe((e) => events.push(e));
        await startConnected();

        jasmine.clock().tick(SSE_STALE_TIMEOUT_MS - 5000);
        fake.calls[0].init.onmessage!(heartbeat);
        jasmine.clock().tick(SSE_STALE_TIMEOUT_MS - 5000);
        await micro();
        expect(fake.calls.length).toBe(1);

        jasmine.clock().tick(6000);
        await micro();
        expect(fake.calls.length).toBe(2);
        expect(events.length).toBe(0);
      });

      it('D. un evento de negocio llega a events$ y también rearma el watchdog', async () => {
        const events: RealtimeEvent[] = [];
        transport.events$.subscribe((e) => events.push(e));
        await startConnected();

        jasmine.clock().tick(SSE_STALE_TIMEOUT_MS - 5000);
        const evt = validEvent();
        fake.calls[0].init.onmessage!({
          id: evt.eventId,
          event: evt.type,
          data: JSON.stringify(evt),
        });
        jasmine.clock().tick(SSE_STALE_TIMEOUT_MS - 5000);
        await micro();

        expect(events.length).toBe(1);
        expect(fake.calls.length).toBe(1);
      });

      it('E. la generation 1 que resuelve tarde no crea otra conexión ni altera la generation 2', async () => {
        const states: RealtimeConnectionState[] = [];
        const events: RealtimeEvent[] = [];
        transport.connectionState$.subscribe((s) => states.push(s));
        transport.events$.subscribe((e) => events.push(e));
        await startConnected();

        jasmine.clock().tick(SSE_STALE_TIMEOUT_MS + 1);
        await micro();
        await connectMicro(fake.calls[1]);
        expect(states.slice(-1)[0]).toBe('CONNECTED');
        const statesBefore = states.length;

        // La generation 1 reacciona tarde: mensaje, apertura y cierre.
        const evt = validEvent();
        fake.calls[0].init.onmessage!({ id: '1', event: evt.type, data: JSON.stringify(evt) });
        await openWith(fake.calls[0], fakeResponse(200, 'text/event-stream'));
        fake.calls[0].resolve();
        await micro();
        jasmine.clock().tick(1000);
        await micro();

        expect(fake.calls.length).toBe(2);
        expect(events.length).toBe(0);
        expect(states.length).toBe(statesBefore);
      });

      it('F. dos eventos online seguidos no abren más de un stream', async () => {
        await startConnected();

        window.dispatchEvent(new Event('online'));
        window.dispatchEvent(new Event('online'));
        await micro();
        await micro();

        expect(fake.calls.length).toBe(2);
        expect(fake.calls[1].init.signal?.aborted).toBeFalse();
      });

      it('stop() limpia el watchdog: no reabre tras el timeout', async () => {
        await startConnected();
        transport.stop();
        jasmine.clock().tick(SSE_STALE_TIMEOUT_MS * 2);
        await micro();
        expect(fake.calls.length).toBe(1);
      });

      it('offline limpia el watchdog: no fuerza reconexión sin red', async () => {
        await startConnected();
        window.dispatchEvent(new Event('offline'));
        jasmine.clock().tick(SSE_STALE_TIMEOUT_MS * 2);
        await micro();
        expect(fake.calls.length).toBe(1);
      });
    });
  });
});
