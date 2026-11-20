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
import { SolicitudRevisionItem } from '../../../core/models/role-management.model';
import { CatalogService } from '../../../core/services/catalog.service';
import { TeacherAttendanceSummaryService } from '../../../core/services/teacher-attendance-summary.service';
import { TeacherMatrizAsistenciaService } from '../../../core/services/teacher-matriz-asistencia.service';
import { TeacherGruposResumenService } from '../../../core/services/teacher-grupos-resumen.service';
import { resumenSesiones } from '../../../core/testing/resumen-sesiones-grupo.fixture';
import { EstadoCeldaAsistencia, FilaMatriz } from '../../../core/models/matriz-asistencia.model';
import { Course } from '../../../core/models/course.model';
import { ClassSession } from '../../../core/models/attendance.model';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { apiHttpError } from '../../../core/testing/api-error.fixture';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { RealtimeEvent, SesionCanceladaRealtimePayload, SesionManualCreadaRealtimePayload } from '../../../core/realtime/model/realtime-event.model';
import { RevisionCancelacionService } from '../../../core/services/revision-cancelacion.service';
import { RevisionCancelacion } from '../../../core/models/revision-cancelacion.model';

// LB-001B.1B (DB source of truth cleanup): AS-IS #20 (docenteName hardcodeado y enviado en
// el payload de crearGrupo/actualizarGrupo), #21 (selección de sesión activa por status) y
// #22 (síntesis nueva AN/SJC por paridad de ID, hallazgo no cubierto por LB-001B.1A).

