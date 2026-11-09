import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject, Subject } from 'rxjs';
import { CoordinatorAttendanceComponent } from './coordinator-attendance.component';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { RealtimeConnectionState } from '../../../core/realtime/model/realtime-connection-state.model';
import { RealtimeEvent } from '../../../core/realtime/model/realtime-event.model';
import { GrupoProgramaItem, SesionGrupoItem } from '../../../core/models/asistencia-programa.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

const grupo: GrupoProgramaItem = {
  id: 'grp-1', codigo: 101, nombre: 'Grupo 101', idAsignatura: 'asg-1', nombreAsignatura: 'Estructuras de Datos',
  idDocente: 'doc-1', capacidadMaxima: 30, estudiantesActivos: 25, cuposDisponibles: 5, habilitado: true,
  inicioPeriodo: '2026-02-01', finPeriodo: '2026-06-30',
};

function sesion(id: string, estado: 'PROGRAMADA' | 'CANCELADA'): SesionGrupoItem {
  return {
    id, idGrupo: grupo.id, codigoGrupo: 101, nombreGrupo: 'Grupo 101', nombre: `Sesión ${id}`, numero: 1,
    codigo: `SES-${id}`, numeroSemana: 1, fechaHoraInicio: '2026-11-20T08:00:00', fechaHoraFin: '2026-11-20T10:00:00',
    estado,
    cancelacion: estado === 'CANCELADA'
      ? { tipo: 'DOCENTE', motivo: 'x', nombreFestivo: null, fechaCancelacionUtc: null }
      : null,
  };
}

