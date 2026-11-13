import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { StudentCoursesComponent } from './student-courses.component';
import { StudentManagementService } from '../../../core/services/student-management.service';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConsultasTransversalesService } from '../../../core/services/consultas-transversales.service';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { RealtimeConnectionState } from '../../../core/realtime/model/realtime-connection-state.model';
import { RealtimeEvent } from '../../../core/realtime/model/realtime-event.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { crearMateria } from '../../../core/testing/student-portal.fixtures';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('StudentCoursesComponent - avisos en tiempo real (DEC-064)', () => {
  let component: StudentCoursesComponent;
  let claims: jasmine.SpyObj<AttendanceClaimService>;
  let toast: jasmine.SpyObj<ToastService>;
  let realtime: jasmine.SpyObj<RealtimeService>;
  let events$: Subject<RealtimeEvent>;
  let estado$: BehaviorSubject<RealtimeConnectionState>;
  const materia = crearMateria();

  function evento(type: string, payload: unknown): RealtimeEvent {
    return { eventId: 'e', type, occurredAt: '2026-11-09T10:00:00Z', correlationId: null, payload };
  }

  beforeEach(() => {
    events$ = new Subject<RealtimeEvent>();
    estado$ = new BehaviorSubject<RealtimeConnectionState>('DISCONNECTED');
    realtime = jasmine.createSpyObj<RealtimeService>('RealtimeService', ['startForGroup', 'stop', 'events'], {
      connectionState$: estado$.asObservable(),
    });
    realtime.events.and.returnValue(events$.asObservable());
    claims = jasmine.createSpyObj<AttendanceClaimService>('AttendanceClaimService', [
      'subirSoporte', 'crearReclamo', 'getSesionesPorMateria', 'eliminarReclamo', 'getConfiguracionReclamos',
    ]);
    claims.getSesionesPorMateria.and.returnValue(of({ exitoso: true, datos: [] }) as never);
    claims.getConfiguracionReclamos.and.returnValue(of({ exitoso: true, datos: null }) as never);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);

    TestBed.configureTestingModule({
      imports: [StudentCoursesComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: AttendanceClaimService, useValue: claims },
        { provide: ToastService, useValue: toast },
        { provide: RealtimeService, useValue: realtime },
        { provide: StudentManagementService, useValue: { getMaterias: () => of({ exitoso: true, datos: [] }) } },
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'u-1' }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
        { provide: ConsultasTransversalesService, useValue: { getCategoriasJustificacion: () => of({ exitoso: true, datos: [] }) } },
      ],
    });
    component = TestBed.createComponent(StudentCoursesComponent).componentInstance;
    component.verDetalleCompleto(materia);
    claims.getSesionesPorMateria.calls.reset();
  });

  it('al abrir el detalle se suscribe al canal del grupo y al volver a la lista lo detiene', () => {
    expect(realtime.startForGroup).toHaveBeenCalledWith(materia.idGrupo);
    component.volverALista();
    expect(realtime.stop).toHaveBeenCalled();
    events$.next(evento('SESION_CANCELADA', { grupo: materia.idGrupo, sesion: 's', tipo: 'COORDINADOR', fechaHoraInicioUtc: null }));
    expect(claims.getSesionesPorMateria).not.toHaveBeenCalled();
  });

  it('SESION_MANUAL_CREADA del grupo avisa con docente y fecha y recarga las sesiones', () => {
    events$.next(evento('SESION_MANUAL_CREADA', {
      grupo: materia.idGrupo, sesion: 's', fechaHoraInicio: '2026-11-20T13:00:00Z', docente: 'Ana Pérez',
    }));
    const mensaje = toast.info.calls.mostRecent().args[0];
    expect(mensaje).toContain('Ana Pérez');
    expect(mensaje).toContain('2026');
    expect(claims.getSesionesPorMateria).toHaveBeenCalledTimes(1);
  });

  it('ignora eventos de otro grupo', () => {
    events$.next(evento('SESION_MANUAL_CREADA', { grupo: 'otro', sesion: 's', fechaHoraInicio: null, docente: 'X' }));
    events$.next(evento('SESION_CANCELADA', { grupo: 'otro', sesion: 's', tipo: 'COORDINADOR', fechaHoraInicioUtc: null }));
    events$.next(evento('OTRO_TIPO', { grupo: materia.idGrupo }));
    expect(toast.info).not.toHaveBeenCalled();
    expect(claims.getSesionesPorMateria).not.toHaveBeenCalled();
  });

  it('SESION_CANCELADA del grupo recarga sin avisar; la reconexión también recarga', () => {
    events$.next(evento('SESION_CANCELADA', { grupo: materia.idGrupo, sesion: 's', tipo: 'COORDINADOR', fechaHoraInicioUtc: null }));
    expect(claims.getSesionesPorMateria).toHaveBeenCalledTimes(1);
    expect(toast.info).not.toHaveBeenCalled();

    estado$.next('RECONNECTING');
    estado$.next('CONNECTED');
    expect(claims.getSesionesPorMateria).toHaveBeenCalledTimes(2);
  });

  it('destruir el componente detiene el canal', () => {
    realtime.stop.calls.reset();
    component.ngOnDestroy();
    expect(realtime.stop).toHaveBeenCalledTimes(1);
  });

  it('una materia sin idGrupo no abre el canal', () => {
    realtime.startForGroup.calls.reset();
    component.verDetalleCompleto({ ...materia, idGrupo: '' });
    expect(realtime.startForGroup).not.toHaveBeenCalled();
  });
});
