import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject, Subject } from 'rxjs';
import { CoordinatorSesionesGrupoComponent } from './coordinator-sesiones-grupo.component';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { RealtimeConnectionState } from '../../../core/realtime/model/realtime-connection-state.model';
import { RealtimeEvent } from '../../../core/realtime/model/realtime-event.model';
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

describe('CoordinatorSesionesGrupoComponent - Realtime SSE (C-F-51..C-F-53)', () => {
  let fixture: ComponentFixture<CoordinatorSesionesGrupoComponent>;
  let component: CoordinatorSesionesGrupoComponent;
  let http: HttpTestingController;
  let connectionState$: BehaviorSubject<RealtimeConnectionState>;
  let events$: Subject<RealtimeEvent>;
  let realtimeSpy: jasmine.SpyObj<RealtimeService>;

  beforeEach(async () => {
    connectionState$ = new BehaviorSubject<RealtimeConnectionState>('DISCONNECTED');
    events$ = new Subject<RealtimeEvent>();

    realtimeSpy = jasmine.createSpyObj<RealtimeService>('RealtimeService', ['startForGroup', 'stop', 'events'], {
      connectionState$: connectionState$.asObservable(),
    });
    realtimeSpy.events.and.returnValue(events$.asObservable());

    await TestBed.configureTestingModule({
      imports: [CoordinatorSesionesGrupoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RealtimeService, useValue: realtimeSpy },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CoordinatorSesionesGrupoComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('grupo', mockGrupo);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('C-F-51: al abrirse con un grupo, invoca realtimeService.startForGroup con el id del grupo', () => {
    const sesReq = http.expectOne((r) => r.url.includes(`${API}/coordinador/grupos/${mockGrupo.id}/sesiones`));
    sesReq.flush({ idResultado: 1, exitoso: true, mensajeUsuario: '', datos: [] });

    expect(realtimeSpy.startForGroup).toHaveBeenCalledWith(mockGrupo.id);
  });

  it('C-F-52: en reconexión o evento SSE relevante recarga sesiones con la secuencia canónica (exactamente 3 cargas)', () => {
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
      eventId: 'evt-1',
      type: 'REVISION_CANCELACION_PROPUESTA',
      occurredAt: '2026-11-08T10:00:00Z',
      correlationId: null,
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
    expect(req1).toBeTruthy();
    expect(req2).toBeTruthy();
    expect(req3).toBeTruthy();
    http.verify();
  });

  it('C-F-53: al cambiar de grupo o destruir el componente invoca realtimeService.stop()', () => {
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

describe('CoordinatorSesionesGrupoComponent - dueño del stream con varias filas abiertas (CULM-001)', () => {
  let http: HttpTestingController;
  let realtimeSpy: jasmine.SpyObj<RealtimeService>;

  beforeEach(async () => {
    realtimeSpy = jasmine.createSpyObj<RealtimeService>('RealtimeService', ['startForGroup', 'stop', 'events'], {
      connectionState$: new BehaviorSubject<RealtimeConnectionState>('DISCONNECTED').asObservable(),
    });
    realtimeSpy.events.and.returnValue(new Subject<RealtimeEvent>().asObservable());
    await TestBed.configureTestingModule({
      imports: [CoordinatorSesionesGrupoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: RealtimeService, useValue: realtimeSpy }],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  function abrir(id: string): ComponentFixture<CoordinatorSesionesGrupoComponent> {
    const f = TestBed.createComponent(CoordinatorSesionesGrupoComponent);
    f.componentRef.setInput('grupo', { id, nombre: id, nombreAsignatura: 'X' });
    f.detectChanges();
    http.expectOne((r) => r.url.includes(`/coordinador/grupos/${id}/sesiones`)).flush({ exitoso: true, datos: [], total: 0 });
    return f;
  }

  it('destruir la fila anterior después de abrir otra no corta el stream de la nueva', () => {
    const a = abrir('grp-a');
    const b = abrir('grp-b');
    realtimeSpy.stop.calls.reset();

    a.destroy();
    expect(realtimeSpy.stop).not.toHaveBeenCalled();

    b.destroy();
    expect(realtimeSpy.stop).toHaveBeenCalledTimes(1);
    http.verify();
  });
});