describe('CoordinatorAttendanceComponent - cancelación de sesiones manuales y avisos (DEC-064)', () => {
  let fixture: ComponentFixture<CoordinatorAttendanceComponent>;
  let component: CoordinatorAttendanceComponent;
  let http: HttpTestingController;
  let toast: ToastService;
  let events$: Subject<RealtimeEvent>;
  const el = () => fixture.nativeElement as HTMLElement;
  const sesionesUrl = (r: { url: string }) => r.url.includes(`${API}/coordinador/grupos/${grupo.id}/sesiones`);

  function flushSesiones(datos: SesionGrupoItem[]): void {
    http.expectOne(sesionesUrl).flush({ exitoso: true, mensajeUsuario: '', datos, total: datos.length });
  }

  async function refrescar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    events$ = new Subject<RealtimeEvent>();
    const realtime = jasmine.createSpyObj<RealtimeService>('RealtimeService', ['startForGroup', 'stop', 'events'], {
      connectionState$: new BehaviorSubject<RealtimeConnectionState>('DISCONNECTED').asObservable(),
    });
    realtime.events.and.returnValue(events$.asObservable());

    await TestBed.configureTestingModule({
      imports: [CoordinatorAttendanceComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: RealtimeService, useValue: realtime }],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(CoordinatorAttendanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(`${API}/coordinador/periodos-academicos`).flush({ exitoso: true, datos: [] });
    http.match((r) => r.url.includes(`${API}/coordinador/grupos`) && !r.url.includes('/sesiones'))
      .forEach((r) => r.flush({ exitoso: true, datos: [grupo], total: 1 }));
    component.seleccionarGrupo(grupo);
    flushSesiones([sesion('a', 'PROGRAMADA'), sesion('b', 'CANCELADA')]);
    await refrescar();
  });

  afterEach(() => http.verify());

  it('muestra "Cancelar sesión" solo en las sesiones no canceladas', () => {
    expect(el().querySelector('[data-testid="sesion-fila-a"] [data-testid="cancelar-sesion"]')).toBeTruthy();
    expect(el().querySelector('[data-testid="sesion-fila-b"] [data-testid="cancelar-sesion"]')).toBeNull();
  });

  it('abrir el diálogo carga los motivos una sola vez y confirmar llama al endpoint y recarga la lista', async () => {
    spyOn(toast, 'success');
    (el().querySelector('[data-testid="cancelar-sesion"]') as HTMLButtonElement).click();
    http.expectOne(`${API}/coordinador/sesiones/motivos-cancelacion`).flush({
      exitoso: true, datos: [{ codigo: 'DUPLICADA', nombre: 'Sesión duplicada' }], total: 1,
    });
    await refrescar();
    expect(el().querySelector('[role="dialog"]')).toBeTruthy();

    component.confirmarCancelacion({ codigoMotivo: 'DUPLICADA', observacion: 'ya existe' });
    const req = http.expectOne(`${API}/coordinador/sesiones/a/cancelacion`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ codigoMotivo: 'DUPLICADA', observacion: 'ya existe' });
    req.flush({ exitoso: true, mensajeUsuario: 'Sesión cancelada y estudiantes notificados.', datos: { idSesion: 'a', estado: 'CANCELADA' } });
    flushSesiones([sesion('a', 'CANCELADA'), sesion('b', 'CANCELADA')]);
    await refrescar();

    expect(toast.success).toHaveBeenCalledWith('Sesión cancelada y estudiantes notificados.');
    expect(component.sesionACancelar()).toBeNull();
    expect(el().querySelector('[role="dialog"]')).toBeNull();

    // Segunda apertura: ya hay motivos cargados, no se vuelve a pedir el catálogo.
    component.abrirCancelar(sesion('c', 'PROGRAMADA'));
    http.expectNone(`${API}/coordinador/sesiones/motivos-cancelacion`);
  });

  it('un 409 SES_018 muestra el mensaje del backend tal cual y deja el diálogo abierto sin recargar', async () => {
    component.abrirCancelar(sesion('a', 'PROGRAMADA'));
    http.expectOne(`${API}/coordinador/sesiones/motivos-cancelacion`).flush({ exitoso: true, datos: [], total: 0 });
    component.confirmarCancelacion({ codigoMotivo: 'DUPLICADA' });
    http.expectOne(`${API}/coordinador/sesiones/a/cancelacion`).flush(
      { code: 'SES_018', message: 'Solo se pueden cancelar sesiones creadas manualmente.', status: 409 },
      { status: 409, statusText: 'Conflict' }
    );
    await refrescar();

    expect(component.errorCancelar()).toBe('Solo se pueden cancelar sesiones creadas manualmente.');
    expect(component.enviandoCancelacion()).toBeFalse();
    expect(component.sesionACancelar()).not.toBeNull();
    expect(el().querySelector('[data-testid="error-cancelacion"]')?.textContent).toContain('Solo se pueden cancelar sesiones creadas manualmente.');
  });

  it('si el catálogo de motivos falla, lo informa y permite reintentar al reabrir', () => {
    component.abrirCancelar(sesion('a', 'PROGRAMADA'));
    http.expectOne(`${API}/coordinador/sesiones/motivos-cancelacion`).flush(
      { code: 'SEC_002', message: 'No tienes permiso.', status: 403 },
      { status: 403, statusText: 'Forbidden' }
    );
    expect(component.errorMotivos()).toBe('No tienes permiso.');
    component.cerrarCancelar();
    component.abrirCancelar(sesion('a', 'PROGRAMADA'));
    http.expectOne(`${API}/coordinador/sesiones/motivos-cancelacion`).flush({ exitoso: true, datos: [] });
    expect(component.errorMotivos()).toBeNull();
  });

  it('no abre el diálogo para una sesión cancelada ni envía dos veces mientras está enviando', () => {
    component.abrirCancelar(sesion('b', 'CANCELADA'));
    expect(component.sesionACancelar()).toBeNull();

    component.confirmarCancelacion({ codigoMotivo: 'X' });
    http.expectNone(`${API}/coordinador/sesiones/b/cancelacion`);

    component.abrirCancelar(sesion('a', 'PROGRAMADA'));
    http.expectOne(`${API}/coordinador/sesiones/motivos-cancelacion`).flush({ exitoso: true, datos: [] });
    component.confirmarCancelacion({ codigoMotivo: 'X' });
    component.confirmarCancelacion({ codigoMotivo: 'X' });
    http.expectOne(`${API}/coordinador/sesiones/a/cancelacion`);
  });

  it('SESION_MANUAL_CREADA del grupo avisa con docente y fecha y recarga; la de otro grupo se ignora', () => {
    spyOn(toast, 'info');
    events$.next({
      eventId: 'e1', type: 'SESION_MANUAL_CREADA', occurredAt: '2026-11-09T10:00:00Z', correlationId: null,
      payload: { grupo: 'otro', sesion: 's', fechaHoraInicio: '2026-11-20T13:00:00Z', docente: 'Ana' },
    });
    http.expectNone(sesionesUrl);
    expect(toast.info).not.toHaveBeenCalled();

    events$.next({
      eventId: 'e2', type: 'SESION_MANUAL_CREADA', occurredAt: '2026-11-09T10:00:00Z', correlationId: null,
      payload: { grupo: grupo.id, sesion: 's', fechaHoraInicio: '2026-11-20T13:00:00Z', docente: 'Ana Pérez' },
    });
    flushSesiones([sesion('a', 'PROGRAMADA')]);
    const mensaje = (toast.info as jasmine.Spy).calls.mostRecent().args[0] as string;
    expect(mensaje).toContain('Ana Pérez');
    expect(mensaje).toContain('2026');
  });

  it('SESION_CANCELADA del grupo recarga la lista; la de otro grupo no', () => {
    events$.next({
      eventId: 'e3', type: 'SESION_CANCELADA', occurredAt: '2026-11-09T10:00:00Z', correlationId: null,
      payload: { grupo: 'otro', sesion: 'a', tipo: 'COORDINADOR', fechaHoraInicioUtc: null },
    });
    http.expectNone(sesionesUrl);

    events$.next({
      eventId: 'e4', type: 'SESION_CANCELADA', occurredAt: '2026-11-09T10:00:00Z', correlationId: null,
      payload: { grupo: grupo.id, sesion: 'a', tipo: 'COORDINADOR', fechaHoraInicioUtc: null },
    });
    flushSesiones([sesion('a', 'CANCELADA')]);
    expect(component.sesiones().length).toBe(1);
  });
});
