import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
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
import { AttendanceControlComponent } from './attendance-control.component';
import { AttendanceRealtimeSyncService } from './attendance-realtime-sync.service';
import { AttendanceControlTableComponent } from './components/attendance-control-table.component';
import { AttendanceControlHeaderComponent } from './components/attendance-control-header.component';

/**
 * SES-01: la toma ordinaria solo se habilita con la sesión activa, [inicio, fin) sobre los instantes v2.
 * Sesión 08:00-10:00 Bogotá = 13:00-15:00 UTC. El reloj del navegador solo controla la UI; un 409 del
 * backend nunca se muestra como éxito y descarta los cambios locales no confirmados.
 */
describe('AttendanceControlComponent SES-01 ventana estricta', () => {
  let fixture: ComponentFixture<AttendanceControlComponent>;
  let sessionService: jasmine.SpyObj<SessionService>;
  let groupService: jasmine.SpyObj<GroupService>;
  let attendanceService: jasmine.SpyObj<AttendanceService>;
  let nowMs: number;

  const course = {
    id: 'group-1', code: 'MAT-1', name: 'Materia', section: '1', schedule: 'Lunes', room: 'Aula 1',
    enrolledStudentsCount: 1, docenteName: 'Docente', colorCategory: 'emerald',
  };
  const confirmedSession = {
    id: 'session-1', courseId: 'group-1', sessionNumber: 1, title: 'Sesión', date: '2026-11-03',
    startTime: '08:00', endTime: '10:00', records: [],
    estadoTemporal: 'CONFIRMADA', procedenciaTemporal: 'UTC_V2',
    fechaHoraInicio: '2026-11-03T13:00:00Z', fechaHoraFin: '2026-11-03T15:00:00Z',
  };
  const closedSession = {
    ...confirmedSession, id: 'session-0', sessionNumber: 0, title: 'Sesión anterior', date: '2026-11-02',
    fechaHoraInicio: '2026-11-02T13:00:00Z', fechaHoraFin: '2026-11-02T15:00:00Z',
  };
  const indeterminateSession = {
    ...confirmedSession, id: 'session-2', sessionNumber: 2, estadoTemporal: 'INDETERMINADA',
    procedenciaTemporal: null, fechaHoraInicio: null, fechaHoraFin: null,
  };

  beforeEach(() => {
    localStorage.setItem('USE_MOCKS', 'false');
    nowMs = Date.parse('2026-11-03T14:00:00Z');
    const courseService = jasmine.createSpyObj<CourseService>('CourseService', ['getCurrentTeacherCourses']);
    sessionService = jasmine.createSpyObj('SessionService', ['getSessionsByGroup', 'createSession']);
    groupService = jasmine.createSpyObj('GroupService', ['getStudentsByGroup']);
    attendanceService = jasmine.createSpyObj('AttendanceService', ['getAttendancesByGroup', 'saveBatchAttendance']);
    const realtime = jasmine.createSpyObj<AttendanceRealtimeSyncService>('AttendanceRealtimeSyncService', [
      'watch', 'watchCancelaciones', 'connectionAlerts', 'connectGroup', 'disconnect',
    ]);
    const claims = jasmine.createSpyObj<AttendanceClaimService>('AttendanceClaimService', [
      'getReclamosDocente', 'getReclamosDocentePorGrupo', 'resolverReclamo',
    ]);
    const registrationConfig = jasmine.createSpyObj<StudentRegistrationConfigService>(
      'StudentRegistrationConfigService', ['getEmailDomain']);
    const emailVerification = jasmine.createSpyObj<EmailVerificationService>(
      'EmailVerificationService', ['resendVerification']);

    courseService.getCurrentTeacherCourses.and.returnValue(of({ exitoso: true, datos: [course] } as any));
    sessionService.getSessionsByGroup.and.returnValue(
      of({ exitoso: true, datos: [closedSession, confirmedSession, indeterminateSession], total: 3 } as any));
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
    (realtime as any).watchCancelaciones.and.returnValue(NEVER);
    realtime.connectionAlerts.and.returnValue(NEVER);
    claims.getReclamosDocente.and.returnValue(of({ exitoso: true, datos: [] }) as any);
    claims.getReclamosDocentePorGrupo.and.returnValue(of([]));
    registrationConfig.getEmailDomain.and.returnValue(of('@uco.edu.co'));
    emailVerification.resendVerification.and.returnValue(of({ exitoso: true, datos: null }) as any);

    TestBed.configureTestingModule({
      imports: [AttendanceControlComponent],
      providers: [
        { provide: CourseService, useValue: courseService },
        { provide: SessionService, useValue: sessionService },
        { provide: GroupService, useValue: groupService },
        { provide: StudentService, useValue: jasmine.createSpyObj('StudentService', ['enrollStudentInGroup']) },
        { provide: AttendanceService, useValue: attendanceService },
        { provide: AttendanceClaimService, useValue: claims },
        { provide: CatalogService, useValue: { getIdentityDocumentTypes: () => of([]) } },
        { provide: AttendanceRealtimeSyncService, useValue: realtime },
        { provide: StudentRegistrationConfigService, useValue: registrationConfig },
        { provide: EmailVerificationService, useValue: emailVerification },
        { provide: ATTENDANCE_NOW, useValue: () => nowMs },
      ],
    });
  });

  afterEach(() => {
    fixture?.destroy();
    localStorage.removeItem('USE_MOCKS');
  });

  function createInSession(sessionId: string): AttendanceControlComponent {
    fixture = TestBed.createComponent(AttendanceControlComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.onSessionSelect(sessionId);
    fixture.detectChanges();
    return component;
  }

  function table(): AttendanceControlTableComponent {
    return fixture.debugElement.query((el) => el.componentInstance instanceof AttendanceControlTableComponent)
      .componentInstance as AttendanceControlTableComponent;
  }

  function header(): AttendanceControlHeaderComponent {
    return fixture.debugElement.query((el) => el.componentInstance instanceof AttendanceControlHeaderComponent)
      .componentInstance as AttendanceControlHeaderComponent;
  }

  it('sesión activa: controles, marcado masivo y guardado habilitados', () => {
    const component = createInSession('session-1');

    expect(component.attendanceWindowState()).toBe('ABIERTA');
    expect(table().controlsDisabled()).toBeFalse();
    expect(header().bulkDisabled()).toBeFalse();

    component.markAllPresent();
    component.saveAttendance();

    expect(attendanceService.saveBatchAttendance).toHaveBeenCalledOnceWith({
      sesionId: 'session-1',
      registros: [{ estudianteId: 'student-1', estado: 'AN' }],
    });
  });

  it('sesión futura: bloquea cambio individual, marcado masivo y guardado', () => {
    nowMs = Date.parse('2026-11-03T12:59:59Z');
    const component = createInSession('session-1');

    expect(component.attendanceWindowState()).toBe('NO_INICIADA');
    expect(table().controlsDisabled()).toBeTrue();
    expect(header().bulkDisabled()).toBeTrue();
    component.onStudentStatusChange({ studentId: 'student-1', status: 'AN' });
    component.markAllAbsent();
    component.saveAttendance();

    expect(component.students()[0].status).toBeNull();
    expect(attendanceService.saveBatchAttendance).not.toHaveBeenCalled();
  });

  it('sesión cerrada (fin exacto): bloquea controles y muestra el mensaje de cierre', () => {
    nowMs = Date.parse('2026-11-03T15:00:00Z');
    const component = createInSession('session-1');

    expect(component.attendanceWindowState()).toBe('CERRADA');
    expect(table().controlsDisabled()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('La sesión ya finalizó');
    component.markAllPresent();
    component.saveAttendance();
    expect(attendanceService.saveBatchAttendance).not.toHaveBeenCalled();
  });

  it('procedencia INDETERMINADA: nunca habilita el registro', () => {
    const component = createInSession('session-2');

    expect(component.attendanceWindowState()).toBe('INDETERMINADA');
    expect(table().controlsDisabled()).toBeTrue();
  });

  it('al cambiar de sesión recalcula la habilitación', () => {
    const component = createInSession('session-1');
    expect(component.attendanceWindowOpen()).toBeTrue();

    component.onSessionSelect('session-0');
    fixture.detectChanges();

    expect(component.attendanceWindowState()).toBe('CERRADA');
    expect(table().controlsDisabled()).toBeTrue();
  });

  it('página abierta tras el cierre: bloquea y descarta los cambios no guardados', () => {
    const component = createInSession('session-1');
    component.onStudentStatusChange({ studentId: 'student-1', status: 'SJC' });
    expect(component.students()[0].status).toBe('SJC');
    const loadsBefore = attendanceService.getAttendancesByGroup.calls.count();

    nowMs = Date.parse('2026-11-03T15:00:00Z');
    component.refrescarVentanaAsistencia();
    fixture.detectChanges();

    expect(component.attendanceWindowState()).toBe('CERRADA');
    expect(table().controlsDisabled()).toBeTrue();
    expect(attendanceService.getAttendancesByGroup.calls.count()).toBeGreaterThan(loadsBefore);
    expect(component.students()[0].status).toBeNull();
    component.saveAttendance();
    expect(attendanceService.saveBatchAttendance).not.toHaveBeenCalled();
  });

  it('el reloj local avanzado no impide que el 409 del backend se trate como rechazo y no como éxito', () => {
    const component = createInSession('session-1');
    attendanceService.saveBatchAttendance.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: {
        timestamp: '2026-11-03T15:00:01Z', status: 409, error: 'Conflict', code: 'ERR_SESION_CERRADA',
        message: 'La sesion ya finalizo; la asistencia solo puede modificarse mediante un reclamo.',
        path: '/api/v1/asistencias/lote', correlationId: '43ecb554-7527-45f5-8107-8ef896f63455',
      },
    })));
    component.onStudentStatusChange({ studentId: 'student-1', status: 'AN' });
    const loadsBefore = attendanceService.getAttendancesByGroup.calls.count();

    component.saveAttendance();

    expect(component.toastType()).toBe('error');
    expect(component.toastMessage()).toContain('reclamo');
    expect(attendanceService.getAttendancesByGroup.calls.count()).toBeGreaterThan(loadsBefore);
    expect(component.students()[0].status).toBeNull();
  });
});
