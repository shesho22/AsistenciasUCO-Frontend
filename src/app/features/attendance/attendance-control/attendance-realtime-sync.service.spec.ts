import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AttendanceRealtimeSyncService } from './attendance-realtime-sync.service';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import {
  AttendanceSessionUpdatedRealtimePayload,
  RealtimeEvent,
} from '../../../core/realtime/model/realtime-event.model';
import { RealtimeConnectionState } from '../../../core/realtime/model/realtime-connection-state.model';

describe('AttendanceRealtimeSyncService', () => {
  let service: AttendanceRealtimeSyncService;
  let events$: Subject<RealtimeEvent<AttendanceSessionUpdatedRealtimePayload>>;
  let connectionState$: Subject<RealtimeConnectionState>;
  let realtimeServiceSpy: jasmine.SpyObj<RealtimeService>;

  beforeEach(() => {
    events$ = new Subject<RealtimeEvent<AttendanceSessionUpdatedRealtimePayload>>();
    connectionState$ = new Subject<RealtimeConnectionState>();
    realtimeServiceSpy = jasmine.createSpyObj<RealtimeService>(
      'RealtimeService',
      ['listenType', 'startForGroup', 'stop'],
      { connectionState$: connectionState$.asObservable() }
    );
    realtimeServiceSpy.listenType.and.returnValue(events$.asObservable());

    TestBed.configureTestingModule({
      providers: [{ provide: RealtimeService, useValue: realtimeServiceSpy }],
    });

    service = TestBed.inject(AttendanceRealtimeSyncService);
  });

  function emit(grupo: string, sesion: string): void {
    events$.next({
      eventId: 'evt-' + Math.random(),
      type: 'ASISTENCIAS_SESION_ACTUALIZADAS',
      occurredAt: '2026-09-15T10:00:00Z',
      correlationId: null,
      payload: { grupo, sesion, totalRegistros: 1 },
    });
  }

  it('escucha ASISTENCIAS_SESION_ACTUALIZADAS en el RealtimeService', () => {
    service.watch(() => 'g1', () => 's1').subscribe();
    expect(realtimeServiceSpy.listenType).toHaveBeenCalledWith(
      'ASISTENCIAS_SESION_ACTUALIZADAS'
    );
  });

  it('conecta y desconecta el scope mediante RealtimeService', () => {
    service.connectGroup('g1');
    service.disconnect();

    expect(realtimeServiceSpy.startForGroup).toHaveBeenCalledOnceWith('g1');
    expect(realtimeServiceSpy.stop).toHaveBeenCalledTimes(1);
  });

  it('emite cuando el evento coincide con el mismo grupo y la misma sesión', fakeAsync(() => {
    const received: unknown[] = [];
    service.watch(() => 'g1', () => 's1').subscribe((evt) => received.push(evt));

    emit('g1', 's1');
    tick(300);

    expect(received.length).toBe(1);
  }));

  it('no emite si el evento pertenece a la misma sesión pero otro grupo', fakeAsync(() => {
    const received: unknown[] = [];
    service.watch(() => 'g1', () => 's1').subscribe((evt) => received.push(evt));

    emit('g2', 's1');
    tick(300);

    expect(received.length).toBe(0);
  }));

  it('no emite si el evento pertenece al mismo grupo pero otra sesión', fakeAsync(() => {
    const received: unknown[] = [];
    service.watch(() => 'g1', () => 's1').subscribe((evt) => received.push(evt));

    emit('g1', 's2');
    tick(300);

    expect(received.length).toBe(0);
  }));

  it('coalesce varios eventos consecutivos del mismo grupo/sesión en una sola emisión', fakeAsync(() => {
    const received: unknown[] = [];
    service.watch(() => 'g1', () => 's1').subscribe((evt) => received.push(evt));

    emit('g1', 's1');
    emit('g1', 's1');
    emit('g1', 's1');
    tick(300);

    expect(received.length).toBe(1);
  }));

  it('no emite si no hay grupo o sesión seleccionados', fakeAsync(() => {
    const received: unknown[] = [];
    service.watch(() => '', () => '').subscribe((evt) => received.push(evt));

    emit('g1', 's1');
    tick(300);

    expect(received.length).toBe(0);
  }));

  it('RECONNECTING -> CONNECTED genera un refresh', () => {
    const received: unknown[] = [];
    service.watch(() => 'g1', () => 's1').subscribe((value) => received.push(value));

    connectionState$.next('CONNECTED');
    connectionState$.next('RECONNECTING');
    connectionState$.next('CONNECTED');

    expect(received.length).toBe(1);
  });

  it('CONNECTING -> CONNECTED inicial no genera refresh', () => {
    const received: unknown[] = [];
    service.watch(() => 'g1', () => 's1').subscribe((value) => received.push(value));

    connectionState$.next('CONNECTING');
    connectionState$.next('CONNECTED');

    expect(received.length).toBe(0);
  });

  describe('recuperación tras reconexión (MV001-R01)', () => {
    function emitStates(...states: RealtimeConnectionState[]): void {
      states.forEach((state) => connectionState$.next(state));
    }

    function collect(): unknown[] {
      const received: unknown[] = [];
      service.watch(() => 'g1', () => 's1').subscribe((value) => received.push(value));
      return received;
    }

    it('A. CONNECTED -> RECONNECTING -> CONNECTING -> CONNECTED produce 1 refresh', () => {
      const received = collect();

      emitStates('CONNECTED', 'RECONNECTING', 'CONNECTING', 'CONNECTED');

      expect(received.length).toBe(1);
    });

    it('B. RECONNECTING -> CONNECTING -> RECONNECTING -> CONNECTING -> CONNECTED produce 1 refresh', () => {
      const received = collect();

      emitStates(
        'CONNECTED',
        'RECONNECTING',
        'CONNECTING',
        'RECONNECTING',
        'CONNECTING',
        'CONNECTED'
      );

      expect(received.length).toBe(1);
    });

    it('C. DISCONNECTED -> CONNECTING -> CONNECTED (conexión inicial) produce 0 refresh', () => {
      const received = collect();

      emitStates('DISCONNECTED', 'CONNECTING', 'CONNECTED');

      expect(received.length).toBe(0);
    });

    it('D. tras el refresh de reconexión, un evento de negocio sigue refrescando', fakeAsync(() => {
      const received = collect();

      emitStates('CONNECTED', 'RECONNECTING', 'CONNECTING', 'CONNECTED');
      expect(received.length).toBe(1);

      emit('g1', 's1');
      tick(300);

      expect(received.length).toBe(2);
    }));

    it('no duplica el refresh si CONNECTED se repite dentro de la misma reconexión', () => {
      const received = collect();

      emitStates('CONNECTED', 'RECONNECTING', 'CONNECTING', 'CONNECTED', 'CONNECTED');

      expect(received.length).toBe(1);
    });

    it('cada reconexión distinta produce exactamente un refresh', () => {
      const received = collect();

      emitStates('CONNECTED', 'RECONNECTING', 'CONNECTING', 'CONNECTED');
      emitStates('RECONNECTING', 'RECONNECTING', 'CONNECTED');

      expect(received.length).toBe(2);
    });

    it('la conexión inicial no refresca aunque haya varios CONNECTING previos', () => {
      const received = collect();

      emitStates('CONNECTING', 'CONNECTING', 'CONNECTED');

      expect(received.length).toBe(0);
    });

    it('el refresh de reconexión emite aunque no haya grupo ni sesión seleccionados aún', () => {
      // El filtro grupo/sesión aplica solo a eventos de negocio; el consumidor
      // ya ignora la emisión si no hay curso/sesión visibles.
      const received: unknown[] = [];
      service.watch(() => '', () => '').subscribe((value) => received.push(value));

      emitStates('RECONNECTING', 'CONNECTING', 'CONNECTED');

      expect(received.length).toBe(1);
    });
  });

  it('expone UNAUTHORIZED y ERROR una sola vez por estado terminal', () => {
    const received: RealtimeConnectionState[] = [];
    (service as any)
      .connectionAlerts()
      .subscribe((state: RealtimeConnectionState) => received.push(state));

    connectionState$.next('ERROR');
    connectionState$.next('ERROR');
    connectionState$.next('RECONNECTING');
    connectionState$.next('ERROR');
    connectionState$.next('UNAUTHORIZED');
    connectionState$.next('UNAUTHORIZED');

    expect(received).toEqual(['ERROR', 'UNAUTHORIZED']);
  });

  it('no convierte estados normales de conexión o reconexión en alertas', () => {
    const received: RealtimeConnectionState[] = [];
    (service as any)
      .connectionAlerts()
      .subscribe((state: RealtimeConnectionState) => received.push(state));

    connectionState$.next('CONNECTING');
    connectionState$.next('CONNECTED');
    connectionState$.next('RECONNECTING');
    connectionState$.next('DISCONNECTED');

    expect(received).toEqual([]);
  });

  describe('watchCancelaciones (HU047, CULM-001 B.1)', () => {
    function emitCancelada(grupo: string, sesion: string): void {
      (events$ as unknown as Subject<RealtimeEvent<unknown>>).next({
        eventId: 'evt-c', type: 'SESION_CANCELADA', occurredAt: '2026-11-10T14:00:00Z', correlationId: null,
        payload: { grupo, sesion, tipo: 'DOCENTE', fechaHoraInicioUtc: '2026-11-10T13:00:00Z' },
      });
    }

    it('B1-F-19 escucha SESION_CANCELADA y entrega solo los eventos del grupo actual', () => {
      const recibidos: unknown[] = [];
      service.watchCancelaciones(() => 'g1').subscribe((e) => recibidos.push(e.payload.sesion));

      expect(realtimeServiceSpy.listenType).toHaveBeenCalledWith('SESION_CANCELADA');
      emitCancelada('g1', 's1');
      emitCancelada('g2', 's2');

      expect(recibidos).toEqual(['s1']);
    });

    it('B1-F-19 sin grupo seleccionado no entrega nada', () => {
      const recibidos: unknown[] = [];
      service.watchCancelaciones(() => '').subscribe((e) => recibidos.push(e));

      emitCancelada('g1', 's1');

      expect(recibidos).toEqual([]);
    });

    it('B1-F-19 no usa timers: setInterval no se invoca', () => {
      const spy = spyOn(window, 'setInterval').and.callThrough();
      service.watchCancelaciones(() => 'g1').subscribe();
      emitCancelada('g1', 's1');

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('watchTomas (CULM-001 B.2)', () => {
    let porTipo: Record<string, Subject<RealtimeEvent<unknown>>>;

    beforeEach(() => {
      porTipo = {
        TOMA_ABIERTA: new Subject(),
        TOMA_CERRADA: new Subject(),
        ASISTENCIAS_TOMA_ACTUALIZADAS: new Subject(),
      };
      realtimeServiceSpy.listenType.and.callFake(((tipo: string) => porTipo[tipo].asObservable()) as never);
    });

    const emitir = (tipo: string, grupo: string, extra: Record<string, unknown> = {}) =>
      porTipo[tipo].next({
        eventId: 'e', type: tipo, occurredAt: '2026-11-10T14:00:00Z', correlationId: null,
        payload: { grupo, sesion: 's1', toma: 't1', ...extra },
      });

    it('B2-F-12 escucha TOMA_ABIERTA, TOMA_CERRADA y ASISTENCIAS_TOMA_ACTUALIZADAS del grupo actual', () => {
      const tipos: string[] = [];
      service.watchTomas(() => 'g1').subscribe((e) => tipos.push(e.type));

      emitir('TOMA_ABIERTA', 'g1');
      emitir('TOMA_CERRADA', 'g1', { automatico: true, totalAusentesMarcados: 2 });
      emitir('ASISTENCIAS_TOMA_ACTUALIZADAS', 'g1', { totalRegistros: 3 });
      emitir('TOMA_ABIERTA', 'g2');

      expect(tipos).toEqual(['TOMA_ABIERTA', 'TOMA_CERRADA', 'ASISTENCIAS_TOMA_ACTUALIZADAS']);
    });

    it('B2-F-12 sin grupo seleccionado no entrega nada y no usa timers', () => {
      const intervalo = spyOn(window, 'setInterval').and.callThrough();
      const recibidos: unknown[] = [];
      service.watchTomas(() => '').subscribe((e) => recibidos.push(e));
      emitir('TOMA_CERRADA', 'g1');
      expect(recibidos).toEqual([]);
      expect(intervalo).not.toHaveBeenCalled();
    });
  });
});
