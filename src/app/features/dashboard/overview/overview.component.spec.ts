import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { OverviewComponent } from './overview.component';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { DeanManagementService } from '../../../core/services/dean-management.service';
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

describe('OverviewComponent', () => {
  let fixture: ComponentFixture<OverviewComponent>;
  let component: OverviewComponent;

  let currentUserSignal: ReturnType<typeof signal<User | null>>;
  let authServiceSpy: { currentUser: jasmine.Spy };
  let courseServiceSpy: jasmine.SpyObj<CourseService>;
  let adminServiceSpy: jasmine.SpyObj<AdminManagementService>;
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
    {
      id: 'mat-1',
      codigo: 'MAT-101',
      nombre: 'Cálculo I',
      grupo: '01',
      docente: 'Profesor X',
      horario: 'Martes 10:00 - 12:00',
      aula: 'Aula 102',
      creditos: 4,
      porcentajeAsistencia: 90,
      asistencias: 9,
      inasistencias: 1,
      totalClases: 10,
      estado: 'Al día',
    },
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
      of({ exitoso: true, datos: [{ id: 'r1', estadoSolicitud: 'PENDIENTE' } as any] })
    );

    await TestBed.configureTestingModule({
      imports: [OverviewComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CourseService, useValue: courseServiceSpy },
        { provide: AdminManagementService, useValue: adminServiceSpy },
        { provide: DeanManagementService, useValue: deanServiceSpy },
        { provide: CoordinatorManagementService, useValue: coordinatorServiceSpy },
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
    expect(claimServiceSpy.getReclamosDocente).toHaveBeenCalled();
    expect(component.pendingClaimsCount()).toBe(1);
    expect(component.totalStudentsCount()).toBe(25);
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
    expect(component.totalGruposFacultad()).toBe(15);
    expect(component.isLoading()).toBeFalse();
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
    expect(component.averageStudentAttendance()).toBe(90);
    expect(component.totalStudentAbsences()).toBe(1);
    expect(component.isLoading()).toBeFalse();
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
