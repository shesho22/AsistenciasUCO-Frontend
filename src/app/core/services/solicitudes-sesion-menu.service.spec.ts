import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { SolicitudesSesionMenuService } from './solicitudes-sesion-menu.service';
import { CoordinadorSesionesService } from './coordinador-sesiones.service';
import { DocenteSolicitudesSesionService } from './docente-solicitudes-sesion.service';
import { RealtimeService } from '../realtime/realtime.service';
import { RealtimeEvent } from '../realtime/model/realtime-event.model';

describe('SolicitudesSesionMenuService (ATA D6)', () => {
  let service: SolicitudesSesionMenuService;
  let coordinador: jasmine.SpyObj<CoordinadorSesionesService>;
  let docente: jasmine.SpyObj<DocenteSolicitudesSesionService>;
  let eventos$: Subject<RealtimeEvent>;

  const evento = (type: string): RealtimeEvent => ({ eventId: 'e', type, occurredAt: '2026-11-18T10:00:00Z', correlationId: null, payload: {} });

  beforeEach(() => {
    eventos$ = new Subject<RealtimeEvent>();
    coordinador = jasmine.createSpyObj('CoordinadorSesionesService', ['contarPendientes']);
    docente = jasmine.createSpyObj('DocenteSolicitudesSesionService', ['contarPendientes']);
    coordinador.contarPendientes.and.returnValue(of(3));
    docente.contarPendientes.and.returnValue(of(2));
    TestBed.configureTestingModule({
      providers: [
        { provide: CoordinadorSesionesService, useValue: coordinador },
        { provide: DocenteSolicitudesSesionService, useValue: docente },
        { provide: RealtimeService, useValue: { allEvents: () => eventos$.asObservable() } },
      ],
    });
    service = TestBed.inject(SolicitudesSesionMenuService);
  });

  it('el coordinador cuenta con su consulta al fijar el rol', () => {
    service.iniciar('COORDINADOR');
    expect(coordinador.contarPendientes).toHaveBeenCalledTimes(1);
    expect(docente.contarPendientes).not.toHaveBeenCalled();
    expect(service.pendientes()).toBe(3);
  });

  it('el docente cuenta con la consulta del docente', () => {
    service.iniciar('DOCENTE');
    expect(docente.contarPendientes).toHaveBeenCalledTimes(1);
    expect(service.pendientes()).toBe(2);
  });

  it('los demás roles no consultan y dejan el contador en cero', () => {
    service.iniciar('COORDINADOR');
    service.iniciar('ESTUDIANTE');
    expect(service.pendientes()).toBe(0);
    service.iniciar(null);
    expect(service.pendientes()).toBe(0);
    expect(coordinador.contarPendientes).toHaveBeenCalledTimes(1);
    expect(docente.contarPendientes).not.toHaveBeenCalled();
  });

  it('recarga con SESION_SOLICITUD_CREADA, SESION_SOLICITUD_RECHAZADA y SESION_MANUAL_CREADA', () => {
    service.iniciar('COORDINADOR');
    coordinador.contarPendientes.and.returnValue(of(5));
    eventos$.next(evento('SESION_SOLICITUD_CREADA'));
    expect(service.pendientes()).toBe(5);
    coordinador.contarPendientes.and.returnValue(of(4));
    eventos$.next(evento('SESION_SOLICITUD_RECHAZADA'));
    expect(service.pendientes()).toBe(4);
    coordinador.contarPendientes.and.returnValue(of(1));
    eventos$.next(evento('SESION_MANUAL_CREADA'));
    expect(service.pendientes()).toBe(1);
    expect(coordinador.contarPendientes).toHaveBeenCalledTimes(4);
  });

  it('ignora los eventos de otros tipos', () => {
    service.iniciar('DOCENTE');
    eventos$.next(evento('TOMA_ABIERTA'));
    expect(docente.contarPendientes).toHaveBeenCalledTimes(1);
  });

  it('si la consulta falla el contador queda en cero, sin inventar un total', () => {
    coordinador.contarPendientes.and.returnValue(throwError(() => new Error('500')));
    service.iniciar('COORDINADOR');
    expect(service.pendientes()).toBe(0);
  });

  it('al fijar de nuevo el rol queda un solo suscriptor (una recarga por evento)', () => {
    service.iniciar('COORDINADOR');
    service.iniciar('COORDINADOR');
    coordinador.contarPendientes.calls.reset();
    eventos$.next(evento('SESION_SOLICITUD_CREADA'));
    expect(coordinador.contarPendientes).toHaveBeenCalledTimes(1);
  });

  it('recargar sin rol con entrada deja el contador en cero', () => {
    service.recargar();
    expect(service.pendientes()).toBe(0);
  });

  it('recargar manual (tras aprobar o rechazar) vuelve a consultar', () => {
    service.iniciar('COORDINADOR');
    coordinador.contarPendientes.and.returnValue(of(0));
    service.recargar();
    expect(service.pendientes()).toBe(0);
    expect(coordinador.contarPendientes).toHaveBeenCalledTimes(2);
  });

  it('al destruir el servicio deja de escuchar', () => {
    service.iniciar('DOCENTE');
    TestBed.resetTestingModule();
    eventos$.next(evento('SESION_SOLICITUD_CREADA'));
    expect(docente.contarPendientes).toHaveBeenCalledTimes(1);
  });
});
