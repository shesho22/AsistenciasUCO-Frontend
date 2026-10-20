import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { StudentCoursesComponent } from './student-courses.component';
import { StudentManagementService } from '../../../core/services/student-management.service';
import { AttendanceClaimService } from '../../../core/services/attendance-claim.service';
import { AuthService } from '../../../core/services/auth.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { CourseService } from '../../../core/services/course.service';
import { SessionService } from '../../../core/services/session.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { MateriaEstudianteItem, SesionMateriaDetalle } from '../../../core/models/role-management.model';

describe('StudentCoursesComponent', () => {
  let fixture: ComponentFixture<StudentCoursesComponent>;
  let component: StudentCoursesComponent;

  let studentServiceSpy: jasmine.SpyObj<StudentManagementService>;
  let claimServiceSpy: jasmine.SpyObj<AttendanceClaimService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let coordinatorServiceSpy: jasmine.SpyObj<CoordinatorManagementService>;
  let courseServiceSpy: jasmine.SpyObj<CourseService>;
  let sessionServiceSpy: jasmine.SpyObj<SessionService>;
  let toastSpy: jasmine.SpyObj<ToastService>;

  const mockMaterias: MateriaEstudianteItem[] = [
    {
      id: 'mat-1',
      codigo: 'IS-101',
      nombre: 'Arquitectura de Software',
      creditos: 3,
      grupo: 'G1',
      docente: 'Ing. Pedro Pérez',
      aula: 'Aula 201',
      horario: 'Lunes 08:00 - 10:00',
      totalClases: 16,
      asistencias: 14,
      inasistencias: 2,
      porcentajeAsistencia: 87.5,
      estado: 'Al día',
    },
  ];

  const mockSesiones: SesionMateriaDetalle[] = [
    {
      id: 'ses-1',
      materiaId: 'mat-1',
      numeroSesion: 1,
      fecha: '2026-09-01',
      horario: '08:00 - 10:00',
      tema: 'Clean Architecture',
      estadoAsistencia: 'AUSENTE',
      reclamoId: 'rec-1',
    },
  ];

  beforeEach(async () => {
    studentServiceSpy = jasmine.createSpyObj('StudentManagementService', [
      'getMaterias',
      'getPrerrequisitosMateria',
      'matricularGrupo',
    ]);
    claimServiceSpy = jasmine.createSpyObj('AttendanceClaimService', [
      'getSesionesPorMateria',
      'crearReclamo',
      'eliminarReclamo',
      'subirSoporte',
    ]);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['currentUser']);
    coordinatorServiceSpy = jasmine.createSpyObj('CoordinatorManagementService', [
      'crearSolicitudMatricula',
    ]);
    courseServiceSpy = jasmine.createSpyObj('CourseService', ['getTeacherCourses']);
    sessionServiceSpy = jasmine.createSpyObj('SessionService', ['registrarAutoAsistencia']);
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    studentServiceSpy.getMaterias.and.returnValue(
      of({ exitoso: true, datos: mockMaterias })
    );
    claimServiceSpy.getSesionesPorMateria.and.returnValue(
      of({ exitoso: true, datos: mockSesiones })
    );

    await TestBed.configureTestingModule({
      imports: [StudentCoursesComponent],
      providers: [
        { provide: StudentManagementService, useValue: studentServiceSpy },
        { provide: AttendanceClaimService, useValue: claimServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CoordinatorManagementService, useValue: coordinatorServiceSpy },
        { provide: CourseService, useValue: courseServiceSpy },
        { provide: SessionService, useValue: sessionServiceSpy },
        { provide: ToastService, useValue: toastSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: () => null,
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentCoursesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe inicializarse y cargar materias del estudiante', () => {
    expect(component).toBeTruthy();
    expect(component.materias().length).toBe(1);
    expect(component.totalCreditos()).toBe(3);
    expect(component.promedioAsistencia()).toBe('87.5');
    expect(component.totalFallas()).toBe(2);
  });

  it('permite ver detalle completo de sesiones y regresar a la lista', () => {
    component.verDetalleCompleto(mockMaterias[0]);
    expect(component.vistaActual()).toBe('DETALLE');
    expect(component.selectedMateria()?.id).toBe('mat-1');
    expect(component.sesiones().length).toBe(1);

    component.volverALista();
    expect(component.vistaActual()).toBe('LISTA');
    expect(component.selectedMateria()).toBeNull();
  });

  it('permite iniciar y enviar un reclamo con éxito', () => {
    component.selectedMateria.set(mockMaterias[0]);
    component.iniciarReclamo(mockSesiones[0]);
    expect(component.vistaActual()).toBe('RECLAMO');
    expect(component.sesionReclamar()?.id).toBe('ses-1');

    claimServiceSpy.crearReclamo.and.returnValue(
      of({ exitoso: true, mensajeUsuario: 'Reclamo radicado.' } as any)
    );

    component.enviarReclamo({
      categoria: 'Médico / Salud',
      justificacion: 'Estuve incapacitado por gripa fuerte.',
    });

    expect(claimServiceSpy.crearReclamo).toHaveBeenCalled();
    expect(toastSpy.success).toHaveBeenCalledWith('Reclamo radicado.');
    expect(component.vistaActual()).toBe('DETALLE');
  });

  it('permite retirar un reclamo existente', () => {
    component.selectedMateria.set(mockMaterias[0]);
    claimServiceSpy.eliminarReclamo.and.returnValue(
      of({ exitoso: true, mensajeUsuario: 'Reclamo retirado.' } as any)
    );

    component.retirarReclamo(mockSesiones[0]);

    expect(claimServiceSpy.eliminarReclamo).toHaveBeenCalledWith('rec-1', 'mat-1', 'ses-1');
    expect(toastSpy.success).toHaveBeenCalledWith('Reclamo retirado.');
  });

  it('abre y cierra modal de prerrequisitos consultando servicio', () => {
    studentServiceSpy.getPrerrequisitosMateria.and.returnValue(
      of({ exitoso: true, datos: [{ id: 'p1', prerrequisitoNombre: 'Cálculo I' }] } as any)
    );

    component.abrirPrerrequisitos(mockMaterias[0]);
    expect(component.modalPrerrequisitosVisible()).toBeTrue();
    expect(component.materiaPrerrequisitos()?.id).toBe('mat-1');
    expect(component.listaPrerrequisitos().length).toBe(1);

    component.cerrarModalPrerrequisitos();
    expect(component.modalPrerrequisitosVisible()).toBeFalse();
    expect(component.materiaPrerrequisitos()).toBeNull();
  });

  it('registra autoasistencia por PIN o Token exitosamente', () => {
    sessionServiceSpy.registrarAutoAsistencia.and.returnValue(
      of({ exitoso: true, mensajeUsuario: 'Asistencia registrada' } as any)
    );

    component.abrirModalAutoAsistencia();
    expect(component.modalAutoAsistenciaVisible()).toBeTrue();

    component.enviarAutoAsistencia({ pin: '123456', token: '' });

    expect(sessionServiceSpy.registrarAutoAsistencia).toHaveBeenCalledWith({
      codigoAcceso: '123456',
      token: undefined,
    });
    expect(toastSpy.success).toHaveBeenCalledWith('Asistencia registrada');
    expect(component.modalAutoAsistenciaVisible()).toBeFalse();
  });

  it('registra matrícula por código o PIN exitosamente', () => {
    studentServiceSpy.matricularGrupo.and.returnValue(
      of({ exitoso: true, mensajeUsuario: 'Matrícula confirmada' } as any)
    );

    component.abrirModalMatriculaGrupo();
    expect(component.modalMatriculaGrupoVisible()).toBeTrue();

    component.enviarMatriculaPorCodigo('GRP-101');

    expect(studentServiceSpy.matricularGrupo).toHaveBeenCalledWith('GRP-101');
    expect(toastSpy.success).toHaveBeenCalledWith('Matrícula confirmada');
    expect(component.modalMatriculaGrupoVisible()).toBeFalse();
  });
});