describe('TeacherGruposComponent', () => {
  let fixture: ComponentFixture<TeacherGruposComponent>;
  let gruposResumen: jasmine.SpyObj<TeacherGruposResumenService>;
  let component: TeacherGruposComponent;
  let courseService: jasmine.SpyObj<CourseService>;
  let sessionService: jasmine.SpyObj<SessionService>;
  let studentService: jasmine.SpyObj<StudentService>;
  let claimService: jasmine.SpyObj<AttendanceClaimService>;
  let router: jasmine.SpyObj<Router>;
  let attendanceService: jasmine.SpyObj<AttendanceService>;
  let matrizService: jasmine.SpyObj<TeacherMatrizAsistenciaService>;
  let realtimeEvents$: Subject<RealtimeEvent<SesionCanceladaRealtimePayload | SesionManualCreadaRealtimePayload>>;
  let realtime: jasmine.SpyObj<RealtimeService>;
  let revisiones: jasmine.SpyObj<RevisionCancelacionService>;
  const paginaRevisiones = (elementos: Partial<RevisionCancelacion>[]) =>
    of({ exitoso: true, elementos: elementos as RevisionCancelacion[], numeroPagina: 1, tamanoPagina: 100, totalElementos: elementos.length, totalPaginas: 1 });

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
      'getPadronGrupoPagina',
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

    matrizService = jasmine.createSpyObj<TeacherMatrizAsistenciaService>('TeacherMatrizAsistenciaService', ['consultarMatriz', 'consultarResumenSesiones']);
    matrizService.consultarMatriz.and.returnValue(
      of({ exitoso: true, sesiones: [], elementos: [], numeroPagina: 1, tamanoPagina: 50, totalElementos: 0, totalPaginas: 0 })
    );
    matrizService.consultarResumenSesiones.and.returnValue(of({ exitoso: true, datos: resumenSesiones() }) as never);

    courseService.getTeacherCourses.and.returnValue(
      of<never>({ exitoso: true, datos: [course] } as never)
    );
    courseService.getAsignaturasDocente.and.returnValue(
      of<never>({ exitoso: true, datos: [] } as never)
    );
    claimService.getReclamosDocentePorGrupo.and.returnValue(of({ exitoso: true, datos: [], total: 0 }));
    studentService.getPadronGrupoPagina.and.returnValue(
      of({ exitoso: true, elementos: [], numeroPagina: 1, tamanoPagina: 12, totalElementos: 0, totalPaginas: 0 })
    );
    studentService.getStudentsByGroup.and.returnValue(
      of<never>({ exitoso: true, datos: [] } as never)
    );
    sessionService.getSessionsByGroup.and.returnValue(
      of<never>({ exitoso: true, datos: [], total: 0 } as never)
    );

    const groupService = jasmine.createSpyObj<GroupService>('GroupService', [
      'getStudentsByGroup',
      'getAllGroups',
    ]);
    groupService.getAllGroups.and.returnValue(
      of<never>({ exitoso: true, total: 1, datos: [{ id: 'crs-1', capacidadMaximaPermitida: 35 }] } as never)
    );

    realtimeEvents$ = new Subject();
    // Angular 19 ejecuta los effect() de componente durante la deteccion de cambios: la sabana del hub ya
    // arranca su tiempo real en estas pruebas y lee connectionState$ (antes el effect quedaba en microtarea).
    realtime = jasmine.createSpyObj<RealtimeService>('RealtimeService', ['listenType', 'startForGroup', 'stop', 'events'], {
      connectionState$: of('CONNECTED'),
    });
    realtime.listenType.and.callFake(((tipo: string) => realtimeEvents$.pipe(filter((e) => e.type === tipo))) as never);
    realtime.events.and.returnValue(new Subject<RealtimeEvent>().asObservable());

    gruposResumen = jasmine.createSpyObj<TeacherGruposResumenService>('TeacherGruposResumenService', ['consultar']);
    gruposResumen.consultar.and.returnValue(
      of({ exitoso: true, datos: { gruposHabilitados: 1, estudiantesActivos: 41, cupoTotal: 60, tasaOcupacion: 68.33 } })
    );

    revisiones = jasmine.createSpyObj<RevisionCancelacionService>('RevisionCancelacionService', ['consultarDocente']);
    revisiones.consultarDocente.and.returnValue(paginaRevisiones([]) as never);

    TestBed.configureTestingModule({
      imports: [TeacherGruposComponent],
      providers: [
        { provide: RealtimeService, useValue: realtime },
        { provide: RevisionCancelacionService, useValue: revisiones },
        { provide: CourseService, useValue: courseService },
        { provide: SessionService, useValue: sessionService },
        { provide: GroupService, useValue: groupService },
        { provide: StudentService, useValue: studentService },
        { provide: AttendanceClaimService, useValue: claimService },
        { provide: Router, useValue: router },
        { provide: AttendanceService, useValue: attendanceService },
        { provide: TeacherAttendanceSummaryService, useValue: resumenService },
        { provide: TeacherMatrizAsistenciaService, useValue: matrizService },
        { provide: TeacherGruposResumenService, useValue: gruposResumen },
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
      of<never>({
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
      } as never)
    );

    component.cargarGrupos();
    fixture.detectChanges();

    expect(component.courses()).toHaveSize(1);
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Arquitectura de Software');
    expect(text).toContain('Grupo 001 - Arq Software');
    expect(text).toContain('Sin horario asignado');
    expect(text).not.toContain('undefined');
  });



  // --- LB-001B.5A: acciones de sesión fuera de BACKEND_GOLDEN_PATH_CONTRACT ---

  it('B2-F-15 el QR (HU175) esta habilitado y el bloque de proyeccion con temporizador fue retirado', () => {
    expect(component.sessionQrEnabled).toBeTrue();
    const interno = component as unknown as Record<string, unknown>;
    for (const retirado of ['datosQr', 'segundosRestantes', 'modalProyeccionVisible', 'refrescarQrManual', 'iniciarTimerQr']) {
      expect(interno[retirado]).toBeUndefined();
    }
  });

  it('B2-F-15 proyectar el QR del grupo lleva a la pantalla de asistencia sin llamar al backend', () => {
    const navigate = router.navigate.and.resolveTo(true);
    component.verHubGrupo(course);

    component.proyectarQrGrupo(course);
    // Proyectar Auto-Registro pide a la pantalla de asistencia proyectar el QR (o el selector de modo) de una vez.
    expect(navigate).toHaveBeenCalledWith(['/app/asistencia'], { queryParams: { courseId: course.id, accion: 'proyectar-qr' } });
  });

  // CIERRE-W3M: el hub ya no descarga padron, asistencias y sesiones completos para cruzarlos; el servidor entrega la matriz
  // (la pagina vigente de la sabana) y el resumen de sesiones (estado temporal, conteos, en curso y proxima).
  it('CIERRE-W3M: al abrir el hub pide el resumen de sesiones al servidor y no descarga el padron ni las asistencias del grupo', () => {
    const resumen = resumenSesiones({ sesionesProgramadas: 2, sesionesEjecutadas: 1, idSesionProxima: 'ses-2' });
    matrizService.consultarResumenSesiones.and.returnValue(of({ exitoso: true, datos: resumen }) as never);

    component.verHubGrupo(course);

    expect(matrizService.consultarResumenSesiones).toHaveBeenCalledWith('crs-1');
    expect(component.resumenSesiones()).toEqual(resumen);
    expect(attendanceService.getAttendancesByGroup).not.toHaveBeenCalled();
    expect(studentService.getStudentsByGroup).not.toHaveBeenCalled();
  });

  it('CIERRE-W3M: si falla el resumen de sesiones avisa con el mensaje del backend y no queda un resumen viejo', () => {
    const toastError = spyOn(TestBed.inject(ToastService), 'error');
    component.verHubGrupo(course);
    matrizService.consultarResumenSesiones.and.returnValue(
      throwError(() => apiHttpError(403, 'No eres el titular de este grupo.', 'SEC_002')) as never
    );

    component.cargarResumenSesiones('crs-1');

    expect(toastError).toHaveBeenCalledWith('No eres el titular de este grupo.');
    expect(component.resumenSesiones()).toBeNull();
  });

  it('CIERRE-W3M: al cargar las sesiones vuelve a pedir el resumen (estado temporal y conteos son del servidor)', () => {
    component.verHubGrupo(course);
    matrizService.consultarResumenSesiones.calls.reset();

    component.cargarSesiones('crs-1');

    expect(matrizService.consultarResumenSesiones).toHaveBeenCalledOnceWith('crs-1');
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

  it('permite abrir y cerrar modal de matrícula de grupo', () => {
    component.abrirModalMatriculaGrupo(course);
    expect(component.modalMatriculaGrupoVisible()).toBeTrue();
    expect(component.grupoMatricula()).toBe(course);

    component.cerrarModalMatriculaGrupo();
    expect(component.modalMatriculaGrupoVisible()).toBeFalse();
    expect(component.grupoMatricula()).toBeNull();
  });



  it('HU051 RT-11 abre el modal de retiro con el estudiante y, tras retirarlo, recarga el padrón', () => {
    component.selectedCourse.set(course);
    component.abrirModalRetiro({ idEstudiante: 'est-1', nombreCompleto: 'Ana Gómez' });
    expect(component.estudianteARetirar()).toEqual({ idEstudiante: 'est-1', nombreCompleto: 'Ana Gómez' });

    studentService.getPadronGrupoPagina.calls.reset();
    matrizService.consultarResumenSesiones.calls.reset();
    component.onEstudianteRetirado();

    expect(component.estudianteARetirar()).toBeNull();
    // CIERRE-W3M: se recarga la pagina del padron (servidor) y el resumen del grupo (cambian los activos); no el padron completo.
    expect(studentService.getPadronGrupoPagina).toHaveBeenCalledOnceWith('crs-1', { pagina: 1, tamano: 15, busqueda: '' });
    expect(matrizService.consultarResumenSesiones).toHaveBeenCalledOnceWith('crs-1');
    expect(studentService.getStudentsByGroup).not.toHaveBeenCalled();
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
  // CIERRE-W1A: el servidor filtra por grupo y pagina; el componente solo muestra lo que llega.
  describe('APP-05 reclamos por grupo', () => {
    const GROUP_A = '3f0c1d2e-0000-4000-8000-000000000001';
    const GROUP_B = '3f0c1d2e-0000-4000-8000-000000000002';
    const claim = (id: string, grupoId: string) => ({ id, grupoId } as never as SolicitudRevisionItem);
    const pagina = (datos: SolicitudRevisionItem[], total = datos.length) => ({ exitoso: true, datos, total });

    it('solicita la primera página del UUID seleccionado y muestra el total del servidor', () => {
      claimService.getReclamosDocentePorGrupo.and.returnValue(of(pagina([claim('a-1', GROUP_A)], 23)));

      component.verHubGrupo({ ...course, id: GROUP_A });

      expect(claimService.getReclamosDocentePorGrupo).toHaveBeenCalledOnceWith(GROUP_A, { pagina: 1, tamano: 15 });
      expect(component.reclamosGrupo().map((item) => item.id)).toEqual(['a-1']);
      expect(component.totalReclamosGrupo()).toBe(23);
      expect(component.estadoCargaReclamos()).toBe('LOADED');
    });

    it('cambiar de página pide esa página al servidor', () => {
      claimService.getReclamosDocentePorGrupo.and.returnValue(of(pagina([claim('a-1', GROUP_A)], 23)));
      component.verHubGrupo({ ...course, id: GROUP_A });
      claimService.getReclamosDocentePorGrupo.calls.reset();

      component.cambiarPaginaReclamosGrupo(3);

      expect(component.paginaReclamosGrupo()).toBe(3);
      expect(claimService.getReclamosDocentePorGrupo).toHaveBeenCalledOnceWith(GROUP_A, { pagina: 3, tamano: 15 });
    });

    it('si la página pedida quedó vacía pero hay reclamos, retrocede a la última', () => {
      claimService.getReclamosDocentePorGrupo.and.callFake((_grupo, paginacion) =>
        of(paginacion.pagina === 3 ? pagina([], 20) : pagina([claim('a-9', GROUP_A)], 20))
      );
      component.verHubGrupo({ ...course, id: GROUP_A });

      component.cambiarPaginaReclamosGrupo(3);

      expect(component.paginaReclamosGrupo()).toBe(2);
      expect(component.reclamosGrupo().map((item) => item.id)).toEqual(['a-9']);
    });

    it('al abrir otro grupo vuelve a la primera página', () => {
      claimService.getReclamosDocentePorGrupo.and.returnValue(of(pagina([claim('a-1', GROUP_A)], 23)));
      component.verHubGrupo({ ...course, id: GROUP_A });
      component.cambiarPaginaReclamosGrupo(3);

      component.verHubGrupo({ ...course, id: GROUP_B });

      expect(component.paginaReclamosGrupo()).toBe(1);
      expect(claimService.getReclamosDocentePorGrupo.calls.mostRecent().args).toEqual([GROUP_B, { pagina: 1, tamano: 15 }]);
    });

    it('descarta la respuesta pendiente del grupo anterior al cambiar rápidamente', () => {
      const anterior = new Subject<ReturnType<typeof pagina>>();
      const actual = new Subject<ReturnType<typeof pagina>>();
      claimService.getReclamosDocentePorGrupo.and.returnValues(anterior.asObservable(), actual.asObservable());

      component.verHubGrupo({ ...course, id: GROUP_A });
      expect(component.estadoCargaReclamos()).toBe('LOADING');
      component.verHubGrupo({ ...course, id: GROUP_B });
      anterior.next(pagina([claim('a-1', GROUP_A)]));
      actual.next(pagina([claim('b-1', GROUP_B)]));

      expect(component.reclamosGrupo().map((item) => item.id)).toEqual(['b-1']);
      expect(component.reclamosGrupo()[0].grupoId).toBe(GROUP_B);
      expect(component.estadoCargaReclamos()).toBe('LOADED');
    });

    it('no duplica una consulta activa del mismo grupo', () => {
      const pendiente = new Subject<ReturnType<typeof pagina>>();
      claimService.getReclamosDocentePorGrupo.and.returnValue(pendiente.asObservable());
      const grupo = { ...course, id: GROUP_A };

      component.verHubGrupo(grupo);
      component.cargarReclamosGrupo(GROUP_A);

      expect(claimService.getReclamosDocentePorGrupo).toHaveBeenCalledOnceWith(GROUP_A, { pagina: 1, tamano: 15 });
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
        expect(component.totalReclamosGrupo()).toBe(0);
      }
    });
  });

  // CIERRE-W1A: el padrón de la pestaña Matrícula lo pagina y filtra el servidor.
  describe('CIERRE-W1A padrón paginado en el servidor', () => {
    const matricula = (n: number) => ({ id: `m-${n}`, idEstudiante: `e-${n}`, nombreCompleto: `Estudiante ${n}`, documento: `${n}`, correo: `e${n}@uco.edu.co`, codigoEstado: 'A', nombreEstado: 'activo' });
    const paginaPadron = (n: number, total: number, numeroPagina = 1) => ({
      exitoso: true,
      elementos: Array.from({ length: n }, (_, i) => matricula(i)),
      numeroPagina,
      tamanoPagina: 12,
      totalElementos: total,
      totalPaginas: Math.ceil(total / 12),
    });

    it('al abrir el hub pide la primera página (15) sin búsqueda y guarda total y filas', () => {
      studentService.getPadronGrupoPagina.and.returnValue(of(paginaPadron(12, 30)));

      component.verHubGrupo(course);

      expect(studentService.getPadronGrupoPagina).toHaveBeenCalledOnceWith(course.id, { pagina: 1, tamano: 15, busqueda: '' });
      expect(component.padronPagina()).toHaveSize(12);
      expect(component.totalPadron()).toBe(30);
      expect(component.cargandoPadron()).toBeFalse();
    });

    it('cambiar de página, de tamaño o de búsqueda vuelve a pedir al servidor (la búsqueda y el tamaño reinician la página)', () => {
      studentService.getPadronGrupoPagina.and.returnValue(of(paginaPadron(12, 30)));
      component.verHubGrupo(course);
      studentService.getPadronGrupoPagina.calls.reset();

      component.cambiarPaginaPadron(3);
      expect(studentService.getPadronGrupoPagina.calls.mostRecent().args).toEqual([course.id, { pagina: 3, tamano: 15, busqueda: '' }]);

      component.cambiarTamanoPadron(24);
      expect(studentService.getPadronGrupoPagina.calls.mostRecent().args).toEqual([course.id, { pagina: 1, tamano: 24, busqueda: '' }]);

      component.cambiarPaginaPadron(2);
      component.cambiarBusquedaPadron('ana');
      expect(component.paginaPadron()).toBe(1);
      expect(studentService.getPadronGrupoPagina.calls.mostRecent().args).toEqual([course.id, { pagina: 1, tamano: 24, busqueda: 'ana' }]);
    });

    it('sin grupo abierto no se pide nada al cambiar de página', () => {
      component.selectedCourse.set(null);
      studentService.getPadronGrupoPagina.calls.reset();

      component.cambiarPaginaPadron(2);

      expect(studentService.getPadronGrupoPagina).not.toHaveBeenCalled();
    });

    it('si la página pedida quedó vacía pero hay matrículas, retrocede a la última', () => {
      studentService.getPadronGrupoPagina.and.callFake((_grupo, filtro) =>
        of(filtro.pagina === 5 ? { ...paginaPadron(0, 40, 5) } : paginaPadron(6, 40, 3))
      );
      component.verHubGrupo(course);

      component.cambiarPaginaPadron(5);

      expect(component.paginaPadron()).toBe(3);
      expect(component.padronPagina()).toHaveSize(6);
    });

    it('un error al cargar la página vacía el padrón, avisa y no queda cargando', () => {
      studentService.getPadronGrupoPagina.and.returnValue(throwError(() => ({ status: 500 })));

      component.verHubGrupo(course);

      expect(component.padronPagina()).toEqual([]);
      expect(component.totalPadron()).toBeNull();
      expect(component.cargandoPadron()).toBeFalse();
    });

    it('abrir otro grupo reinicia la página y la búsqueda del padrón', () => {
      studentService.getPadronGrupoPagina.and.returnValue(of(paginaPadron(12, 30)));
      component.verHubGrupo(course);
      component.cambiarPaginaPadron(3);
      component.cambiarBusquedaPadron('ana');

      component.verHubGrupo({ ...course, id: 'otro-grupo' });

      expect(studentService.getPadronGrupoPagina.calls.mostRecent().args).toEqual(['otro-grupo', { pagina: 1, tamano: 15, busqueda: '' }]);
    });

    it('CIERRE-W3M: ya no se descarga el padrón completo; la planilla pide su página al servidor', () => {
      studentService.getPadronGrupoPagina.and.returnValue(of(paginaPadron(12, 30)));

      component.verHubGrupo(course);

      expect(studentService.getStudentsByGroup).not.toHaveBeenCalled();
      expect(studentService.getPadronGrupoPagina).toHaveBeenCalledTimes(1);
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

  it('ATA D9: ?grupo=<id>&pestana=ESTUDIANTES abre la matrícula; sin pestana o desconocida abre la planilla', () => {
    const conPestana = (pestana?: string) => ({
      snapshot: { queryParamMap: convertToParamMap(pestana === undefined ? { grupo: 'crs-1' } : { grupo: 'crs-1', pestana }) },
    });
    const abrirCon = (pestana?: string): string => {
      (component as unknown as { route: unknown }).route = conPestana(pestana);
      component.cargarGrupos();
      return component.subPestanaHub();
    };

    expect(abrirCon('ESTUDIANTES')).toBe('ESTUDIANTES');
    expect(abrirCon('RECLAMOS')).toBe('RECLAMOS');
    expect(abrirCon('HOY')).toBe('SABANA');
    expect(abrirCon('inexistente')).toBe('SABANA');
    expect(abrirCon()).toBe('SABANA');
  });

  describe('SSE de cancelaciones y aprobaciones del grupo (HU047, CULM-001 B.1, DEC-065 (2))', () => {
    const sesion: ClassSession = {
      id: 'ses-1', courseId: 'crs-1', sessionNumber: 1, title: 'S1', date: '2026-11-10',
      startTime: '08:00', endTime: '10:00', records: [], estado: 'PROGRAMADA', cancelacion: null,
    };

    function abrirHub(): void {
      sessionService.getSessionsByGroup.and.returnValue(of<never>({ exitoso: true, datos: [sesion], total: 1 } as never));
      component.verHubGrupo(course);
      sessionService.getSessionsByGroup.calls.reset();
    }

    function eventoCancelada(grupo: string, id: string): RealtimeEvent<SesionCanceladaRealtimePayload> {
      return {
        eventId: 'e', type: 'SESION_CANCELADA', occurredAt: '2026-11-10T14:00:00Z', correlationId: null,
        payload: { grupo, sesion: id, tipo: 'DOCENTE', fechaHoraInicioUtc: null },
      };
    }

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
      sessionService.getSessionsByGroup.and.returnValue(of<never>({
        exitoso: true, total: 1,
        datos: [{ ...sesion, title: 'Refuerzo', estadoSolicitud: 'PENDIENTE', pendienteAprobacion: true }],
      } as never));
      component.verHubGrupo({ id: 'crs-1' } as never);
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
      sessionService.getSessionsByGroup.and.returnValue(of<never>({
        exitoso: true, total: 1, datos: [{ ...sesion, estadoSolicitud: 'PENDIENTE', pendienteAprobacion: true }],
      } as never));
      component.verHubGrupo({ id: 'crs-1' } as never);
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
      abrirHub();
      realtimeEvents$.next(eventoCancelada('crs-1', 'ses-1'));

      expect(spy).not.toHaveBeenCalled();
    });
  });

  // HU029 + CIERRE-W3M: la sabana del hub pinta la matriz que entrega el servidor (ya cruzada, paginada y con busqueda).
  describe('sabana del hub: matriz del servidor', () => {
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
    const fila = (idEstudiante: string, codigoEstado: EstadoCeldaAsistencia | null): FilaMatriz => ({
      idEstudianteGrupo: `eg-${idEstudiante}`,
      idEstudiante,
      nombreCompleto: `Estudiante ${idEstudiante}`,
      documento: '1001',
      codigoEstadoEstudiante: 'A',
      celdas: codigoEstado ? [{ idSesion: 'ses-1', codigoEstado, minutosAsistidos: 0, minutosSesion: 120 }] : [],
    });
    const celda = (est: string) =>
      (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="sabana-celda-${est}-ses-1"]`);
    const abrirSabana = async () => {
      component.verHubGrupo(course);
      component.subPestanaHub.set('SABANA');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };

    beforeEach(() => {
      sessionService.getSessionsByGroup.and.returnValue(of({ exitoso: true, datos: [sesion], total: 1 }) as never);
      matrizService.consultarMatriz.and.returnValue(of({
        exitoso: true,
        sesiones: [],
        elementos: [fila('est-1', 'AUSENTE'), fila('est-2', null)],
        numeroPagina: 1,
        tamanoPagina: 50,
        totalElementos: 2,
        totalPaginas: 1,
      }));
    });

    it('pide la matriz del grupo al abrir la planilla y pinta la marca del estudiante en su sesion', async () => {
      await abrirSabana();

      expect(matrizService.consultarMatriz).toHaveBeenCalledWith('crs-1', 1, 50, '');
      expect(celda('est-1')?.textContent).toContain('SJC');
    });

    it('un estudiante sin celda en esa sesion sigue mostrando "—" (nunca se inventa una marca)', async () => {
      await abrirSabana();

      expect(celda('est-2')?.textContent).toContain('—');
      expect(celda('est-2')?.textContent).not.toMatch(/AN|EX|SJC/);
    });

    it('un fallo al cargar la matriz muestra el mensaje del backend y no inventa marcas', async () => {
      matrizService.consultarMatriz.and.returnValue(
        throwError(() => apiHttpError(409, 'No se pudo consultar la matriz.', 'CONFLICT')) as never
      );
      await abrirSabana();

      const aviso = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="sabana-matriz-error"]');
      expect(aviso?.textContent?.trim()).toBe('No se pudo consultar la matriz.');
      expect(celda('est-1')).toBeNull();
    });

    it('al abrir otro grupo la planilla vuelve a pedir la matriz del nuevo grupo', async () => {
      await abrirSabana();

      component.verHubGrupo({ ...course, id: 'crs-2' });
      component.subPestanaHub.set('SABANA');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(matrizService.consultarMatriz.calls.mostRecent().args[0]).toBe('crs-2');
      expect(matrizService.consultarMatriz.calls.mostRecent().args[1]).toBe(1);
    });
  });

  describe('CIERRE-W3I: total de estudiantes desde el servidor', () => {
    it('pide los totales al servidor y los pasa a la lista de grupos', () => {
      expect(gruposResumen.consultar).toHaveBeenCalled();
      expect(component.totalEstudiantes()).toBe(41);
      const total = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="total-estudiantes"]');
      expect(total?.textContent?.trim()).toBe('41');
    });

    it('si el servidor falla no se inventa un total', () => {
      gruposResumen.consultar.and.returnValue(throwError(() => new Error('403')));
      component.cargarGrupos();
      fixture.detectChanges();
      expect(component.totalEstudiantes()).toBeNull();
    });

    it('una respuesta sin datos deja el total en blanco', () => {
      gruposResumen.consultar.and.returnValue(of<never>({ exitoso: true, datos: null } as never));
      component.cargarGrupos();
      expect(component.totalEstudiantes()).toBeNull();
    });
  });
  describe('decisiones por inasistencia pendientes por grupo', () => {
    it('reparte las decisiones pendientes por grupo (idGrupo o grupo.id) y pide solo las pendientes', () => {
      revisiones.consultarDocente.and.returnValue(
        paginaRevisiones([
          { id: 'r1', estado: 'PENDIENTE_DOCENTE', idGrupo: 'crs-1' },
          { id: 'r2', estado: 'PENDIENTE_DOCENTE', grupo: { id: 'crs-1', codigo: 1, nombre: 'A' } },
          { id: 'r3', estado: 'PENDIENTE_DOCENTE', idGrupo: 'crs-9' },
          { id: 'r4', estado: 'PENDIENTE_DOCENTE' },
        ]) as never
      );
      component.cargarDecisionesPendientes();

      expect(revisiones.consultarDocente).toHaveBeenCalledWith({ soloPendientes: true, pagina: 1, tamano: 100 });
      expect(component.decisionesPorGrupo().get('crs-1')).toBe(2);
      expect(component.decisionesPorGrupo().get('crs-9')).toBe(1);
      expect(component.decisionesPorGrupo().size).toBe(2);
    });

    it('si la consulta falla no marca ningún grupo', () => {
      component.decisionesPorGrupo.set(new Map([['crs-1', 3]]));
      revisiones.consultarDocente.and.returnValue(throwError(() => new Error('falla')) as never);
      component.cargarDecisionesPendientes();
      expect(component.decisionesPorGrupo().size).toBe(0);
    });

    it('la marca del grupo en la lista abre ese grupo, donde están las decisiones', () => {
      revisiones.consultarDocente.and.returnValue(paginaRevisiones([{ id: 'r1', estado: 'PENDIENTE_DOCENTE', idGrupo: 'crs-1' }]) as never);
      component.cargarDecisionesPendientes();
      fixture.detectChanges();

      (fixture.nativeElement.querySelector('[data-testid="decisiones-grupo-crs-1"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(component.vistaActual()).toBe('HUB_GRUPO');
      expect(component.selectedCourse()?.id).toBe('crs-1');
      expect(component.subPestanaHub()).toBe('SABANA');
      expect(router.navigate).not.toHaveBeenCalledWith(['/app/asistencia'], jasmine.anything());
    });

    it('al volver del grupo a la lista se recalculan las decisiones pendientes', () => {
      component.verHubGrupo(course);
      revisiones.consultarDocente.calls.reset();
      component.volverALista();
      expect(revisiones.consultarDocente).toHaveBeenCalledTimes(1);
    });
  });
});
