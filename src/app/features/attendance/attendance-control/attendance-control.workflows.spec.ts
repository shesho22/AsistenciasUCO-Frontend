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
import { AttendanceControlComponent } from './attendance-control.component';
import { AttendanceRealtimeSyncService } from './attendance-realtime-sync.service';

describe('AttendanceControlComponent public workflows', () => {
  let fixture: ComponentFixture<AttendanceControlComponent>;
  let courseService: jasmine.SpyObj<CourseService>;
  let sessionService: jasmine.SpyObj<SessionService>;
  let groupService: jasmine.SpyObj<GroupService>;
  let studentService: jasmine.SpyObj<StudentService>;
  let attendanceService: jasmine.SpyObj<AttendanceService>;
  let attendanceClaimService: jasmine.SpyObj<AttendanceClaimService>;
  let realtime: jasmine.SpyObj<AttendanceRealtimeSyncService>;
  let registrationConfig: jasmine.SpyObj<StudentRegistrationConfigService>;
  let emailVerification: jasmine.SpyObj<EmailVerificationService>;

  const course = {
    id: 'group-1',
    code: 'MAT-1',
    name: 'Materia',
    section: '1',
    schedule: 'Lunes',
    room: 'Aula 1',
    enrolledStudentsCount: 1,
    docenteName: 'Docente',
    colorCategory: 'emerald',
  };

  const session = {
    id: 'session-1',
    courseId: 'group-1',
    sessionNumber: 1,
    title: 'Sesión inicial',
    date: '2026-09-22',
    startTime: '08:00',
    endTime: '10:00',
    records: [],
  };

  beforeEach(() => {
    localStorage.setItem('USE_MOCKS', 'false');
    courseService = jasmine.createSpyObj('CourseService', ['getCurrentTeacherCourses']);
    sessionService = jasmine.createSpyObj('SessionService', ['getSessionsByGroup', 'createSession']);
    groupService = jasmine.createSpyObj('GroupService', ['getStudentsByGroup']);
    studentService = jasmine.createSpyObj('StudentService', ['enrollStudentInGroup']);
    attendanceService = jasmine.createSpyObj('AttendanceService', [
      'getAttendancesByGroup',
      'saveBatchAttendance',
    ]);
    realtime = jasmine.createSpyObj('AttendanceRealtimeSyncService', [
      'watch',
      'connectionAlerts',
      'connectGroup',
      'disconnect',
    ]);

    courseService.getCurrentTeacherCourses.and.returnValue(
      of({ exitoso: true, datos: [course] } as any)
    );
    sessionService.getSessionsByGroup.and.returnValue(
      of({ exitoso: true, datos: [session], total: 1 } as any)
    );
    groupService.getStudentsByGroup.and.returnValue(of({
      exitoso: true,
      datos: [{
        id: 'enrollment-1',
        idEstudiante: 'student-1',
        documento: '123456',
        nombreCompleto: 'Ada Lovelace',
        correo: 'ada@example.test',
        codigoEstado: 'A',
        nombreEstado: 'Activo',
      }],
      total: 1,
    }));
    attendanceService.getAttendancesByGroup.and.returnValue(
      of({ exitoso: true, datos: [], total: 0 })
    );
    attendanceService.saveBatchAttendance.and.returnValue(
      of({ exitoso: true, mensaje: 'Guardada' })
    );
    studentService.enrollStudentInGroup.and.returnValue(
      of({ exitoso: true, mensajeUsuario: 'Matriculada' })
    );
    realtime.watch.and.returnValue(NEVER);
    realtime.connectionAlerts.and.returnValue(NEVER);
    registrationConfig = jasmine.createSpyObj('StudentRegistrationConfigService', ['getEmailDomain']);
    registrationConfig.getEmailDomain.and.returnValue(of('@uco.edu.co'));
    emailVerification = jasmine.createSpyObj('EmailVerificationService', ['resendVerification']);
    emailVerification.resendVerification.and.returnValue(of({ exitoso: true, datos: null }));

    attendanceClaimService = jasmine.createSpyObj('AttendanceClaimService', [
      'getReclamosDocente',
      'resolverReclamo',
    ]);
    attendanceClaimService.getReclamosDocente.and.returnValue(
      of({ exitoso: true, datos: [] })
    );

    TestBed.configureTestingModule({
      imports: [AttendanceControlComponent],
      providers: [
        { provide: CourseService, useValue: courseService },
        { provide: SessionService, useValue: sessionService },
        { provide: GroupService, useValue: groupService },
        { provide: StudentService, useValue: studentService },
        { provide: AttendanceService, useValue: attendanceService },
        { provide: AttendanceClaimService, useValue: attendanceClaimService },
        {
          provide: CatalogService,
          useValue: { getIdentityDocumentTypes: () => of([]) },
        },
        { provide: AttendanceRealtimeSyncService, useValue: realtime },
        { provide: StudentRegistrationConfigService, useValue: registrationConfig },
        { provide: EmailVerificationService, useValue: emailVerification },
      ],
    });
  });

  afterEach(() => {
    fixture?.destroy();
    localStorage.removeItem('USE_MOCKS');
  });

  function createComponent(): AttendanceControlComponent {
    fixture = TestBed.createComponent(AttendanceControlComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('crea una sesión y selecciona la recién creada, sin topic/room/tipo en el payload', () => {
    // TARGET (PLAN.md LB-001B.1B, AS-IS #29/#5): onCreateSessionSubmit() alimenta el
    // ghost-parameter drift de createSession(); topic/room/tipo dejan de construirse aquí.
    const component = createComponent();
    const created = {
      ...session,
      id: 'session-2',
      sessionNumber: 2,
      title: 'Sesión contractual',
      date: '2026-09-23',
    };
    sessionService.createSession.and.returnValue(
      of({ exitoso: true, mensaje: 'Creada' })
    );
    sessionService.getSessionsByGroup.and.returnValue(
      of({ exitoso: true, datos: [session, created], total: 2 } as any)
    );

    component.openNewSessionModal();
    component.onCreateSessionSubmit({
      title: created.title,
      date: created.date,
      startTime: '10:00',
      endTime: '12:00',
    });

    const sentPayload = sessionService.createSession.calls.mostRecent().args[1] as Record<string, unknown>;
    expect(sentPayload['topic']).toBeUndefined();
    expect(sentPayload['room']).toBeUndefined();
    expect(sentPayload['tipo']).toBeUndefined();
    expect(component.selectedSessionId()).toBe('session-2');
    expect(component.isNewSessionModalOpen()).toBeFalse();
    expect(component.toastType()).toBe('success');
  });

  it('informa respuestas negativas y errores al crear una sesión', () => {
    const component = createComponent();
    const data = {
      title: 'Nueva',
      date: '2026-09-23',
      startTime: '10:00',
      endTime: '12:00',
      tipo: 'REGULAR',
    };
    sessionService.createSession.and.returnValue(
      of({ exitoso: false, mensaje: 'No autorizada' })
    );

    component.onCreateSessionSubmit(data);
    expect(component.toastMessage()).toBe('No autorizada');
    expect(component.isCreatingSession()).toBeFalse();

    sessionService.createSession.and.returnValue(
      throwError(() => new Error('fallo'))
    );
    component.onCreateSessionSubmit(data);
    expect(component.toastType()).toBe('error');
    expect(component.showToast()).toBeTrue();
  });

  it('matricula con contraseña explícita y refresca la sesión actual', () => {
    const component = createComponent();
    component.openStudentRegistration();

    component.onRegisterStudentSubmit({
      tipoIdentificacionId: 'tipo-1',
      numeroIdentificacion: '123456',
      primerNombre: ' Ada ',
      segundoNombre: ' Augusta ',
      primerApellido: ' Lovelace ',
      segundoApellido: '',
      correo: ' ada@example.test ',
      password: ' ClaveSegura1! ',
    });

    expect(studentService.enrollStudentInGroup).toHaveBeenCalledWith(jasmine.objectContaining({
      grupo: 'group-1',
      numeroIdentificacion: 123456,
      primerNombre: 'Ada',
      password: 'ClaveSegura1!',
    }));
    expect(component.isRegisterModalOpen()).toBeFalse();
    expect(component.studentFieldErrors()).toEqual({});
    expect(component.toastType()).toBe('success');
  });

  it('matricula un estudiante existente institucional sin fallos', () => {
    const component = createComponent();
    component.openStudentRegistration();

    component.onRegisterStudentSubmit({
      tipoIdentificacionId: 'tipo-1',
      numeroIdentificacion: '1017123456',
      primerNombre: 'Carlos',
      primerApellido: 'Perez',
      correo: 'carlos.perez@uco.edu.co',
      password: 'Temporal2026*',
    });

    expect(studentService.enrollStudentInGroup).toHaveBeenCalledWith(jasmine.objectContaining({
      grupo: 'group-1',
      numeroIdentificacion: 1017123456,
      primerNombre: 'Carlos',
      primerApellido: 'Perez',
      correoElectronico: 'carlos.perez@uco.edu.co',
    }));
    expect(component.isRegisterModalOpen()).toBeFalse();
    expect(component.toastType()).toBe('success');
  });

  it('mapea errores de campo devueltos por matrícula', () => {
    const component = createComponent();
    studentService.enrollStudentInGroup.and.returnValue(throwError(() =>
      new HttpErrorResponse({
        status: 400,
        error: {
          details: [{
            field: 'correo',
            code: 'DUPLICATE',
            message: 'El correo ya existe',
          }],
        },
      })
    ));

    component.onRegisterStudentSubmit({
      tipoIdentificacionId: 'tipo-1',
      numeroIdentificacion: '123456',
      primerNombre: 'Ada',
      primerApellido: 'Lovelace',
      correo: 'ada@example.test',
      password: 'ClaveSegura1!',
    });

    expect(component.studentFieldErrors()['correo']).toBe('El correo ya existe');
    expect(component.toastType()).toBe('error');
  });

  describe('IDENT-001 correo institucional y verificacion', () => {
    const nuevo = (correo: string) => ({
      tipoIdentificacionId: 'tipo-1',
      numeroIdentificacion: '1017123456',
      primerNombre: 'Carlos',
      primerApellido: 'Perez',
      correo,
      password: 'Temporal2026*',
      esNuevoEstudiante: true,
    });

    it('carga el dominio al abrir el registro y lo expone al modal', () => {
      const component = createComponent();

      component.openStudentRegistration();

      expect(registrationConfig.getEmailDomain).toHaveBeenCalledTimes(1);
      expect(component.emailDomain()).toBe('@uco.edu.co');
    });

    it('rechaza a un estudiante nuevo con correo no institucional sin llamar al backend', () => {
      const component = createComponent();
      component.openStudentRegistration();

      component.onRegisterStudentSubmit(nuevo('carlos@gmail.com'));

      expect(studentService.enrollStudentInGroup).not.toHaveBeenCalled();
      expect(component.studentFieldErrors()['correo']).toBe(
        'El correo del estudiante debe ser institucional y terminar en @uco.edu.co.'
      );
      expect(component.toastType()).toBe('error');
    });

    it('acepta a un estudiante nuevo con correo institucional', () => {
      const component = createComponent();
      component.openStudentRegistration();

      component.onRegisterStudentSubmit(nuevo('carlos.perez@UCO.edu.co'));

      expect(studentService.enrollStudentInGroup).toHaveBeenCalledTimes(1);
    });

    it('no aplica el dominio a un estudiante existente (solo se vincula)', () => {
      const component = createComponent();
      component.openStudentRegistration();

      component.onRegisterStudentSubmit({ ...nuevo('carlos@gmail.com'), esNuevoEstudiante: false });

      expect(studentService.enrollStudentInGroup).toHaveBeenCalledTimes(1);
    });

    it('si el dominio no pudo cargarse omite la pre-validacion y deja decidir al backend', () => {
      registrationConfig.getEmailDomain.and.returnValue(throwError(() => new Error('sin red')));
      const component = createComponent();
      component.openStudentRegistration();

      component.onRegisterStudentSubmit(nuevo('carlos@gmail.com'));

      expect(component.emailDomain()).toBe('');
      expect(studentService.enrollStudentInGroup).toHaveBeenCalledTimes(1);
    });

    it('reenvia el enlace del estudiante del grupo seleccionado y avisa del exito', () => {
      const component = createComponent();
      component.onCourseSelect('group-1');

      component.onResendVerification('student-1');

      expect(emailVerification.resendVerification).toHaveBeenCalledOnceWith('group-1', 'student-1');
      expect(component.resendingStudentId()).toBe('');
      expect(component.toastType()).toBe('success');
    });

    it('muestra el mensaje del backend si el reenvio falla (por ejemplo, espera de reenvio)', () => {
      emailVerification.resendVerification.and.returnValue(throwError(() =>
        new HttpErrorResponse({
          status: 409,
          error: { status: 409, code: 'VCE_005', message: 'Espere unos minutos antes de reenviar el enlace.' },
        })
      ));
      const component = createComponent();
      component.onCourseSelect('group-1');

      component.onResendVerification('student-1');

      expect(component.toastType()).toBe('error');
      expect(component.toastMessage()).toBe('Espere unos minutos antes de reenviar el enlace.');
      expect(component.resendingStudentId()).toBe('');
    });

    it('muestra el mensaje generico de la utilidad de errores si el reenvio falla sin detalle', () => {
      emailVerification.resendVerification.and.returnValue(throwError(() => new Error('')));
      const component = createComponent();
      component.onCourseSelect('group-1');

      component.onResendVerification('student-1');

      expect(component.toastType()).toBe('error');
      expect(component.toastMessage()).toBe('No fue posible completar la operación. Intente nuevamente.');
    });

    it('ignora reenvios sin grupo seleccionado o mientras hay otro en curso', () => {
      const component = createComponent();
      component.selectedCourseId.set('');
      component.onResendVerification('student-1');

      component.selectedCourseId.set('group-1');
      component.resendingStudentId.set('student-2');
      component.onResendVerification('student-1');

      expect(emailVerification.resendVerification).not.toHaveBeenCalled();
    });
  });

  it('marca todos como SJC y reporta un fallo al guardar', () => {
    const component = createComponent();
    component.markAllAbsent();
    expect(component.students()[0].status).toBe('SJC');

    attendanceService.saveBatchAttendance.and.returnValue(
      throwError(() => new Error('fallo de red'))
    );
    component.saveAttendance();

    expect(component.isSaving()).toBeFalse();
    expect(component.toastType()).toBe('error');
    expect(component.showToast()).toBeTrue();
  });

  it('muestra error visible si falla la fuente HTTP de estudiantes', () => {
    groupService.getStudentsByGroup.and.returnValue(
      throwError(() => new Error('sin conexión'))
    );
    const component = createComponent();

    expect(component.isLoadingSession()).toBeFalse();
    expect(component.toastType()).toBe('error');
    expect(component.showToast()).toBeTrue();
  });

  // --- LB-001B.1B: retiro del gate sintético isSessionConcluded, sin sustituto ---
  // TARGET (PLAN.md, riesgo #2 y sección TARGET pantallas ampliadas): el gate basado en
  // ClassSession.status ('CONCLUIDA') se retira sin sustituir por una nueva regla de UI;
  // el backend queda como única autoridad ante una operación inválida.

  it('openExcuseModal no depende de ningún estado de sesión', () => {
    sessionService.getSessionsByGroup.and.returnValue(
      of({
        exitoso: true,
        datos: [{ ...session }],
        total: 1,
      } as any)
    );
    const component = createComponent();

    component.openExcuseModal(component.students()[0]);

    expect(component.students()[0].status).toBe('EX');
  });

  it('markAllPresent/saveAttendance no dependen de ningún estado de sesión', () => {
    sessionService.getSessionsByGroup.and.returnValue(
      of({
        exitoso: true,
        datos: [{ ...session }],
        total: 1,
      } as any)
    );
    const component = createComponent();

    component.markAllPresent();
    expect(component.students()[0].status).toBe('AN');

    component.saveAttendance();
    expect(attendanceService.saveBatchAttendance).toHaveBeenCalled();
  });
});
