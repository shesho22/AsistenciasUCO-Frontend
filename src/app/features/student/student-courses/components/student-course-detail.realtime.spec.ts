import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { StudentCourseDetailComponent } from './student-course-detail.component';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { RealtimeConnectionState } from '../../../../core/realtime/model/realtime-connection-state.model';
import { RealtimeEvent, REALTIME_EVENT_TYPE } from '../../../../core/realtime/model/realtime-event.model';
import { ToastService } from '../../../../shared/components/toast/toast.component';
import { MateriaEstudianteItem } from '../../../../core/models/role-management.model';
import { crearMateria, crearSesion } from '../../../../core/testing/student-portal.fixtures';

describe('StudentCourseDetailComponent — Tiempo real y estado CI (CULM-001 C.1 §4.3, §4.8)', () => {
  let fixture: ComponentFixture<StudentCourseDetailComponent>;
  let component: StudentCourseDetailComponent;
  let realtimeSpy: jasmine.SpyObj<RealtimeService>;
  let toastSpy: jasmine.SpyObj<ToastService>;
  let connectionState$: Subject<RealtimeConnectionState>;
  let events$: Subject<RealtimeEvent>;

  const materiaActiva: MateriaEstudianteItem = crearMateria({
    id: 'asig-1',
    idGrupo: 'grp-1',
    nombre: 'Bases de Datos',
    estadoMatricula: 'A',
  });

  const materiaCancelada: MateriaEstudianteItem = crearMateria({
    id: 'asig-1',
    idGrupo: 'grp-1',
    nombre: 'Bases de Datos',
    estadoMatricula: 'CI',
  });

  beforeEach(() => {
    connectionState$ = new Subject<RealtimeConnectionState>();
    events$ = new Subject<RealtimeEvent>();

    realtimeSpy = jasmine.createSpyObj('RealtimeService', ['startForGroup', 'stop', 'events', 'listenType'], {
      connectionState$: connectionState$.asObservable(),
    });
    realtimeSpy.events.and.returnValue(events$.asObservable());
    realtimeSpy.listenType.and.returnValue(events$.asObservable());

    toastSpy = jasmine.createSpyObj('ToastService', ['show', 'error', 'success', 'warning', 'info']);

    TestBed.configureTestingModule({
      imports: [StudentCourseDetailComponent],
      providers: [
        { provide: RealtimeService, useValue: realtimeSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    });

    fixture = TestBed.createComponent(StudentCourseDetailComponent);
    component = fixture.componentInstance;
  });

  it('C-F-46 con estadoMatricula="CI" no llama a startForGroup, muestra Cancelado por inasistencia y bloquea reclamos', () => {
    fixture.componentRef.setInput('materia', materiaCancelada);
    fixture.componentRef.setInput('sesiones', [
      crearSesion({ id: 's-1', estadoAsistencia: 'AUSENTE', reclamable: true }),
    ]);
    fixture.detectChanges();

    expect(realtimeSpy.startForGroup).not.toHaveBeenCalled();

    const badgeCI = fixture.nativeElement.querySelector('[data-testid="badge-estado-matricula"]') as HTMLElement;
    expect(badgeCI?.textContent).toContain('Cancelado por inasistencia');

    // Botones de reclamo bloqueados/no presentes para matrícula cancelada
    const btnReclamo = fixture.nativeElement.querySelector('[data-testid="btn-iniciar-reclamo"]');
    expect(btnReclamo).toBeFalsy();
  });

  it('C-F-47 con estadoMatricula="A" llama a startForGroup(grupoId)', () => {
    fixture.componentRef.setInput('materia', materiaActiva);
    fixture.detectChanges();

    expect(realtimeSpy.startForGroup).toHaveBeenCalledWith('grp-1');
  });

  it('C-F-48 recarga ante reconexión y eventos SSE (exactamente 3 emisiones)', () => {
    spyOn(component.retry, 'emit');

    fixture.componentRef.setInput('materia', materiaActiva);
    fixture.detectChanges();

    // 1. Carga inicial: ya fue disparada por el padre o componente
    // 2. Primera conexión: no debe recargar
    connectionState$.next('CONNECTING');
    connectionState$.next('CONNECTED');
    expect(component.retry.emit).toHaveBeenCalledTimes(0);

    // 3. Reconexión: RECONNECTING -> CONNECTED
    connectionState$.next('RECONNECTING');
    connectionState$.next('CONNECTED');
    expect(component.retry.emit).toHaveBeenCalledTimes(1);

    // 4. Evento de sesión actualizada
    events$.next({
      eventId: 'evt-1',
      type: REALTIME_EVENT_TYPE.ASISTENCIAS_SESION_ACTUALIZADAS,
      occurredAt: '2026-11-08T10:00:00Z',
      correlationId: null,
      payload: { grupo: 'grp-1', sesion: 's-1', totalRegistros: 20 },
    });
    expect(component.retry.emit).toHaveBeenCalledTimes(2);
  });

  it('C-F-49 ante evento ALERTA_INASISTENCIA muestra notificación toast', () => {
    fixture.componentRef.setInput('materia', materiaActiva);
    fixture.detectChanges();

    events$.next({
      eventId: 'evt-2',
      type: REALTIME_EVENT_TYPE.ALERTA_INASISTENCIA,
      occurredAt: '2026-11-08T10:00:00Z',
      correlationId: null,
      payload: {
        grupo: 'grp-1',
        alerta: 'alt-1',
        estudianteGrupo: 'eg-1',
        tipo: 'ADVERTENCIA',
        porcentajeInasistencia: 16,
        umbral: 15,
      },
    });

    expect(toastSpy.warning).toHaveBeenCalled();
  });

  it('C-F-50 llama a stop() al destruirse', () => {
    fixture.componentRef.setInput('materia', materiaActiva);
    fixture.detectChanges();

    fixture.destroy();
    expect(realtimeSpy.stop).toHaveBeenCalled();
  });
});
