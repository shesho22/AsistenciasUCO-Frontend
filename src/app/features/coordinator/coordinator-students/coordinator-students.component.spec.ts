import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { CoordinatorStudentsComponent } from './coordinator-students.component';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { CourseService } from '../../../core/services/course.service';
import { Course } from '../../../core/models/course.model';
import { CoordinatorProgramService } from '../../../core/services/coordinator-program.service';
import { crearProgramaCoordinadorStub, PROGRAMA_A, PROGRAMA_B } from '../../../core/testing/programa-coordinador.stub';

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
      ['getEstudiantesDirectorio', 'getEstudiantesDirectorioPagina', 'getEstudiantesPorGrupo']
    );
    courseService = jasmine.createSpyObj<CourseService>('CourseService', ['getTeacherCourses']);

    coordinatorService.getEstudiantesDirectorio.and.returnValue(
      of({ exitoso: true, datos: [] } as any)
    );
    coordinatorService.getEstudiantesDirectorioPagina.and.returnValue(
      of({ items: [], totalItems: 0, totalPages: 0, page: 0, size: 6 })
    );
    coordinatorService.getEstudiantesPorGrupo.and.returnValue(
      of({ exitoso: true, datos: [] } as any)
    );

    courseService.getTeacherCourses.and.returnValue(
      of({ exitoso: true, datos: [course] } as any)
    );

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [CoordinatorStudentsComponent],
      providers: [
        { provide: CoordinatorManagementService, useValue: coordinatorService },
        { provide: CourseService, useValue: courseService },
        { provide: CoordinatorProgramService, useValue: crearProgramaCoordinadorStub([PROGRAMA_A, PROGRAMA_B]) },
        { provide: Router, useValue: routerSpy },
      ],
    });

    fixture = TestBed.createComponent(CoordinatorStudentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Un fallo de carga no puede verse como "No hay estudiantes...": alerta accesible y Reintentar.
  it('un fallo al cargar el directorio muestra una alerta con Reintentar y no el estado vacio', () => {
    coordinatorService.getEstudiantesDirectorioPagina.and.returnValue(throwError(() => new Error('falla')));
    component.cargarDatos();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(el.textContent).not.toContain('No hay estudiantes que coincidan');
    expect(Array.from(el.querySelectorAll('button')).some((b) => /Reintentar/.test(b.textContent ?? ''))).toBeTrue();
  });

  it('Reintentar vuelve a pedir el directorio y retira la alerta al responder', () => {
    coordinatorService.getEstudiantesDirectorioPagina.and.returnValue(throwError(() => new Error('falla')));
    component.cargarDatos();
    fixture.detectChanges();

    coordinatorService.getEstudiantesDirectorioPagina.and.returnValue(of({ items: [], totalItems: 0, totalPages: 0, page: 0, size: 6 }));
    const el = fixture.nativeElement as HTMLElement;
    (Array.from(el.querySelectorAll('button')).find((b) => /Reintentar/.test(b.textContent ?? '')) as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.textContent).toContain('No hay estudiantes que coincidan');
  });

  it('no renderiza docenteName en la ficha del curso seleccionado (pestaña Directorio)', () => {
    component.pestanaActiva.set('DIRECTORIO');
    component.onSelectCourse('crs-1');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain(MARCADOR_DOCENTE);
  });

  it('calcula correctamente totalActivosPagina y totalInactivosPagina', () => {
    component.directorio.set([
      {
        id: 'est-1',
        documento: '1017001',
        codigo: 'EST-1',
        nombreCompleto: 'Ana Gómez',
        correo: 'ana@uco.edu.co',
        programa: 'Sistemas',
        estadoMatricula: 'ACTIVO',
      },
      {
        id: 'est-2',
        documento: '1017002',
        codigo: 'EST-2',
        nombreCompleto: 'Bernardo Vega',
        correo: 'bernardo@uco.edu.co',
        programa: 'Sistemas',
        estadoMatricula: 'INACTIVO',
      },
    ]);

    expect(component.totalActivosPagina()).toBe(1);
    expect(component.totalInactivosPagina()).toBe(1);
  });

  it('gestiona cambios de página y tamaño de página del directorio', () => {
    component.onDirectorioPageChange(2);
    expect(component.currentPageDirectorio()).toBe(2);

    component.onPageSizeDirectorioChange(12);
    expect(component.pageSizeDirectorio()).toBe(12);
    expect(component.currentPageDirectorio()).toBe(1);
  });

  it('gestiona cambios de filtro de estado del directorio', () => {
    component.onDirectorioStatusChange('INACTIVO');
    expect(component.filtroEstadoDirectorio()).toBe('INACTIVO');
    expect(component.currentPageDirectorio()).toBe(1);
  });

  it('irAMaterias navega hacia la ruta correspondiente', () => {
    const router = TestBed.inject(Router);
    component.irAMaterias();
    expect(router.navigate).toHaveBeenCalledWith(['/app/coordinador/materias']);
  });

  it('onSelectCourse asigna el curso seleccionado y cargarDatos actualiza directorio', () => {
    component.onSelectCourse('crs-100');
    expect(component.selectedCourseId()).toBe('crs-100');

    component.cargarDatos();
    expect(coordinatorService.getEstudiantesDirectorioPagina).toHaveBeenCalled();

    component.onDirectorioSearchChange('Carlos');
    expect(component.searchDirectorio()).toBe('Carlos');
  });

  // HU159 (certificación Fase 3): "Corregir datos" solo se alcanzaba desde las alertas de Indicadores.
  it('HU159: "Ver ficha" en el padrón abre la ficha del estudiante (con "Corregir datos")', () => {
    const estudiante = {
      id: 'est-1', documento: '1017334455', codigo: '1017334455', nombreCompleto: 'Ana Sofia Gomez Rios',
      correo: 'ana.gomez@uco.edu.co', programa: 'Ingenieria de Sistemas', estadoMatricula: 'ACTIVO' as const,
    };
    component.directorio.set([estudiante]);
    fixture.detectChanges();

    const boton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="ver-ficha-estudiante"]');
    expect(boton).not.toBeNull();
    component.abrirFicha(estudiante);
    expect(component.estudianteFicha()?.id).toBe('est-1');
  });

  // CULM-001 B2NM (S4): con varios programas el directorio se consulta con el programa seleccionado.
  it('S4 carga los programas antes de consultar y muestra el selector con varios programas', () => {
    const programa = TestBed.inject(CoordinatorProgramService);
    expect(programa.cargar).toHaveBeenCalled();
    expect(coordinatorService.getEstudiantesDirectorioPagina).toHaveBeenCalled();
    const select = (fixture.nativeElement as HTMLElement).querySelector('#coordinador-programa') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.textContent?.trim())).toEqual(['Ingeniería de Sistemas', 'Ingeniería de Software']);
  });

  it('S4 al cambiar de programa vuelve a la primera página y consulta de nuevo', () => {
    coordinatorService.getEstudiantesDirectorioPagina.calls.reset();
    component.currentPageDirectorio.set(3);
    const select = (fixture.nativeElement as HTMLElement).querySelector('#coordinador-programa') as HTMLSelectElement;
    select.value = 'prg-b';
    select.dispatchEvent(new Event('change'));

    expect(TestBed.inject(CoordinatorProgramService).seleccionar).toHaveBeenCalledWith('prg-b');
    expect(component.currentPageDirectorio()).toBe(1);
    expect(coordinatorService.getEstudiantesDirectorioPagina).toHaveBeenCalledWith(jasmine.objectContaining({ page: 0 }));
  });
});
