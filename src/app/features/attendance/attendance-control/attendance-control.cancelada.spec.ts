import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TeacherMatrizAsistenciaService } from '../../../core/services/teacher-matriz-asistencia.service';
import { TomaAsistenciaService } from '../../../core/services/toma-asistencia.service';
import { AsistenciaQrService } from '../../../core/services/asistencia-qr.service';
import { NEVER, Subject, of, throwError } from 'rxjs';
import { apiHttpError } from '../../../core/testing/api-error.fixture';
import { AttendanceService } from '../../../core/services/attendance.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { CourseService } from '../../../core/services/course.service';
import { GroupService } from '../../../core/services/group.service';
import { SessionService } from '../../../core/services/session.service';
import { StudentService } from '../../../core/services/student.service';
import { StudentRegistrationConfigService } from '../../../core/services/student-registration-config.service';
import { EmailVerificationService } from '../../../core/services/email-verification.service';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { ATTENDANCE_NOW } from '../../../core/utils/attendance-now.token';
import { RealtimeEvent, SesionCanceladaRealtimePayload } from '../../../core/realtime/model/realtime-event.model';
import { AttendanceControlComponent } from './attendance-control.component';
import { AttendanceRealtimeSyncService } from './attendance-realtime-sync.service';
import { AttendanceControlTableComponent } from './components/attendance-control-table.component';

/**
 * CULM-001 B.1 (HU047): una sesión cancelada se ve como tal en la toma de asistencia, no admite tomas y el SSE
 * `SESION_CANCELADA` actualiza la lista sin recargar.
 */
