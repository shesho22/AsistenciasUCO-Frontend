import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject, Subject } from 'rxjs';
import { CoordinatorAttendanceComponent } from './coordinator-attendance.component';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { ConnectionState, RealtimeEvent } from '../../../core/realtime/model/realtime-event.model';
import { GrupoProgramaItem } from '../../../core/models/asistencia-programa.model';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

const mockGrupo: GrupoProgramaItem = {
  id: 'grp-coord-1',
  codigo: 101,
  nombre: 'Grupo 101',
  idAsignatura: 'asg-1',
  nombreAsignatura: 'Estructuras de Datos',
  idDocente: 'doc-1',
  capacidadMaxima: 30,
  estudiantesActivos: 25,
  cuposDisponibles: 5,
  habilitado: true,
  inicioPeriodo: '2026-02-01',
  finPeriodo: '2026-06-30',
};

describe('CoordinatorAttendanceComponent - Realtime SSE (C-F-51..C-F-53)', () => {
  let fixture: ComponentFixture<CoordinatorAttendanceComponent>;
  let component: CoordinatorAttendanceComponent;
  let http: HttpTestingController;
  let connectionState$: BehaviorSubject<ConnectionState>;
  let events$: Subject<RealtimeEvent>;
  let realtimeSpy: jasmine.SpyObj<RealtimeService>;

  beforeEach(async () => {
    connectionState$ = new BehaviorSubject<ConnectionState>('DISCONNECTED');
    events$ = new Subject<RealtimeEvent>();

    realtimeSpy = jasmine.createSpyObj<RealtimeService>('RealtimeService', ['startForGroup', 'stop'], {
      connectionState$: connectionState$.asObservable(),
      events$: events$.asObservable(),
    });

    await TestBed.configureTestingModule({
      imports: [CoordinatorAttendanceComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RealtimeService, useValue: realtimeSpy },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CoordinatorAttendanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Consume initial periodos and grupos requests
    const reqPeriodos = http.expectOne(`${API}/coordinador/periodos-academicos`);
    reqPeriodos.flush({ idResultado: 1, exitoso: true, mensajeUsuario: '', datos: [] });

    const reqGrupos = http.match((r) => r.url.includes(`${API}/coordinador/grupos`));
    reqGrupos.forEach((r) => r.flush({ idResultado: 1, exitoso: true, mensajeUsuario: '', datos: [mockGrupo], total: 1 }));
  });

  afterEach(() => {
    http.verify();
  });

  it('C-F-51: al seleccionar un grupo, invoca realtimeService.startForGroup con el id del grupo', () => {
    component.seleccionarGrupo(mockGrupo);

    const sesReq = http.expectOne((r) => r.url.includes(`${API}/coordinador/grupos/${mockGrupo.id}/sesiones`));
    sesReq.flush({ idResultado: 1, exitoso: true, mensajeUsuario: '', datos: [] });

    expect(realtimeSpy.startForGroup).toHaveBeenCalledWith(mockGrupo.id);
  });

  it('C-F-52: en reconexión o evento SSE relevante recarga sesiones con la secuencia canónica (exactamente 3 cargas)', () => {
    component.seleccionarGrupo(mockGrupo);

    // Carga 1: entrada al grupo
    const req1 = http.expectOne((r) => r.url.includes(`${API}/coordinador/grupos/${mockGrupo.id}/sesiones`));
    req1.flush({ idResultado: 1, exitoso: true, mensajeUsuario: '', datos: [] });

    // Primera conexión: CONNECTING -> CONNECTED no recarga
    connectionState$.next('CONNECTING');
    connectionState$.next('CONNECTED');
    http.expectNone((r) => r.url.includes(`${API}/coordinador/grupos/${mockGrupo.id}/sesiones`));

    // Reconexión: RECONNECTING -> CONNECTED dispara Carga 2
    connectionState$.next('RECONNECTING');
    connectionState$.next('CONNECTED');
    const req2 = http.expectOne((r) => r.url.includes(`${API}/coordinador/grupos/${mockGrupo.id}/sesiones`));
    req2.flush({ idResultado: 1, exitoso: true, mensajeUsuario: '', datos: [] });

    // Evento SSE relevante: dispara Carga 3
    events$.next({
      tipo: 'REVISION_CANCELACION_PROPUESTA',
      timestamp: '2026-11-08T10:00:00Z',
      payload: {
        idRevision: 'rev-1',
        idMatricula: 'mat-1',
        idGrupo: mockGrupo.id,
        idEstudiante: 'est-1',
        estado: 'PROPUESTA_COORDINACION',
      },
    });
    const req3 = http.expectOne((r) => r.url.includes(`${API}/coordinador/grupos/${mockGrupo.id}/sesiones`));
    req3.flush({ idResultado: 1, exitoso: true, mensajeUsuario: '', datos: [] });

    // En total exactamente 3 cargas
    http.verify();
  });

  it('C-F-53: al cambiar de grupo o destruir el componente invoca realtimeService.stop()', () => {
    component.seleccionarGrupo(mockGrupo);
    const req1 = http.expectOne((r) => r.url.includes(`${API}/coordinador/grupos/${mockGrupo.id}/sesiones`));
    req1.flush({ idResultado: 1, exitoso: true, mensajeUsuario: '', datos: [] });

    expect(realtimeSpy.stop).not.toHaveBeenCalled();

    const otroGrupo: GrupoProgramaItem = { ...mockGrupo, id: 'grp-coord-2' };
    component.seleccionarGrupo(otroGrupo);
    const req2 = http.expectOne((r) => r.url.includes(`${API}/coordinador/grupos/${otroGrupo.id}/sesiones`));
    req2.flush({ idResultado: 1, exitoso: true, mensajeUsuario: '', datos: [] });

    expect(realtimeSpy.stop).toHaveBeenCalled();

    realtimeSpy.stop.calls.reset();
    fixture.destroy();
    expect(realtimeSpy.stop).toHaveBeenCalled();
  });
});
