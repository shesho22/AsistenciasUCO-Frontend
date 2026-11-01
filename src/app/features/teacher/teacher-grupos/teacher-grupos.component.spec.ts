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
});
