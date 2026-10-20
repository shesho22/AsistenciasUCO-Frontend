import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { TeacherGruposComponent } from './teacher-grupos.component';
import { CourseService } from '../../../core/services/course.service';
import { SessionService } from '../../../core/services/session.service';
import { StudentService } from '../../../core/services/student.service';
import { GroupService } from '../../../core/services/group.service';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { Course } from '../../../core/models/course.model';
import { ClassSession } from '../../../core/models/attendance.model';

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
      'getQrToken',
      'cancelarSesion',
      'createSession',
      'updateSession',
    ]);
    studentService = jasmine.createSpyObj<StudentService>('StudentService', [
      'getStudentsByGroup',
    ]);
    claimService = jasmine.createSpyObj<AttendanceClaimService>('AttendanceClaimService', [
      'getReclamosDocente',
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    courseService.getTeacherCourses.and.returnValue(
      of({ exitoso: true, datos: [course] } as any)
    );
    courseService.getAsignaturasDocente.and.returnValue(
      of({ exitoso: true, datos: [] } as any)
    );
    claimService.getReclamosDocente.and.returnValue(
      of({ exitoso: true, datos: [] } as any)
    );
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

    TestBed.configureTestingModule({
      imports: [TeacherGruposComponent],
      providers: [
        { provide: CourseService, useValue: courseService },
        { provide: SessionService, useValue: sessionService },
        { provide: GroupService, useValue: groupService },
        { provide: StudentService, useValue: studentService },
        { provide: AttendanceClaimService, useValue: claimService },
        { provide: Router, useValue: router },
      ],
    });

    fixture = TestBed.createComponent(TeacherGruposComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('abrirCrearGrupo() ya no precarga el literal sintetizado "Dra. María Elena Rostagno"', () => {
    component.abrirCrearGrupo();

    expect(component.grupoForm.docenteName).not.toBe('Dra. María Elena Rostagno');
  });

  it('guardarGrupo() (CREAR) no envía docenteName a crearGrupo()', () => {
    courseService.crearGrupo.and.returnValue(
      of({ exitoso: true, mensajeUsuario: 'ok', datos: course } as any)
    );
    component.abrirCrearGrupo();
    component.grupoForm.code = 'NUE-100';
    component.grupoForm.name = 'Nueva Asignatura';

    component.guardarGrupo();

    const sentPayload = courseService.crearGrupo.calls.mostRecent().args[0] as Record<string, unknown>;
    expect(sentPayload['docenteName']).toBeUndefined();
  });

  it('guardarGrupo() (EDITAR) no envía docenteName a actualizarGrupo()', () => {
    courseService.actualizarGrupo.and.returnValue(
      of({ exitoso: true, mensajeUsuario: 'ok', datos: course } as any)
    );
    component.abrirEditarGrupo(course);

    component.guardarGrupo();

    const sentPayload = courseService.actualizarGrupo.calls.mostRecent().args[1] as Record<string, unknown>;
    expect(sentPayload['docenteName']).toBeUndefined();
  });

  it('abrirModalProyeccionParaGrupo() ya no selecciona la sesión activa por status sintético', () => {
    // TARGET (PLAN.md riesgo #2/TARGET): sin sustituto sintético, se asume el criterio más
    // simple consistente con "no inventar una regla de reemplazo": tomar la primera sesión
    // de la lista tal como la entrega el backend, sin heurística por status.
    const primera: ClassSession = {
      id: 'ses-1',
      courseId: 'crs-1',
      sessionNumber: 1,
      title: 'Primera',
      date: '2026-09-10',
      startTime: '08:00',
      endTime: '10:00',
      records: [],
    };
    const segunda: ClassSession = {
      ...primera,
      id: 'ses-2',
      sessionNumber: 2,
      title: 'Segunda',
    };
    sessionService.getSessionsByGroup.and.returnValue(
      of({ exitoso: true, datos: [primera, segunda], total: 2 } as any)
    );
    sessionService.getQrToken.and.returnValue(
      of({ exitoso: true, datos: { sesionId: '', grupoId: '', token: '', codigoAcceso: '', expiraEnSegundos: 30, expiraEn: '' } } as any)
    );
    // La proyección QR está OUT_OF_GOLDEN_PATH (feature deshabilitada): se habilita solo para este criterio legacy.
    Object.assign(component, { sessionQrEnabled: true });

    component.abrirModalProyeccionParaGrupo(course);

    expect(component.sesionActivaId()).toBe('ses-1');
    component.cerrarModalProyeccion();
  });

  // --- LB-001B.5A: acciones de sesión fuera de BACKEND_GOLDEN_PATH_CONTRACT ---

  it('QR/PIN y Cancelar sesión están deshabilitados por feature: no llaman a getQrToken ni cancelarSesion', () => {
    expect(component.sessionQrEnabled).toBeFalse();
    expect(component.sessionCancelEnabled).toBeFalse();
    const sesion: ClassSession = {
      id: 'ses-1', courseId: 'crs-1', sessionNumber: 1, title: 'S',
      date: '2026-09-10', startTime: '08:00', endTime: '10:00', records: [],
    };

    component.abrirModalProyeccionParaGrupo(course);
    component.proyectarSesionEspecifica(sesion);
    component.cambiarSesionActiva('ses-1');
    component.abrirModalCancelarSesion(sesion);
    component.confirmarCancelarSesionConMotivo('Fuerza mayor');

    expect(component.modalProyeccionVisible()).toBeFalse();
    expect(component.modalCancelarVisible()).toBeFalse();
    expect(sessionService.getQrToken).not.toHaveBeenCalled();
    expect(sessionService.cancelarSesion).not.toHaveBeenCalled();
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

  it('guardarSesion valida campos obligatorios antes de enviar', () => {
    component.verHubGrupo(course);
    component.abrirCrearSesionExtraordinaria();
    component.sesionForm = { title: '', date: '', startTime: '', endTime: '', sessionNumber: 1 };
    component.guardarSesion();
    expect(sessionService.createSession).not.toHaveBeenCalled();

    component.sesionForm = { title: 'Valida', date: '', startTime: '08:00', endTime: '10:00', sessionNumber: 1 };
    component.guardarSesion();
    expect(sessionService.createSession).not.toHaveBeenCalled();

    component.sesionForm = { title: 'Valida', date: '2026-09-15', startTime: '10:00', endTime: '08:00', sessionNumber: 1 };
    component.guardarSesion();
    expect(sessionService.createSession).not.toHaveBeenCalled();
  });

  it('permite abrir y cerrar modal de matrícula de grupo', () => {
    component.abrirModalMatriculaGrupo(course);
    expect(component.modalMatriculaGrupoVisible()).toBeTrue();
    expect(component.grupoMatricula()).toBe(course);

    component.cerrarModalMatriculaGrupo();
    expect(component.modalMatriculaGrupoVisible()).toBeFalse();
    expect(component.grupoMatricula()).toBeNull();
  });

  it('permite cancelar sesión cuando el switch está activo', () => {
    sessionService.cancelarSesion.and.returnValue(
      of({ exitoso: true, mensajeUsuario: 'Cancelada' } as any)
    );
    (component as any).sessionCancelEnabled = true;
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

  it('guardarGrupo crea un grupo cuando modoFormGrupo es CREAR', () => {
    courseService.crearGrupo.and.returnValue(
      of({ exitoso: true, mensajeUsuario: 'Grupo creado con éxito.' } as any)
    );
    component.abrirCrearGrupo();
    component.grupoForm = {
      code: 'SIS-205',
      name: 'Bases de Datos',
      section: 'G01',
      schedule: 'Lunes 08:00 - 10:00',
      room: 'A-101',
      cupoMaximo: 30,
      docenteName: 'Docente Prueba',
      asignaturaId: '',
      diasSeleccionados: ['Lunes'],
      horaInicio: '08:00',
      horaFin: '10:00',
      generarSesionesAutomaticas: false,
    };

    component.guardarGrupo();

    expect(courseService.crearGrupo).toHaveBeenCalled();
  });

  it('guardarGrupo actualiza un grupo cuando modoFormGrupo es EDITAR', () => {
    courseService.actualizarGrupo.and.returnValue(
      of({ exitoso: true, mensajeUsuario: 'Grupo actualizado.' } as any)
    );
    component.abrirEditarGrupo(course);
    component.guardarGrupo();

    expect(courseService.actualizarGrupo).toHaveBeenCalled();
  });
});
