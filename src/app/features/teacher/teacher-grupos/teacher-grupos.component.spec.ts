import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { filter } from 'rxjs/operators';
import { TeacherGruposComponent } from './teacher-grupos.component';
import { CourseService } from '../../../core/services/course.service';
import { AttendanceService } from '../../../core/services/attendance.service';
import { SessionService } from '../../../core/services/session.service';
import { StudentService } from '../../../core/services/student.service';
import { GroupService } from '../../../core/services/group.service';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { TeacherAttendanceSummaryService } from '../../../core/services/teacher-attendance-summary.service';
import { Course } from '../../../core/models/course.model';
import { ClassSession } from '../../../core/models/attendance.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { apiHttpError } from '../../../core/testing/api-error.fixture';
import { HttpErrorResponse } from '@angular/common/http';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { RealtimeEvent, SesionCanceladaRealtimePayload, SesionManualCreadaRealtimePayload } from '../../../core/realtime/model/realtime-event.model';

// LB-001B.1B (DB source of truth cleanup): AS-IS #20 (docenteName hardcodeado y enviado en
// el payload de crearGrupo/actualizarGrupo), #21 (selección de sesión activa por status) y
// #22 (síntesis nueva AN/SJC por paridad de ID, hallazgo no cubierto por LB-001B.1A).

