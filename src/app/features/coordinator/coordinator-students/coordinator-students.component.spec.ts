import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CoordinatorStudentsComponent } from './coordinator-students.component';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { CourseService } from '../../../core/services/course.service';
import { Course } from '../../../core/models/course.model';

// LB-001B.1B (DB source of truth cleanup, PLAN.md AS-IS #18): la ficha de curso seleccionado
// en matrícula de estudiantes lee Course.docenteName sintetizado.

describe('CoordinatorStudentsComponent', () => {
  let fixture: ComponentFixture<CoordinatorStudentsComponent>;
  let component: CoordinatorStudentsComponent;
  let coordinatorService: jasmine.SpyObj<CoordinatorManagementService>;
  let courseService: jasmine.SpyObj<CourseService>;

  const MARCADOR_DOCENTE = 'MARCADOR-DOCENTE-NO-DEBE-RENDERIZARSE';

  const course: Course = {
    id: 'crs-1',
    code: 'MAT-301',
    name: 'Matemática Avanzada III',
    section: 'Sección A',
    schedule: 'Lun, Mié 08:00 - 10:00 AM',
    room: 'Aula A-204',
    enrolledStudentsCount: 32,
    cupoMaximo: 35,
    docenteName: MARCADOR_DOCENTE,
    colorCategory: 'emerald',
  };

  beforeEach(() => {
    coordinatorService = jasmine.createSpyObj<CoordinatorManagementService>(
      'CoordinatorManagementService',
      ['getEstudiantesDirectorio', 'getEstudiantesDirectorioPagina', 'getSolicitudesMatricula', 'getEstudiantesPorGrupo']
    );
    courseService = jasmine.createSpyObj<CourseService>('CourseService', ['getTeacherCourses']);

    coordinatorService.getEstudiantesDirectorio.and.returnValue(
      of({ exitoso: true, datos: [] } as any)
    );
    coordinatorService.getEstudiantesDirectorioPagina.and.returnValue(
      of({ items: [], totalItems: 0, totalPages: 0, page: 0, size: 6 })
    );
    coordinatorService.getSolicitudesMatricula.and.returnValue(
      of({ exitoso: true, datos: [] } as any)
    );
    coordinatorService.getEstudiantesPorGrupo.and.returnValue(
      of({ exitoso: true, datos: [] } as any)
    );

    courseService.getTeacherCourses.and.returnValue(
      of({ exitoso: true, datos: [course] } as any)
    );

    TestBed.configureTestingModule({
      imports: [CoordinatorStudentsComponent],
      providers: [
        { provide: CoordinatorManagementService, useValue: coordinatorService },
        { provide: CourseService, useValue: courseService },
      ],
    });

    fixture = TestBed.createComponent(CoordinatorStudentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('no renderiza docenteName en la ficha del curso seleccionado (pestaña Matrícula por Grupo)', () => {
    component.pestanaActiva.set('MATRICULA_GRUPO');
    component.onSelectCourse('crs-1');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain(MARCADOR_DOCENTE);
  });
});
