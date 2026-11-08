import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { DeanGrupoDetalleComponent } from './dean-grupo-detalle.component';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { ConnectionState, RealtimeEvent } from '../../../core/realtime/model/realtime-event.model';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

describe('DeanGrupoDetalleComponent - Realtime SSE (C-F-54..C-F-56)', () => {
  let fixture: ComponentFixture<DeanGrupoDetalleComponent>;
  let component: DeanGrupoDetalleComponent;
  let http: HttpTestingController;
  let connectionState$: BehaviorSubject<ConnectionState>;
  let events$: Subject<RealtimeEvent>;
  let realtimeSpy: jasmine.SpyObj<RealtimeService>;

  const grupoId = 'grp-dean-123';

  beforeEach(async () => {
    connectionState$ = new BehaviorSubject<ConnectionState>('DISCONNECTED');
    events$ = new Subject<RealtimeEvent>();

    realtimeSpy = jasmine.createSpyObj<RealtimeService>('RealtimeService', ['startForGroup', 'stop'], {
      connectionState$: connectionState$.asObservable(),
      events$: events$.asObservable(),
    });

    await TestBed.configureTestingModule({
      imports: [DeanGrupoDetalleComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RealtimeService, useValue: realtimeSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ grupoId }),
            },
          },
        },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeanGrupoDetalleComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    http.verify();
  });

  it('C-F-54: al iniciar con effectiveGrupoId, invoca realtimeService.startForGroup con el id del grupo', () => {
    fixture.detectChanges();

    const reqGrupos = http.expectOne(`${API}/decano/grupos`);
    reqGrupos.flush({ exitoso: true, datos: [] });

    const reqSesiones = http.expectOne((r) => r.url.includes(`${API}/decano/sesiones`));
    reqSesiones.flush({ exitoso: true, datos: [], total: 0 });

    expect(realtimeSpy.startForGroup).toHaveBeenCalledWith(grupoId);
  });

  it('C-F-55: en reconexión o evento SSE relevante recarga sesiones con la secuencia canónica (exactamente 3 cargas)', () => {
    fixture.detectChanges();

    const reqGrupos = http.expectOne(`${API}/decano/grupos`);
    reqGrupos.flush({ exitoso: true, datos: [] });

    // Carga 1: entrada
    const req1 = http.expectOne((r) => r.url.includes(`${API}/decano/sesiones`));
    req1.flush({ exitoso: true, datos: [], total: 0 });

    // Primera conexión: CONNECTING -> CONNECTED no recarga
    connectionState$.next('CONNECTING');
    connectionState$.next('CONNECTED');
    http.expectNone((r) => r.url.includes(`${API}/decano/sesiones`));

    // Reconexión: RECONNECTING -> CONNECTED dispara Carga 2
    connectionState$.next('RECONNECTING');
    connectionState$.next('CONNECTED');
    const req2 = http.expectOne((r) => r.url.includes(`${API}/decano/sesiones`));
    req2.flush({ exitoso: true, datos: [], total: 0 });

    // Evento SSE relevante: dispara Carga 3
    events$.next({
      tipo: 'REVISION_CANCELACION_RESOLUCION',
      timestamp: '2026-11-08T10:00:00Z',
      payload: {
        idRevision: 'rev-2',
        idMatricula: 'mat-2',
        idGrupo: grupoId,
        idEstudiante: 'est-2',
        estado: 'CANCELADO_POR_INASISTENCIA',
      },
    });
    const req3 = http.expectOne((r) => r.url.includes(`${API}/decano/sesiones`));
    req3.flush({ exitoso: true, datos: [], total: 0 });

    http.verify();
  });

  it('C-F-56: al destruir el componente invoca realtimeService.stop()', () => {
    fixture.detectChanges();

    const reqGrupos = http.expectOne(`${API}/decano/grupos`);
    reqGrupos.flush({ exitoso: true, datos: [] });

    const reqSesiones = http.expectOne((r) => r.url.includes(`${API}/decano/sesiones`));
    reqSesiones.flush({ exitoso: true, datos: [], total: 0 });

    expect(realtimeSpy.stop).not.toHaveBeenCalled();

    fixture.destroy();
    expect(realtimeSpy.stop).toHaveBeenCalled();
  });
});
