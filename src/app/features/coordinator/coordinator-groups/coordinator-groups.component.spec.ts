import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CoordinatorGroupsComponent } from './coordinator-groups.component';
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

  beforeEach(async () => {
    courseService = jasmine.createSpyObj('CourseService', ['getCoordinatorCourses', 'crearGrupo', 'actualizarGrupo']);
    coordinatorService = jasmine.createSpyObj('CoordinatorManagementService', [
      'getPlanesEstudio',
      'getAsignaturasPorPlan',
      'getDocentesPrograma',
      'getPeriodosAcademicos',
    ]);
    toast = jasmine.createSpyObj('ToastService', ['success', 'error', 'warning']);

    courseService.getCoordinatorCourses.and.returnValue(of({ exitoso: true, datos: [grupo] }));
    coordinatorService.getPlanesEstudio.and.returnValue(of({ exitoso: true, datos: [{ id: 'plan-1' } as any, { id: 'plan-2' } as any] }));
    coordinatorService.getAsignaturasPorPlan.and.callFake((planId: string) =>
      planId === 'plan-1'
        ? of({ exitoso: true, datos: [{ id: 'asig-1', codigo: 'IS-1', nombre: 'Arquitectura de Software' } as any] })
        : throwError(() => new Error('plan sin acceso'))
    );
    coordinatorService.getDocentesPrograma.and.returnValue(
      of({ exitoso: true, datos: [{ idDocente: 'doc-1', nombreCompleto: 'Ana Pérez' } as any] })
    );
    coordinatorService.getPeriodosAcademicos.and.returnValue(of({ exitoso: true, datos: [{ id: 'per-1', nombre: '2026-2' } as any] }));

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
    expect(component.grupos()).toEqual([grupo]);
    expect(component.asignaturas().map((a) => a.id)).toEqual(['asig-1']);
    expect(component.docentes().length).toBe(1);
    expect(component.periodos().length).toBe(1);
    expect(component.nombreDocente('doc-1')).toBe('Ana Pérez');
    expect(component.nombreDocente(undefined)).toBe('Sin asignar');
    expect(fixture.nativeElement.textContent).toContain('Lunes 08:00-10:00');
    expect(coordinatorService.getDocentesPrograma).toHaveBeenCalledWith({ pagina: 1, tamano: 100, estaActivo: true });
  });

  it('muestra el estado vacío y avisa si falla la carga de grupos', () => {
    courseService.getCoordinatorCourses.and.returnValue(of({ exitoso: true, datos: [] }));
    component.cargarGrupos();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="sin-grupos"]')).not.toBeNull();

    courseService.getCoordinatorCourses.and.returnValue(throwError(() => new Error('falla')));
    component.cargarGrupos();
    expect(component.cargando()).toBeFalse();
    expect(toast.error).toHaveBeenCalled();
  });

  it('sin planes o con catálogos que fallan deja las listas vacías', () => {
    coordinatorService.getPlanesEstudio.and.returnValue(of({ exitoso: true, datos: [] }));
    coordinatorService.getDocentesPrograma.and.returnValue(throwError(() => new Error('x')));
    coordinatorService.getPeriodosAcademicos.and.returnValue(throwError(() => new Error('x')));
    component.cargarCatalogos();
    expect(component.asignaturas()).toEqual([]);
    expect(component.docentes()).toEqual([]);
    expect(component.periodos()).toEqual([]);

    coordinatorService.getPlanesEstudio.and.returnValue(throwError(() => new Error('x')));
    component.cargarCatalogos();
    expect(component.asignaturas()).toEqual([]);
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
    component.agregarFranja();
    component.form.franjas[1] = { dia: 'MI', horaInicio: '14:00', horaFin: '16:00' };
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
    expect(courseService.getCoordinatorCourses).toHaveBeenCalledTimes(2);
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
    component.quitarFranja(0);
    expect(component.form.franjas).toEqual([{ dia: 'LU', horaInicio: '10:00', horaFin: '12:00' }]);
    expect(courseService.crearGrupo).not.toHaveBeenCalled();
  });

  it('editar: precarga el grupo con su horario y envía PUT con cupo y franjas', () => {
    courseService.actualizarGrupo.and.returnValue(of({ exitoso: true, mensajeUsuario: '', datos: { id: 'g1', mensajeUsuario: '' } }));
    component.abrirEditar(grupo);
    expect(component.modo()).toBe('EDITAR');
    expect(component.form).toEqual(jasmine.objectContaining({ codigo: 1, nombre: 'Grupo 1', idDocente: 'doc-1', cupoMaximo: 35 }));
    expect(component.form.franjas).not.toBe(grupo.franjas as any);

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
});
