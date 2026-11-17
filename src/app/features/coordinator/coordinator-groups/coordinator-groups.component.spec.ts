import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { CoordinatorGroupsComponent, cupoValidoOVacio } from './coordinator-groups.component';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { CourseService } from '../../../core/services/course.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { Course } from '../../../core/models/course.model';

describe('CoordinatorGroupsComponent (F1: grupos y horario semanal)', () => {
  let fixture: ComponentFixture<CoordinatorGroupsComponent>;
  let component: CoordinatorGroupsComponent;
  let courseService: jasmine.SpyObj<CourseService>;
  let coordinatorService: jasmine.SpyObj<CoordinatorManagementService>;
  let toast: jasmine.SpyObj<ToastService>;

  const grupo: Course = {
    id: 'g1',
    code: '1',
    name: 'Arquitectura de Software',
    section: 'Grupo 1',
    schedule: 'Lunes 08:00-10:00',
    franjas: [{ dia: 'LU', nombreDia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' }],
    asignaturaId: 'asig-1',
    docenteId: 'doc-1',
    enrolledStudentsCount: 10,
    cupoMaximo: 35,
    colorCategory: 'emerald',
  };

  /** Pagina del servidor (CIERRE-W2A): `totalElementos` es el total real aunque la pagina traiga menos filas. */
  const paginaGrupos = (elementos: Course[], totalElementos = elementos.length, numeroPagina = 1, tamanoPagina = 10) => ({
    exitoso: true,
    elementos,
    numeroPagina,
    tamanoPagina,
    totalElementos,
    totalPaginas: Math.max(1, Math.ceil(totalElementos / tamanoPagina)),
  });

  beforeEach(async () => {
    courseService = jasmine.createSpyObj('CourseService', ['getCoordinatorCoursesPage', 'crearGrupo', 'actualizarGrupo']);
    coordinatorService = jasmine.createSpyObj('CoordinatorManagementService', [
      'getPlanesEstudio',
      'getAsignaturasPorPlan',
      'getDocentesPrograma',
      'getPeriodosAcademicos',
    ]);
    toast = jasmine.createSpyObj('ToastService', ['success', 'error', 'warning']);

    courseService.getCoordinatorCoursesPage.and.returnValue(of(paginaGrupos([grupo])));
    coordinatorService.getPlanesEstudio.and.returnValue(of({ exitoso: true, datos: [{ id: 'plan-1' } as never, { id: 'plan-2' } as never] }));
    coordinatorService.getAsignaturasPorPlan.and.callFake((planId: string) =>
      planId === 'plan-1'
        ? of({ exitoso: true, datos: [{ id: 'asig-1', codigo: 'IS-1', nombre: 'Arquitectura de Software' } as never] })
        : throwError(() => new Error('plan sin acceso'))
    );
    coordinatorService.getDocentesPrograma.and.returnValue(
      of({ exitoso: true, datos: [{ idDocente: 'doc-1', nombreCompleto: 'Ana Pérez' } as never] })
    );
    coordinatorService.getPeriodosAcademicos.and.returnValue(of({ exitoso: true, datos: [{ id: 'per-1', nombre: '2026-2' } as never] }));

    await TestBed.configureTestingModule({
      imports: [CoordinatorGroupsComponent],
      providers: [
        { provide: CourseService, useValue: courseService },
        { provide: CoordinatorManagementService, useValue: coordinatorService },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CoordinatorGroupsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga los grupos con su horario, las asignaturas de los planes, los docentes y los períodos', () => {
    expect(component.listado.filas()).toEqual([grupo]);
    expect(component.asignaturas().map((a) => a.id)).toEqual(['asig-1']);
    expect(component.docentes().length).toBe(1);
    expect(component.periodos().length).toBe(1);
    expect(component.nombreDocente('doc-1')).toBe('Ana Pérez');
    expect(component.nombreDocente(undefined)).toBe('Sin asignar');
    expect(fixture.nativeElement.textContent).toContain('Lunes 08:00-10:00');
    expect(coordinatorService.getDocentesPrograma).toHaveBeenCalledWith({ pagina: 1, tamano: 100, estaActivo: true });
  });

  it('muestra el estado vacío y avisa si falla la carga de grupos', () => {
    courseService.getCoordinatorCoursesPage.and.returnValue(of(paginaGrupos([])));
    component.cargarGrupos();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="sin-grupos"]')).not.toBeNull();

    courseService.getCoordinatorCoursesPage.and.returnValue(throwError(() => new Error('falla')));
    component.cargarGrupos();
    expect(component.cargando()).toBeFalse();
    expect(toast.error).toHaveBeenCalled();
  });

  // Un fallo de carga no puede verse como "El programa aun no tiene grupos": alerta accesible y Reintentar.
  it('un fallo al cargar los grupos muestra una alerta con Reintentar y no el estado vacio', () => {
    courseService.getCoordinatorCoursesPage.and.returnValue(throwError(() => new Error('falla')));
    component.cargarGrupos();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="sin-grupos"]')).toBeNull();
    expect(Array.from(el.querySelectorAll('button')).some((b) => /Reintentar/.test(b.textContent ?? ''))).toBeTrue();
  });

  it('Reintentar vuelve a pedir los grupos y, si responde, pinta la tabla y retira la alerta', () => {
    courseService.getCoordinatorCoursesPage.and.returnValue(throwError(() => new Error('falla')));
    component.cargarGrupos();
    fixture.detectChanges();

    courseService.getCoordinatorCoursesPage.and.returnValue(of(paginaGrupos([grupo])));
    const el = fixture.nativeElement as HTMLElement;
    (Array.from(el.querySelectorAll('button')).find((b) => /Reintentar/.test(b.textContent ?? '')) as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(component.listado.filas().length).toBe(1);
  });

  it('si fallan los catálogos del formulario se muestra el error con reintento y no solo listas vacías', () => {
    coordinatorService.getPlanesEstudio.and.returnValue(of({ exitoso: true, datos: [] }));
    coordinatorService.getDocentesPrograma.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    coordinatorService.getPeriodosAcademicos.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.cargarCatalogos();
    expect(component.asignaturas()).toEqual([]);
    expect(component.docentes()).toEqual([]);
    expect(component.periodos()).toEqual([]);
    expect(component.errorCatalogos()?.kind).toBe('SERVIDOR');

    component.abrirCrear();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="error-carga"]')).not.toBeNull();

    coordinatorService.getDocentesPrograma.and.returnValue(of({ exitoso: true, total: 0, datos: [] }));
    coordinatorService.getPeriodosAcademicos.and.returnValue(of({ exitoso: true, datos: [] }));
    (el.querySelector('[data-testid="error-carga"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.errorCatalogos()).toBeNull();
    expect(el.querySelector('[data-testid="error-carga"]')).toBeNull();
  });

  it('si falla la malla de un plan o la lista de planes se informa el error de catálogos', () => {
    coordinatorService.getPlanesEstudio.and.returnValue(of({ exitoso: true, datos: [{ id: 'p-1' } as never] }));
    coordinatorService.getAsignaturasPorPlan.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.cargarCatalogos();
    expect(component.asignaturas()).toEqual([]);
    expect(component.errorCatalogos()).not.toBeNull();

    coordinatorService.getPlanesEstudio.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    component.cargarCatalogos();
    expect(component.errorCatalogos()?.kind).toBe('AUTORIZACION');
  });

  it('crear: valida los campos y envía grupo y franjas en una sola llamada', () => {
    courseService.crearGrupo.and.returnValue(of({ exitoso: true, mensajeUsuario: 'Grupo creado.', datos: { id: 'g2', mensajeUsuario: '' } }));
    fixture.nativeElement.querySelector('[data-testid="nuevo-grupo"]').click();
    fixture.detectChanges();
    expect(component.vista()).toBe('FORM');
    expect(component.form.franjas.length).toBe(1);

    component.guardar();
    expect(toast.warning).toHaveBeenCalledWith('Seleccione la asignatura y el período académico.');

    component.form.idAsignatura = 'asig-1';
    component.form.idPeriodoAcademico = 'per-1';
    component.guardar();
    expect(toast.warning).toHaveBeenCalledWith('El código y el nombre del grupo son obligatorios.');

    component.form.codigo = 2;
    component.form.nombre = '  Grupo 2  ';
    component.guardar();
    expect(toast.warning).toHaveBeenCalledWith('Seleccione el docente titular.');

    component.form.idDocente = 'doc-1';
    component.form.franjas = [...component.form.franjas, { dia: 'MI', horaInicio: '14:00', horaFin: '16:00' }];
    component.guardar();

    expect(courseService.crearGrupo).toHaveBeenCalledWith({
      codigo: 2,
      nombre: 'Grupo 2',
      idDocente: 'doc-1',
      franjas: [
        { dia: 'LU', horaInicio: '08:00', horaFin: '10:00' },
        { dia: 'MI', horaInicio: '14:00', horaFin: '16:00' },
      ],
      idAsignatura: 'asig-1',
      idPeriodoAcademico: 'per-1',
    });
    expect(toast.success).toHaveBeenCalledWith('Grupo creado.');
    expect(component.vista()).toBe('LISTA');
    expect(courseService.getCoordinatorCoursesPage).toHaveBeenCalledTimes(2);
  });

  // DEC-073: el código es un entero positivo y el nombre, texto seguro.
  it('DEC-073: valida código entero y nombre sin < > ni comillas antes de llamar al backend', () => {
    component.abrirCrear();
    Object.assign(component.form, { idAsignatura: 'a', idPeriodoAcademico: 'p', codigo: 1.5, nombre: 'G', idDocente: 'd' });
    expect(component.validar()).toBe('El código del grupo debe ser un número entero mayor que cero.');

    Object.assign(component.form, { codigo: 2, nombre: 'Grupo <b>A</b>' });
    expect(component.validar()).toContain('solo admite');

    Object.assign(component.form, { nombre: 'Grupo A (Noche) - 2027/1' });
    expect(component.validar()).toBeNull();
  });

  it('valida horas y franjas que se cruzan antes de llamar al backend', () => {
    component.abrirCrear();
    Object.assign(component.form, { idAsignatura: 'a', idPeriodoAcademico: 'p', codigo: 1, nombre: 'G', idDocente: 'd' });

    component.form.franjas = [{ dia: 'LU', horaInicio: '10:00', horaFin: '08:00' }];
    component.guardar();
    expect(toast.warning).toHaveBeenCalledWith('En cada franja la hora de fin debe ser mayor que la de inicio.');

    component.form.franjas = [
      { dia: 'LU', horaInicio: '08:00', horaFin: '10:00' },
      { dia: 'LU', horaInicio: '09:00', horaFin: '11:00' },
    ];
    component.guardar();
    expect(toast.warning).toHaveBeenCalledWith('Las franjas del horario no pueden cruzarse entre sí.');

    component.form.franjas = [
      { dia: 'LU', horaInicio: '08:00', horaFin: '10:00' },
      { dia: 'LU', horaInicio: '10:00', horaFin: '12:00' },
    ];
    expect(component.validar()).toBeNull();
    expect(courseService.crearGrupo).not.toHaveBeenCalled();
  });

  it('editar: precarga el grupo con su horario y envía PUT con cupo y franjas', () => {
    courseService.actualizarGrupo.and.returnValue(of({ exitoso: true, mensajeUsuario: '', datos: { id: 'g1', mensajeUsuario: '' } }));
    component.abrirEditar(grupo);
    expect(component.modo()).toBe('EDITAR');
    expect(component.form).toEqual(jasmine.objectContaining({ codigo: 1, nombre: 'Grupo 1', idDocente: 'doc-1', cupoMaximo: 35 }));
    expect(component.form.franjas).not.toBe(grupo.franjas as never);

    component.guardar();

    expect(courseService.actualizarGrupo).toHaveBeenCalledWith('g1', {
      codigo: 1,
      nombre: 'Grupo 1',
      idDocente: 'doc-1',
      franjas: [{ dia: 'LU', nombreDia: 'Lunes', horaInicio: '08:00', horaFin: '10:00' }],
      cupoMaximo: 35,
    });
    expect(toast.success).toHaveBeenCalledWith('Grupo guardado.');
  });

  it('editar: un cupo 0, negativo o con decimales avisa con el mensaje del catálogo y no envía el PUT', () => {
    // usp_actualizar_grupo ignora un cupo <= 0 y deja el anterior; sin esta validación el guardado parecía exitoso.
    for (const cupo of [0, -3, 12.5]) {
      component.abrirEditar(grupo);
      component.form.cupoMaximo = cupo;
      component.guardar();
    }
    expect(courseService.actualizarGrupo).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledTimes(3);
    expect(toast.warning).toHaveBeenCalledWith(mensajeUi('UI_COORDINATOR_GROUPS_004'));
  });

  it('editar: un cupo vacío se acepta y no se envía (el backend conserva el actual)', () => {
    courseService.actualizarGrupo.and.returnValue(of({ exitoso: true, mensajeUsuario: '', datos: { id: 'g1', mensajeUsuario: '' } }));
    component.abrirEditar(grupo);
    component.form.cupoMaximo = null;

    component.guardar();

    expect(courseService.actualizarGrupo).toHaveBeenCalledWith('g1', jasmine.objectContaining({ cupoMaximo: undefined }));
  });

  it('cupoValidoOVacio acepta vacío o enteros >= 1', () => {
    expect(cupoValidoOVacio(null)).toBeTrue();
    expect(cupoValidoOVacio(undefined)).toBeTrue();
    expect(cupoValidoOVacio('')).toBeTrue();
    expect(cupoValidoOVacio(1)).toBeTrue();
    expect(cupoValidoOVacio('40')).toBeTrue();
    expect(cupoValidoOVacio(0)).toBeFalse();
    expect(cupoValidoOVacio(-1)).toBeFalse();
    expect(cupoValidoOVacio(2.5)).toBeFalse();
  });

  it('muestra el mensaje del backend cuando rechaza (p. ej. HOR_002) y conserva el formulario', () => {
    courseService.actualizarGrupo.and.returnValue(throwError(() => ({ error: { mensajeUsuario: 'cruce' } })));
    component.abrirEditar({ ...grupo, code: undefined, cupoMaximo: undefined, docenteId: 'doc-1', franjas: undefined });
    component.form.codigo = 1;
    component.guardar();
    expect(toast.error).toHaveBeenCalled();
    expect(component.vista()).toBe('FORM');
    expect(component.guardando()).toBeFalse();

    courseService.actualizarGrupo.and.returnValue(of({ exitoso: false, mensajeUsuario: '', datos: { id: 'g1', mensajeUsuario: '' } }));
    component.guardar();
    expect(toast.error).toHaveBeenCalledWith('No fue posible guardar el grupo.');

    component.volver();
    expect(component.vista()).toBe('LISTA');
  });

  it('ERR_CRUCE_HORARIO_DOCENTE: crear un grupo con cruce de horario (409) muestra el mensaje del backend en el formulario', () => {
    const mensaje = 'Existe cruce de horario para el docente.';
    courseService.crearGrupo.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: {
        timestamp: '2026-11-16T10:00:00Z', status: 409, error: 'Conflict', code: 'ERR_CRUCE_HORARIO_DOCENTE',
        message: mensaje, path: '/api/v1/grupos', correlationId: null,
      },
    })));
    component.abrirCrear();
    component.form = { ...component.form, idAsignatura: 'a-1', idPeriodoAcademico: 'p-1', codigo: 3, nombre: 'Grupo 03', idDocente: 'doc-1' };
    component.guardar();
    fixture.detectChanges();

    const alerta = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="error-guardado-grupo"]');
    expect(alerta?.textContent).toContain(mensaje);
    expect(toast.error).toHaveBeenCalledWith(mensaje);
    expect(component.vista()).toBe('FORM');

    component.volver();
    expect(component.errorGuardado()).toBeNull();
  });

  it('F-COO-009: el selector de docentes trae todas las paginas del directorio (mas de 100)', () => {
    const docente = (n: number) => ({ idDocente: `doc-${n}`, nombreCompleto: `Docente ${n}` }) as never;
    const pagina1 = Array.from({ length: 100 }, (_, i) => docente(i + 1));
    const pagina2 = Array.from({ length: 20 }, (_, i) => docente(i + 101));
    coordinatorService.getDocentesPrograma.calls.reset();
    coordinatorService.getDocentesPrograma.and.callFake((filtro) =>
      of({ exitoso: true, total: 120, datos: filtro.pagina === 1 ? pagina1 : pagina2 })
    );
    component.cargarCatalogos();
    expect(coordinatorService.getDocentesPrograma).toHaveBeenCalledTimes(2);
    expect(coordinatorService.getDocentesPrograma.calls.argsFor(1)[0]).toEqual({ pagina: 2, tamano: 100, estaActivo: true });
    expect(component.docentes().length).toBe(120);
  });

  it('F-COO-009: el listado de grupos se pagina en el servidor y el total sale de totalElementos', () => {
    // La página trae 10 filas, pero el programa tiene 25 grupos: el total y las páginas son los del servidor
    const primera = Array.from({ length: 10 }, (_, i) => ({ ...grupo, id: `g-${i}` }));
    courseService.getCoordinatorCoursesPage.and.returnValue(of(paginaGrupos(primera, 25)));
    component.cargarGrupos();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-pagination')).toBeTruthy();
    expect(el.querySelectorAll('tbody tr').length).toBe(10);
    expect(component.listado.total()).toBe(25);
    expect(component.listado.totalPaginas()).toBe(3);

    // Ir a la página 3 vuelve a pedir esa página al servidor (no corta una lista en memoria)
    const ultima = Array.from({ length: 5 }, (_, i) => ({ ...grupo, id: `u-${i}` }));
    courseService.getCoordinatorCoursesPage.and.returnValue(of(paginaGrupos(ultima, 25, 3)));
    component.listado.irAPagina(3);
    fixture.detectChanges();
    expect(courseService.getCoordinatorCoursesPage).toHaveBeenCalledWith({ pagina: 3, tamano: 10 });
    expect(el.querySelectorAll('tbody tr').length).toBe(5);
  });

  it('cambiar el tamaño de página pide la primera página con el nuevo tamaño al servidor', () => {
    courseService.getCoordinatorCoursesPage.calls.reset();
    component.listado.cambiarTamano(25);
    expect(courseService.getCoordinatorCoursesPage).toHaveBeenCalledWith({ pagina: 1, tamano: 25 });
  });
});
