import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, Observable, Subject, of, throwError } from 'rxjs';
import { AttendanceControlComponent } from './attendance-control.component';
import { CourseService } from '../../../core/services/course.service';
import { SessionService } from '../../../core/services/session.service';
import { GroupService } from '../../../core/services/group.service';
import { StudentService } from '../../../core/services/student.service';
import { AttendanceService } from '../../../core/services/attendance.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { AttendanceRealtimeSyncService } from './attendance-realtime-sync.service';
import { EstudianteGrupoApiDto } from '../../../core/api/models/estudiante-grupo-api-dto.model';
import { AsistenciaConsultadaApiDto } from '../../../core/api/models/asistencia-consultada-api-dto.model';
import { RealtimeConnectionState } from '../../../core/realtime/model/realtime-connection-state.model';

describe('AttendanceControlComponent contract corrections', () => {
  let courseService: jasmine.SpyObj<CourseService>;
  let sessionService: jasmine.SpyObj<SessionService>;
  let groupService: jasmine.SpyObj<GroupService>;
  let studentService: jasmine.SpyObj<StudentService>;
  let attendanceService: jasmine.SpyObj<AttendanceService>;
  let catalogService: jasmine.SpyObj<CatalogService>;
  let attendanceClaimService: jasmine.SpyObj<AttendanceClaimService>;
  let realtimeAlerts$: Subject<RealtimeConnectionState>;
  let realtimeSync: jasmine.SpyObj<AttendanceRealtimeSyncService> & {
    connectionAlerts: jasmine.Spy<() => Observable<RealtimeConnectionState>>;
  };
  let fixture: ComponentFixture<AttendanceControlComponent>;

  const activeStudent: EstudianteGrupoApiDto = {
    id: 'matricula-1',
    idEstudiante: 'student-active',
    documento: '1001',
    nombreCompleto: 'Ada Activa',
    correo: 'ada@example.test',
    codigoEstado: 'A',
    nombreEstado: 'Activo',
  };

  const cancelledStudent: EstudianteGrupoApiDto = {
    id: 'matricula-2',
    idEstudiante: 'student-cancelled',
    documento: '1002',
    nombreCompleto: 'Grace Cancelada',
    correo: 'grace@example.test',
    codigoEstado: 'C',
    nombreEstado: 'Cancelado',
  };

  const attendance = (
    studentId: string,
    estado: 'AN' | 'SJC' | 'EX'
  ): AsistenciaConsultadaApiDto => ({
    asistencia: `attendance-${studentId}`,
    estudiante: studentId,
    grupo: 'group-1',
    sesion: 'session-1',
    presente: estado === 'AN',
    estado,
    observacion: null,
  });

  beforeEach(() => {
    localStorage.setItem('USE_MOCKS', 'false');
    courseService = jasmine.createSpyObj<CourseService>('CourseService', [
      'getCurrentTeacherCourses',
    ]);
    sessionService = jasmine.createSpyObj<SessionService>('SessionService', [
      'getSessionsByGroup',
      'createSession',
    ]);
    groupService = jasmine.createSpyObj<GroupService>('GroupService', [
      'getStudentsByGroup',
      'getAllGroups',
      'descargarPlanillaExcel',
    ]);
    groupService.getAllGroups.and.returnValue(
      of({ exitoso: true, total: 1, datos: [{ id: 'group-1', capacidadMaximaPermitida: 40 }] } as any)
    );
    groupService.descargarPlanillaExcel.and.returnValue(
      of(new Blob(['test-excel'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    );
    studentService = jasmine.createSpyObj<StudentService>('StudentService', [
      'enrollStudentInGroup',
    ]);
    attendanceService = jasmine.createSpyObj<AttendanceService>(
      'AttendanceService',
      ['getAttendancesByGroup', 'saveBatchAttendance']
    );
    catalogService = jasmine.createSpyObj<CatalogService>('CatalogService', [
      'getIdentityDocumentTypes',
    ]);
    attendanceClaimService = jasmine.createSpyObj<AttendanceClaimService>(
      'AttendanceClaimService',
      ['getReclamosDocente', 'resolverReclamo']
    );
    attendanceClaimService.getReclamosDocente.and.returnValue(
      of({ exitoso: true, datos: [] })
    );
    realtimeAlerts$ = new Subject<RealtimeConnectionState>();
    realtimeSync = jasmine.createSpyObj<AttendanceRealtimeSyncService>(
      'AttendanceRealtimeSyncService',
      ['watch', 'connectGroup', 'disconnect', 'connectionAlerts'] as any
    ) as typeof realtimeSync;
    realtimeSync.watch.and.returnValue(NEVER);
    realtimeSync.connectionAlerts.and.returnValue(realtimeAlerts$.asObservable());

    catalogService.getIdentityDocumentTypes.and.returnValue(of([]));
    courseService.getCurrentTeacherCourses.and.returnValue(
      of({
        exitoso: true,
        datos: [
          {
            id: 'group-1',
            code: 'MAT-1',
            name: 'Materia',
            section: '1',
            schedule: 'Lunes',
            room: 'Aula',
            enrolledStudentsCount: 2,
            docenteName: 'Docente',
            colorCategory: 'emerald',
          },
        ],
      } as any)
    );
    sessionService.getSessionsByGroup.and.returnValue(
      of({
        exitoso: true,
        datos: [
          {
            id: 'session-1',
            courseId: 'group-1',
            sessionNumber: 1,
            title: 'Sesión',
            date: '2026-09-14',
            startTime: '08:00',
            endTime: '10:00',
            records: [],
          },
        ],
      } as any)
    );
    attendanceService.saveBatchAttendance.and.returnValue(
      of({ exitoso: true, mensaje: 'ok' })
    );
    studentService.enrollStudentInGroup.and.returnValue(
      of({ exitoso: true, mensajeUsuario: 'ok' })
    );

    TestBed.configureTestingModule({
      imports: [AttendanceControlComponent],
      providers: [
        { provide: CourseService, useValue: courseService },
        { provide: SessionService, useValue: sessionService },
        { provide: GroupService, useValue: groupService },
        { provide: StudentService, useValue: studentService },
        { provide: AttendanceService, useValue: attendanceService },
        { provide: CatalogService, useValue: catalogService },
        { provide: AttendanceClaimService, useValue: attendanceClaimService },
        { provide: AttendanceRealtimeSyncService, useValue: realtimeSync },
      ],
    });
  });

  afterEach(() => {
    fixture?.destroy();
    localStorage.removeItem('USE_MOCKS');
  });

  function createComponent(
    students: EstudianteGrupoApiDto[] = [activeStudent],
    attendances: AsistenciaConsultadaApiDto[] = []
  ): AttendanceControlComponent {
    groupService.getStudentsByGroup.and.returnValue(
      of({ exitoso: true, datos: students, total: students.length })
    );
    attendanceService.getAttendancesByGroup.and.returnValue(
      of({ exitoso: true, datos: attendances, total: attendances.length })
    );
    fixture = TestBed.createComponent(AttendanceControlComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('no envía un lote vacío cuando nadie fue marcado explícitamente', () => {
    const component = createComponent([activeStudent], []);

    component.saveAttendance();

    expect(attendanceService.saveBatchAttendance).not.toHaveBeenCalled();
  });

  it('incluye solo matrículas A y NO reenvía estados persistidos sin cambios', () => {
    const component = createComponent(
      [activeStudent, cancelledStudent],
      [
        attendance(activeStudent.idEstudiante, 'AN'),
        attendance(cancelledStudent.idEstudiante, 'SJC'),
      ]
    );

    expect(component.students().map((student) => student.studentId)).toEqual([
      activeStudent.idEstudiante,
    ]);
    expect(component.students()[0].status).toBe('AN');

    component.saveAttendance();

    expect(attendanceService.saveBatchAttendance).not.toHaveBeenCalled();
  });

  it('batch parcial: solo se envía lo que el usuario seleccionó/modificó', () => {
    const second: EstudianteGrupoApiDto = {
      ...activeStudent,
      id: 'matricula-3',
      idEstudiante: 'student-second',
      documento: '1003',
      nombreCompleto: 'Alan Segundo',
    };
    const third: EstudianteGrupoApiDto = {
      ...activeStudent,
      id: 'matricula-4',
      idEstudiante: 'student-third',
      documento: '1004',
      nombreCompleto: 'Tercero Omitido',
    };
    const component = createComponent(
      [activeStudent, second, third],
      [attendance(activeStudent.idEstudiante, 'AN')]
    );

    // Sin fila persistida => "Sin registrar" (null), jamás AN sintético.
    expect(component.students().map((s) => s.status)).toEqual(['AN', null, null]);

    component.setStatus(second.idEstudiante, 'EX');
    component.setStatus(activeStudent.idEstudiante, 'SJC');
    component.saveAttendance();

    expect(attendanceService.saveBatchAttendance).toHaveBeenCalledOnceWith({
      sesionId: 'session-1',
      registros: [
        { estudianteId: activeStudent.idEstudiante, estado: 'SJC' },
        { estudianteId: second.idEstudiante, estado: 'EX' },
      ],
    });
    const body = attendanceService.saveBatchAttendance.calls.mostRecent().args[0];
    for (const registro of body.registros) {
      expect(Object.keys(registro).sort()).toEqual(['estado', 'estudianteId']);
    }
    expect(Object.keys(body).sort()).toEqual(['registros', 'sesionId']);
  });

  it('un estudiante sin asistencia persistida queda null y no se envía hasta que el usuario elige', () => {
    const component = createComponent([activeStudent], []);

    expect(component.students()[0].status).toBeNull();
    component.saveAttendance();
    expect(attendanceService.saveBatchAttendance).not.toHaveBeenCalled();
  });

  it('tras guardar, el siguiente guardado no reenvía lo ya persistido', () => {
    const component = createComponent([activeStudent], []);
    component.setStatus(activeStudent.idEstudiante, 'AN');
    component.saveAttendance();
    expect(attendanceService.saveBatchAttendance).toHaveBeenCalledTimes(1);

    component.saveAttendance();
    expect(attendanceService.saveBatchAttendance).toHaveBeenCalledTimes(1);
  });

  it('markAllPresent marca AN explícitamente y permite guardar', () => {
    const component = createComponent([activeStudent], []);

    component.markAllPresent();
    component.saveAttendance();

    expect(attendanceService.saveBatchAttendance).toHaveBeenCalledOnceWith({
      sesionId: 'session-1',
      registros: [
        { estudianteId: activeStudent.idEstudiante, estado: 'AN' },
      ],
    });
  });

  it('marca EX directamente sin capturar causa u observación', () => {
    const component = createComponent([activeStudent], []);

    component.openExcuseModal(component.students()[0]);
    fixture.detectChanges();

    expect(component.students()[0].status).toBe('EX');
    expect(
      fixture.nativeElement.querySelector('app-attendance-excuse-modal')
    ).toBeNull();
  });

  it('exige contraseña explícita antes de matricular', () => {
    const component = createComponent();

    component.onRegisterStudentSubmit({
      tipoIdentificacionId: 'tipo-1',
      numeroIdentificacion: '123456',
      primerNombre: 'Ada',
      primerApellido: 'Lovelace',
      correo: 'ada@example.test',
      password: '   ',
    });

    expect(studentService.enrollStudentInGroup).not.toHaveBeenCalled();
    expect(component.studentFieldErrors()['password']).toBeTruthy();
  });

  it('muestra feedback cuando falla la carga de sesiones', () => {
    sessionService.getSessionsByGroup.and.returnValue(
      throwError(() => new Error('session load failed'))
    );
    const component = createComponent();

    expect(component.sessions()).toEqual([]);
    expect(component.showToast()).toBeTrue();
    expect(component.toastType()).toBe('error');
    expect(component.toastMessage()).toContain('sesiones');
  });

  it('mantiene una lista vacía válida sin mostrar error', () => {
    sessionService.getSessionsByGroup.and.returnValue(
      of({ exitoso: true, datos: [], total: 0 } as any)
    );
    const component = createComponent();

    expect(component.sessions()).toEqual([]);
    expect(component.showToast()).toBeFalse();
  });

  it('grupo asignado sin horario ni código: aparece en el selector y carga sus dos sesiones', () => {
    const grupoId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
    courseService.getCurrentTeacherCourses.and.returnValue(
      of({
        exitoso: true,
        total: 1,
        datos: [
          {
            id: grupoId,
            name: 'Arquitectura de Software',
            section: 'Grupo 001 - Arq Software',
            schedule: '',
            asignaturaId: 'e2f3a4b5-0000-0000-0000-000000000001',
            colorCategory: 'emerald',
          },
        ],
      })
    );
    sessionService.getSessionsByGroup.and.returnValue(
      of({
        exitoso: true,
        total: 2,
        datos: [1, 2].map((n) => ({
          id: `sesion-${n}`,
          courseId: grupoId,
          sessionNumber: n,
          title: `Sesión ${n}`,
          date: '2026-09-14',
          startTime: '08:00',
          endTime: '10:00',
          records: [],
        })),
      } as any)
    );
    const component = createComponent();

    expect(component.courseOptions()).toEqual([
      { value: grupoId, label: 'Arquitectura de Software (Grupo 001 - Arq Software)' },
    ] as any);
    expect(component.selectedCourseId()).toBe(grupoId);
    expect(sessionService.getSessionsByGroup).toHaveBeenCalledWith(grupoId);
    expect(component.sessions().length).toBe(2);
    expect(component.showToast()).toBeFalse();
  });

  it('muestra feedback útil ante UNAUTHORIZED realtime', () => {
    const component = createComponent();

    realtimeAlerts$.next('UNAUTHORIZED');

    expect(component.showToast()).toBeTrue();
    expect(component.toastType()).toBe('error');
    expect(component.toastMessage()).toContain('sesión');
  });

  // La Sesion no tiene estado contractual: no existe gate de UI por estado de sesión.
  it('permite marcar EX sin ningún gate por estado de sesión', () => {
    sessionService.getSessionsByGroup.and.returnValue(
      of({
        exitoso: true,
        datos: [
          {
            id: 'session-1',
            courseId: 'group-1',
            sessionNumber: 1,
            title: 'Sesión',
            date: '2026-09-14',
            startTime: '08:00',
            endTime: '10:00',
            records: [],
          },
        ],
      } as any)
    );
    const component = createComponent([activeStudent], []);

    component.openExcuseModal(component.students()[0]);

    expect(component.students()[0].status).toBe('EX');
  });

  it('permite alternar entre vista OVERVIEW y DETALLE', () => {
    const component = createComponent([activeStudent], []);

    component.volverAOverview();
    expect(component.vistaActual()).toBe('OVERVIEW');
    expect(component.selectedSessionId()).toBe('');

    component.irASesionDetalle('session-1');
    expect(component.vistaActual()).toBe('DETALLE');
    expect(component.selectedSessionId()).toBe('session-1');

    component.onSessionSelect('session-1');
    expect(component.selectedSessionId()).toBe('session-1');
  });

  it('onClearStudentFieldError elimina el error del campo especificado', () => {
    const component = createComponent([activeStudent], []);
    component.studentFieldErrors.set({ primerNombre: 'Requerido', correo: 'Invalido' });

    component.onClearStudentFieldError('primerNombre');
    expect(component.studentFieldErrors()['primerNombre']).toBeUndefined();
    expect(component.studentFieldErrors()['correo']).toBe('Invalido');
  });

  it('onRegisterStudentSubmit valida campos y rechaza formulario incompleto', () => {
    const component = createComponent([activeStudent], []);

    component.onRegisterStudentSubmit({
      numeroIdentificacion: '',
      primerNombre: '',
      primerApellido: '',
      correo: 'correo-invalido',
      tipoIdentificacionId: '',
    });

    expect(component.showToast()).toBeTrue();
    expect(component.toastType()).toBe('error');
    expect(component.studentFieldErrors()['primerNombre']).toBeTruthy();
    expect(component.studentFieldErrors()['correo']).toBeTruthy();
  });

  it('descargarPlanillaExcel invoca servicio y muestra toast exitoso', () => {
    const component = createComponent([activeStudent], []);
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:http://localhost/test');
    spyOn(window.URL, 'revokeObjectURL');

    component.descargarPlanillaExcel();

    expect(groupService.descargarPlanillaExcel).toHaveBeenCalledWith('group-1');
    expect(component.showToast()).toBeTrue();
    expect(component.toastType()).toBe('success');
    expect(component.toastMessage()).toContain('descargada');
  });

  it('descargarPlanillaExcel muestra error si el servicio falla', () => {
    const component = createComponent([activeStudent], []);
    groupService.descargarPlanillaExcel.and.returnValue(
      throwError(() => new Error('Error al generar planilla'))
    );

    component.descargarPlanillaExcel();

    expect(component.showToast()).toBeTrue();
    expect(component.toastType()).toBe('error');
  });

  it('navega hacia la lista de grupos y bandeja general de reclamos', () => {
    const component = createComponent([activeStudent], []);

    component.volverAListaGrupos();
    component.irABandejaGeneralReclamos();

    expect(component.isGroupClaimsModalOpen()).toBeFalse();
  });

  it('abre modales de información del grupo, reclamos y proyección de sesión', () => {
    const component = createComponent([activeStudent], []);

    component.abrirProyeccionDeSesion('session-1');
    expect(component.selectedSessionId()).toBe('session-1');
    expect(component.isProjectionModalOpen()).toBeTrue();

    component.abrirInfoGrupo();
    expect(component.isGroupInfoModalOpen()).toBeTrue();
    expect(groupService.getStudentsByGroup).toHaveBeenCalledWith('group-1');

    component.abrirReclamosGrupo();
    expect(component.isGroupClaimsModalOpen()).toBeTrue();
  });

  it('resolverReclamoGrupo procesa respuesta exitosa y actualiza toast', () => {
    attendanceClaimService.resolverReclamo.and.returnValue(
      of({ exitoso: true, mensajeUsuario: 'Reclamo aprobado.' } as any)
    );
    const component = createComponent([activeStudent], []);

    component.resolverReclamoGrupo({ id: 'rec-1', accion: 'APROBADA' });

    expect(attendanceClaimService.resolverReclamo).toHaveBeenCalled();
    expect(component.showToast()).toBeTrue();
    expect(component.toastType()).toBe('success');
    expect(component.toastMessage()).toBe('Reclamo aprobado.');
  });

  it('onCreateSessionSubmit crea sesión exitosamente y actualiza lista', () => {
    sessionService.createSession.and.returnValue(
      of({ exitoso: true, mensaje: 'Sesión creada.', datos: { id: 'ses-nueva' } } as any)
    );
    const component = createComponent([activeStudent], []);

    component.onCreateSessionSubmit({
      title: 'Sesión de Clase 2',
      date: '2026-09-20',
      startTime: '08:00',
      endTime: '10:00',
    });

    expect(sessionService.createSession).toHaveBeenCalled();
    expect(component.showToast()).toBeTrue();
    expect(component.toastType()).toBe('success');
    expect(component.isNewSessionModalOpen()).toBeFalse();
  });

  it('onStudentStatusChange actualiza el estado del estudiante', () => {
    const component = createComponent([activeStudent], []);

    component.onStudentStatusChange({ studentId: 'student-active', status: 'AN' });

    const student = component.students().find((s) => s.studentId === 'student-active');
    expect(student?.status).toBe('AN');
  });
});
