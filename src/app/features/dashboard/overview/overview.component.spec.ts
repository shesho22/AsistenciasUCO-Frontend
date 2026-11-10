import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
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
      telefono: '5698000',
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
    deanServiceSpy.getCoordinadores.and.returnValue(of({ exitoso: true, datos: mockCoordinadores }));

    adminIndicatorsSpy = jasmine.createSpyObj('AdminIndicatorsService', ['consultarKpis']);
    adminIndicatorsSpy.consultarKpis.and.returnValue(of({ exitoso: true, datos: { totalProgramas: 4, porcentajeAsistencia: 96.54 } as any }));

    deanIndicatorsSpy = jasmine.createSpyObj('DeanIndicatorsService', ['consultarKpis']);
    deanIndicatorsSpy.consultarKpis.and.returnValue(
      of({ exitoso: true, datos: { porcentajeAsistencia: 82.86, gruposActivos: 5, nombrePeriodoAcademico: '2026-2' } as any })
    );

    coordinatorIndicatorsSpy = jasmine.createSpyObj('CoordinatorIndicatorsService', ['consultarKpis']);
    coordinatorIndicatorsSpy.consultarKpis.and.returnValue(of({ exitoso: true, datos: { estudiantesRiesgo: 3 } as any }));

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
      of({ exitoso: true, datos: [{ id: 'est-1' } as any] })
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
      of({ exitoso: true, datos: [{ id: 'r1', estadoSolicitud: 'PENDIENTE' } as any], total: 7 })
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
    expect(component.totalStudentsCount()).toBe(25);
    expect(component.isLoading()).toBeFalse();
  });

  it('usa el total del servidor y no la longitud de la primera página para el contador de pendientes', () => {
    claimServiceSpy.getReclamosDocente.and.returnValue(of({ exitoso: true, datos: [], total: 42 }));
    createComponentWithRole('DOCENTE');
    expect(component.pendingClaimsCount()).toBe(42);
  });

  it('cae a la longitud de datos si el servidor no informa total', () => {
    claimServiceSpy.getReclamosDocente.and.returnValue(of({ exitoso: true, datos: [{ id: 'r1' } as any] }));
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

  it('debe inicializarse correctamente para rol ADMINISTRADOR', () => {
    createComponentWithRole('ADMINISTRADOR');
    expect(adminServiceSpy.getDecanos).toHaveBeenCalled();
    expect(component.decanos().length).toBe(1);
    expect(component.totalFacultadesAdmin()).toBe(1);
    expect(component.isLoading()).toBeFalse();
  });

  it('ADMIN: la tarjeta de programas refleja el total que entrega el backend y no una expresión sobre decanos', () => {

    createComponentWithRole('ADMINISTRADOR');

    expect(adminIndicatorsSpy.consultarKpis).toHaveBeenCalled();

    expect(component.totalProgramasAdmin()).toBe(4);

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Programas Académicos');

    expect(texto).toMatch(/Programas Académicos\s*4/);

  });



  it('F3-ADM-02: Asistencia campus sale de /admin/indicadores y decanos en ejercicio solo cuenta los activos', () => {
    adminServiceSpy.getDecanos.and.returnValue(of({
      exitoso: true,
      datos: [
        { id: 'd1', estaActivoDecano: true },
        { id: 'd2', estaActivoDecano: false },
        { id: 'd3', estaActivoDecano: false },
      ] as any,
    }));
    createComponentWithRole('ADMINISTRADOR');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="asistencia-campus"]')!.textContent!.trim()).toBe('96.54%');
    expect(el.querySelector('[data-testid="decanos-activos"]')!.textContent!.trim()).toBe('1');
    expect(el.textContent).toContain('3 registrados');
  });

  it('F3-ADM-02: sin porcentajeAsistencia la tarjeta de campus muestra Sin datos, no 100%', () => {
    adminIndicatorsSpy.consultarKpis.and.returnValue(of({ exitoso: true, datos: { totalProgramas: 4, porcentajeAsistencia: null } as any }));
    createComponentWithRole('ADMINISTRADOR');
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="asistencia-campus"]')!.textContent!.trim()).toBe('Sin datos');
  });

  it('F3-COO-01: la tarjeta fija de 92% se reemplaza por estudiantes en riesgo de /coordinador/indicadores y el rotulo dice Registrados', () => {
    createComponentWithRole('COORDINADOR');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="estudiantes-riesgo"]')!.textContent!.trim()).toBe('3');
    expect(el.textContent).toContain('Estudiantes Registrados');
    expect(el.textContent).not.toContain('Estudiantes Matriculados');
    expect(el.textContent).not.toContain('92%');
  });

  it('ADMIN: sin total (null) la tarjeta de programas muestra Sin datos, no 0 ni 1', () => {

    adminIndicatorsSpy.consultarKpis.and.returnValue(of({ exitoso: true, datos: { totalProgramas: null } as any }));

    createComponentWithRole('ADMINISTRADOR');

    expect(component.totalProgramasAdmin()).toBeNull();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Sin datos');

  });



  it('ADMIN: si la consulta de indicadores falla la tarjeta queda en Sin datos y los decanos cargan', () => {

    adminIndicatorsSpy.consultarKpis.and.returnValue(throwError(() => ({ status: 403 })));

    createComponentWithRole('ADMINISTRADOR');

    expect(component.totalProgramasAdmin()).toBeNull();

    expect(component.decanos().length).toBe(1);

    expect(component.isLoading()).toBeFalse();

  });



  it('debe manejar error al cargar decanos para rol ADMIN', () => {
    adminServiceSpy.getDecanos.and.returnValue(throwError(() => new Error('Error')));
    createComponentWithRole('ADMIN');
    expect(component.isLoading()).toBeFalse();
  });

  it('debe inicializarse correctamente para rol DECANO', () => {
    createComponentWithRole('DECANO');
    expect(deanServiceSpy.getCoordinadores).toHaveBeenCalled();
    expect(component.coordinadores().length).toBe(1);
    expect(component.totalDocentesFacultad()).toBe(10);
    // DASH-13: los grupos en curso son los activos del período vigente de la facultad, no la suma por coordinador.
    expect(component.gruposActivosFacultad()).toBe(5);
    expect(component.periodoFacultad()).toBe('2026-2');
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Semestre 2026-II');
    expect(component.isLoading()).toBeFalse();
  });

  it('DECANO: la tarjeta de asistencia refleja el porcentaje que entrega el backend y no un valor fijo', () => {
    createComponentWithRole('DECANO');
    expect(deanIndicatorsSpy.consultarKpis).toHaveBeenCalled();
    expect(component.porcentajeAsistenciaFacultad()).toBe(82.86);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('82.86%');
    expect(texto).not.toContain('94%');
  });

  it('DECANO: sin porcentaje (null) la tarjeta muestra Sin datos, no 0%', () => {
    deanIndicatorsSpy.consultarKpis.and.returnValue(of({ exitoso: true, datos: { porcentajeAsistencia: null } as any }));
    createComponentWithRole('DECANO');
    expect(component.porcentajeAsistenciaFacultad()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Sin datos');
  });

  it('DECANO: si la consulta de indicadores falla la tarjeta queda en Sin datos y el resto de la vista carga', () => {
    deanIndicatorsSpy.consultarKpis.and.returnValue(throwError(() => ({ status: 403 })));
    createComponentWithRole('DECANO');
    expect(component.porcentajeAsistenciaFacultad()).toBeNull();
    expect(component.gruposActivosFacultad()).toBeNull();
    expect(component.coordinadores().length).toBe(1);
    expect(component.isLoading()).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Sin período vigente');
  });

  it('debe manejar error al cargar coordinadores para rol DECANO', () => {
    deanServiceSpy.getCoordinadores.and.returnValue(throwError(() => new Error('Error')));
    createComponentWithRole('DECANO');
    expect(component.isLoading()).toBeFalse();
  });

  it('debe inicializarse correctamente para rol COORDINADOR', () => {
    createComponentWithRole('COORDINADOR');
    expect(coordinatorServiceSpy.getPlanesEstudio).toHaveBeenCalled();
    expect(coordinatorServiceSpy.getDocentes).toHaveBeenCalled();
    expect(coordinatorServiceSpy.getEstudiantesDirectorio).toHaveBeenCalled();
    expect(component.planesEstudio().length).toBe(1);
    expect(component.docentes().length).toBe(1);
    expect(component.totalGruposPrograma()).toBe(3);
    expect(component.totalEstudiantesPrograma()).toBe(1);
    expect(component.isLoading()).toBeFalse();
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
