import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { CoordinatorDocentesComponent } from './coordinator-docentes.component';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { CourseService } from '../../../core/services/course.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { Course } from '../../../core/models/course.model';
import { DocenteItem } from '../../../core/models/role-management.model';

describe('CoordinatorDocentesComponent', () => {
  let fixture: ComponentFixture<CoordinatorDocentesComponent>;
  let component: CoordinatorDocentesComponent;
  let coordinatorService: jasmine.SpyObj<CoordinatorManagementService>;
  let catalogService: jasmine.SpyObj<CatalogService>;
  let courseService: jasmine.SpyObj<CourseService>;
  let toastService: jasmine.SpyObj<ToastService>;

  const docente1: DocenteItem = {
    id: 'doc-1',
    numeroIdentificacion: '9999',
    nombres: 'Roberto',
    apellidos: 'Gómez',
    correo: 'rgomez@uco.edu.co',
    departamento: 'Ingeniería',
    especialidad: 'Software',
    estado: 'ACTIVO',
    totalGruposAsignados: 2,
  };

  const docente2: DocenteItem = {
    id: 'doc-2',
    numeroIdentificacion: '8888',
    nombres: 'Luisa',
    apellidos: 'Castro',
    correo: 'lcastro@uco.edu.co',
    departamento: 'Ciencias Básicas',
    especialidad: 'Matemáticas',
    estado: 'INACTIVO',
    totalGruposAsignados: 0,
  };

  const cursoRelacionado: Course = {
    id: 'crs-1',
    code: 'MAT-301',
    name: 'Matemática Avanzada III',
    section: 'Sección A',
    schedule: 'Lun, Mié 08:00 - 10:00 AM',
    room: 'Aula A-204',
    enrolledStudentsCount: 32,
    cupoMaximo: 35,
    docenteId: 'doc-1',
    docenteName: 'Roberto Gómez',
    colorCategory: 'emerald',
  };

  beforeEach(() => {
    coordinatorService = jasmine.createSpyObj<CoordinatorManagementService>(
      'CoordinatorManagementService',
      ['getDocentes', 'toggleDocenteStatus', 'createDocente']
    );
    catalogService = jasmine.createSpyObj<CatalogService>('CatalogService', [
      'getTiposIdentificacion',
      'getDepartamentosAcademicos',
    ]);
    courseService = jasmine.createSpyObj<CourseService>('CourseService', [
      'getTeacherCourses',
    ]);
    toastService = jasmine.createSpyObj<ToastService>('ToastService', [
      'success',
      'error',
      'warning',
      'info',
    ]);

    coordinatorService.getDocentes.and.returnValue(
      of({ exitoso: true, datos: [docente1, docente2] })
    );
    catalogService.getTiposIdentificacion.and.returnValue(
      of({ exitoso: true, datos: [{ id: 'tipo-1', tipoIdentificacion: 'CC', nombre: 'Cédula' }] })
    );
    catalogService.getDepartamentosAcademicos.and.returnValue(
      of({ exitoso: true, datos: ['Ingeniería', 'Ciencias Básicas'] })
    );
    courseService.getTeacherCourses.and.returnValue(
      of({ exitoso: true, datos: [cursoRelacionado] })
    );

    TestBed.configureTestingModule({
      imports: [CoordinatorDocentesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CoordinatorManagementService, useValue: coordinatorService },
        { provide: CatalogService, useValue: catalogService },
        { provide: CourseService, useValue: courseService },
        { provide: ToastService, useValue: toastService },
      ],
    });

    fixture = TestBed.createComponent(CoordinatorDocentesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse e inicializar la lista de docentes y cursos', () => {
    expect(component).toBeTruthy();
    expect(component.docentes().length).toBe(2);
    expect(component.allCourses().length).toBe(1);
    expect(component.isLoading()).toBeFalse();
  });

  it('filteredDocentes filtra por término de búsqueda', () => {
    component.searchQuery = 'roberto';
    component.docentes.set([...component.docentes()]);
    expect(component.filteredDocentes().length).toBe(1);
    expect(component.filteredDocentes()[0].nombres).toBe('Roberto');
  });

  it('filteredDocentes filtra por estado', () => {
    component.selectedEstado = 'INACTIVO';
    component.docentes.set([...component.docentes()]);
    expect(component.filteredDocentes().length).toBe(1);
    expect(component.filteredDocentes()[0].nombres).toBe('Luisa');
  });

  it('verFichaDocente() empareja cursos por docenteId real', () => {
    component.verFichaDocente(docente1);
    expect(component.docenteSeleccionado()).toBe(docente1);
    expect(component.cursosDocente().length).toBe(1);
    expect(component.cursosDocente()[0].id).toBe('crs-1');
  });

  it('cerrarFichaDocente() limpia la selección de ficha', () => {
    component.verFichaDocente(docente1);
    component.cerrarFichaDocente();
    expect(component.docenteSeleccionado()).toBeNull();
    expect(component.cursosDocente().length).toBe(0);
  });

  it('abrirFormularioRegistro y volverALista cambian la vista correctamente', () => {
    component.abrirFormularioRegistro();
    expect(component.vistaActual()).toBe('REGISTRO');

    component.volverALista();
    expect(component.vistaActual()).toBe('LISTA');
  });

  it('toggleEstado alterna el estado del docente y notifica éxito', () => {
    coordinatorService.toggleDocenteStatus.and.returnValue(
      of({ exitoso: true, mensajeUsuario: 'Estado actualizado', datos: { ...docente1, estado: 'INACTIVO' } })
    );

    component.toggleEstado(docente1);

    expect(coordinatorService.toggleDocenteStatus).toHaveBeenCalledWith('doc-1');
    expect(toastService.success).toHaveBeenCalledWith('Estado actualizado');
  });

  it('onNumeroIdentificacionInput limpia caracteres no numéricos', () => {
    const event = { target: { value: '1017-999-ABC' } } as unknown as Event;
    component.onNumeroIdentificacionInput(event);
    expect(component.formData.numeroIdentificacion).toBe('1017999');
  });

  it('guardarDocente valida campos obligatorios antes de enviar', () => {
    component.abrirFormularioRegistro();

    // Sin documento
    component.formData.numeroIdentificacion = '';
    component.guardarDocente();
    expect(toastService.warning).toHaveBeenCalled();

    // Sin primer nombre
    component.formData.numeroIdentificacion = '1017123456';
    component.formData.primerNombre = '';
    component.guardarDocente();
    expect(toastService.warning).toHaveBeenCalled();

    // Sin primer apellido
    component.formData.primerNombre = 'Jorge';
    component.formData.primerApellido = '';
    component.guardarDocente();
    expect(toastService.warning).toHaveBeenCalled();

    // Correo inválido
    component.formData.primerApellido = 'Gómez';
    component.formData.correo = 'correo-no-valido';
    component.guardarDocente();
    expect(toastService.warning).toHaveBeenCalled();

    // Sin especialidad
    component.formData.correo = 'jorge.gomez@uco.edu.co';
    component.formData.especialidad = '';
    component.guardarDocente();
    expect(toastService.warning).toHaveBeenCalled();
  });

  it('guardarDocente registra un nuevo docente exitosamente', () => {
    component.abrirFormularioRegistro();
    component.formData.numeroIdentificacion = '1017888777';
    component.formData.primerNombre = 'Esteban';
    component.formData.primerApellido = 'Quintero';
    component.formData.correo = 'esteban.quintero@uco.edu.co';
    component.formData.especialidad = 'Inteligencia Artificial';
    component.formData.departamento = 'Departamento de Ciencias Computacionales';

    coordinatorService.createDocente.and.returnValue(
      of({
        exitoso: true,
        mensajeUsuario: 'Docente registrado exitosamente.',
        datos: {
          id: 'doc-nuevo',
          ...component.formData,
          totalGruposAsignados: 0,
        },
      })
    );

    component.guardarDocente();

    expect(coordinatorService.createDocente).toHaveBeenCalled();
    expect(component.docentes().length).toBe(3);
    expect(component.vistaActual()).toBe('LISTA');
    expect(toastService.success).toHaveBeenCalled();
  });

  it('abrirModalSeleccionarDocente y onSolicitarRegistroNuevo manejan estado del modal', () => {
    expect(component.isPickerModalOpen()).toBeFalse();
    component.abrirModalSeleccionarDocente();
    expect(component.isPickerModalOpen()).toBeTrue();
    component.onSolicitarRegistroNuevo();
    expect(component.isPickerModalOpen()).toBeFalse();
    expect(component.vistaActual()).toBe('REGISTRO');
  });

  it('onDocenteSeleccionadoDelDirectorio avisa si el docente ya está en el claustro', () => {
    component.onDocenteSeleccionadoDelDirectorio({
      id: 'doc-1',
      numeroIdentificacion: '12345678',
      nombres: 'Roberto',
      apellidos: 'Gómez',
      correo: 'roberto.gomez@uco.edu.co',
    });

    expect(toastService.info).toHaveBeenCalled();
  });

  it('onDocenteSeleccionadoDelDirectorio vincula un nuevo docente del directorio', () => {
    const userPicker = {
      id: 'usr-nuevo-dir',
      numeroIdentificacion: '1017444555',
      nombres: 'Laura',
      apellidos: 'Cardona',
      correo: 'laura.cardona@uco.edu.co',
      tipoIdentificacion: 'CC',
    };

    coordinatorService.createDocente.and.returnValue(
      of({
        exitoso: true,
        datos: {
          id: 'usr-nuevo-dir',
          tipoIdentificacionId: 'tipo-1',
          tipoIdentificacion: 'CC',
          numeroIdentificacion: '1017444555',
          primerNombre: 'Laura',
          primerApellido: 'Cardona',
          nombres: 'Laura',
          apellidos: 'Cardona',
          correo: 'laura.cardona@uco.edu.co',
          departamento: 'Departamento de Ciencias Computacionales',
          especialidad: 'Docencia Universitaria',
          totalGruposAsignados: 0,
          estado: 'ACTIVO',
        },
      })
    );

    component.onDocenteSeleccionadoDelDirectorio(userPicker);

    expect(coordinatorService.createDocente).toHaveBeenCalled();
    expect(component.docentes().some((d) => d.id === 'usr-nuevo-dir')).toBeTrue();
    expect(toastService.success).toHaveBeenCalled();
  });
});
