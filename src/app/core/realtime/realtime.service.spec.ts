import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { RealtimeService } from './realtime.service';
import { REALTIME_TRANSPORT, REALTIME_USUARIO_TRANSPORT, RealtimeTransport } from './contract/realtime-transport';
import { RealtimeEvent } from './model/realtime-event.model';
import { RealtimeConnectionState } from './model/realtime-connection-state.model';

describe('RealtimeService', () => {
  let service: RealtimeService;
  let events$: Subject<RealtimeEvent>;
  let state$: Subject<RealtimeConnectionState>;
  let transportSpy: jasmine.SpyObj<RealtimeTransport>;
  let eventosUsuario$: Subject<RealtimeEvent>;
  let transporteUsuarioSpy: jasmine.SpyObj<RealtimeTransport>;

  beforeEach(() => {
    events$ = new Subject<RealtimeEvent>();
    state$ = new Subject<RealtimeConnectionState>();
    transportSpy = jasmine.createSpyObj<RealtimeTransport>(
      'RealtimeTransport',
      ['start', 'stop'],
      { events$: events$.asObservable(), connectionState$: state$.asObservable() }
    );

    eventosUsuario$ = new Subject<RealtimeEvent>();
    transporteUsuarioSpy = jasmine.createSpyObj<RealtimeTransport>(
      'RealtimeUsuarioTransport',
      ['start', 'stop'],
      { events$: eventosUsuario$.asObservable(), connectionState$: new Subject<RealtimeConnectionState>().asObservable() }
    );

    TestBed.configureTestingModule({
      providers: [
        { provide: REALTIME_TRANSPORT, useValue: transportSpy },
        { provide: REALTIME_USUARIO_TRANSPORT, useValue: transporteUsuarioSpy },
      ],
    });

    service = TestBed.inject(RealtimeService);
  });

  function makeEvent(type: string, payload: unknown = {}): RealtimeEvent {
    return {
      eventId: 'evt-' + Math.random(),
      type,
      occurredAt: '2026-09-15T10:00:00Z',
      correlationId: null,
      payload,
    };
  }

  it('startForGroup() delega el scope al transporte', () => {
    service.startForGroup('g1');
    expect(transportSpy.start).toHaveBeenCalledOnceWith({ grupoId: 'g1' });
  });

  it('startForUser() abre el canal del usuario sin tocar el del grupo (TD-084)', () => {
    service.startForUser();
    expect(transporteUsuarioSpy.start).toHaveBeenCalledOnceWith({ canal: 'usuario' });
    expect(transportSpy.start).not.toHaveBeenCalled();
  });

  it('stop() cierra solo el grupo y stopUser() solo el canal del usuario', () => {
    service.stop();
    expect(transporteUsuarioSpy.stop).not.toHaveBeenCalled();
    service.stopUser();
    expect(transporteUsuarioSpy.stop).toHaveBeenCalledTimes(1);
    expect(transportSpy.stop).toHaveBeenCalledTimes(1);
  });

  it('events() une ambos canales y entrega una sola vez el evento que llega por los dos', () => {
    const recibidos: string[] = [];
    service.events().subscribe((evt) => recibidos.push(evt.eventId));
    const repetido = makeEvent('SESION_SOLICITUD_CREADA');

    events$.next(repetido);
    eventosUsuario$.next(repetido);
    eventosUsuario$.next({ ...makeEvent('FALTA_SESION_AVISADA'), eventId: 'solo-usuario' });
    events$.next({ ...makeEvent('SIN_ID'), eventId: '' });

    expect(recibidos).toEqual([repetido.eventId, 'solo-usuario', '']);
  });

  it('events() olvida los ids más antiguos para no crecer sin límite', () => {
    const recibidos: string[] = [];
    service.events().subscribe((evt) => recibidos.push(evt.eventId));
    const primero = { ...makeEvent('X'), eventId: 'id-0' };
    events$.next(primero);
    for (let i = 1; i <= 200; i++) {
      events$.next({ ...makeEvent('X'), eventId: 'id-' + i });
    }
    eventosUsuario$.next(primero);

    expect(recibidos.filter((id) => id === 'id-0')).toHaveSize(2);
  });

  it('listenType también recibe lo que llega por el canal del usuario', () => {
    const recibidos: RealtimeEvent[] = [];
    service.listenType('FALTA_SESION_AVISADA').subscribe((evt) => recibidos.push(evt));
    eventosUsuario$.next(makeEvent('FALTA_SESION_AVISADA'));
    expect(recibidos).toHaveSize(1);
  });

  it('stop() delega en el transporte', () => {
    service.stop();
    expect(transportSpy.stop).toHaveBeenCalledTimes(1);
  });

  it('listenType entrega solo eventos del tipo solicitado', () => {
    const received: RealtimeEvent[] = [];
    service.listenType('ASISTENCIAS_SESION_ACTUALIZADAS').subscribe((evt) => received.push(evt));

    events$.next(makeEvent('OTRO_TIPO'));
    events$.next(makeEvent('ASISTENCIAS_SESION_ACTUALIZADAS'));
    events$.next(makeEvent('OTRO_TIPO'));

    expect(received).toHaveSize(1);
    expect(received[0].type).toBe('ASISTENCIAS_SESION_ACTUALIZADAS');
  });

  it('soporta múltiples subscribers independientes', () => {
    const a: RealtimeEvent[] = [];
    const b: RealtimeEvent[] = [];
    service.listenType('ASISTENCIAS_SESION_ACTUALIZADAS').subscribe((evt) => a.push(evt));
    service.events().subscribe((evt) => b.push(evt));

    events$.next(makeEvent('ASISTENCIAS_SESION_ACTUALIZADAS'));
    events$.next(makeEvent('OTRO_TIPO'));

    expect(a).toHaveSize(1);
    expect(b).toHaveSize(2);
  });

  it('expone connectionState$ del transporte', () => {
    const states: RealtimeConnectionState[] = [];
    service.connectionState$.subscribe((s) => states.push(s));

    state$.next('CONNECTING');
    state$.next('CONNECTED');

    expect(states).toEqual(['CONNECTING', 'CONNECTED']);
  });
});
