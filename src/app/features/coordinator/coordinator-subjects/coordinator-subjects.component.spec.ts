import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { CoordinatorSubjectsComponent } from './coordinator-subjects.component';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { CourseService } from '../../../core/services/course.service';
import { Course } from '../../../core/models/course.model';

describe('CoordinatorSubjectsComponent', () => {
  let fixture: ComponentFixture<CoordinatorSubjectsComponent>;
  let component: CoordinatorSubjectsComponent;
  let coordinatorService: jasmine.SpyObj<CoordinatorManagementService>;
  let courseService: jasmine.SpyObj<CourseService>;
  let router: Router;

  const MARCADOR_DOCENTE = 'MARCADOR-DOCENTE-NO-DEBE-RENDERIZARSE';

  const course: Course = {
    id: 'crs-1',
    code: 'IS-401',
    name: 'Arquitectura de Software',
    section: 'Grupo 01',
    schedule: 'Mar, Jue 10:00 - 12:00',
    room: 'A-301',
    enrolledStudentsCount: 28,
    cupoMaximo: 35,
    docenteName: MARCADOR_DOCENTE,
    colorCategory: 'emerald',
  };

  beforeEach(async () => {
    coordinatorService = jasmine.createSpyObj<CoordinatorManagementService>(
      'CoordinatorManagementService',
      ['getPlanesEstudio', 'getAsignaturasPorPlan', 'getEstudiantesPorGrupo']
    );
    courseService = jasmine.createSpyObj<CourseService>('CourseService', ['getCoordinatorCourses']);

    courseService.getCoordinatorCourses.and.returnValue(
      of({ exitoso: true, datos: [course] } as any)
    );
    coordinatorService.getPlanesEstudio.and.returnValue(
      of({
        exitoso: true,
        datos: [
          {
            id: 'plan-1',
            codigo: 'ING-SIS-2026',
            nombre: 'Ingeniería de Sistemas',
            version: '1.0',
            anioVigencia: 2026,
            totalCreditos: 160,
            totalSemestres: 10,
            totalAsignaturas: 1,
            estado: 'VIGENTE',
            descripcion: 'Plan vigente',
          },
        ],
      } as any)
    );
    coordinatorService.getAsignaturasPorPlan.and.returnValue(
      of({
        exitoso: true,
        datos: [
          {
            id: 'asig-1',
            planEstudioId: 'plan-1',
            codigo: 'IS-401',
            nombre: 'Arquitectura de Software',
            semestre: 7,
            creditos: 4,
            horasSemanales: 4,
            area: 'Ingeniería de Software',
            componente: 'Obligatoria',
          },
        ],
      } as any)
    );
    coordinatorService.getEstudiantesPorGrupo.and.returnValue(
      of({
        exitoso: true,
        datos: [
          {
            id: 'est-1',
            documento: '1036998877',
            codigo: '20261001',
            nombreCompleto: 'Valentina Ríos',
            correo: 'valentina.rios@uco.edu.co',
            programa: 'Ingeniería de Sistemas',
            estadoMatricula: 'ACTIVO',
          },
        ],
      } as any)
    );

    await TestBed.configureTestingModule({
      imports: [CoordinatorSubjectsComponent],
      providers: [
        provideRouter([]),
        { provide: CoordinatorManagementService, useValue: coordinatorService },
        { provide: CourseService, useValue: courseService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(CoordinatorSubjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga las materias ofertadas, las asignaturas curriculares y los inscritos del grupo inicial', () => {
    expect(component.courses().length).toBe(1);
    expect(component.asignaturasCurriculares().length).toBe(1);
    expect(component.enrolledStudents().length).toBe(1);
  });

  it('no renderiza docenteName sintetizado ni controles de solicitud de cupo', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain(MARCADOR_DOCENTE);
    expect(text).not.toContain('Solicitudes de Cupo');
  });

  it('navega a la malla curricular del plan al invocar irAMallaPlan', () => {
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.irAMallaPlan('plan-1');
    expect(navSpy).toHaveBeenCalledWith(['/app/coordinador/planes-estudio', 'plan-1', 'malla']);
  });

  // CULM-001 B2NM: una asignatura compartida aparece una vez por plan donde está vinculada (no se deduplica por id).
  describe('asignatura compartida entre planes', () => {
    const fila = (planEstudioId: string, extra: Record<string, unknown> = {}) => ({
      id: 'asig-1', planEstudioId, codigo: 'IS-401', nombre: 'Arquitectura de Software', semestre: 7, creditos: 4, horasSemanales: 4,
      area: 'Software', componente: 'Específica', codigoCaracter: 'OBL', nombreCaracter: 'Obligatoria', compartida: true,
      nombrePrograma: 'Ingeniería de Sistemas', inpPlanEstudio: '2024', ...extra,
    });

    beforeEach(() => {
      coordinatorService.getPlanesEstudio.and.returnValue(
        of({ exitoso: true, datos: [{ id: 'plan-1' }, { id: 'plan-2' }] } as any)
      );
      coordinatorService.getAsignaturasPorPlan.and.callFake(((planId: string) =>
        of({
          exitoso: true,
          datos: planId === 'plan-1' ? [fila('plan-1')] : [fila('plan-2', { nombreCaracter: 'Optativa', codigoCaracter: 'OPT', nombrePrograma: 'Ingeniería de Software' })],
        })) as any);
      component.cargarDatos();
      fixture.detectChanges();
    });

    it('conserva una fila por plan y marca la asignatura como compartida', () => {
      expect(component.asignaturasCurriculares().map((a) => a.planEstudioId)).toEqual(['plan-1', 'plan-2']);
      const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(texto).toContain('Compartida');
      expect(texto).toContain('Ingeniería de Software');
      expect(texto).toContain('Optativa');
    });

    it('filtra el catálogo por carácter y ofrece solo los caracteres presentes', () => {
      expect(component.caracteresDisponibles()).toEqual(['Obligatoria', 'Optativa']);
      component.filtroTipoAsignatura.set('Optativa');
      expect(component.filteredAsignaturas().map((a) => a.planEstudioId)).toEqual(['plan-2']);
    });

    it('Ver Malla navega al plan de la fila', () => {
      const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      const botones = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).filter((b) => b.textContent?.includes('Ver Malla'));
      expect(botones.length).toBe(2);
      (botones[1] as HTMLButtonElement).click();
      expect(navSpy).toHaveBeenCalledWith(['/app/coordinador/planes-estudio', 'plan-2', 'malla']);
    });
  });
});
