import { ComponentFixture, DeferBlockState, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, of, throwError } from 'rxjs';
import { CoordinatorSubjectsComponent, etiquetaEstadoInscrito } from './coordinator-subjects.component';
import { EstudianteGrupoApiDto } from '../../../core/api/models/estudiante-grupo-api-dto.model';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { CourseService } from '../../../core/services/course.service';
import { CoordinatorIndicatorsService } from '../../../core/services/coordinator-indicators.service';
import { CoordinatorProgramService } from '../../../core/services/coordinator-program.service';
import { KpisCoordinador } from '../../../core/models/coordinator-indicators.model';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Course } from '../../../core/models/course.model';
import { AsignaturaPlanItem } from '../../../core/models/role-management.model';
import { ToastService } from '../../../shared/components/toast/toast.component';

describe('CoordinatorSubjectsComponent', () => {
  let fixture: ComponentFixture<CoordinatorSubjectsComponent>;
  let component: CoordinatorSubjectsComponent;
  let coordinatorService: jasmine.SpyObj<CoordinatorManagementService>;
  let courseService: jasmine.SpyObj<CourseService>;
  let indicadores: jasmine.SpyObj<CoordinatorIndicatorsService>;
  let programa: jasmine.SpyObj<CoordinatorProgramService>;
  let toast: jasmine.SpyObj<ToastService>;
  let router: Router;

  const MARCADOR_DOCENTE = 'MARCADOR-DOCENTE-NO-DEBE-RENDERIZARSE';

  /** KPI del programa con el aforo de TODOS los grupos habilitados (no solo los de la pagina visible). */
  const kpisPrograma = (extra: Partial<KpisCoordinador> = {}): ApiResponse<KpisCoordinador> => ({
    exitoso: true,
    datos: {
      idPrograma: 'p-1', nombrePrograma: 'Sistemas', idPeriodoAcademico: 'per-1', nombrePeriodoAcademico: '2026-2',
      totalEstudiantes: 40, estudiantesRegulares: 30, estudiantesRiesgo: 8, estudiantesPerdida: 2, tasaPermanencia: 95,
      sesionesProgramadas: 10, sesionesVencidas: 5, sesionesEjecutadas: 5, sesionesVencidasSinRegistro: 0, sesionesSinProcedenciaTemporal: 0,
      porcentajeCumplimiento: 100, porcentajeProgresoCalendario: 50, umbralAdvertencia: 15, umbralPerdida: 20,
      totalDocentes: 12, gruposActivos: 37, cupoTotal: 1110, matriculadosActivos: 888, tasaAforo: 80, estudiantesRegistrados: 5007,
      ...extra,
    },
  } as ApiResponse<KpisCoordinador>);

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
  const pagina = <T,>(elementos: T[], totalElementos = elementos.length, numeroPagina = 1, tamanoPagina = 15) => ({
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
    indicadores = jasmine.createSpyObj<CoordinatorIndicatorsService>('CoordinatorIndicatorsService', ['consultarKpis']);
    indicadores.consultarKpis.and.returnValue(of(kpisPrograma()));
    programa = jasmine.createSpyObj<CoordinatorProgramService>('CoordinatorProgramService', ['cargar']);
    programa.cargar.and.returnValue(of([]));
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
          // Forma real de EstudianteGrupoDTO (GET /grupos/{id}/estudiantes): el estado viaja en codigoEstado/nombreEstado.
          {
            id: 'mat-1',
            idEstudiante: 'est-1',
            documento: '1036998877',
            nombreCompleto: 'Valentina Ríos',
            correo: 'valentina.rios@uco.edu.co',
            codigoEstado: 'A',
            nombreEstado: 'activo',
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
        { provide: CoordinatorIndicatorsService, useValue: indicadores },
        { provide: CoordinatorProgramService, useValue: programa },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(CoordinatorSubjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga las materias ofertadas y las asignaturas curriculares; la nómina se pide al abrir un grupo', () => {
    expect(component.courses()).toHaveSize(1);
    expect(component.listadoAsignaturas.filas()).toHaveSize(1);
    expect(component.enrolledStudents()).toHaveSize(0);
    expect(coordinatorService.getEstudiantesPorGrupo).not.toHaveBeenCalled();
  });

  describe('MEJORAS-SERGIO 11: subpestañas y nómina en ventana emergente', () => {
    const el = () => fixture.nativeElement as HTMLElement;

    it('muestra una sección a la vez: grupos del período por defecto y el catálogo en su subpestaña', () => {
      const pestanas = Array.from(el().querySelectorAll('[role="tab"]')).map((b) => b.textContent?.trim() ?? '');
      expect(pestanas[0]).toContain('Grupos del período');
      expect(pestanas[1]).toContain('Catálogo curricular');
      expect(el().textContent).toContain('Grupos y Materias Activas en el Período');
      expect(el().textContent).not.toContain('Catálogo Curricular de Materias de la Carrera');

      (el().querySelector('[data-testid="subpestana-catalogo"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(el().textContent).toContain('Catálogo Curricular de Materias de la Carrera');
      expect(el().textContent).not.toContain('Grupos y Materias Activas en el Período');
    });

    it('«Ver inscritos» abre la nómina del grupo en una ventana y Cerrar la oculta', async () => {
      expect(el().querySelector('[data-testid="modal-inscritos"]')).toBeNull();
      (el().querySelector('[data-testid="ver-inscritos"] button') as HTMLElement).click();
      fixture.detectChanges();
      const deferBlocks = await fixture.getDeferBlocks();
      await Promise.all(deferBlocks.map((block) => block.render(DeferBlockState.Complete)));
      fixture.detectChanges();
      expect(coordinatorService.getEstudiantesPorGrupo).toHaveBeenCalled();
      expect(component.enrolledStudents()).toHaveSize(1);
      const modal = el().querySelector('[data-testid="modal-inscritos"]');
      expect(modal).not.toBeNull();
      expect(modal?.querySelector('[data-testid="lista-inscritos"]')).not.toBeNull();

      component.cerrarInscritos();
      fixture.detectChanges();
      expect(el().querySelector('[data-testid="modal-inscritos"]')).toBeNull();
      expect(component.enrolledStudents()).toHaveSize(0);
    });

    const abrir = async (id = 'crs-1') => {
      component.onSelectCourse(id);
      fixture.detectChanges();
      const deferBlocks = await fixture.getDeferBlocks();
      await Promise.all(deferBlocks.map((block) => block.render(DeferBlockState.Complete)));
      fixture.detectChanges();
    };
    const modal = () => el().querySelector('[data-testid="modal-inscritos"]') as HTMLElement | null;
    const fila = (nombre: string, codigoEstado: string, nombreEstado: string): EstudianteGrupoApiDto => ({
      id: 'mat-' + nombre, idEstudiante: 'est-' + nombre, documento: '100', nombreCompleto: nombre, correo: '', codigoEstado, nombreEstado,
    });

    it('la fila muestra el estado real de la matrícula (codigoEstado del backend) y no una etiqueta vacía', async () => {
      await abrir();
      const badge = modal()!.querySelector('[data-testid="estado-inscrito"]');
      expect(badge?.textContent?.trim()).toBe('Activo');
      expect(modal()!.textContent).toContain('Doc. 1036998877');
      expect(modal()!.textContent).not.toContain('undefined');
    });

    it('traduce los códigos del catálogo EstadoEstudianteGrupo y usa nombreEstado para uno desconocido', () => {
      expect(etiquetaEstadoInscrito({ codigoEstado: 'A', nombreEstado: 'activo' })).toEqual({ etiqueta: 'Activo', variante: 'success' });
      expect(etiquetaEstadoInscrito({ codigoEstado: 'CVP', nombreEstado: 'x' }).etiqueta).toBe('Cancelado por voluntad propia');
      expect(etiquetaEstadoInscrito({ codigoEstado: 'CI', nombreEstado: 'x' })).toEqual({ etiqueta: 'Cancelado por inasistencia', variante: 'warning' });
      expect(etiquetaEstadoInscrito({ codigoEstado: 'F', nombreEstado: 'x' }).etiqueta).toBe('Finalizado');
      expect(etiquetaEstadoInscrito({ codigoEstado: 'ZZ', nombreEstado: 'en revisión' }).etiqueta).toBe('En revisión');
      expect(etiquetaEstadoInscrito({}).etiqueta).toBe('Sin estado');
    });

    it('mientras la nómina carga muestra «Cargando…» y no «No hay estudiantes»', async () => {
      coordinatorService.getEstudiantesPorGrupo.and.returnValue(new Subject<never>());
      await abrir();
      expect(component.cargandoInscritos()).toBeTrue();
      expect(modal()!.querySelector('[data-testid="inscritos-cargando"]')?.getAttribute('role')).toBe('status');
      expect(modal()!.textContent).not.toContain('No hay estudiantes registrados');
    });

    it('un 403/500 de la nómina se muestra como error (con Reintentar si aplica) y no como grupo vacío', async () => {
      coordinatorService.getEstudiantesPorGrupo.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      await abrir();
      expect(component.cargandoInscritos()).toBeFalse();
      expect(modal()!.querySelector('[role="alert"]')).not.toBeNull();
      expect(modal()!.textContent).not.toContain('No hay estudiantes registrados');
      const reintentar = Array.from(modal()!.querySelectorAll('button')).find((b) => /Reintentar/.test(b.textContent ?? ''));
      expect(reintentar).toBeTruthy();

      coordinatorService.getEstudiantesPorGrupo.and.returnValue(of({ exitoso: true, datos: [fila('Ana', 'A', 'activo')] }));
      reintentar!.click();
      fixture.detectChanges();
      expect(modal()!.querySelector('[role="alert"]')).toBeNull();
      expect(component.enrolledStudents()).toHaveSize(1);

      coordinatorService.getEstudiantesPorGrupo.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
      component.cargarInscritos('crs-1');
      fixture.detectChanges();
      expect(modal()!.querySelector('[role="alert"]')).not.toBeNull();
      expect(modal()!.textContent).toContain('Sin autorización');
    });

    it('abrir A y luego B: la respuesta tardía de A no pisa la nómina de B', async () => {
      const cursoB: Course = { ...course, id: 'crs-2', code: 'IS-402', name: 'Bases de Datos' };
      courseService.getCoordinatorCoursesPage.and.returnValue(of(pagina([course, cursoB])));
      component.cargarDatos();
      fixture.detectChanges();

      const respuestaA = new Subject<never>();
      const respuestaB = new Subject<never>();
      coordinatorService.getEstudiantesPorGrupo.and.callFake(((id: string) => (id === 'crs-1' ? respuestaA : respuestaB)) as never);
      await abrir('crs-1');
      await abrir('crs-2');

      respuestaB.next({ exitoso: true, datos: [fila('Bruno', 'A', 'activo')] } as never);
      respuestaA.next({ exitoso: true, datos: [fila('Alicia', 'A', 'activo')] } as never);
      fixture.detectChanges();

      expect(component.selectedCourse()?.id).toBe('crs-2');
      expect(component.enrolledStudents().map((e) => e.nombreCompleto)).toEqual(['Bruno']);
      expect(respuestaA.observed).toBeFalse();
    });

    it('cerrar la ventana cancela la consulta pendiente', async () => {
      const pendiente = new Subject<never>();
      coordinatorService.getEstudiantesPorGrupo.and.returnValue(pendiente);
      await abrir();
      component.cerrarInscritos();
      expect(pendiente.observed).toBeFalse();
      expect(component.cargandoInscritos()).toBeFalse();
    });

    it('al cerrar, el foco vuelve al botón «Ver inscritos» que abrió la ventana', async () => {
      const disparador = el().querySelector('[data-testid="ver-inscritos"] button') as HTMLButtonElement;
      disparador.focus();
      disparador.click();
      fixture.detectChanges();
      const deferBlocks = await fixture.getDeferBlocks();
      await Promise.all(deferBlocks.map((block) => block.render(DeferBlockState.Complete)));
      fixture.detectChanges();
      expect(modal()).not.toBeNull();
      expect(document.activeElement).not.toBe(disparador);

      (modal()!.querySelector('[data-modal-cerrar]') as HTMLButtonElement).click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(modal()).toBeNull();
      expect(document.activeElement).toBe(disparador);
    });
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
      expect(texto).toContain('Catálogo curricular (112)');
      expect(texto).toContain('En 4 planes de estudio');
      component.seccion.set('catalogo');
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('112 asignaturas');
    });

    it('con un solo grupo los contadores van en singular', () => {
      courseService.getCoordinatorCoursesPage.and.returnValue(of(pagina([course], 1)));
      component.cargarDatos();
      fixture.detectChanges();
      const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(texto).toMatch(/\b1 grupo\b/);
      expect(texto).not.toContain('1 grupos');
    });

    it('pide al servidor la primera página con el tamaño de la pantalla y sin filtros', () => {
      expect(courseService.getCoordinatorCoursesPage).toHaveBeenCalledWith({ busqueda: null, pagina: 1, tamano: 15 });
      expect(coordinatorService.getAsignaturasPrograma).toHaveBeenCalledWith({ busqueda: null, caracter: null, pagina: 1, tamano: 15 });
    });

    it('la búsqueda viaja al servidor (con espera) para grupos y asignaturas y vuelve a la página 1', fakeAsync(() => {
      courseService.getCoordinatorCoursesPage.calls.reset();
      coordinatorService.getAsignaturasPrograma.calls.reset();

      component.onBusqueda('calc');
      component.onBusqueda('calculo');
      tick(300);

      expect(courseService.getCoordinatorCoursesPage).toHaveBeenCalledTimes(1);
      expect(courseService.getCoordinatorCoursesPage).toHaveBeenCalledWith({ busqueda: 'calculo', pagina: 1, tamano: 15 });
      expect(coordinatorService.getAsignaturasPrograma).toHaveBeenCalledWith({ busqueda: 'calculo', caracter: null, pagina: 1, tamano: 15 });
    }));

    it('el filtro de carácter usa el CÓDIGO del catálogo y lo resuelve el servidor, no las filas cargadas', () => {
      // El catálogo trae Obligatoria y Optativa aunque la página solo tenga filas obligatorias
      expect(component.caracteres().map((c) => c.codigo)).toEqual(['OBL', 'OPT']);
      const opciones = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('select[aria-label="Filtrar asignaturas por tipo"] option'));
      expect(opciones.map((o) => o.textContent?.trim())).toEqual(['Todos los caracteres', 'Obligatoria', 'Optativa']);

      coordinatorService.getAsignaturasPrograma.calls.reset();
      component.onCaracter('OPT');
      expect(component.filtroTipoAsignatura()).toBe('OPT');
      expect(coordinatorService.getAsignaturasPrograma).toHaveBeenCalledWith({ busqueda: null, caracter: 'OPT', pagina: 1, tamano: 15 });

      component.onCaracter('');
      expect(coordinatorService.getAsignaturasPrograma).toHaveBeenCalledWith({ busqueda: null, caracter: null, pagina: 1, tamano: 15 });
    });

    it('ir a otra página de grupos o de asignaturas pide esa página al servidor', () => {
      courseService.getCoordinatorCoursesPage.calls.reset();
      coordinatorService.getAsignaturasPrograma.calls.reset();

      component.listado.irAPagina(3);
      component.listadoAsignaturas.irAPagina(2);

      expect(courseService.getCoordinatorCoursesPage).toHaveBeenCalledWith({ busqueda: null, pagina: 3, tamano: 15 });
      expect(coordinatorService.getAsignaturasPrograma).toHaveBeenCalledWith({ busqueda: null, caracter: null, pagina: 2, tamano: 15 });
    });
  });

  describe('bloque E: listas en tabla', () => {
    const el = () => fixture.nativeElement as HTMLElement;

    it('los grupos del período se muestran en una tabla con una fila por grupo y conservan «Ver inscritos»', () => {
      expect(el().querySelector('app-tabla-datos table')).not.toBeNull();
      const filas = el().querySelectorAll('tbody tr[data-testid="grupo-programa-fila"]');
      expect(filas).toHaveSize(1);
      expect(filas[0].textContent).toContain('Arquitectura de Software');
      expect(filas[0].textContent).toContain('28 / 35');
      expect(filas[0].querySelector('[data-testid="ver-inscritos"]')).not.toBeNull();
    });

    it('el catálogo curricular se muestra en una tabla con una fila por asignatura', () => {
      (el().querySelector('[data-testid="subpestana-catalogo"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      const filas = el().querySelectorAll('tbody tr[data-testid="asignatura-catalogo-fila"]');
      expect(filas).toHaveSize(1);
      expect(filas[0].textContent).toContain('Obligatoria');
      expect(filas[0].textContent).toContain('Ver Plan de Estudio');
    });

    it('la nómina del grupo es una tabla paginada de a 15 en el cliente', async () => {
      const estudiantes = Array.from({ length: 20 }, (_, i) => ({
        id: `mat-${i}`, idEstudiante: `est-${i}`, documento: `${1000 + i}`, nombreCompleto: `Estudiante ${i}`, correo: '',
        codigoEstado: 'A', nombreEstado: 'activo',
      }));
      coordinatorService.getEstudiantesPorGrupo.and.returnValue(of<never>({ exitoso: true, datos: estudiantes } as never));
      component.onSelectCourse('crs-1');
      fixture.detectChanges();
      const deferBlocks = await fixture.getDeferBlocks();
      await Promise.all(deferBlocks.map((block) => block.render(DeferBlockState.Complete)));
      fixture.detectChanges();
      const modal = el().querySelector('[data-testid="modal-inscritos"]') as HTMLElement;
      expect(modal.querySelectorAll('tr[data-testid="inscrito-fila"]')).toHaveSize(15);
      component.paginaInscritos.set(2);
      fixture.detectChanges();
      expect(modal.querySelectorAll('tr[data-testid="inscrito-fila"]')).toHaveSize(5);
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
    });

    it('un grupo sin cupo se muestra como no disponible, sin número inventado', () => {
      const texto = recargar([sinCupo]);
      expect(texto).toContain('12 / —');
      expect(texto).not.toContain('12 / 35');
      expect(component.cupoTexto(sinCupo)).toBe('—');
    });

    it('un cupo en cero se muestra como no disponible', () => {
      recargar([course, sinCupo]);
      expect(component.cupoTexto({ ...sinCupo, cupoMaximo: 0 })).toBe('—');
    });
  });

  describe('CIERRE-W3I: Ocupacion de Cupos desde el servidor', () => {
    const texto = (testid: string): string =>
      ((fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testid}"]`)?.textContent ?? '').trim();

    it('muestra los matriculados y el cupo de TODOS los grupos habilitados, no la suma de la pagina visible', () => {
      // La pagina visible tiene un solo grupo (28 / 35): la cifra del KPI es la del servidor (888 / 1110).
      expect(component.courses()).toHaveSize(1);
      expect(texto('ocupacion-cupos')).toBe('888 / 1110');
      expect(texto('ocupacion-detalle')).toBe('80 % de ocupación · 37 grupos habilitados');
      expect(programa.cargar).toHaveBeenCalled();
      expect(indicadores.consultarKpis).toHaveBeenCalled();
    });

    it('sin cupo registrado (tasa nula) no inventa un porcentaje', () => {
      indicadores.consultarKpis.and.returnValue(of(kpisPrograma({ cupoTotal: 0, matriculadosActivos: 0, gruposActivos: 0, tasaAforo: null })));
      component.cargarDatos();
      fixture.detectChanges();
      expect(texto('ocupacion-cupos')).toBe('0 / 0');
      expect(texto('ocupacion-detalle')).toBe('Sin cupo registrado en los grupos habilitados');
    });

    it('mientras el servidor no responde muestra "Cargando…" y no una cifra', () => {
      const pendiente = new Observable<ApiResponse<KpisCoordinador>>(() => undefined);
      indicadores.consultarKpis.and.returnValue(pendiente);
      component.cargarDatos();
      fixture.detectChanges();
      expect(texto('ocupacion-cupos')).toBe('Cargando…');
    });

    it('si el servidor falla muestra "Sin datos" y no 0 / 0', () => {
      indicadores.consultarKpis.and.returnValue(throwError(() => new Error('500')));
      component.cargarDatos();
      fixture.detectChanges();
      expect(texto('ocupacion-cupos')).toBe('Sin datos');
    });

    it('una respuesta sin datos se trata como fallo', () => {
      indicadores.consultarKpis.and.returnValue(of<never>({ exitoso: true, datos: null } as never));
      component.cargarDatos();
      fixture.detectChanges();
      expect(texto('ocupacion-cupos')).toBe('Sin datos');
      expect(component.estadoKpis()).toBe('error');
    });

    it('un servidor sin los campos del aforo muestra «—» y no «undefined / undefined»', () => {
      const datos = { ...kpisPrograma().datos } as Partial<KpisCoordinador>;
      delete datos.matriculadosActivos;
      delete datos.cupoTotal;
      delete datos.gruposActivos;
      delete datos.tasaAforo;
      indicadores.consultarKpis.and.returnValue(of({ exitoso: true, datos } as ApiResponse<KpisCoordinador>));
      component.cargarDatos();
      fixture.detectChanges();
      expect(texto('ocupacion-cupos')).toBe('— / —');
      expect(texto('ocupacion-detalle')).toBe('Grupos habilitados del período');
    });

    it('si no se pueden cargar los programas del coordinador tampoco se afirma una ocupacion', () => {
      programa.cargar.and.returnValue(throwError(() => new Error('403')));
      component.cargarDatos();
      fixture.detectChanges();
      expect(texto('ocupacion-cupos')).toBe('Sin datos');
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
      component.seccion.set('catalogo');
      fixture.detectChanges();
    });

    it('conserva una fila por plan y marca la asignatura como compartida', () => {
      expect(component.listadoAsignaturas.filas().map((a) => a.planEstudioId)).toEqual(['plan-1', 'plan-2']);
      const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(texto).toContain('Compartida');
      expect(texto).toContain('Ingeniería de Software');
      expect(texto).toContain('Optativa');
    });

    it('Ver Plan de Estudio navega al plan de la fila', () => {
      const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      const botones = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).filter((b) => b.textContent?.includes('Ver Plan de Estudio'));
      expect(botones).toHaveSize(2);
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
