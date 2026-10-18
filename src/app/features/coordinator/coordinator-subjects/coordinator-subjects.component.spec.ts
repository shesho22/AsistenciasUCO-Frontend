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
    courseService = jasmine.createSpyObj<CourseService>('CourseService', ['getTeacherCourses']);

    courseService.getTeacherCourses.and.returnValue(
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
            prerrequisitos: [],
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
});
