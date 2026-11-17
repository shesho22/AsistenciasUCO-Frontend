import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { OverviewComponent } from './overview.component';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { DeanManagementService } from '../../../core/services/dean-management.service';
import { DeanIndicatorsService } from '../../../core/services/dean-indicators.service';
import { CoordinatorIndicatorsService } from '../../../core/services/coordinator-indicators.service';
import { CoordinadorSesionesService } from '../../../core/services/coordinador-sesiones.service';
import { CoordinatorProgramService } from '../../../core/services/coordinator-program.service';
import { AdminIndicatorsService } from '../../../core/services/admin-indicators.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { StudentManagementService } from '../../../core/services/student-management.service';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { TeacherGruposResumenService } from '../../../core/services/teacher-grupos-resumen.service';
import { User, UserRole } from '../../../core/models/user.model';
import { Course } from '../../../core/models/course.model';
import {
  DecanoItem,
  CoordinadorItem,
  DocenteItem,
  PlanEstudioItem,
  MateriaEstudianteItem,
  HorarioDocenteItem,
  HorarioItem,
} from '../../../core/models/role-management.model';
import { crearMateria } from '../../../core/testing/student-portal.fixtures';

describe('OverviewComponent', () => {
  let fixture: ComponentFixture<OverviewComponent>;
  let component: OverviewComponent;

  let currentUserSignal: ReturnType<typeof signal<User | null>>;
  let authServiceSpy: { currentUser: jasmine.Spy };
  let courseServiceSpy: jasmine.SpyObj<CourseService>;
  let adminServiceSpy: jasmine.SpyObj<AdminManagementService>;
  let deanIndicatorsSpy: jasmine.SpyObj<DeanIndicatorsService>;
  let adminIndicatorsSpy: jasmine.SpyObj<AdminIndicatorsService>;
  let coordinatorIndicatorsSpy: jasmine.SpyObj<CoordinatorIndicatorsService>;
  let coordinadorSesionesSpy: jasmine.SpyObj<CoordinadorSesionesService>;
  let coordinatorProgramSpy: jasmine.SpyObj<CoordinatorProgramService>;
  let deanServiceSpy: jasmine.SpyObj<DeanManagementService>;
  let coordinatorServiceSpy: jasmine.SpyObj<CoordinatorManagementService>;
  let studentServiceSpy: jasmine.SpyObj<StudentManagementService>;
  let claimServiceSpy: jasmine.SpyObj<AttendanceClaimService>;
  let gruposResumenSpy: jasmine.SpyObj<TeacherGruposResumenService>;

  const mockUserDocente: User = {
    id: 'user-doc-1',
    name: 'Docente Juan',
    email: 'docente@uco.edu.co',
    role: 'DOCENTE',
    institutionName: 'UCO',
    department: 'Ingeniería',
    status: 'active',
  };

  const mockCourses: Course[] = [
    {
      id: 'c1',
      code: 'ING-101',
      name: 'Estructuras de Datos',
      schedule: 'Lunes 08:00 - 10:00',
      room: 'Aula 201',
      enrolledStudentsCount: 25,
      section: 'Grupo 01',
      colorCategory: 'emerald',
    },
  ];

  const mockHorarioDocente: HorarioDocenteItem[] = [
    {
      id: 'h1',
      codigoMateria: 'ING-101',
      nombreMateria: 'Estructuras de Datos',
      seccion: 'G1',
      dia: 'Lunes',
      horaInicio: '08:00',
      horaFin: '10:00',
      totalEstudiantes: 25,
      colorCategory: 'emerald',
    },
  ];

  const mockDecanos: DecanoItem[] = [
    {
      id: 'dec-1',
      numeroIdentificacion: '123',
      nombres: 'Decano 1',
      apellidos: 'Pérez',
      correo: 'decano@uco.edu.co',
      facultad: 'Facultad de Ingeniería',
      fechaAsignacion: '2025-01-01',
      estado: 'ACTIVO',
    },
  ];

  const mockCoordinadores: CoordinadorItem[] = [
    {
      id: 'coord-1',
      numeroIdentificacion: '456',
      nombres: 'Coord 1',
      apellidos: 'Gómez',
      correo: 'coord@uco.edu.co',
      programaAcademico: 'Sistemas',
      facultad: 'Ingeniería',
      estado: 'ACTIVO',
      totalDocentes: 10,
      totalGrupos: 15,
    },
  ];

  const mockDocentes: DocenteItem[] = [
    {
      id: 'doc-1',
      numeroIdentificacion: '789',
      nombres: 'Docente 1',
      apellidos: 'Rodríguez',
      correo: 'doc@uco.edu.co',
      especialidad: 'Software',
      departamento: 'Ingeniería',
      estado: 'ACTIVO',
      totalGruposAsignados: 3,
    },
  ];

  const mockPlanes: PlanEstudioItem[] = [
    {
      id: 'plan-1',
      codigo: 'P-SIS',
      nombre: 'Ingeniería de Sistemas',
      anioVigencia: 2024,
      programa: 'Ingeniería de Sistemas',
      facultad: 'Facultad de Ingeniería',
      totalCreditos: 160,
      totalSemestres: 10,
      totalAsignaturas: 50,
      estado: 'VIGENTE',
      descripcion: 'Plan de estudios vigente',
    },
  ];

  const mockMaterias: MateriaEstudianteItem[] = [
    crearMateria({
      id: 'e2f3a4b5-0000-0000-0000-0000000000a1',
      codigo: 'MAT-101',
      nombre: 'Cálculo I',
      grupo: '01',
      docente: 'Profesor X',
      horario: 'Martes 10:00 - 12:00',
      aula: 'Aula 102',
      creditos: 4,
      indicadores: { sesionesEjecutadas: 10, horasDictadas: 20, horasAsistidas: 18, horasFalta: 2, horasExcusa: 0, horasSinRegistro: 0, porcentajeInasistencia: 10, porcentajeAsistencia: 90, codigoPermanencia: 'REGULAR', umbralAdvertencia: 15, umbralPerdida: 20 },
      estado: 'Al día',
    }),
  ];

  const mockHorarioEstudiante: HorarioItem[] = [
    {
      id: 'he-1',
      codigoMateria: 'MAT-101',
      nombreMateria: 'Cálculo I',
      grupo: '01',
      dia: 'Martes',
      horaInicio: '10:00',
      horaFin: '12:00',
      aula: 'Aula 102',
      docente: 'Profesor X',
      colorCategory: 'blue',
    },
  ];

  beforeEach(async () => {
    currentUserSignal = signal<User | null>(mockUserDocente);
    authServiceSpy = {
      currentUser: jasmine.createSpy('currentUser').and.callFake(() => currentUserSignal()),
    };

    courseServiceSpy = jasmine.createSpyObj('CourseService', ['getTeacherCourses']);
    courseServiceSpy.getTeacherCourses.and.returnValue(of({ exitoso: true, datos: mockCourses }));

    adminServiceSpy = jasmine.createSpyObj('AdminManagementService', ['getDecanos']);
    adminServiceSpy.getDecanos.and.returnValue(of({ exitoso: true, datos: mockDecanos }));

    deanServiceSpy = jasmine.createSpyObj('DeanManagementService', ['getCoordinadores']);
    deanServiceSpy.getCoordinadores.and.returnValue(of({
      exitoso: true, datos: mockCoordinadores, elementos: mockCoordinadores, numeroPagina: 1, tamanoPagina: 100,
      totalElementos: mockCoordinadores.length, totalPaginas: 1,
    }));

    adminIndicatorsSpy = jasmine.createSpyObj('AdminIndicatorsService', ['consultarKpis']);
    adminIndicatorsSpy.consultarKpis.and.returnValue(
      of({ exitoso: true, datos: { totalProgramas: 4, porcentajeAsistencia: 96.54, facultadesActivas: 3, totalDecanos: 3, decanosActivos: 1 } as never })
    );

    deanIndicatorsSpy = jasmine.createSpyObj('DeanIndicatorsService', ['consultarKpis']);
    deanIndicatorsSpy.consultarKpis.and.returnValue(
      of({
        exitoso: true,
        datos: { porcentajeAsistencia: 82.86, gruposActivos: 5, nombrePeriodoAcademico: '2026-2', totalCoordinadores: 4, totalDocentes: 37 } as never,
      })
    );

    coordinatorIndicatorsSpy = jasmine.createSpyObj('CoordinatorIndicatorsService', ['consultarKpis']);
    coordinatorIndicatorsSpy.consultarKpis.and.returnValue(
      of({
        exitoso: true,
        datos: { estudiantesRiesgo: 3, totalDocentes: 12, gruposActivos: 7, nombrePeriodoAcademico: '2026-2', estudiantesRegistrados: 5007 } as never,
      })
    );

    coordinadorSesionesSpy = jasmine.createSpyObj('CoordinadorSesionesService', ['contarPendientes']);
    coordinadorSesionesSpy.contarPendientes.and.returnValue(of(4));
    coordinatorProgramSpy = jasmine.createSpyObj('CoordinatorProgramService', ['cargar', 'programaId']);
    coordinatorProgramSpy.cargar.and.returnValue(of([]));
    coordinatorProgramSpy.programaId.and.returnValue('prog-1');

    coordinatorServiceSpy = jasmine.createSpyObj('CoordinatorManagementService', [
      'getPlanesEstudio',
      'getDocentes',
      'getEstudiantesDirectorio',
    ]);
    coordinatorServiceSpy.getPlanesEstudio.and.returnValue(of({ exitoso: true, datos: mockPlanes }));
    coordinatorServiceSpy.getDocentes.and.returnValue(of({ exitoso: true, datos: mockDocentes }));
    coordinatorServiceSpy.getEstudiantesDirectorio.and.returnValue(
      of({ exitoso: true, datos: [{ id: 'est-1' } as never] })
    );

    gruposResumenSpy = jasmine.createSpyObj('TeacherGruposResumenService', ['consultar']);
    gruposResumenSpy.consultar.and.returnValue(
      of({ exitoso: true, datos: { gruposHabilitados: 1, estudiantesActivos: 31, cupoTotal: 40, tasaOcupacion: 77.5 } })
    );

    studentServiceSpy = jasmine.createSpyObj('StudentManagementService', ['getHorarios', 'getMaterias']);
    studentServiceSpy.getHorarios.and.returnValue(of({ exitoso: true, datos: mockHorarioEstudiante }));
    studentServiceSpy.getMaterias.and.returnValue(of({ exitoso: true, datos: mockMaterias }));

    claimServiceSpy = jasmine.createSpyObj('AttendanceClaimService', [
      'getHorarioDocente',
      'getReclamosDocente',
    ]);
    claimServiceSpy.getHorarioDocente.and.returnValue(of({ exitoso: true, datos: mockHorarioDocente }));
    claimServiceSpy.getReclamosDocente.and.returnValue(
      of({ exitoso: true, datos: [{ id: 'r1', estadoSolicitud: 'PENDIENTE' } as never], total: 7 })
    );

    await TestBed.configureTestingModule({
      imports: [OverviewComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CourseService, useValue: courseServiceSpy },
        { provide: AdminManagementService, useValue: adminServiceSpy },
        { provide: DeanManagementService, useValue: deanServiceSpy },
        { provide: DeanIndicatorsService, useValue: deanIndicatorsSpy },
        { provide: AdminIndicatorsService, useValue: adminIndicatorsSpy },
        { provide: CoordinatorManagementService, useValue: coordinatorServiceSpy },
        { provide: CoordinatorIndicatorsService, useValue: coordinatorIndicatorsSpy },
        { provide: CoordinadorSesionesService, useValue: coordinadorSesionesSpy },
        { provide: CoordinatorProgramService, useValue: coordinatorProgramSpy },
        { provide: StudentManagementService, useValue: studentServiceSpy },
        { provide: AttendanceClaimService, useValue: claimServiceSpy },
        { provide: TeacherGruposResumenService, useValue: gruposResumenSpy },
      ],
    }).compileComponents();
  });

  function createComponentWithRole(role: UserRole) {
    currentUserSignal.set({
      ...mockUserDocente,
      role,
    });
    fixture = TestBed.createComponent(OverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('debe inicializarse correctamente para rol DOCENTE', () => {
    createComponentWithRole('DOCENTE');
    expect(component).toBeTruthy();
    expect(claimServiceSpy.getHorarioDocente).toHaveBeenCalled();
    expect(courseServiceSpy.getTeacherCourses).toHaveBeenCalled();
    expect(claimServiceSpy.getReclamosDocente.calls.mostRecent().args as unknown[]).toEqual([{ estado: 'P', pagina: 1, tamano: 1 }]);
    expect(component.pendingClaimsCount()).toBe(7);
    // CIERRE-W3I: el total sale del servidor (31), no de sumar enrolledStudentsCount de los cursos cargados (25).
    expect(gruposResumenSpy.consultar).toHaveBeenCalled();
    expect(component.totalStudentsCount()).toBe(31);
    expect(component.isLoading()).toBeFalse();
  });

  it('DOCENTE: si el resumen de grupos falla no se inventa un total (null, la tarjeta muestra el guion)', () => {
    gruposResumenSpy.consultar.and.returnValue(throwError(() => ({ status: 403 })));
    createComponentWithRole('DOCENTE');
    expect(component.totalStudentsCount()).toBeNull();
    expect(component.courses.length).toBe(1);
  });

  it('DOCENTE: una respuesta sin datos deja el total en blanco', () => {
    gruposResumenSpy.consultar.and.returnValue(of<never>({ exitoso: true, datos: null } as never));
    createComponentWithRole('DOCENTE');
    expect(component.totalStudentsCount()).toBeNull();
  });

  it('usa el total del servidor y no la longitud de la primera página para el contador de pendientes', () => {
    claimServiceSpy.getReclamosDocente.and.returnValue(of({ exitoso: true, datos: [], total: 42 }));
    createComponentWithRole('DOCENTE');
    expect(component.pendingClaimsCount()).toBe(42);
  });

  it('cae a la longitud de datos si el servidor no informa total', () => {
    claimServiceSpy.getReclamosDocente.and.returnValue(of({ exitoso: true, datos: [{ id: 'r1' } as never] }));
    createComponentWithRole('DOCENTE');
    expect(component.pendingClaimsCount()).toBe(1);
  });

  it('deja el contador vacío (null) cuando la consulta de reclamos falla', () => {
    claimServiceSpy.getReclamosDocente.and.returnValue(throwError(() => ({ status: 501 })));
    createComponentWithRole('DOCENTE');
    expect(component.pendingClaimsCount()).toBeNull();
    expect(component.isLoading()).toBeFalse();
  });

  it('debe manejar error al cargar cursos del docente', () => {
    courseServiceSpy.getTeacherCourses.and.returnValue(throwError(() => new Error('Error')));
    createComponentWithRole('DOCENTE');
    expect(component.isLoading()).toBeFalse();
  });

  const texto = (testid: string): string =>
    ((fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testid}"]`)?.textContent ?? '').trim();

  it('debe inicializarse correctamente para rol ADMINISTRADOR', () => {
    createComponentWithRole('ADMINISTRADOR');
    expect(adminServiceSpy.getDecanos).toHaveBeenCalled();
    expect(component.decanos().length).toBe(1);
    expect(component.adminEstado()).toBe('listo');
    expect(component.isLoading()).toBeFalse();
  });

  it('ADMIN: las facultades activas y los decanos salen del servidor, no del conjunto de decanos listados', () => {
    // El directorio trae un solo decano; la institucion tiene 3 facultades activas (una sin decano en la lista) y 3 decanos.
    createComponentWithRole('ADMINISTRADOR');
    expect(adminIndicatorsSpy.consultarKpis).toHaveBeenCalled();
    expect(component.decanos().length).toBe(1);
    expect(texto('facultades-activas')).toBe('3');
    expect(texto('decanos-activos')).toBe('1');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('de 3 registrados');
    expect(texto('programas')).toBe('4');
    expect(texto('asistencia-campus')).toBe('96.54%');
  });

  it('ADMIN: mientras los indicadores no llegan no se pinta un cero', () => {
    adminIndicatorsSpy.consultarKpis.and.returnValue(new Observable(() => undefined));
    createComponentWithRole('ADMINISTRADOR');
    expect(component.adminEstado()).toBe('cargando');
    expect(texto('facultades-activas')).toBe('Cargando…');
    expect(texto('programas')).toBe('Cargando…');
  });

  it('F3-ADM-02: sin porcentajeAsistencia la tarjeta de campus muestra Sin datos, no 100%', () => {
    adminIndicatorsSpy.consultarKpis.and.returnValue(of({ exitoso: true, datos: { totalProgramas: 4, porcentajeAsistencia: null } as never }));
    createComponentWithRole('ADMINISTRADOR');
    expect(texto('asistencia-campus')).toBe('Sin datos');
  });

  it('ADMIN: sin total (null) la tarjeta de programas muestra Sin datos, no 0 ni 1', () => {
    adminIndicatorsSpy.consultarKpis.and.returnValue(of({ exitoso: true, datos: { totalProgramas: null } as never }));
    createComponentWithRole('ADMINISTRADOR');
    expect(texto('programas')).toBe('Sin datos');
  });

  it('ADMIN: si la consulta de indicadores falla las tarjetas quedan en Sin datos y los decanos cargan', () => {
    adminIndicatorsSpy.consultarKpis.and.returnValue(throwError(() => ({ status: 403 })));
    createComponentWithRole('ADMINISTRADOR');
    expect(component.adminEstado()).toBe('error');
    expect(component.adminKpis()).toBeNull();
    expect(texto('facultades-activas')).toBe('Sin datos');
    expect(component.decanos().length).toBe(1);
    expect(component.isLoading()).toBeFalse();
  });

  it('ADMIN: una respuesta sin datos se trata como fallo', () => {
    adminIndicatorsSpy.consultarKpis.and.returnValue(of<never>({ exitoso: true, datos: null } as never));
    createComponentWithRole('ADMINISTRADOR');
    expect(component.adminEstado()).toBe('error');
  });

  it('F3-COO-01: la tarjeta fija de 92% se reemplaza por estudiantes en riesgo de /coordinador/indicadores y el rotulo dice Registrados', () => {
    createComponentWithRole('COORDINADOR');
    const el = fixture.nativeElement as HTMLElement;
    expect(texto('estudiantes-riesgo')).toBe('3');
    expect(el.textContent).toContain('Estudiantes Registrados');
    expect(el.textContent).not.toContain('Estudiantes Matriculados');
    expect(el.textContent).not.toContain('92%');
  });

  it('debe manejar error al cargar decanos para rol ADMINISTRADOR', () => {
    adminServiceSpy.getDecanos.and.returnValue(throwError(() => new Error('Error')));
    createComponentWithRole('ADMINISTRADOR');
    expect(component.isLoading()).toBeFalse();
  });

  it('debe inicializarse correctamente para rol DECANO', () => {
    createComponentWithRole('DECANO');
    expect(deanServiceSpy.getCoordinadores).toHaveBeenCalled();
    expect(component.coordinadores().length).toBe(1);
    expect(component.deanEstado()).toBe('listo');
    expect(component.isLoading()).toBeFalse();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Semestre 2026-II');
  });

  it('DECANO: coordinadores, docentes, grupos y periodo son los del servidor, no los de la lista de coordinadores', () => {
    // La lista trae un coordinador con 10 docentes; el servidor cuenta 4 coordinadores y 37 docentes sin repetir (DASH-13).
    createComponentWithRole('DECANO');
    expect(texto('coordinadores')).toBe('4');
    expect(texto('docentes')).toBe('37');
    expect(texto('grupos')).toBe('5');
    expect(texto('periodo')).toBe('2026-2');
  });

  it('F-DEC-01: mientras llegan los indicadores no se afirma "Sin período vigente"', () => {
    deanIndicatorsSpy.consultarKpis.and.returnValue(new Observable(() => undefined));
    createComponentWithRole('DECANO');
    expect(component.deanEstado()).toBe('cargando');
    expect(texto('grupos')).toBe('Cargando…');
    expect(texto('periodo')).toBe('Cargando…');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Sin período vigente');
  });

  it('F-DEC-01: "Sin período vigente" solo si el servidor respondió sin período', () => {
    deanIndicatorsSpy.consultarKpis.and.returnValue(
      of({ exitoso: true, datos: { gruposActivos: 0, nombrePeriodoAcademico: null, totalCoordinadores: 1, totalDocentes: 0, porcentajeAsistencia: null } as never })
    );
    createComponentWithRole('DECANO');
    expect(texto('periodo')).toBe('Sin período vigente');
    expect(texto('grupos')).toBe('0');
  });

  it('DECANO: la tarjeta de asistencia refleja el porcentaje que entrega el backend y no un valor fijo', () => {
    createComponentWithRole('DECANO');
    expect(deanIndicatorsSpy.consultarKpis).toHaveBeenCalled();
    expect(texto('asistencia')).toBe('82.86%');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('94%');
  });

  it('DECANO: sin porcentaje (null) la tarjeta muestra Sin datos, no 0%', () => {
    deanIndicatorsSpy.consultarKpis.and.returnValue(of({ exitoso: true, datos: { porcentajeAsistencia: null } as never }));
    createComponentWithRole('DECANO');
    expect(texto('asistencia')).toBe('Sin datos');
  });

  it('DECANO: si la consulta de indicadores falla las tarjetas quedan en Sin datos y el resto de la vista carga', () => {
    deanIndicatorsSpy.consultarKpis.and.returnValue(throwError(() => ({ status: 403 })));
    createComponentWithRole('DECANO');
    expect(component.deanEstado()).toBe('error');
    expect(component.deanKpis()).toBeNull();
    expect(component.coordinadores().length).toBe(1);
    expect(component.isLoading()).toBeFalse();
    expect(texto('grupos')).toBe('Sin datos');
    expect(texto('periodo')).toBe('Sin datos');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Sin período vigente');
  });

  it('DECANO: una respuesta sin datos se trata como fallo', () => {
    deanIndicatorsSpy.consultarKpis.and.returnValue(of<never>({ exitoso: true, datos: null } as never));
    createComponentWithRole('DECANO');
    expect(component.deanEstado()).toBe('error');
  });

  it('debe manejar error al cargar coordinadores para rol DECANO', () => {
    deanServiceSpy.getCoordinadores.and.returnValue(throwError(() => new Error('Error')));
    createComponentWithRole('DECANO');
    expect(component.isLoading()).toBeFalse();
  });

  describe('HU178: decano sin facultad y coordinador sin programa', () => {
    function crear(role: 'DECANO' | 'COORDINADOR', vinculos: User['vinculos']) {
      currentUserSignal.set({ ...mockUserDocente, role, department: 'Sin entidad', vinculos });
      fixture = TestBed.createComponent(OverviewComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it('al decano sin facultad le muestra el aviso y no consulta datos de facultad que responderían 403', () => {
      const el = crear('DECANO', []);

      expect(el.querySelector('[data-testid="decano-sin-facultad"]')).not.toBeNull();
      expect(el.querySelector('app-overview-dean')).toBeNull();
      expect(deanIndicatorsSpy.consultarKpis).not.toHaveBeenCalled();
      expect(deanServiceSpy.getCoordinadores).not.toHaveBeenCalled();
      expect(component.isLoading()).toBeFalse();
    });

    it('con su facultad en el perfil carga el panel del decano como siempre', () => {
      const el = crear('DECANO', [{ rol: 'DECANO', nombreEntidad: 'Facultad de Ciencias' }]);

      expect(el.querySelector('[data-testid="decano-sin-facultad"]')).toBeNull();
      expect(el.querySelector('app-overview-dean')).not.toBeNull();
      expect(deanServiceSpy.getCoordinadores).toHaveBeenCalled();
    });

    it('al coordinador sin programa le muestra el aviso y no consulta datos de programa que responderían 403', () => {
      const el = crear('COORDINADOR', []);

      expect(el.querySelector('[data-testid="coordinador-sin-programa"]')).not.toBeNull();
      expect(el.querySelector('app-overview-coordinator')).toBeNull();
      expect(coordinatorServiceSpy.getPlanesEstudio).not.toHaveBeenCalled();
      expect(coordinatorServiceSpy.getDocentes).not.toHaveBeenCalled();
      expect(coordinatorServiceSpy.getEstudiantesDirectorio).not.toHaveBeenCalled();
      expect(coordinatorIndicatorsSpy.consultarKpis).not.toHaveBeenCalled();
      expect(coordinatorProgramSpy.cargar).not.toHaveBeenCalled();
      expect(component.isLoading()).toBeFalse();
    });

    it('con su programa en el perfil carga el panel del coordinador como siempre', () => {
      const el = crear('COORDINADOR', [{ rol: 'COORDINADOR', nombreEntidad: 'Derecho' }]);

      expect(el.querySelector('[data-testid="coordinador-sin-programa"]')).toBeNull();
      expect(el.querySelector('app-overview-coordinator')).not.toBeNull();
      expect(coordinatorServiceSpy.getDocentes).toHaveBeenCalled();
    });
  });

  it('debe inicializarse correctamente para rol COORDINADOR', () => {
    createComponentWithRole('COORDINADOR');
    expect(coordinatorServiceSpy.getPlanesEstudio).toHaveBeenCalled();
    expect(coordinatorServiceSpy.getDocentes).toHaveBeenCalled();
    expect(component.planesEstudio().length).toBe(1);
    expect(component.docentes().length).toBe(1);
    expect(component.coordEstado()).toBe('listo');
    expect(component.isLoading()).toBeFalse();
  });

  it('F-COORD-01: los estudiantes registrados salen del servidor y no se descarga el directorio completo', () => {
    // El directorio de la primera pagina trae 1 docente; el padron real del programa es 5007.
    createComponentWithRole('COORDINADOR');
    expect(coordinatorServiceSpy.getEstudiantesDirectorio).not.toHaveBeenCalled();
    expect(texto('estudiantes')).toBe('5007');
    expect(texto('docentes')).toBe('12');
    expect(texto('grupos')).toBe('7');
    expect(texto('periodo')).toBe('2026-2');
  });

  it('F-COORD-01: los indicadores se piden con el programa ya resuelto (antes de consultar, cargar el programa)', () => {
    const orden: string[] = [];
    coordinatorProgramSpy.cargar.and.callFake(() => {
      orden.push('programa');
      return of([]);
    });
    coordinatorIndicatorsSpy.consultarKpis.and.callFake(() => {
      orden.push('indicadores');
      return of({ exitoso: true, datos: { estudiantesRegistrados: 5007 } as never });
    });
    createComponentWithRole('COORDINADOR');
    expect(orden).toEqual(['programa', 'indicadores']);
  });

  it('F-COORD-01: mientras llegan los indicadores el padron no se muestra como 0', () => {
    coordinatorIndicatorsSpy.consultarKpis.and.returnValue(new Observable(() => undefined));
    createComponentWithRole('COORDINADOR');
    expect(component.coordEstado()).toBe('cargando');
    expect(texto('estudiantes')).toBe('Cargando…');
  });

  it('F-COORD-01: si los indicadores fallan se muestra Sin datos y no 0', () => {
    coordinatorIndicatorsSpy.consultarKpis.and.returnValue(throwError(() => ({ status: 400 })));
    createComponentWithRole('COORDINADOR');
    expect(component.coordEstado()).toBe('error');
    expect(texto('estudiantes')).toBe('Sin datos');
    expect(texto('estudiantes-riesgo')).toBe('Sin datos');
  });

  it('COORDINADOR: si no se pueden resolver los programas no se consultan indicadores y se muestra Sin datos', () => {
    coordinatorProgramSpy.cargar.and.returnValue(throwError(() => ({ status: 403 })));
    createComponentWithRole('COORDINADOR');
    expect(coordinatorIndicatorsSpy.consultarKpis).not.toHaveBeenCalled();
    expect(coordinadorSesionesSpy.contarPendientes).not.toHaveBeenCalled();
    expect(component.coordEstado()).toBe('error');
    expect(component.solicitudesSesionPendientes()).toBeNull();
  });

  it('COORDINADOR: una respuesta de indicadores sin datos se trata como fallo', () => {
    coordinatorIndicatorsSpy.consultarKpis.and.returnValue(of<never>({ exitoso: true, datos: null } as never));
    createComponentWithRole('COORDINADOR');
    expect(component.coordEstado()).toBe('error');
  });

  it('DEC-065 (2): el coordinador ve las solicitudes de sesión pendientes de su programa con enlace a Asistencia', () => {
    createComponentWithRole('COORDINADOR');
    fixture.detectChanges();

    expect(coordinadorSesionesSpy.contarPendientes).toHaveBeenCalledWith('prog-1');
    expect(component.solicitudesSesionPendientes()).toBe(4);
    const tarjeta: HTMLAnchorElement | null = fixture.nativeElement.querySelector('[data-testid="solicitudes-sesion-pendientes"]');
    expect(tarjeta?.getAttribute('href')).toBe('/app/coordinador/asistencia');
    expect(fixture.nativeElement.querySelector('[data-testid="solicitudes-sesion-valor"]').textContent.trim()).toBe('4');
  });

  it('DEC-065 (2): si el conteo falla la tarjeta muestra «Sin datos», no un cero', () => {
    coordinadorSesionesSpy.contarPendientes.and.returnValue(throwError(() => new Error('500')));
    createComponentWithRole('COORDINADOR');
    fixture.detectChanges();

    expect(component.solicitudesSesionPendientes()).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="solicitudes-sesion-valor"]').textContent.trim()).toBe('Sin datos');
  });

  it('debe manejar error al cargar docentes para rol COORDINADOR', () => {
    coordinatorServiceSpy.getDocentes.and.returnValue(throwError(() => new Error('Error')));
    createComponentWithRole('COORDINADOR');
    expect(component.isLoading()).toBeFalse();
  });

  it('debe inicializarse correctamente para rol ESTUDIANTE', () => {
    createComponentWithRole('ESTUDIANTE');
    expect(studentServiceSpy.getHorarios).toHaveBeenCalled();
    expect(studentServiceSpy.getMaterias).toHaveBeenCalled();
    expect(component.materias().length).toBe(1);
    expect(component.studentMateriasEnRiesgo()).toBe(0);
    expect(component.studentHorasFalta()).toBe(2);
    expect(component.isLoading()).toBeFalse();
  });

  it('sin indicadores autoritativos no cuenta riesgo ni horas de falta (null, nunca 0 ni NaN)', () => {
    studentServiceSpy.getMaterias.and.returnValue(of({ exitoso: true, datos: [crearMateria()] }));
    createComponentWithRole('ESTUDIANTE');
    expect(component.materias().length).toBe(1);
    expect(component.studentMateriasEnRiesgo()).toBeNull();
    expect(component.studentHorasFalta()).toBeNull();
  });

  it('debe manejar error al cargar materias para rol ESTUDIANTE', () => {
    studentServiceSpy.getMaterias.and.returnValue(throwError(() => new Error('Error')));
    createComponentWithRole('ESTUDIANTE');
    expect(component.isLoading()).toBeFalse();
  });

  it('debe manejar fallback de cálculo de próxima clase con courses si no hay horariosDocente', () => {
    createComponentWithRole('DOCENTE');
    component.horariosDocente.set([]);
    component.courses = mockCourses;
    component.recalcularProximaClase();
    expect(component).toBeTruthy();
  });

  it('debe manejar fallback de cálculo de próxima clase con materias si no hay horariosEstudiante', () => {
    createComponentWithRole('ESTUDIANTE');
    component.horariosEstudiante.set([]);
    component.materias.set(mockMaterias);
    component.recalcularProximaClase();
    expect(component).toBeTruthy();
  });
});
