import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CoordinatorSubjectsComponent } from './coordinator-subjects.component';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { CourseService } from '../../../core/services/course.service';
import { Course } from '../../../core/models/course.model';
import { AsignaturaPlanItem } from '../../../core/models/role-management.model';
import { ToastService } from '../../../shared/components/toast/toast.component';

describe('CoordinatorSubjectsComponent', () => {
  let fixture: ComponentFixture<CoordinatorSubjectsComponent>;
  let component: CoordinatorSubjectsComponent;
  let coordinatorService: jasmine.SpyObj<CoordinatorManagementService>;
  let courseService: jasmine.SpyObj<CourseService>;
  let toast: jasmine.SpyObj<ToastService>;
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

  const asignatura = (planEstudioId: string, extra: Record<string, unknown> = {}): AsignaturaPlanItem =>
    ({
      id: 'asig-1', planEstudioId, codigo: 'IS-401', nombre: 'Arquitectura de Software', semestre: 7, creditos: 4, horasSemanales: 4,
      area: 'Software', componente: 'Específica', codigoCaracter: 'OBL', nombreCaracter: 'Obligatoria', compartida: false,
      nombrePrograma: 'Ingeniería de Sistemas', inpPlanEstudio: '2024', ...extra,
    }) as unknown as AsignaturaPlanItem;

  /** Página del servidor (`totalElementos` es el total real aunque la página traiga menos filas). */
  const pagina = <T,>(elementos: T[], totalElementos = elementos.length, numeroPagina = 1, tamanoPagina = 12) => ({
    exitoso: true,
    elementos,
    numeroPagina,
    tamanoPagina,
    totalElementos,
    totalPaginas: Math.max(1, Math.ceil(totalElementos / tamanoPagina)),
  });

  beforeEach(async () => {
    coordinatorService = jasmine.createSpyObj<CoordinatorManagementService>(
      'CoordinatorManagementService',
      ['getPlanesEstudio', 'getAsignaturasPrograma', 'getCaracteresAsignatura', 'getEstudiantesPorGrupo']
    );
    courseService = jasmine.createSpyObj<CourseService>('CourseService', ['getCoordinatorCoursesPage']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);

    courseService.getCoordinatorCoursesPage.and.returnValue(of(pagina([course])));
    coordinatorService.getPlanesEstudio.and.returnValue(
      of<never>({ exitoso: true, datos: [{ id: 'plan-1' }], total: 4 } as never)
    );
    coordinatorService.getAsignaturasPrograma.and.returnValue(of(pagina([asignatura('plan-1')])));
    coordinatorService.getCaracteresAsignatura.and.returnValue(
      of({ exitoso: true, datos: [{ codigo: 'OBL', nombre: 'Obligatoria', orden: 1 }, { codigo: 'OPT', nombre: 'Optativa', orden: 2 }] })
    );
    coordinatorService.getEstudiantesPorGrupo.and.returnValue(
      of<never>({
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
      } as never)
    );

    await TestBed.configureTestingModule({
      imports: [CoordinatorSubjectsComponent],
      providers: [
        provideRouter([]),
        { provide: CoordinatorManagementService, useValue: coordinatorService },
        { provide: CourseService, useValue: courseService },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(CoordinatorSubjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga las materias ofertadas, las asignaturas curriculares y los inscritos del grupo inicial', () => {
    expect(component.courses().length).toBe(1);
    expect(component.listadoAsignaturas.filas().length).toBe(1);
    expect(component.enrolledStudents().length).toBe(1);
  });

  it('no renderiza docenteName sintetizado ni controles de solicitud de cupo', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain(MARCADOR_DOCENTE);
    expect(text).not.toContain('Solicitudes de Cupo');
  });

  describe('CIERRE-W2A: totales, búsqueda y paginación desde el servidor', () => {
    it('los totales mostrados salen de totalElementos y de total, no de contar las filas de la página', () => {
      courseService.getCoordinatorCoursesPage.and.returnValue(of(pagina([course], 37)));
      coordinatorService.getAsignaturasPrograma.and.returnValue(of(pagina([asignatura('plan-1')], 112)));
      component.cargarDatos();
      fixture.detectChanges();

      expect(component.listado.total()).toBe(37);
      expect(component.listadoAsignaturas.total()).toBe(112);
      expect(component.totalPlanes()).toBe(4);
      const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(texto).toContain('37 grupos');
      expect(texto).toContain('112 asignaturas');
      expect(texto).toContain('En 4 planes de estudio');
    });

    it('pide al servidor la primera página con el tamaño de la pantalla y sin filtros', () => {
      expect(courseService.getCoordinatorCoursesPage).toHaveBeenCalledWith({ busqueda: null, pagina: 1, tamano: 12 });
      expect(coordinatorService.getAsignaturasPrograma).toHaveBeenCalledWith({ busqueda: null, caracter: null, pagina: 1, tamano: 12 });
    });

    it('la búsqueda viaja al servidor (con espera) para grupos y asignaturas y vuelve a la página 1', fakeAsync(() => {
      courseService.getCoordinatorCoursesPage.calls.reset();
      coordinatorService.getAsignaturasPrograma.calls.reset();

      component.onBusqueda('calc');
      component.onBusqueda('calculo');
      tick(300);

      expect(courseService.getCoordinatorCoursesPage).toHaveBeenCalledTimes(1);
      expect(courseService.getCoordinatorCoursesPage).toHaveBeenCalledWith({ busqueda: 'calculo', pagina: 1, tamano: 12 });
      expect(coordinatorService.getAsignaturasPrograma).toHaveBeenCalledWith({ busqueda: 'calculo', caracter: null, pagina: 1, tamano: 12 });
    }));

    it('el filtro de carácter usa el CÓDIGO del catálogo y lo resuelve el servidor, no las filas cargadas', () => {
      // El catálogo trae Obligatoria y Optativa aunque la página solo tenga filas obligatorias
      expect(component.caracteres().map((c) => c.codigo)).toEqual(['OBL', 'OPT']);
      const opciones = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('select[aria-label="Filtrar asignaturas por tipo"] option'));
      expect(opciones.map((o) => o.textContent?.trim())).toEqual(['Todos los caracteres', 'Obligatoria', 'Optativa']);

      coordinatorService.getAsignaturasPrograma.calls.reset();
      component.onCaracter('OPT');
      expect(component.filtroTipoAsignatura()).toBe('OPT');
      expect(coordinatorService.getAsignaturasPrograma).toHaveBeenCalledWith({ busqueda: null, caracter: 'OPT', pagina: 1, tamano: 12 });

      component.onCaracter('');
      expect(coordinatorService.getAsignaturasPrograma).toHaveBeenCalledWith({ busqueda: null, caracter: null, pagina: 1, tamano: 12 });
    });

    it('ir a otra página de grupos o de asignaturas pide esa página al servidor', () => {
      courseService.getCoordinatorCoursesPage.calls.reset();
      coordinatorService.getAsignaturasPrograma.calls.reset();

      component.listado.irAPagina(3);
      component.listadoAsignaturas.irAPagina(2);

      expect(courseService.getCoordinatorCoursesPage).toHaveBeenCalledWith({ busqueda: null, pagina: 3, tamano: 12 });
      expect(coordinatorService.getAsignaturasPrograma).toHaveBeenCalledWith({ busqueda: null, caracter: null, pagina: 2, tamano: 12 });
    });
  });

  describe('cupo máximo del grupo (sin valores inventados)', () => {
    const sinCupo: Course = { ...course, id: 'crs-2', code: 'IS-402', name: 'Bases de Datos', enrolledStudentsCount: 12, cupoMaximo: undefined };

    function recargar(cursos: Course[]): string {
      courseService.getCoordinatorCoursesPage.and.returnValue(of(pagina(cursos)));
      component.cargarDatos();
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).textContent ?? '';
    }

    it('muestra el cupo que entrega el backend', () => {
      const texto = recargar([course]);
      expect(texto).toContain('28 / 35');
      expect(component.totalCapacidadGrupos()).toBe('35');
    });

    it('un grupo sin cupo se muestra como no disponible, sin número inventado', () => {
      const texto = recargar([sinCupo]);
      expect(texto).toContain('12 / —');
      expect(texto).not.toContain('12 / 35');
      expect(component.cupoTexto(sinCupo)).toBe('—');
      expect(component.totalCapacidadGrupos()).toBe('—');
    });

    it('un grupo sin cupo no entra en la suma de la capacidad', () => {
      recargar([course, sinCupo]);
      expect(component.totalCapacidadGrupos()).toBe('35');
      expect(component.cupoTexto({ ...sinCupo, cupoMaximo: 0 })).toBe('—');
    });
  });

  it('navega a la malla curricular del plan al invocar irAMallaPlan', () => {
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.irAMallaPlan('plan-1');
    expect(navSpy).toHaveBeenCalledWith(['/app/coordinador/planes-estudio', 'plan-1', 'malla']);
  });

  // CULM-001 B2NM: una asignatura compartida aparece una vez por plan donde está vinculada (no se deduplica por id).
  describe('asignatura compartida entre planes', () => {
    beforeEach(() => {
      coordinatorService.getAsignaturasPrograma.and.returnValue(
        of(pagina([asignatura('plan-1', { compartida: true }), asignatura('plan-2', { compartida: true, nombreCaracter: 'Optativa', codigoCaracter: 'OPT', nombrePrograma: 'Ingeniería de Software' })]))
      );
      component.cargarDatos();
      fixture.detectChanges();
    });

    it('conserva una fila por plan y marca la asignatura como compartida', () => {
      expect(component.listadoAsignaturas.filas().map((a) => a.planEstudioId)).toEqual(['plan-1', 'plan-2']);
      const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(texto).toContain('Compartida');
      expect(texto).toContain('Ingeniería de Software');
      expect(texto).toContain('Optativa');
    });

    it('Ver Malla navega al plan de la fila', () => {
      const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      const botones = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).filter((b) => b.textContent?.includes('Ver Malla'));
      expect(botones.length).toBe(2);
      (botones[1] as HTMLButtonElement).click();
      expect(navSpy).toHaveBeenCalledWith(['/app/coordinador/planes-estudio', 'plan-2', 'malla']);
    });
  });

  // Un fallo de carga no puede verse como "No se encontraron grupos ofertados": alerta accesible y Reintentar.
  describe('errores de carga distinguibles del vacio', () => {
    const el = () => fixture.nativeElement as HTMLElement;
    const reintentar = () =>
      Array.from(el().querySelectorAll('button')).find((b) => /Reintentar/.test(b.textContent ?? '')) as HTMLButtonElement | undefined;

    it('si falla la consulta de grupos muestra una alerta con Reintentar y no el estado vacio', () => {
      courseService.getCoordinatorCoursesPage.and.returnValue(throwError(() => new Error('falla')));
      component.cargarDatos();
      fixture.detectChanges();

      expect(el().querySelector('[role="alert"]')).not.toBeNull();
      expect(el().textContent).not.toContain('No se encontraron grupos ofertados');
      expect(reintentar()).toBeTruthy();
      expect(toast.error).toHaveBeenCalled();
    });

    it('si falla la consulta de asignaturas tambien se anuncia', () => {
      coordinatorService.getAsignaturasPrograma.and.returnValue(throwError(() => new Error('falla')));
      component.cargarDatos();
      fixture.detectChanges();
      expect(el().querySelector('[role="alert"]')).not.toBeNull();
    });

    it('si falla la consulta de planes tambien se anuncia y Reintentar recupera la pantalla', () => {
      coordinatorService.getPlanesEstudio.and.returnValue(throwError(() => new Error('falla')));
      component.cargarDatos();
      fixture.detectChanges();
      expect(el().querySelector('[role="alert"]')).not.toBeNull();

      coordinatorService.getPlanesEstudio.and.returnValue(of({ exitoso: true, datos: [], total: 0 }) as never);
      courseService.getCoordinatorCoursesPage.and.returnValue(of(pagina([course])));
      reintentar()?.click();
      fixture.detectChanges();
      expect(el().querySelector('[role="alert"]')).toBeNull();
      expect(component.courses()).toHaveSize(1);
    });

    it('si falla el catálogo de caracteres se anuncia', () => {
      coordinatorService.getCaracteresAsignatura.and.returnValue(throwError(() => new Error('falla')));
      component.cargarDatos();
      fixture.detectChanges();
      expect(el().querySelector('[role="alert"]')).not.toBeNull();
    });
  });

  it('un total de planes ausente se toma como cero', () => {
    coordinatorService.getPlanesEstudio.and.returnValue(of<never>({ exitoso: true } as never));
    component.cargarDatos();
    expect(component.totalPlanes()).toBe(0);
  });
});