describe('TeacherGruposComponent', () => {
  let fixture: ComponentFixture<TeacherGruposComponent>;
  let component: TeacherGruposComponent;
  let courseService: jasmine.SpyObj<CourseService>;
  let sessionService: jasmine.SpyObj<SessionService>;
  let studentService: jasmine.SpyObj<StudentService>;
  let claimService: jasmine.SpyObj<AttendanceClaimService>;
  let router: jasmine.SpyObj<Router>;
  let attendanceService: jasmine.SpyObj<AttendanceService>;
  let realtimeEvents$: Subject<RealtimeEvent<SesionCanceladaRealtimePayload | SesionManualCreadaRealtimePayload>>;
  let realtime: jasmine.SpyObj<RealtimeService>;

  const course: Course = {
    id: 'crs-1',
    code: 'MAT-301',
    name: 'Matemática Avanzada III',
    section: 'Sección A',
    schedule: 'Lun, Mié 08:00 - 10:00 AM',
    room: 'Aula A-204',
    enrolledStudentsCount: 32,
    cupoMaximo: 35,
    docenteName: 'Dra. María Elena Rostagno',
    colorCategory: 'emerald',
  };

  beforeEach(() => {
    courseService = jasmine.createSpyObj<CourseService>('CourseService', [
      'getTeacherCourses',
      'getAsignaturasDocente',
      'crearGrupo',
      'actualizarGrupo',
    ]);
    sessionService = jasmine.createSpyObj<SessionService>('SessionService', [
      'getSessionsByGroup',
      'cancelarSesion',
      'createSession',
      'updateSession',
    ]);
    studentService = jasmine.createSpyObj<StudentService>('StudentService', [
      'getStudentsByGroup',
    ]);
    claimService = jasmine.createSpyObj<AttendanceClaimService>('AttendanceClaimService', [
      'getReclamosDocentePorGrupo',
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    attendanceService = jasmine.createSpyObj<AttendanceService>('AttendanceService', ['getAttendancesByGroup']);
    attendanceService.getAttendancesByGroup.and.returnValue(of({ exitoso: true, datos: [], total: 0 }) as never);
    const resumenService = jasmine.createSpyObj<TeacherAttendanceSummaryService>('TeacherAttendanceSummaryService', ['consultarResumen']);
    resumenService.consultarResumen.and.returnValue(
      of({ exitoso: true, elementos: [], numeroPagina: 1, tamanoPagina: 100, totalElementos: 0, totalPaginas: 0 }) as never
    );

    courseService.getTeacherCourses.and.returnValue(
      of({ exitoso: true, datos: [course] } as any)
    );
    courseService.getAsignaturasDocente.and.returnValue(
      of({ exitoso: true, datos: [] } as any)
    );
    claimService.getReclamosDocentePorGrupo.and.returnValue(of([]) as never);
    studentService.getStudentsByGroup.and.returnValue(
      of({ exitoso: true, datos: [] } as any)
    );
    sessionService.getSessionsByGroup.and.returnValue(
      of({ exitoso: true, datos: [], total: 0 } as any)
    );

    let groupService = jasmine.createSpyObj<GroupService>('GroupService', [
      'getStudentsByGroup',
      'getAllGroups',
    ]);
    groupService.getAllGroups.and.returnValue(
      of({ exitoso: true, total: 1, datos: [{ id: 'crs-1', capacidadMaximaPermitida: 35 }] } as any)
    );

    realtimeEvents$ = new Subject();
    realtime = jasmine.createSpyObj<RealtimeService>('RealtimeService', ['listenType', 'startForGroup', 'stop', 'events']);
    realtime.listenType.and.callFake(((tipo: string) => realtimeEvents$.pipe(filter((e) => e.type === tipo))) as never);
    realtime.events.and.returnValue(new Subject<RealtimeEvent>().asObservable());

    TestBed.configureTestingModule({
      imports: [TeacherGruposComponent],
      providers: [
        { provide: RealtimeService, useValue: realtime },
        { provide: CourseService, useValue: courseService },
        { provide: SessionService, useValue: sessionService },
        { provide: GroupService, useValue: groupService },
        { provide: StudentService, useValue: studentService },
        { provide: AttendanceClaimService, useValue: claimService },
        { provide: Router, useValue: router },
        { provide: AttendanceService, useValue: attendanceService },
        { provide: TeacherAttendanceSummaryService, useValue: resumenService },
        // HU058: catálogo real de tipos de programa para el filtro "Nivel formativo".
        { provide: CatalogService, useValue: { getTiposPrograma: () => of([{ id: 'TP-PRE', codigo: 'PRE', nombre: 'pregrado' }]) } },
      ],
    });

    fixture = TestBed.createComponent(TeacherGruposComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });




  it('muestra un grupo asignado sin horario ni código, sin inventar datos', () => {
    courseService.getTeacherCourses.and.returnValue(
      of({
        exitoso: true,
        datos: [
          {
            id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
            name: 'Arquitectura de Software',
            section: 'Grupo 001 - Arq Software',
            schedule: '',
            asignaturaId: 'e2f3a4b5-0000-0000-0000-000000000001',
            colorCategory: 'emerald',
          },
        ],
      } as any)
    );

    component.cargarGrupos();
    fixture.detectChanges();

    expect(component.courses().length).toBe(1);
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Arquitectura de Software');
    expect(text).toContain('Grupo 001 - Arq Software');
    expect(text).toContain('Sin horario asignado');
    expect(text).not.toContain('undefined');
  });



  // --- LB-001B.5A: acciones de sesión fuera de BACKEND_GOLDEN_PATH_CONTRACT ---

  it('B2-F-15 el QR (HU175) esta habilitado y el bloque de proyeccion con temporizador fue retirado', () => {
    expect(component.sessionQrEnabled).toBeTrue();
    expect(component.sessionCancelEnabled).toBeTrue();
    const interno = component as unknown as Record<string, unknown>;
    for (const retirado of ['datosQr', 'segundosRestantes', 'modalProyeccionVisible', 'refrescarQrManual', 'iniciarTimerQr']) {
      expect(interno[retirado]).toBeUndefined();
    }
  });

  it('B2-F-15 proyectar el QR de un grupo o de una sesion lleva a la pantalla de asistencia sin llamar al backend', () => {
    const navigate = router.navigate.and.resolveTo(true);
    const sesion: ClassSession = {
      id: 'ses-1', courseId: 'crs-1', sessionNumber: 1, title: 'S',
      date: '2026-09-10', startTime: '08:00', endTime: '10:00', records: [],
    };
    component.verHubGrupo(course);

    component.proyectarQrGrupo(course);
    expect(navigate).toHaveBeenCalledWith(['/app/asistencia'], { queryParams: { courseId: course.id } });

    component.proyectarSesionEspecifica(sesion);
    expect(navigate).toHaveBeenCalledWith(['/app/asistencia'], { queryParams: { courseId: course.id, sessionId: 'ses-1' } });
  });

  it('actualizar sesión consume ApiDataResponse<Void>: éxito con solo `exitoso` recarga por HTTP', () => {
    sessionService.updateSession.and.returnValue(of({ exitoso: true, datos: null }));
    component.verHubGrupo(course);
    sessionService.getSessionsByGroup.calls.reset();
    component.abrirEditarSesion({
      id: 'ses-1', courseId: 'crs-1', sessionNumber: 1, title: 'Editada',
      date: '2026-09-10', startTime: '08:00', endTime: '10:00', records: [],
    });

    component.guardarSesion();

    expect(sessionService.updateSession).toHaveBeenCalledTimes(1);
    expect(sessionService.getSessionsByGroup).toHaveBeenCalledWith('crs-1');
  });

  it('F3-DOC-01: la sábana recibe el estado por sesión desde GET /grupos/{id}/asistencias', () => {
    sessionService.getSessionsByGroup.and.returnValue(of({
      exitoso: true,
      total: 2,
      datos: [
        { id: 'ses-1', courseId: 'crs-1', sessionNumber: 1, title: 'S1', date: '2026-09-10', startTime: '08:00', endTime: '10:00', records: [] },
        { id: 'ses-2', courseId: 'crs-1', sessionNumber: 2, title: 'S2', date: '2026-09-17', startTime: '08:00', endTime: '10:00', records: [] },
      ],
    } as any));
    attendanceService.getAttendancesByGroup.and.returnValue(of({
      exitoso: true,
      total: 2,
      datos: [
        { asistencia: 'a1', estudiante: 'est-1', grupo: 'crs-1', sesion: 'ses-1', presente: true, estado: 'AN', observacion: null },
        { asistencia: 'a2', estudiante: 'est-1', grupo: 'crs-1', sesion: 'ses-2', presente: false, estado: 'EX', observacion: null },
      ],
    } as any));

    studentService.getStudentsByGroup.and.returnValue(
      of({ exitoso: true, datos: [{ idEstudiante: 'est-1', nombreCompleto: 'Ana Gomez', documento: '1001', codigoEstado: 'A' }] }) as never
    );

    component.verHubGrupo(course);

    expect(attendanceService.getAttendancesByGroup).toHaveBeenCalledWith('crs-1');
    const [s1, s2] = component.sessionsConRegistros();
    expect(s1.records.map((r) => [r.studentId, r.status])).toEqual([['est-1', 'AN']]);
    expect(s2.records.map((r) => [r.studentId, r.status])).toEqual([['est-1', 'EX']]);
  });

  it('F3-DOC-01: si falla la consulta de asistencias las sesiones se muestran igual sin estados', () => {
    sessionService.getSessionsByGroup.and.returnValue(of({
      exitoso: true,
      total: 1,
      datos: [{ id: 'ses-1', courseId: 'crs-1', sessionNumber: 1, title: 'S1', date: '2026-09-10', startTime: '08:00', endTime: '10:00', records: [] }],
    } as any));
    attendanceService.getAttendancesByGroup.and.returnValue(throwError(() => new Error('x')));

    component.verHubGrupo(course);

    expect(component.sessionsConRegistros().length).toBe(1);
    expect(component.sessionsConRegistros()[0].records).toEqual([]);
  });

  it('abrirDetalleSesionModal() ya no sintetiza AN/SJC por paridad del ID del estudiante', () => {
    const sesionConcluida: ClassSession = {
      id: 'ses-1',
      courseId: 'crs-1',
      sessionNumber: 1,
      title: 'Sesión',
      date: '2026-09-10',
      startTime: '08:00',
      endTime: '10:00',
      records: [],
    };
    component.verHubGrupo(course);
    studentService.getStudentsByGroup.and.returnValue(
      of({
        exitoso: true,
        datos: [
          { id: 'student-2', studentName: 'Estudiante Dos', studentCode: '002' },
          { id: 'student-3', studentName: 'Estudiante Tres', studentCode: '003' },
        ],
      } as any)
    );

    component.abrirDetalleSesionModal(sesionConcluida);

    const detalle = component.sesionDetalle();
    expect(detalle?.records ?? []).toEqual([]);
  });

  it('al seleccionar un grupo de la lista, navega a la vista de asistencia del curso', () => {
    spyOn(component, 'tomarAsistenciaGrupo').and.callThrough();
    const listElement = fixture.nativeElement.querySelector('app-teacher-grupos-list');
    expect(listElement).toBeTruthy();

    component.tomarAsistenciaGrupo(course);

    expect(component.tomarAsistenciaGrupo).toHaveBeenCalledWith(course);
    expect(router.navigate).toHaveBeenCalledWith(['/app/asistencia'], {
      queryParams: { courseId: course.id },
    });
  });

  it('guardarSesion crea una nueva sesión cuando modoFormSesion es CREAR', () => {
    sessionService.createSession.and.returnValue(of({ exitoso: true, mensaje: 'Sesión creada' } as any));
    component.verHubGrupo(course);
    component.abrirCrearSesionExtraordinaria();
    component.sesionForm = {
      title: 'Sesión de repaso',
      date: '2026-09-15',
      startTime: '08:00',
      endTime: '10:00',
      sessionNumber: 1,
    };

    component.guardarSesion();

    expect(sessionService.createSession).toHaveBeenCalled();
  });

  it('DEC-065 (2): tras solicitar la sesión muestra el mensajeUsuario del backend tal cual', () => {
    const toastSuccess = spyOn(TestBed.inject(ToastService), 'success');
    sessionService.createSession.and.returnValue(of({ exitoso: true, mensaje: 'x', mensajeUsuario: 'Solicitud enviada; queda pendiente de aprobación.' } as any));
    component.verHubGrupo(course);
    component.abrirCrearSesionExtraordinaria();
    component.sesionForm = { title: 'Sesión de repaso', date: '2026-09-15', startTime: '08:00', endTime: '10:00', sessionNumber: 1 };

    component.guardarSesion();

    expect(toastSuccess).toHaveBeenCalledOnceWith('Solicitud enviada; queda pendiente de aprobación.');
  });

  it('DEC-065 (2): sin mensajeUsuario usa mensaje y, sin ninguno, el aviso de solicitud pendiente', () => {
    const toastSuccess = spyOn(TestBed.inject(ToastService), 'success');
    sessionService.createSession.and.returnValues(
      of({ exitoso: true, mensaje: 'Sesión creada' } as any),
      of({ exitoso: true } as any)
    );
    component.verHubGrupo(course);
    component.abrirCrearSesionExtraordinaria();
    component.sesionForm = { title: 'Sesión de repaso', date: '2026-09-15', startTime: '08:00', endTime: '10:00', sessionNumber: 1 };

    component.guardarSesion();
    component.guardarSesion();

    expect(toastSuccess.calls.allArgs()).toEqual([
      ['Sesión creada'],
      ['La sesión queda pendiente hasta que el coordinador del programa la apruebe.'],
    ]);
  });

  it('A2-F-09 un 400 SES_017 al crear una sesión muestra el message del backend, sin texto local', () => {
    const toastError = spyOn(TestBed.inject(ToastService), 'error');
    sessionService.createSession.and.returnValue(throwError(() => apiHttpError(400, 'La sesión se cruza con otra sesión del grupo o del docente en ese horario.', 'VALIDATION_ERROR')));
    component.verHubGrupo(course);
    component.abrirCrearSesionExtraordinaria();
    component.sesionForm = { title: 'Repaso', date: '2026-09-15', startTime: '08:00', endTime: '10:00', sessionNumber: 1 };

    component.guardarSesion();

    expect(toastError).toHaveBeenCalledOnceWith('La sesión se cruza con otra sesión del grupo o del docente en ese horario.');
  });

  it('A2-F-09 un 400 SES_017 al editar una sesión muestra el message del backend', () => {
    const toastError = spyOn(TestBed.inject(ToastService), 'error');
    sessionService.updateSession.and.returnValue(throwError(() => apiHttpError(400, 'La sesión se cruza con otra sesión del grupo o del docente en ese horario.', 'VALIDATION_ERROR')));
    component.verHubGrupo(course);
    component.abrirEditarSesion({
      id: 'ses-1', courseId: 'crs-1', sessionNumber: 1, title: 'Editada',
      date: '2026-09-10', startTime: '08:00', endTime: '10:00', records: [],
    });

    component.guardarSesion();

    expect(toastError).toHaveBeenCalledOnceWith('La sesión se cruza con otra sesión del grupo o del docente en ese horario.');
  });

  it('guardarSesion valida campos obligatorios antes de enviar', () => {
    component.verHubGrupo(course);
    component.abrirCrearSesionExtraordinaria();
    component.sesionForm = { title: '', date: '', startTime: '', endTime: '', sessionNumber: 1 };
    component.guardarSesion();
    expect(sessionService.createSession).not.toHaveBeenCalled();

    component.sesionForm = { title: 'Valida', date: '', startTime: '08:00', endTime: '10:00', sessionNumber: 1 };
    component.guardarSesion();
    expect(sessionService.createSession).not.toHaveBeenCalled();
  });

  it('guardarSesion permite una sesión que cruza medianoche y delega la conversión UTC V2', () => {
    sessionService.createSession.and.returnValue(of({ exitoso: true, mensaje: 'Sesión creada' } as any));
    component.verHubGrupo(course);
    component.abrirCrearSesionExtraordinaria();
    component.sesionForm = {
      title: 'Sesión nocturna',
      date: '2026-09-15',
      startTime: '23:30',
      endTime: '01:30',
      sessionNumber: 1,
    };

    component.guardarSesion();

    expect(sessionService.createSession).toHaveBeenCalledWith('crs-1', {
      title: 'Sesión nocturna',
      date: '2026-09-15',
      startTime: '23:30',
      endTime: '01:30',
    });
  });

  it('permite abrir y cerrar modal de matrícula de grupo', () => {
    component.abrirModalMatriculaGrupo(course);
    expect(component.modalMatriculaGrupoVisible()).toBeTrue();
    expect(component.grupoMatricula()).toBe(course);

    component.cerrarModalMatriculaGrupo();
    expect(component.modalMatriculaGrupoVisible()).toBeFalse();
    expect(component.grupoMatricula()).toBeNull();
  });

  it('permite cancelar sesión con la bandera activa (B.1)', () => {
    sessionService.cancelarSesion.and.returnValue(
      of({ exitoso: true, datos: { idSesion: 'ses-cancelar', idGrupo: 'crs-1', estado: 'CANCELADA', cancelacion: null, estudiantesNotificados: 0 } } as any)
    );
    component.verHubGrupo(course);
    const sesion: ClassSession = {
      id: 'ses-cancelar',
      courseId: 'crs-1',
      sessionNumber: 2,
      title: 'Sesión por cancelar',
      date: '2026-09-20',
      startTime: '08:00',
      endTime: '10:00',
      records: [],
    };

    component.abrirModalCancelarSesion(sesion);
    expect(component.modalCancelarVisible()).toBeTrue();
    expect(component.sesionACancelar()).toBe(sesion);

    component.confirmarCancelarSesionConMotivo('Incapacidad médica docente');
    expect(sessionService.cancelarSesion).toHaveBeenCalledWith('ses-cancelar', 'Incapacidad médica docente');
    expect(component.modalCancelarVisible()).toBeFalse();
  });



  it('HU051 RT-11 abre el modal de retiro con el estudiante y, tras retirarlo, recarga el padrón', () => {
    component.selectedCourse.set(course);
    component.abrirModalRetiro({ idEstudiante: 'est-1', nombreCompleto: 'Ana Gómez' });
    expect(component.estudianteARetirar()).toEqual({ idEstudiante: 'est-1', nombreCompleto: 'Ana Gómez' });

    studentService.getStudentsByGroup.calls.reset();
    component.onEstudianteRetirado();

    expect(component.estudianteARetirar()).toBeNull();
    expect(studentService.getStudentsByGroup).toHaveBeenCalledWith('crs-1');
  });

  it('HU051 RT-12 acepta la forma heredada (studentId) y no abre el modal sin identificador', () => {
    component.abrirModalRetiro({ studentId: 'est-2', studentName: 'Luis' });
    expect(component.estudianteARetirar()).toEqual({ idEstudiante: 'est-2', nombreCompleto: 'Luis' });

    component.estudianteARetirar.set(null);
    component.abrirModalRetiro({ nombreCompleto: 'Sin id' });
    expect(component.estudianteARetirar()).toBeNull();

    component.selectedCourse.set(null);
    studentService.getStudentsByGroup.calls.reset();
    component.onEstudianteRetirado();
    expect(studentService.getStudentsByGroup).not.toHaveBeenCalled();
  });
  describe('APP-05 reclamos por grupo', () => {
    const GROUP_A = '3f0c1d2e-0000-4000-8000-000000000001';
    const GROUP_B = '3f0c1d2e-0000-4000-8000-000000000002';
    const claim = (id: string, grupoId: string) => ({ id, grupoId } as any);

    it('solicita el UUID seleccionado y no retiene filas de otro grupo', () => {
      claimService.getReclamosDocentePorGrupo.and.returnValue(of([
        claim('a-1', GROUP_A),
        claim('b-1', GROUP_B),
      ]) as never);

      component.verHubGrupo({ ...course, id: GROUP_A });

      expect(claimService.getReclamosDocentePorGrupo).toHaveBeenCalledOnceWith(GROUP_A);
      expect(component.reclamosGrupo().map((item) => item.id)).toEqual(['a-1']);
      expect(component.estadoCargaReclamos()).toBe('LOADED');
    });

    it('descarta la respuesta pendiente del grupo anterior al cambiar rápidamente', () => {
      const anterior = new Subject<any[]>();
      const actual = new Subject<any[]>();
      claimService.getReclamosDocentePorGrupo.and.returnValues(anterior.asObservable() as never, actual.asObservable() as never);

      component.verHubGrupo({ ...course, id: GROUP_A });
      expect(component.estadoCargaReclamos()).toBe('LOADING');
      component.verHubGrupo({ ...course, id: GROUP_B });
      anterior.next([claim('a-1', GROUP_A)]);
      actual.next([claim('b-1', GROUP_B)]);

      expect(component.reclamosGrupo().map((item) => item.id)).toEqual(['b-1']);
      expect(component.reclamosGrupo()[0].grupoId).toBe(GROUP_B);
      expect(component.estadoCargaReclamos()).toBe('LOADED');
    });

    it('no duplica una consulta activa del mismo grupo', () => {
      const pendiente = new Subject<any[]>();
      claimService.getReclamosDocentePorGrupo.and.returnValue(pendiente.asObservable() as never);
      const grupo = { ...course, id: GROUP_A };

      component.verHubGrupo(grupo);
      component.cargarReclamosGrupo(GROUP_A);

      expect(claimService.getReclamosDocentePorGrupo).toHaveBeenCalledOnceWith(GROUP_A);
    });

    it('distingue 403, 501, red y error HTTP de una lista vacía', () => {
      const casos = [
        { status: 403, esperado: 'FORBIDDEN' },
        { status: 501, esperado: 'UNAVAILABLE' },
        { status: 0, esperado: 'NETWORK_ERROR' },
        { status: 500, esperado: 'SERVER_ERROR' },
      ] as const;

      for (const caso of casos) {
        claimService.getReclamosDocentePorGrupo.and.returnValue(
          throwError(() => ({ status: caso.status })) as never
        );
        component.verHubGrupo({ ...course, id: GROUP_A });
        expect(component.estadoCargaReclamos()).toBe(caso.esperado);
        expect(component.reclamosGrupo()).toEqual([]);
      }
    });
  });

  it('HU058: carga el catálogo de tipos de programa para el filtro de nivel formativo', () => {
    expect(component.tiposPrograma().map((t) => t.codigo)).toEqual(['PRE']);
  });

  // Certificación Fase 3: el hub (retiro HU051, solicitudes HU053-HU055) no era alcanzable desde la pantalla.
  it('HU051/HU053: ?grupo=<id> abre el hub de ese grupo; un id ajeno deja la lista', () => {
    const conGrupo = (id: string) => ({ snapshot: { queryParamMap: convertToParamMap({ grupo: id }) } });

    (component as unknown as { route: unknown }).route = conGrupo('otro-grupo');
    component.cargarGrupos();
    expect(component.vistaActual()).toBe('LISTA');

    (component as unknown as { route: unknown }).route = conGrupo('crs-1');
    component.cargarGrupos();
    expect(component.vistaActual()).toBe('HUB_GRUPO');
    expect(component.selectedCourse()?.id).toBe('crs-1');
    expect(sessionService.getSessionsByGroup).toHaveBeenCalled();
  });

  describe('cancelar sesión y SSE (HU047, CULM-001 B.1)', () => {
    const sesion: ClassSession = {
      id: 'ses-1', courseId: 'crs-1', sessionNumber: 1, title: 'S1', date: '2026-11-10',
      startTime: '08:00', endTime: '10:00', records: [], estado: 'PROGRAMADA', cancelacion: null,
    };
    const respuesta = {
      exitoso: true,
      datos: {
        idSesion: 'ses-1', idGrupo: 'crs-1', estado: 'CANCELADA',
        cancelacion: { tipo: 'DOCENTE', motivo: 'Incapacidad médica del docente', nombreFestivo: null, fechaCancelacionUtc: '2026-11-10T14:00:00Z' },
        estudiantesNotificados: 12,
      },
    };

    function abrirHub(): void {
      sessionService.getSessionsByGroup.and.returnValue(of({ exitoso: true, datos: [sesion], total: 1 } as any));
      component.verHubGrupo(course);
      sessionService.getSessionsByGroup.calls.reset();
    }

    function eventoCancelada(grupo: string, id: string): RealtimeEvent<SesionCanceladaRealtimePayload> {
      return {
        eventId: 'e', type: 'SESION_CANCELADA', occurredAt: '2026-11-10T14:00:00Z', correlationId: null,
        payload: { grupo, sesion: id, tipo: 'DOCENTE', fechaHoraInicioUtc: null },
      };
    }

    it('B1-F-20 al cancelar con éxito actualiza la sesión con la respuesta, cierra el modal y no recarga por HTTP', () => {
      sessionService.cancelarSesion.and.returnValue(of(respuesta as any));
      abrirHub();
      component.abrirModalCancelarSesion(sesion);

      component.confirmarCancelarSesionConMotivo('  Incapacidad médica del docente  ');

      expect(sessionService.cancelarSesion).toHaveBeenCalledWith('ses-1', 'Incapacidad médica del docente');
      expect(component.sessions()[0].estado).toBe('CANCELADA');
      expect(component.sessions()[0].cancelacion?.motivo).toBe('Incapacidad médica del docente');
      expect(component.modalCancelarVisible()).toBeFalse();
      expect(component.errorCancelar()).toBeNull();
      expect(sessionService.getSessionsByGroup).not.toHaveBeenCalled();
    });

    for (const codigo of ['SES_011', 'SES_012', 'SES_013', 'SES_016']) {
      it(`B1-F-21 ${codigo}: muestra el mensaje del backend en el modal y lo mantiene abierto`, () => {
        const mensaje = `Mensaje del backend para ${codigo}`;
        sessionService.cancelarSesion.and.returnValue(throwError(() => new HttpErrorResponse({
          status: 409,
          error: { timestamp: 't', status: 409, error: 'Conflict', code: codigo, message: mensaje, path: '/p', correlationId: null },
        })));
        abrirHub();
        component.abrirModalCancelarSesion(sesion);

        component.confirmarCancelarSesionConMotivo('Motivo suficientemente largo');

        expect(component.errorCancelar()).toBe(mensaje);
        expect(component.modalCancelarVisible()).toBeTrue();
        expect(component.enviandoCancelacion()).toBeFalse();
        expect(component.sessions()[0].estado).toBe('PROGRAMADA');
      });
    }

    it('B1-F-21 abrir de nuevo el modal limpia el error anterior', () => {
      component.errorCancelar.set('viejo');
      component.abrirModalCancelarSesion(sesion);
      expect(component.errorCancelar()).toBeNull();
    });

    it('B1-F-22 al abrir el hub se conecta al stream del grupo y escucha SESION_CANCELADA', () => {
      abrirHub();

      expect(realtime.startForGroup).toHaveBeenCalledWith('crs-1');
      expect(realtime.listenType).toHaveBeenCalledWith('SESION_CANCELADA');
    });

    it('B1-F-22 SESION_CANCELADA del grupo marca la sesión sin recargar por HTTP', () => {
      abrirHub();

      realtimeEvents$.next(eventoCancelada('crs-1', 'ses-1'));

      expect(component.sessions()[0].estado).toBe('CANCELADA');
      expect(component.sessions()[0].cancelacion?.tipo).toBe('DOCENTE');
      expect(sessionService.getSessionsByGroup).not.toHaveBeenCalled();
    });

    it('DEC-065 (2): SESION_CANCELADA de tipo COORDINADOR marca la sesión y avisa que la coordinación la rechazó o canceló', () => {
      const toastInfo = spyOn(TestBed.inject(ToastService), 'info');
      abrirHub();

      realtimeEvents$.next({
        eventId: 'e', type: 'SESION_CANCELADA', occurredAt: '2026-11-10T14:00:00Z', correlationId: null,
        payload: { grupo: 'crs-1', sesion: 'ses-1', tipo: 'COORDINADOR', fechaHoraInicioUtc: null },
      });

      expect(component.sessions()[0].estado).toBe('CANCELADA');
      expect(component.sessions()[0].cancelacion?.tipo).toBe('COORDINADOR');
      expect(toastInfo).toHaveBeenCalledOnceWith('La coordinación rechazó o canceló la sesión S1.');
    });

    it('DEC-065 (2): si la sesión no está en la lista, el aviso de coordinación es genérico', () => {
      const toastInfo = spyOn(TestBed.inject(ToastService), 'info');
      abrirHub();

      realtimeEvents$.next({
        eventId: 'e', type: 'SESION_CANCELADA', occurredAt: '2026-11-10T14:00:00Z', correlationId: null,
        payload: { grupo: 'crs-1', sesion: 'ses-desconocida', tipo: 'COORDINADOR', fechaHoraInicioUtc: null },
      });

      expect(toastInfo).toHaveBeenCalledOnceWith('La coordinación rechazó o canceló una sesión del grupo.');
    });

    it('DEC-065 (2): SESION_MANUAL_CREADA de una sesión pendiente la marca APROBADA y avisa al docente', () => {
      const toastSuccess = spyOn(TestBed.inject(ToastService), 'success');
      sessionService.getSessionsByGroup.and.returnValue(of({
        exitoso: true, total: 1,
        datos: [{ ...sesion, title: 'Refuerzo', estadoSolicitud: 'PENDIENTE', pendienteAprobacion: true }],
      } as any));
      component.verHubGrupo({ id: 'crs-1' } as any);
      toastSuccess.calls.reset();

      realtimeEvents$.next({
        eventId: 'e', type: 'SESION_MANUAL_CREADA', occurredAt: '2026-11-10T14:00:00Z', correlationId: null,
        payload: { grupo: 'crs-1', sesion: 'ses-1', fechaHoraInicio: null, docente: 'Ana' },
      });

      expect(component.sessions()[0].estadoSolicitud).toBe('APROBADA');
      expect(component.sessions()[0].pendienteAprobacion).toBeFalse();
      expect(toastSuccess).toHaveBeenCalledOnceWith('La coordinación aprobó la sesión extraordinaria Refuerzo.');
    });

    it('DEC-065 (2): SESION_MANUAL_CREADA de otro grupo, desconocida o no pendiente no cambia nada ni avisa', () => {
      const toastSuccess = spyOn(TestBed.inject(ToastService), 'success');
      abrirHub();
      toastSuccess.calls.reset();
      const manual = (grupo: string, ses: string) => ({
        eventId: 'e', type: 'SESION_MANUAL_CREADA', occurredAt: '2026-11-10T14:00:00Z', correlationId: null,
        payload: { grupo, sesion: ses, fechaHoraInicio: null, docente: 'Ana' },
      });

      realtimeEvents$.next(manual('otro-grupo', 'ses-1'));
      realtimeEvents$.next(manual('crs-1', 'ses-desconocida'));
      realtimeEvents$.next(manual('crs-1', 'ses-1'));

      expect(component.sessions()[0].estadoSolicitud).toBeUndefined();
      expect(toastSuccess).not.toHaveBeenCalled();
    });

    it('DEC-065 (2): al volver a la lista deja de escuchar las aprobaciones', () => {
      sessionService.getSessionsByGroup.and.returnValue(of({
        exitoso: true, total: 1, datos: [{ ...sesion, estadoSolicitud: 'PENDIENTE', pendienteAprobacion: true }],
      } as any));
      component.verHubGrupo({ id: 'crs-1' } as any);
      component.volverALista();

      realtimeEvents$.next({
        eventId: 'e', type: 'SESION_MANUAL_CREADA', occurredAt: '2026-11-10T14:00:00Z', correlationId: null,
        payload: { grupo: 'crs-1', sesion: 'ses-1', fechaHoraInicio: null, docente: 'Ana' },
      });

      expect(component.sessions()[0].estadoSolicitud).toBe('PENDIENTE');
    });

    it('DEC-064: la cancelación del propio docente no muestra el aviso de coordinación', () => {
      const toastInfo = spyOn(TestBed.inject(ToastService), 'info');
      abrirHub();

      realtimeEvents$.next(eventoCancelada('crs-1', 'ses-1'));

      expect(toastInfo).not.toHaveBeenCalled();
    });

    it('B1-F-22 ignora eventos de otro grupo', () => {
      abrirHub();

      realtimeEvents$.next(eventoCancelada('otro-grupo', 'ses-1'));

      expect(component.sessions()[0].estado).toBe('PROGRAMADA');
    });

    it('B1-F-22 al volver a la lista deja de escuchar el stream', () => {
      abrirHub();

      component.volverALista();
      realtimeEvents$.next(eventoCancelada('crs-1', 'ses-1'));

      expect(component.sessions()[0].estado).toBe('PROGRAMADA');
      expect(realtime.stop).toHaveBeenCalled();
    });

    it('B1-F-22 no usa polling para refrescar la lista', () => {
      const spy = spyOn(window, 'setInterval').and.callThrough();
      sessionService.cancelarSesion.and.returnValue(of(respuesta as any));
      abrirHub();
      realtimeEvents$.next(eventoCancelada('crs-1', 'ses-1'));
      component.abrirModalCancelarSesion(sesion);
      component.confirmarCancelarSesionConMotivo('Motivo suficientemente largo');

      expect(spy).not.toHaveBeenCalled();
    });
  });

  // HU029 (F-DOC-S03): la sabana y el detalle de sesion del hub deben mostrar el estado consolidado por sesion
  // que entrega GET /grupos/{id}/asistencias; antes el hub nunca lo cargaba y todas las celdas salian "—".
  describe('sabana del hub: marcas por sesion', () => {
    const sesion = {
      id: 'ses-1',
      courseId: 'crs-1',
      sessionNumber: 1,
      title: 'Sesion 1',
      date: '2026-08-17',
      startTime: '08:00',
      endTime: '10:00',
      records: [],
    } as ClassSession;
    const celda = (est: string) =>
      (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="sabana-celda-${est}-ses-1"]`);

    beforeEach(() => {
      sessionService.getSessionsByGroup.and.returnValue(of({ exitoso: true, datos: [sesion], total: 1 }) as never);
      studentService.getStudentsByGroup.and.returnValue(
        of({
          exitoso: true,
          datos: [
            { idEstudiante: 'est-1', nombreCompleto: 'Ana Gomez', documento: '1001', codigoEstado: 'A' },
            { idEstudiante: 'est-2', nombreCompleto: 'Luis Perez', documento: '1002', codigoEstado: 'A' },
          ],
        }) as never
      );
      attendanceService.getAttendancesByGroup.and.returnValue(
        of({
          exitoso: true,
          total: 1,
          datos: [{ asistencia: 'a1', estudiante: 'est-1', grupo: 'crs-1', sesion: 'ses-1', presente: false, estado: 'SJC', observacion: null }],
        }) as never
      );
    });

    it('pide las asistencias del grupo al abrir el hub y pinta la marca del estudiante en su sesion', () => {
      component.verHubGrupo(course);
      component.subPestanaHub.set('SABANA');
      fixture.detectChanges();

      expect(attendanceService.getAttendancesByGroup).toHaveBeenCalledWith('crs-1');
      expect(celda('est-1')?.textContent).toContain('SJC');
    });

    it('un estudiante sin registro en esa sesion sigue mostrando "—" (nunca se inventa una marca)', () => {
      component.verHubGrupo(course);
      component.subPestanaHub.set('SABANA');
      fixture.detectChanges();

      expect(celda('est-2')?.textContent).toContain('—');
      expect(celda('est-2')?.textContent).not.toMatch(/AN|EX|SJC/);
    });

    it('un fallo al cargar las asistencias avisa con el mensaje del backend y deja las marcas sin inventar', () => {
      attendanceService.getAttendancesByGroup.and.returnValue(
        throwError(() => apiHttpError(409, 'No se pudieron consultar las asistencias.', 'CONFLICT')) as never
      );
      const toastError = spyOn(TestBed.inject(ToastService), 'error');
      component.verHubGrupo(course);
      component.subPestanaHub.set('SABANA');
      fixture.detectChanges();

      expect(toastError).toHaveBeenCalledWith('No se pudieron consultar las asistencias.');
      expect(celda('est-1')?.textContent).toContain('—');
    });

    it('una respuesta sin datos se trata como sin registros', () => {
      attendanceService.getAttendancesByGroup.and.returnValue(of({ exitoso: true }) as never);
      component.verHubGrupo(course);
      fixture.detectChanges();

      expect(component.sessionsConRegistros()[0].records.every((r) => r.status === null)).toBeTrue();
    });

    it('un estado no soportado por el mapper no rompe el hub: la sesion queda sin registros', () => {
      attendanceService.getAttendancesByGroup.and.returnValue(
        of({
          exitoso: true,
          datos: [{ asistencia: 'a9', estudiante: 'est-1', grupo: 'crs-1', sesion: 'ses-1', presente: true, estado: 'XX', observacion: null }],
        }) as never
      );
      component.verHubGrupo(course);
      component.subPestanaHub.set('SABANA');
      fixture.detectChanges();

      expect(component.sessionsConRegistros()[0].records).toEqual([]);
      expect(celda('est-1')?.textContent).toContain('—');
    });

    it('solo compone registros de los estudiantes activos y tolera un padron con campos minimos', () => {
      studentService.getStudentsByGroup.and.returnValue(
        of({
          exitoso: true,
          datos: [
            { id: 'est-9', codigoEstado: 'A' },
            { codigoEstado: 'A' },
            { idEstudiante: 'est-8', nombreCompleto: 'Retirado', documento: '1', codigoEstado: 'R' },
          ],
        }) as never
      );
      attendanceService.getAttendancesByGroup.and.returnValue(
        of({
          exitoso: true,
          datos: [{ asistencia: 'a2', estudiante: 'est-9', grupo: 'crs-1', sesion: 'ses-1', presente: true, estado: 'AN', observacion: null }],
        }) as never
      );
      component.verHubGrupo(course);
      fixture.detectChanges();

      const records = component.sessionsConRegistros()[0].records;
      expect(records.length).toBe(2);
      expect(records.find((r) => r.studentId === 'est-9')).toEqual(jasmine.objectContaining({ status: 'AN' }));
      expect(records.find((r) => r.studentId === '')?.status).toBeNull();
    });

    it('al abrir otro grupo se descartan las asistencias del anterior antes de cargar las nuevas', () => {
      component.verHubGrupo(course);
      fixture.detectChanges();
      expect(component.sessionsConRegistros()[0].records.some((r) => r.status === 'SJC')).toBeTrue();

      attendanceService.getAttendancesByGroup.and.returnValue(new Subject() as never);
      component.verHubGrupo({ ...course, id: 'crs-2' });
      fixture.detectChanges();

      expect(attendanceService.getAttendancesByGroup).toHaveBeenCalledWith('crs-2');
      expect(component.sessionsConRegistros()[0].records.every((r) => r.status === null)).toBeTrue();
    });
  });
});
