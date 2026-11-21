import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { CoordinatorStudentsComponent } from './coordinator-students.component';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { CourseService } from '../../../core/services/course.service';
import { Course } from '../../../core/models/course.model';
import { CoordinatorProgramService } from '../../../core/services/coordinator-program.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { HttpErrorResponse } from '@angular/common/http';
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
      ['getEstudiantesDirectorio', 'getEstudiantesDirectorioPagina', 'getEstudiantesPorGrupo', 'getTotalEstudiantesPorEstado', 'actualizarSemestreEstudiante']
    );
    courseService = jasmine.createSpyObj<CourseService>('CourseService', ['getTeacherCourses']);

    coordinatorService.getEstudiantesDirectorio.and.returnValue(
      of<never>({ exitoso: true, datos: [] } as never)
    );
    coordinatorService.getEstudiantesDirectorioPagina.and.returnValue(
      of({ items: [], totalItems: 0, totalPages: 0, page: 0, size: 6 })
    );
    coordinatorService.getEstudiantesPorGrupo.and.returnValue(
      of<never>({ exitoso: true, datos: [] } as never)
    );
    // CIERRE-W2A: activos e inactivos del programa los cuenta el servidor (filtro `activo`)
    coordinatorService.getTotalEstudiantesPorEstado.and.callFake((activo: boolean) => of(activo ? 40 : 3));

    courseService.getTeacherCourses.and.returnValue(
      of<never>({ exitoso: true, datos: [course] } as never)
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

  it('los activos e inactivos son los del servidor y no cuentan las filas de la página cargada', () => {
    expect(coordinatorService.getTotalEstudiantesPorEstado).toHaveBeenCalledWith(true);
    expect(coordinatorService.getTotalEstudiantesPorEstado).toHaveBeenCalledWith(false);
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

    // La página trae un activo y un inactivo, pero el programa tiene 40 y 3
    expect(component.totalActivos()).toBe(40);
    expect(component.totalInactivos()).toBe(3);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Activos en el Programa');
    expect(texto).not.toContain('en Página Actual');
  });

  it('un fallo al contar activos o inactivos se anuncia sin romper la pantalla', () => {
    coordinatorService.getTotalEstudiantesPorEstado.and.returnValue(throwError(() => new Error('falla')));
    expect(() => component.cargarDatos()).not.toThrow();
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
    expect(router.navigate).toHaveBeenCalledWith(['/app/coordinador/programa/materias']);
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

  it('P3 C3: la tabla no ensancha la página (contenedor con desplazamiento propio, tarjetas bajo md y acciones fijas)', () => {
    const estudiante = {
      id: 'est-1', documento: '1017334455', codigo: '', nombreCompleto: 'Ana Sofia Gomez Rios',
      correo: 'ana.gomez@uco.edu.co', programa: 'Ingenieria de Sistemas', estadoMatricula: 'ACTIVO' as const, idPrograma: 'prg-1',
    };
    component.directorio.set([estudiante]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const tabla = el.querySelector('[data-testid="tabla-estudiantes"]') as HTMLElement;
    expect(tabla.classList).toContain('tabla-tarjetas');
    expect(tabla.closest('[role="region"]')?.classList).toContain('overflow-x-auto');
    expect(tabla.querySelector('tbody td.col-acciones')).not.toBeNull();
    expect(tabla.querySelectorAll('tbody td[data-label]').length).toBe(6);
  });

  it('MEJORAS-SERGIO 8: lista en tabla con "Ver ficha" y sin estado financiero ni promedio ponderado', () => {
    const estudiante = {
      id: 'est-1', documento: '1017334455', codigo: '', nombreCompleto: 'Ana Sofia Gomez Rios',
      correo: 'ana.gomez@uco.edu.co', programa: 'Ingenieria de Sistemas', estadoMatricula: 'ACTIVO' as const,
    };
    component.directorio.set([estudiante, { ...estudiante, id: 'est-2', nombreCompleto: 'Luis Perez' }]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const tabla = el.querySelector('[data-testid="tabla-estudiantes"]');
    expect(tabla).not.toBeNull();
    expect(tabla!.querySelectorAll('tbody tr')).toHaveSize(2);
    expect(el.querySelector('[data-testid="fila-estudiante-est-1"] [data-testid="ver-ficha-estudiante"]')).not.toBeNull();
    const texto = el.textContent ?? '';
    expect(texto).not.toContain('Estado Financiero');
    expect(texto).not.toContain('Al Día');
    expect(texto).not.toContain('Promedio');

    (el.querySelector('[data-testid="fila-estudiante-est-2"] [data-testid="ver-ficha-estudiante"]') as HTMLButtonElement).click();
    expect(component.estudianteFicha()?.id).toBe('est-2');

    // Accesibilidad: el «Ver ficha» repetido de cada fila nombra al estudiante (WCAG 2.4.6 / 2.5.3).
    expect(el.querySelector('[data-testid="fila-estudiante-est-1"] [data-testid="ver-ficha-estudiante"]')?.getAttribute('aria-label'))
      .toBe('Ver ficha de Ana Sofia Gomez Rios');
    expect(el.querySelector('[data-testid="fila-estudiante-est-2"] [data-testid="ver-ficha-estudiante"]')?.getAttribute('aria-label'))
      .toBe('Ver ficha de Luis Perez');
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

  describe('semestre y programa del directorio', () => {
    const resumen = (extra: Record<string, unknown>) => ({
      id: 'est-1', idUsuario: 'u-1', tipoIdentificacionId: '', numeroIdentificacion: 1017, primerApellido: '', segundoApellido: null,
      primerNombre: '', segundoNombre: null, nombreCompleto: 'Ana Gomez', correo: 'ana@uco.edu.co', estaActivoUsuario: true, ...extra,
    });
    const cargar = (items: ReturnType<typeof resumen>[]) => {
      coordinatorService.getEstudiantesDirectorioPagina.and.returnValue(of({ items, totalItems: items.length, totalPages: 1, page: 0, size: 10 }));
      component.cargarDatos();
      fixture.detectChanges();
    };
    const el = () => fixture.nativeElement as HTMLElement;

    it('mapea el nombre del programa y el semestre; nulo se muestra como "No informado"', () => {
      cargar([
        resumen({ idPrograma: 'p-1', nombrePrograma: 'Ingenieria de Sistemas', semestreActual: 4 }),
        resumen({ id: 'est-2', idPrograma: 'p-1', nombrePrograma: 'Ingenieria de Sistemas', semestreActual: null }),
      ]);
      const [a, b] = component.directorio();
      expect(a.programa).toBe('Ingenieria de Sistemas');
      expect(a.semestreActual).toBe(4);
      expect(b.semestreActual).toBeNull();
      const celdas = Array.from(el().querySelectorAll('[data-testid="semestre-estudiante"]')).map((c) => c.textContent?.trim());
      expect(celdas).toEqual(['4°', 'No informado']);
      expect(el().textContent).not.toContain('No informado por el directorio');
      expect(el().textContent).toContain('Ingenieria de Sistemas');
    });

    it('con el filtro "Todos los estados" un estudiante inactivo se muestra INACTIVO', () => {
      component.filtroEstadoDirectorio.set('TODOS');
      cargar([
        resumen({ idPrograma: 'p-1', nombrePrograma: 'Sistemas', estaActivoUsuario: false }),
        resumen({ id: 'est-2', idPrograma: 'p-1', nombrePrograma: 'Sistemas', estaActivoUsuario: true }),
      ]);
      expect(coordinatorService.getEstudiantesDirectorioPagina.calls.mostRecent().args[0]).not.toEqual(jasmine.objectContaining({ activo: jasmine.anything() }));
      expect(component.directorio().map((e) => e.estadoMatricula)).toEqual(['INACTIVO', 'ACTIVO']);
    });

    it('editar semestre con éxito actualiza la fila y muestra el mensaje del backend', () => {
      const toast = TestBed.inject(ToastService);
      spyOn(toast, 'success');
      cargar([resumen({ idPrograma: 'p-1', nombrePrograma: 'Sistemas', semestreActual: null })]);
      coordinatorService.actualizarSemestreEstudiante.and.returnValue(
        of({ exitoso: true, datos: { semestreActual: 5 }, mensajeUsuario: 'Semestre actualizado por backend.' })
      );

      el().querySelector<HTMLButtonElement>('[data-testid="editar-semestre"]')!.click();
      fixture.detectChanges();
      component.semestreSeleccionado.set('5');
      component.guardarSemestre();
      fixture.detectChanges();

      expect(coordinatorService.actualizarSemestreEstudiante).toHaveBeenCalledWith('est-1', 'p-1', 5);
      expect(component.directorio()[0].semestreActual).toBe(5);
      expect(toast.success).toHaveBeenCalledWith('Semestre actualizado por backend.');
      expect(component.estudianteSemestre()).toBeNull();
      expect(el().querySelector('[data-testid="semestre-estudiante"]')?.textContent?.trim()).toBe('5°');
    });

    it('"Sin informar" envía null', () => {
      cargar([resumen({ idPrograma: 'p-1', nombrePrograma: 'Sistemas', semestreActual: 3 })]);
      coordinatorService.actualizarSemestreEstudiante.and.returnValue(of({ exitoso: true, datos: { semestreActual: null }, mensajeUsuario: 'ok' }));
      component.abrirEdicionSemestre(component.directorio()[0]);
      expect(component.semestreSeleccionado()).toBe('3');
      component.semestreSeleccionado.set('');
      component.guardarSemestre();
      expect(coordinatorService.actualizarSemestreEstudiante).toHaveBeenCalledWith('est-1', 'p-1', null);
      expect(component.directorio()[0].semestreActual).toBeNull();
    });

    it('un error del backend se muestra tal cual y la fila no cambia', () => {
      cargar([resumen({ idPrograma: 'p-1', nombrePrograma: 'Sistemas', semestreActual: 2 })]);
      coordinatorService.actualizarSemestreEstudiante.and.returnValue(
        throwError(() => new HttpErrorResponse({
          status: 400,
          error: { status: 400, code: 'EST_009', message: 'El semestre debe estar entre 1 y 10 para este programa.' },
        }))
      );
      component.abrirEdicionSemestre(component.directorio()[0]);
      fixture.detectChanges();
      component.semestreSeleccionado.set('12');
      component.guardarSemestre();
      fixture.detectChanges();

      expect(component.directorio()[0].semestreActual).toBe(2);
      expect(component.estudianteSemestre()).not.toBeNull();
      expect(el().querySelector('[data-testid="error-semestre"]')?.textContent).toContain('El semestre debe estar entre 1 y 10 para este programa.');
    });

    it('sin idPrograma no ofrece editar y guardar no llama al servicio', () => {
      cargar([resumen({})]);
      expect(el().querySelector('[data-testid="editar-semestre"]')).toBeNull();
      component.guardarSemestre();
      expect(coordinatorService.actualizarSemestreEstudiante).not.toHaveBeenCalled();
    });
  });
});
