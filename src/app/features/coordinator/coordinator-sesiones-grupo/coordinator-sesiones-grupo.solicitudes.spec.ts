import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject, Subject } from 'rxjs';
import { CoordinatorSesionesGrupoComponent } from './coordinator-sesiones-grupo.component';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { RealtimeConnectionState } from '../../../core/realtime/model/realtime-connection-state.model';
import { RealtimeEvent } from '../../../core/realtime/model/realtime-event.model';
import { SesionGrupoItem } from '../../../core/models/asistencia-programa.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;
const grupo = { id: 'grp-1', nombre: 'Grupo 101', nombreAsignatura: 'Estructuras de Datos' };

function sesion(id: string, extra: Partial<SesionGrupoItem> = {}): SesionGrupoItem {
  return {
    id, idGrupo: grupo.id, codigoGrupo: 101, nombreGrupo: 'Grupo 101', nombre: `Sesión ${id}`, numero: 1,
    codigo: `SES-${id}`, numeroSemana: 1, fechaHoraInicio: '2026-11-20T08:00:00', fechaHoraFin: '2026-11-20T10:00:00',
    estado: 'PROGRAMADA', cancelacion: null, ...extra,
  };
}

describe('CoordinatorSesionesGrupoComponent - solicitudes de sesión extraordinaria (DEC-065 (2))', () => {
  let fixture: ComponentFixture<CoordinatorSesionesGrupoComponent>;
  let http: HttpTestingController;
  let toast: ToastService;
  let events$: Subject<RealtimeEvent>;
  const el = () => fixture.nativeElement as HTMLElement;
  const sesionesUrl = (r: { url: string }) => r.url.includes(`${API}/coordinador/grupos/${grupo.id}/sesiones`);
  const flush = (datos: SesionGrupoItem[]) => http.expectOne(sesionesUrl).flush({ exitoso: true, mensajeUsuario: '', datos, total: datos.length });
  const evento = (type: string, payload: unknown): RealtimeEvent => ({
    eventId: 'e', type, occurredAt: '2026-11-10T14:00:00Z', correlationId: null, payload,
  });

  beforeEach(async () => {
    events$ = new Subject<RealtimeEvent>();
    const realtime = jasmine.createSpyObj<RealtimeService>('RealtimeService', ['startForGroup', 'stop', 'events'], {
      connectionState$: new BehaviorSubject<RealtimeConnectionState>('DISCONNECTED').asObservable(),
    });
    realtime.events.and.returnValue(events$.asObservable());
    await TestBed.configureTestingModule({
      imports: [CoordinatorSesionesGrupoComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: RealtimeService, useValue: realtime }],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(CoordinatorSesionesGrupoComponent);
    fixture.componentRef.setInput('grupo', grupo);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('SESION_SOLICITUD_CREADA del grupo avisa con el nombre del docente y recarga', () => {
    const info = spyOn(toast, 'info');
    flush([]);

    events$.next(evento('SESION_SOLICITUD_CREADA', { grupo: grupo.id, sesion: 's1', docente: 'Ana Pérez', fechaHoraInicio: null }));

    expect(info).toHaveBeenCalledOnceWith('Nueva solicitud de sesión extraordinaria de Ana Pérez.');
    flush([]);
  });

  it('SESION_SOLICITUD_CREADA de otro grupo no avisa ni recarga', () => {
    const info = spyOn(toast, 'info');
    flush([]);

    events$.next(evento('SESION_SOLICITUD_CREADA', { grupo: 'otro', sesion: 's1', docente: 'Ana', fechaHoraInicio: null }));

    expect(info).not.toHaveBeenCalled();
    http.expectNone(sesionesUrl);
  });

  it('muestra la insignia de pendiente y no ofrece cancelar la sesión pendiente', () => {
    flush([
      sesion('p', { estadoSolicitud: 'PENDIENTE', pendienteAprobacion: true }),
      sesion('n'),
    ]);
    fixture.detectChanges();

    const pendiente = el().querySelector('[data-testid="sesion-fila-p"]') as HTMLElement;
    const normal = el().querySelector('[data-testid="sesion-fila-n"]') as HTMLElement;
    expect(pendiente.querySelector('[data-testid="sesion-pendiente-badge"]')?.textContent).toContain('Pendiente de aprobación');
    expect(pendiente.querySelector('[data-testid="cancelar-sesion"]')).toBeNull();
    expect(normal.querySelector('[data-testid="cancelar-sesion"]')).not.toBeNull();
  });

  it('una sesión rechazada muestra la insignia roja', () => {
    flush([sesion('r', { estado: 'CANCELADA', estadoSolicitud: 'RECHAZADA', cancelacion: { tipo: 'COORDINADOR', motivo: 'Sin aula', nombreFestivo: null, fechaCancelacionUtc: null } })]);
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="sesion-rechazada-badge"]')?.textContent).toContain('Rechazada');
  });
});