describe('AttendanceControlComponent sesión cancelada (B.1)', () => {
  let fixture: ComponentFixture<AttendanceControlComponent>;
  let attendanceService: jasmine.SpyObj<AttendanceService>;
  let cancelaciones$: Subject<RealtimeEvent<SesionCanceladaRealtimePayload>>;
  let watchCancelaciones: jasmine.Spy;
  let sessionService: { cancelarSesion: jasmine.Spy };

  const course = {
    id: 'group-1', code: 'MAT-1', name: 'Materia', section: '1', schedule: 'Lunes', room: 'Aula 1',
    enrolledStudentsCount: 1, docenteName: 'Docente', colorCategory: 'emerald',
  };
  const programada = {
    id: 'session-1', courseId: 'group-1', sessionNumber: 1, title: 'Sesión', date: '2026-11-03',
    startTime: '08:00', endTime: '10:00', records: [],
    estadoTemporal: 'CONFIRMADA', procedenciaTemporal: 'UTC_V2',
    fechaHoraInicio: '2026-11-03T13:00:00Z', fechaHoraFin: '2026-11-03T15:00:00Z',
    estado: 'PROGRAMADA', cancelacion: null,
  };
  const cancelada = {
    ...programada, id: 'session-2', sessionNumber: 2, title: 'Sesión cancelada',
    estado: 'CANCELADA',
    cancelacion: { tipo: 'DOCENTE', motivo: 'Incapacidad médica del docente', nombreFestivo: null, fechaCancelacionUtc: null },
  };

  beforeEach(() => {
    localStorage.setItem('USE_MOCKS', 'false');
    cancelaciones$ = new Subject();
    const courseService = jasmine.createSpyObj<CourseService>('CourseService', ['getCurrentTeacherCourses']);
    const sessionServiceSpy = jasmine.createSpyObj('SessionService', ['getSessionsByGroup', 'createSession', 'cancelarSesion']);
    sessionService = sessionServiceSpy;
    const groupService = jasmine.createSpyObj('GroupService', ['getStudentsByGroup']);
    attendanceService = jasmine.createSpyObj('AttendanceService', ['getAttendancesByGroup', 'saveBatchAttendance']);
    const realtime = jasmine.createSpyObj<AttendanceRealtimeSyncService>('AttendanceRealtimeSyncService', [
      'watch', 'watchCancelaciones', 'watchTomas', 'connectionAlerts', 'connectGroup', 'disconnect',
    ]);
    const claims = jasmine.createSpyObj<AttendanceClaimService>('AttendanceClaimService', [
      'getReclamosDocente', 'getReclamosDocentePorGrupo', 'resolverReclamo',
    ]);
    const registrationConfig = jasmine.createSpyObj<StudentRegistrationConfigService>(
      'StudentRegistrationConfigService', ['getEmailDomain']);
    const emailVerification = jasmine.createSpyObj<EmailVerificationService>(
      'EmailVerificationService', ['resendVerification']);

    courseService.getCurrentTeacherCourses.and.returnValue(of<never>({ exitoso: true, datos: [course] } as never));
    sessionServiceSpy.getSessionsByGroup.and.returnValue(
      of({ exitoso: true, datos: [programada, cancelada], total: 2 } as never));
    groupService.getStudentsByGroup.and.returnValue(of({
      exitoso: true,
      datos: [{
        id: 'enrollment-1', idEstudiante: 'student-1', documento: '123456', nombreCompleto: 'Ada Lovelace',
        correo: 'ada@example.test', codigoEstado: 'A', nombreEstado: 'Activo',
      }],
      total: 1,
    }));
    attendanceService.getAttendancesByGroup.and.returnValue(of({ exitoso: true, datos: [], total: 0 }));
    attendanceService.saveBatchAttendance.and.returnValue(of({ exitoso: true, mensaje: 'Guardada' }));
    realtime.watch.and.returnValue(NEVER);
    watchCancelaciones = realtime.watchCancelaciones.and.returnValue(cancelaciones$.asObservable());
    realtime['watchTomas'].and.returnValue(NEVER);
    realtime.connectionAlerts.and.returnValue(NEVER);
    claims.getReclamosDocente.and.returnValue(of({ exitoso: true, datos: [] }) as never);
    claims.getReclamosDocentePorGrupo.and.returnValue(of({ exitoso: true, datos: [], total: 0 }));
    registrationConfig.getEmailDomain.and.returnValue(of('@uco.edu.co'));
    emailVerification.resendVerification.and.returnValue(of({ exitoso: true, datos: null }) as never);

    TestBed.configureTestingModule({
      imports: [AttendanceControlComponent],
      providers: [
        { provide: CourseService, useValue: courseService },
        { provide: SessionService, useValue: sessionServiceSpy },
        { provide: GroupService, useValue: groupService },
        { provide: StudentService, useValue: jasmine.createSpyObj('StudentService', ['enrollStudentInGroup']) },
        { provide: AttendanceService, useValue: attendanceService },
        { provide: TomaAsistenciaService, useValue: { consultarTomas: () => NEVER, abrirToma: () => NEVER, cerrarToma: () => NEVER, registrarAsistencias: () => NEVER, consultarFaltantes: () => NEVER } },
        { provide: TeacherMatrizAsistenciaService, useValue: { consultarResumenSesiones: () => NEVER } },
        { provide: AsistenciaQrService, useValue: { abrirQr: () => NEVER, rotarQr: () => NEVER, cerrarQr: () => NEVER } },
        { provide: AttendanceClaimService, useValue: claims },
        { provide: CatalogService, useValue: { getIdentityDocumentTypes: () => of([]) } },
        { provide: AttendanceRealtimeSyncService, useValue: realtime },
        { provide: StudentRegistrationConfigService, useValue: registrationConfig },
        { provide: EmailVerificationService, useValue: emailVerification },
        { provide: ATTENDANCE_NOW, useValue: () => Date.parse('2026-11-03T14:00:00Z') },
      ],
    });
  });

  afterEach(() => {
    fixture?.destroy();
    localStorage.removeItem('USE_MOCKS');
  });

  function crear(sessionId?: string): AttendanceControlComponent {
    fixture = TestBed.createComponent(AttendanceControlComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    if (sessionId) {
      component.onSessionSelect(sessionId);
      fixture.detectChanges();
    }
    return component;
  }

  function table(): AttendanceControlTableComponent {
    return fixture.debugElement.query((el) => el.componentInstance instanceof AttendanceControlTableComponent)
      .componentInstance as AttendanceControlTableComponent;
  }

  function evento(sesion: string, grupo = 'group-1'): RealtimeEvent<SesionCanceladaRealtimePayload> {
    return {
      eventId: 'e-1', type: 'SESION_CANCELADA', occurredAt: '2026-11-03T14:00:00Z', correlationId: null,
      payload: { grupo, sesion, tipo: 'DOCENTE', fechaHoraInicioUtc: '2026-11-03T13:00:00Z' },
    };
  }

  it('B1-F-16 el selector deshabilita la sesión cancelada y la rotula con "Cancelada" y el motivo', () => {
    const component = crear();

    const opciones = component.sessionOptions();
    const opcionCancelada = opciones.find((o) => o.value === 'session-2');
    expect(opcionCancelada?.disabled).toBeTrue();
    expect(opcionCancelada?.label).toContain('Cancelada');
    expect(opcionCancelada?.label).toContain('Incapacidad médica del docente');
    expect(opciones.find((o) => o.value === 'session-1')?.disabled).toBeFalsy();
  });

  it('B1-F-16 una sesión cancelada seleccionada bloquea controles, marcado masivo y guardado sin llamar al backend', () => {
    const component = crear('session-2');

    expect(component.attendanceWindowState()).toBe('CANCELADA');
    expect(table().controlsDisabled()).toBeTrue();
    component.onStudentStatusChange({ studentId: 'student-1', status: 'AN' });
    component.markAllPresent();
    component.saveAttendance();

    expect(attendanceService.saveBatchAttendance).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('cancelada');
    expect(fixture.nativeElement.textContent).toContain('Incapacidad médica del docente');
  });

  it('B1-F-17 SESION_CANCELADA del grupo actual marca la sesión como cancelada sin recargar por HTTP', () => {
    const component = crear('session-1');
    expect(component.attendanceWindowState()).toBe('ABIERTA');
    attendanceService.getAttendancesByGroup.calls.reset();

    cancelaciones$.next(evento('session-1'));
    fixture.detectChanges();

    expect(component.attendanceWindowState()).toBe('CANCELADA');
    expect(component.sessionOptions().find((o) => o.value === 'session-1')?.disabled).toBeTrue();
    expect(attendanceService.getAttendancesByGroup).not.toHaveBeenCalled();
  });

  it('B1-F-17 se suscribe a las cancelaciones del grupo seleccionado', () => {
    crear();

    expect(watchCancelaciones).toHaveBeenCalled();
    const getGroup = watchCancelaciones.calls.mostRecent().args[0] as () => string;
    expect(getGroup()).toBe('group-1');
  });

  describe('MEJORAS-SERGIO 10: cancelar una sesión desde el cronograma de /app/asistencia', () => {
    const boton = (n: number) => (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(`[data-testid="cancelar-sesion-${n}"]`);

    it('ofrece «Cancelar» solo en las sesiones no canceladas y abre el modal con motivo', () => {
      const component = crear();
      expect(boton(1)).not.toBeNull();
      expect(boton(2)).toBeNull();
      const abrirToma = spyOn(component, 'irASesionDetalle');

      boton(1)!.click();
      fixture.detectChanges();
      expect(component.sesionACancelar()?.id).toBe('session-1');
      expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="cancelar-panel"]')).not.toBeNull();
      expect(abrirToma).not.toHaveBeenCalled();
    });

    it('con la cancelación registrada marca la sesión, avisa cuántos estudiantes se notificaron y cierra el modal', () => {
      sessionService.cancelarSesion.and.returnValue(of({
        exitoso: true,
        datos: {
          idSesion: 'session-1', idGrupo: 'group-1', estado: 'CANCELADA', estudiantesNotificados: 3,
          cancelacion: { tipo: 'DOCENTE', motivo: 'Calamidad doméstica del docente', nombreFestivo: null, fechaCancelacionUtc: null },
        },
      }) as never);
      const component = crear();
      component.abrirCancelarSesion(component.sessions()[0]);
      component.confirmarCancelarSesion('  Calamidad doméstica del docente  ');
      fixture.detectChanges();

      expect(sessionService.cancelarSesion).toHaveBeenCalledWith('session-1', 'Calamidad doméstica del docente');
      expect(component.sessions().find((s) => s.id === 'session-1')?.estado).toBe('CANCELADA');
      expect(component.sesionACancelar()).toBeNull();
      expect(component.toastMessage()).toBe('Sesión cancelada. Estudiantes notificados: 3.');
      expect(boton(1)).toBeNull();
    });

    it('un rechazo del backend (p. ej. SES_012) se muestra en el modal y la sesión no cambia', () => {
      sessionService.cancelarSesion.and.returnValue(throwError(() => apiHttpError(409, 'La sesión ya tiene asistencia registrada.')));
      const component = crear();
      component.abrirCancelarSesion(component.sessions()[0]);
      component.confirmarCancelarSesion('Motivo suficientemente largo');
      fixture.detectChanges();

      expect(component.errorCancelar()).toBe('La sesión ya tiene asistencia registrada.');
      expect(component.sesionACancelar()?.id).toBe('session-1');
      expect(component.enviandoCancelacion()).toBeFalse();
      expect(component.sessions().find((s) => s.id === 'session-1')?.estado).toBe('PROGRAMADA');
    });

    it('no abre el modal para una sesión ya cancelada', () => {
      const component = crear();
      component.abrirCancelarSesion(component.sessions()[1]);
      expect(component.sesionACancelar()).toBeNull();
    });
  });

  it('B1-F-18 la actualización por SSE y el bloqueo de la toma no usan polling: setInterval no se invoca', () => {
    // El modal de proyección heredado arma su propio temporizador al instanciarse (lo retira B.2); este spec
    // acota la afirmación al flujo de cancelación: se espía después de crear la pantalla.
    crear();
    const spy = spyOn(window, 'setInterval').and.callThrough();

    cancelaciones$.next(evento('session-1'));
    fixture.componentInstance.onSessionSelect('session-1');
    fixture.detectChanges();

    expect(fixture.componentInstance.attendanceWindowState()).toBe('CANCELADA');
    expect(spy).not.toHaveBeenCalled();
  });
});
