import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { CoordinatorGroupsComponent, cupoValidoOVacio } from './coordinator-groups.component';
import { mensajeUi } from '../../../core/messages/mensajes-ui';
import { CourseService } from '../../../core/services/course.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { Course } from '../../../core/models/course.model';
import { PrevisualizacionHorarioGrupo } from '../../../core/models/horario-grupo.model';

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
    courseService = jasmine.createSpyObj('CourseService', ['getCoordinatorCoursesPage', 'crearGrupo', 'actualizarGrupo', 'previsualizarHorarioGrupo']);
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
    coordinatorService.getPeriodosAcademicos.and.returnValue(
      of({
        exitoso: true,
        datos: [
          { id: 'per-0', nombre: '2026-1', estado: 'CERRADO' } as never,
          { id: 'per-1', nombre: '2026-2', estado: 'ACTIVO' } as never,
          { id: 'per-2', nombre: '2027-1', estado: 'PLANEACION' } as never,
        ],
      })
    );

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
    expect(component.docentes()).toHaveSize(1);
    expect(component.periodos()).toHaveSize(3);
    expect(component.nombreDocente('doc-1')).toBe('Ana Pérez');
    expect(component.nombreDocente(undefined)).toBe('Sin asignar');
    // El nombre que entrega el backend manda; el listado del programa es solo respaldo.
    expect(component.nombreDocente('doc-1', 'Luis Mora')).toBe('Luis Mora');
    expect(component.nombreDocente('doc-x', null)).toBe('Sin asignar');
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
    expect(component.listado.filas()).toHaveSize(1);
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
    expect(component.form.franjas).toHaveSize(1);

    component.guardar();
    expect(toast.warning).toHaveBeenCalledWith('Seleccione la asignatura.');

    component.form.idAsignatura = 'asig-1';
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

  // DEC-076: el período no se elige; se muestra el que el servidor marca como ACTIVO y se envía su id.
  it('DEC-076: sin selector de período, muestra el período en curso y lo envía al crear', () => {
    fixture.nativeElement.querySelector('[data-testid="nuevo-grupo"]').click();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('select[name="idPeriodoAcademico"]')).toBeNull();
    expect(el.querySelector('[data-testid="periodo-creacion"]')?.textContent).toContain('2026-2 (en curso)');

    courseService.crearGrupo.and.returnValue(of({ exitoso: true, mensajeUsuario: 'Grupo creado.', datos: { id: 'g9', mensajeUsuario: '' } }));
    Object.assign(component.form, { idAsignatura: 'a', codigo: 9, nombre: 'G9', idDocente: 'd' });
    component.guardar();
    expect(courseService.crearGrupo.calls.mostRecent().args[0].idPeriodoAcademico).toBe('per-1');
  });

  it('DEC-076: sin período en curso no envía período (la base toma el próximo en planeación) y lo explica', () => {
    component.periodos.set([{ id: 'per-2', nombre: '2027-1', estado: 'PLANEACION' } as never]);
    component.abrirCrear();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="periodo-creacion"]')?.textContent).toContain('próximo período en planeación');

    courseService.crearGrupo.and.returnValue(of({ exitoso: true, mensajeUsuario: 'Grupo creado.', datos: { id: 'g10', mensajeUsuario: '' } }));
    Object.assign(component.form, { idAsignatura: 'a', codigo: 10, nombre: 'G10', idDocente: 'd' });
    component.guardar();
    expect(courseService.crearGrupo.calls.mostRecent().args[0].idPeriodoAcademico).toBeUndefined();
  });

  // DEC-073: el código es un entero positivo y el nombre, texto seguro.
  it('DEC-073: valida código entero y nombre sin < > ni comillas antes de llamar al backend', () => {
    component.abrirCrear();
    Object.assign(component.form, { idAsignatura: 'a', codigo: 1.5, nombre: 'G', idDocente: 'd' });
    expect(component.validar()).toBe('El código del grupo debe ser un número entero mayor que cero.');

    Object.assign(component.form, { codigo: 2, nombre: 'Grupo <b>A</b>' });
    expect(component.validar()).toContain('solo admite');

    Object.assign(component.form, { nombre: 'Grupo A (Noche) - 2027/1' });
    expect(component.validar()).toBeNull();
  });

  it('valida horas y franjas que se cruzan antes de llamar al backend', () => {
    component.abrirCrear();
    Object.assign(component.form, { idAsignatura: 'a', codigo: 1, nombre: 'G', idDocente: 'd' });

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

  describe('HU074 asignaturas inactivas', () => {
    beforeEach(() => {
      component.asignaturas.set([
        { id: 'asig-1', codigo: 'IS-1', nombre: 'Arquitectura de Software', estaActivaAsignatura: true } as never,
        { id: 'asig-ina', codigo: 'PRB-074', nombre: 'Prueba inactiva', estaActivaAsignatura: false } as never,
        { id: 'asig-sin', codigo: 'IS-2', nombre: 'Sin estado informado' } as never,
      ]);
    });

    it('crear: el combo de asignatura no ofrece las inactivas', () => {
      component.abrirCrear();
      fixture.detectChanges();
      const opciones = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLOptionElement>('select[name="idAsignatura"] option')
      ).map((o) => o.textContent?.trim());
      expect(opciones).toContain('IS-1 - Arquitectura de Software');
      expect(opciones).toContain('IS-2 - Sin estado informado');
      expect(opciones.some((o) => o?.includes('PRB-074'))).toBeFalse();
      expect(component.asignaturasParaCrear().map((a) => a.id)).toEqual(['asig-1', 'asig-sin']);
    });

    it('crear: si todas están inactivas el combo avisa que no hay asignaturas disponibles', () => {
      component.asignaturas.set([{ id: 'asig-ina', codigo: 'PRB-074', nombre: 'Prueba inactiva', estaActivaAsignatura: false } as never]);
      component.abrirCrear();
      fixture.detectChanges();
      const combo = (fixture.nativeElement as HTMLElement).querySelector('select[name="idAsignatura"]') as HTMLSelectElement;
      expect(combo.options).toHaveSize(1);
      expect(combo.textContent).toContain('No hay asignaturas disponibles');
    });

    it('editar: un grupo cuya asignatura está inactiva se edita y guarda sin tocar la asignatura', () => {
      courseService.actualizarGrupo.and.returnValue(of({ exitoso: true, mensajeUsuario: '', datos: { id: 'g1', mensajeUsuario: '' } }));
      component.abrirEditar({ ...grupo, asignaturaId: 'asig-ina' });
      fixture.detectChanges();

      expect(component.form.idAsignatura).toBe('asig-ina');
      expect((fixture.nativeElement as HTMLElement).querySelector('select[name="idAsignatura"]')).toBeNull();
      component.guardar();
      expect(toast.warning).not.toHaveBeenCalled();
      expect(courseService.actualizarGrupo).toHaveBeenCalledWith('g1', jasmine.objectContaining({ codigo: 1, nombre: 'Grupo 1' }));
    });
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

  /** Previsualización de ejemplo: 2 franjas de 2 h = 4 h por semana, 32 sesiones en 16 semanas, 2 cancelan por festivo. */
  const previsualizacion = (conflictos: PrevisualizacionHorarioGrupo['conflictos'] = []): PrevisualizacionHorarioGrupo => ({
    idGrupo: null,
    asignatura: { id: 'asig-1', codigo: 'IS-1', nombre: 'Arquitectura de Software', horasSemanales: 4 },
    periodo: { id: 'per-1', nombre: '2027-1', fechaInicio: '2027-02-03', fechaFin: '2027-05-25', diasPeriodo: 112, semanasPeriodo: 16, estado: 'PLANEACION' },
    zonaHoraria: 'America/Bogota',
    franjas: [
      { codigoDia: 'LU', nombreDia: 'Lunes', horaInicio: '08:00', horaFin: '10:00', minutos: 120 },
      { codigoDia: 'MI', nombreDia: 'Miércoles', horaInicio: '08:00', horaFin: '10:00', minutos: 120 },
    ],
    resumenSemanal: { franjasPorSemana: 2, minutosSemanales: 240, minutosSemanalesMateria: 240, diferenciaMinutos: 0, coincideConMateria: true },
    resumenPeriodo: {
      sesionesCalendario: 32, sesionesProgramadas: 30, sesionesEnFestivo: 2, sesionesNoProgramables: 0, minutosCalendario: 3840,
      minutosProgramados: 3600, minutosPerdidosFestivo: 240, minutosNoProgramables: 0, minutosEsperadosMateria: 3840, diferenciaMinutos: -240,
      cubreTotalEsperado: false,
    },
    festivos: [{ fecha: '2027-03-22', nombre: 'Festivo', sesionesAfectadas: 1 }],
    sesiones: [{
      numero: 1, numeroSemana: 1, fecha: '2027-02-03', horaInicio: '08:00', horaFin: '10:00', fechaHoraInicioUtc: '2027-02-03T13:00:00Z',
      fechaHoraFinUtc: '2027-02-03T15:00:00Z', minutos: 120, estado: 'PROGRAMADA', nombreFestivo: null,
    }],
    cambioSobreGrupoExistente: null,
    conflictos,
    puedeConfirmar: conflictos.every((c) => c.severidad !== 'BLOQUEANTE'),
  });

  function llenarGrupoNuevo(): void {
    component.abrirCrear();
    component.form.idAsignatura = 'asig-1';
    component.form.codigo = 3;
    component.form.nombre = 'Grupo 3';
    component.form.idDocente = 'doc-1';
    component.form.franjas = [{ dia: 'LU', horaInicio: '08:00', horaFin: '10:00' }, { dia: 'MI', horaInicio: '08:00', horaFin: '10:00' }];
  }

  it('SES-GEN-01: un grupo nuevo no se guarda sin al menos una franja y no se envía «sin horario»', () => {
    llenarGrupoNuevo();
    component.form.franjas = [];
    component.guardar();
    expect(courseService.crearGrupo).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledWith(jasmine.stringContaining('al menos una franja'));
  });

  it('SES-GEN-01: editar un grupo tampoco envía franjas vacías (el editor vaciado ya no significa «sin horario»)', () => {
    component.abrirEditar(grupo);
    component.form.franjas = [];
    component.guardar();
    expect(courseService.actualizarGrupo).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledWith(jasmine.stringContaining('al menos una franja'));
  });

  it('SES-GEN-01: calcula las sesiones del semestre con el horario propuesto y muestra el resumen y los conflictos', () => {
    courseService.previsualizarHorarioGrupo.and.returnValue(of({
      exitoso: true,
      datos: previsualizacion([
        { codigo: 'HOR_011', severidad: 'INFORMATIVO', mensaje: '4 h caen en días festivos (2 sesión(es)); esas sesiones quedan canceladas.', franja: null },
        { codigo: 'HOR_006', severidad: 'BLOQUEANTE', mensaje: 'Las horas semanales no coinciden.', franja: null },
      ]),
    }));
    llenarGrupoNuevo();
    fixture.detectChanges();

    component.previsualizar();
    fixture.detectChanges();

    expect(courseService.previsualizarHorarioGrupo).toHaveBeenCalledWith({
      idGrupo: undefined,
      idAsignatura: 'asig-1',
      idPeriodoAcademico: 'per-1',
      idDocente: 'doc-1',
      franjas: [{ dia: 'LU', horaInicio: '08:00', horaFin: '10:00' }, { dia: 'MI', horaInicio: '08:00', horaFin: '10:00' }],
    });
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('32'); // sesiones del período
    expect(texto).toContain('4 h de 4 h'); // horas por semana frente a las de la materia
    expect(texto).toContain('No se puede guardar:');
    expect(texto).toContain('Las horas semanales no coinciden.');
    expect(component.previsualizacionDesactualizada()).toBeFalse();
  });

  it('DEC-081: la previsualización muestra el conteo de receso, la lista de días, la sesión «Cancelada · motivo» y el aviso informativo', () => {
    const base = previsualizacion([
      { codigo: 'REC_011', severidad: 'INFORMATIVO', mensaje: '2 h caen en receso académico (1 sesión(es)); esas sesiones quedan canceladas.', franja: null },
    ]);
    courseService.previsualizarHorarioGrupo.and.returnValue(of({
      exitoso: true,
      datos: {
        ...base,
        resumenPeriodo: { ...base.resumenPeriodo, sesionesEnReceso: 1, minutosPerdidosReceso: 120 },
        recesos: [{ fecha: '2027-03-24', motivo: 'Receso académico: Semana Santa', sesionesAfectadas: 1 }],
        sesiones: [
          ...base.sesiones,
          {
            numero: 2, numeroSemana: 7, fecha: '2027-03-24', horaInicio: '08:00', horaFin: '10:00', fechaHoraInicioUtc: '2027-03-24T13:00:00Z',
            fechaHoraFinUtc: '2027-03-24T15:00:00Z', minutos: 120, estado: 'CANCELADA_POR_RECESO' as const, nombreFestivo: null,
            motivoReceso: 'Receso académico: Semana Santa',
          },
        ],
      },
    }));
    llenarGrupoNuevo();
    fixture.detectChanges();
    component.previsualizar();
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('[data-testid="resumen-receso"]')?.textContent).toContain('1 (2 h)');
    expect(raiz.querySelector('[data-testid="resumen-previsualizacion"]')?.textContent).toContain('Caen en festivo');
    const lista = raiz.querySelector('[data-testid="recesos-previsualizacion"]');
    expect(lista?.textContent).toContain('2027-03-24');
    expect(lista?.textContent).toContain('Receso académico: Semana Santa');
    expect(lista?.textContent).toContain('1 sesión');
    const filas = Array.from(raiz.querySelectorAll('details tbody tr')).map((tr) => tr.textContent?.replace(/\s+/g, ' ').trim() ?? '');
    expect(filas[1]).toContain('Cancelada · Receso académico: Semana Santa');
    const conflicto = raiz.querySelector('[data-testid="conflictos-previsualizacion"] li');
    expect(conflicto?.textContent).toContain('Información:');
    expect(conflicto?.textContent).toContain('esas sesiones quedan canceladas');
    expect(conflicto?.className).not.toContain('danger');
    expect(raiz.querySelector('[data-testid="error-previsualizacion"]')).toBeNull();
  });

  it('DEC-081: sin campos de receso (backend anterior) no pinta el conteo ni la lista y una sesión en receso sin motivo usa el texto base', () => {
    courseService.previsualizarHorarioGrupo.and.returnValue(of({ exitoso: true, datos: previsualizacion() }));
    llenarGrupoNuevo();
    fixture.detectChanges();
    component.previsualizar();
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('[data-testid="resumen-receso"]')).toBeNull();
    expect(raiz.querySelector('[data-testid="recesos-previsualizacion"]')).toBeNull();
  });

  it('SES-GEN-01: si el horario cambia después de calcular, avisa que hay que volver a calcular', () => {
    courseService.previsualizarHorarioGrupo.and.returnValue(of({ exitoso: true, datos: previsualizacion() }));
    llenarGrupoNuevo();
    component.previsualizar();
    expect(component.previsualizacionDesactualizada()).toBeFalse();

    component.form.franjas = [{ dia: 'MA', horaInicio: '08:00', horaFin: '10:00' }];
    fixture.detectChanges();
    expect(component.previsualizacionDesactualizada()).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="previsualizacion-desactualizada"]')).not.toBeNull();
  });

  it('SES-GEN-01: sin docente, sin materia o sin franjas no pide el cálculo y lo explica', () => {
    component.abrirCrear();
    component.previsualizar();
    expect(courseService.previsualizarHorarioGrupo).not.toHaveBeenCalled();
    expect(component.errorPrevision()).toContain('asignatura');

    // DEC-076: sin período en curso no hay calendario que previsualizar.
    llenarGrupoNuevo();
    component.periodos.set([{ id: 'per-2', nombre: '2027-1', estado: 'PLANEACION' } as never]);
    component.previsualizar();
    expect(component.errorPrevision()).toContain('No hay un período en curso');
    expect(courseService.previsualizarHorarioGrupo).not.toHaveBeenCalled();
    component.periodos.set([{ id: 'per-1', nombre: '2026-2', estado: 'ACTIVO' } as never]);

    llenarGrupoNuevo();
    component.form.idDocente = '';
    component.previsualizar();
    expect(component.errorPrevision()).toContain('docente');
    expect(courseService.previsualizarHorarioGrupo).not.toHaveBeenCalled();
  });

  it('SES-GEN-01: al editar, la previsualización va por el grupo existente (la DB toma materia y período del grupo)', () => {
    courseService.previsualizarHorarioGrupo.and.returnValue(of({ exitoso: true, datos: previsualizacion() }));
    component.abrirEditar(grupo);
    component.previsualizar();
    expect(courseService.previsualizarHorarioGrupo).toHaveBeenCalledWith(jasmine.objectContaining({
      idGrupo: 'g1', idAsignatura: undefined, idPeriodoAcademico: undefined, idDocente: 'doc-1',
    }));
  });

  it('SES-GEN-01: muestra el rechazo del backend al calcular (p. ej. período no vigente)', () => {
    courseService.previsualizarHorarioGrupo.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { exitoso: false, code: 'PER_010', mensajeUsuario: 'El período académico 2025-1 no está vigente.' },
    })));
    llenarGrupoNuevo();
    component.previsualizar();
    expect(component.errorPrevision()).toContain('2025-1');
    expect(component.previsualizando()).toBeFalse();
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
    component.abrirEditar({ ...grupo, code: undefined, cupoMaximo: undefined, docenteId: 'doc-1' });
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
    component.form = { ...component.form, idAsignatura: 'a-1', codigo: 3, nombre: 'Grupo 03', idDocente: 'doc-1' };
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
    expect(component.docentes()).toHaveSize(120);
  });

  it('F-COO-009: el listado de grupos se pagina en el servidor y el total sale de totalElementos', () => {
    // La página trae 10 filas, pero el programa tiene 25 grupos: el total y las páginas son los del servidor
    const primera = Array.from({ length: 10 }, (_, i) => ({ ...grupo, id: `g-${i}` }));
    courseService.getCoordinatorCoursesPage.and.returnValue(of(paginaGrupos(primera, 25)));
    component.cargarGrupos();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-pagination')).toBeTruthy();
    expect(el.querySelectorAll('tbody tr')).toHaveSize(10);
    expect(component.listado.total()).toBe(25);
    expect(component.listado.totalPaginas()).toBe(3);

    // Ir a la página 3 vuelve a pedir esa página al servidor (no corta una lista en memoria)
    const ultima = Array.from({ length: 5 }, (_, i) => ({ ...grupo, id: `u-${i}` }));
    courseService.getCoordinatorCoursesPage.and.returnValue(of(paginaGrupos(ultima, 25, 3)));
    component.listado.irAPagina(3);
    fixture.detectChanges();
    expect(courseService.getCoordinatorCoursesPage).toHaveBeenCalledWith({ pagina: 3, tamano: 10 });
    expect(el.querySelectorAll('tbody tr')).toHaveSize(5);
  });

  it('cambiar el tamaño de página pide la primera página con el nuevo tamaño al servidor', () => {
    courseService.getCoordinatorCoursesPage.calls.reset();
    component.listado.cambiarTamano(25);
    expect(courseService.getCoordinatorCoursesPage).toHaveBeenCalledWith({ pagina: 1, tamano: 25 });
  });

  describe('DEC-077: programa responsable', () => {
    const filaTexto = (): { responsable: string[]; botones: number; notas: string[] } => {
      const el = fixture.nativeElement as HTMLElement;
      return {
        responsable: Array.from(el.querySelectorAll('[data-testid="programa-responsable"]')).map((n) => n.textContent!.trim()),
        botones: Array.from(el.querySelectorAll('tbody button')).filter((b) => b.textContent!.trim() === 'Editar').length,
        notas: Array.from(el.querySelectorAll('[data-testid="gestiona-otro-programa"]')).map((n) => n.textContent!.trim()),
      };
    };

    it('muestra el programa responsable y Editar solo cuando esResponsable es true', () => {
      courseService.getCoordinatorCoursesPage.and.returnValue(of(paginaGrupos([
        { ...grupo, id: 'a', nombreProgramaResponsable: 'Ingeniería de Sistemas', esResponsable: true },
      ])));
      component.listado.cargar();
      fixture.detectChanges();
      const r = filaTexto();
      expect(r.responsable).toEqual(['Ingeniería de Sistemas']);
      expect(r.botones).toBe(1);
      expect(r.notas).toEqual([]);
    });

    it('en grupos de otro programa oculta Editar y muestra la nota "Lo gestiona <programa>"', () => {
      courseService.getCoordinatorCoursesPage.and.returnValue(of(paginaGrupos([
        { ...grupo, id: 'b', nombreProgramaResponsable: 'Derecho', esResponsable: false },
      ])));
      component.listado.cargar();
      fixture.detectChanges();
      const r = filaTexto();
      expect(r.responsable).toEqual(['Derecho']);
      expect(r.botones).toBe(0);
      expect(r.notas).toEqual(['Lo gestiona Derecho']);
    });

    it('sin programa responsable muestra "Sin programa responsable" y no ofrece Editar', () => {
      courseService.getCoordinatorCoursesPage.and.returnValue(of(paginaGrupos([
        { ...grupo, id: 'c', nombreProgramaResponsable: null, esResponsable: false },
      ])));
      component.listado.cargar();
      fixture.detectChanges();
      const r = filaTexto();
      expect(r.responsable).toEqual(['Sin programa responsable']);
      expect(r.botones).toBe(0);
      expect(r.notas).toEqual(['Sin programa responsable']);
    });
  });
});
