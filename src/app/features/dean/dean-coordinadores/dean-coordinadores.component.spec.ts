import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeanCoordinadoresComponent } from './dean-coordinadores.component';
import { DeanManagementService } from '../../../core/services/dean-management.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { environment } from '../../../../environments/environment';
import { CoordinadorItem } from '../../../core/models/role-management.model';

describe('DeanCoordinadoresComponent', () => {
  let fixture: ComponentFixture<DeanCoordinadoresComponent>;
  let component: DeanCoordinadoresComponent;
  let deanService: DeanManagementService;
  let catalogService: CatalogService;
  let toastService: jasmine.SpyObj<ToastService>;
  let http: HttpTestingController;

  const mockCoordinadores: CoordinadorItem[] = [
    {
      id: 'coord-1',
      numeroIdentificacion: '1017001',
      nombres: 'Carlos',
      apellidos: 'Ramírez',
      correo: 'cramirez@uco.edu.co',
      facultad: 'Facultad de Ingeniería',
      programaAcademico: 'Ingeniería de Sistemas',
      estado: 'ACTIVO',
      totalDocentes: 10,
      totalGrupos: 15,
    },
    {
      id: 'coord-2',
      numeroIdentificacion: '1017002',
      nombres: 'Ana',
      apellidos: 'Gómez',
      correo: 'agomez@uco.edu.co',
      facultad: 'Facultad de Ingeniería',
      programaAcademico: 'Ingeniería Industrial',
      estado: 'INACTIVO',
      totalDocentes: 8,
      totalGrupos: 12,
    },
  ];

  beforeEach(async () => {
    toastService = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    await TestBed.configureTestingModule({
      imports: [DeanCoordinadoresComponent],
      providers: [
        DeanManagementService,
        CatalogService,
        { provide: ToastService, useValue: toastService },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    deanService = TestBed.inject(DeanManagementService);
    catalogService = TestBed.inject(CatalogService);
    fixture = TestBed.createComponent(DeanCoordinadoresComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => http.verify());

  function flushInitialRequests() {
    fixture.detectChanges();

    const reqCoords = http.expectOne(`${environment.apiUrl}/decano/coordinadores`);
    reqCoords.flush({ exitoso: true, datos: mockCoordinadores });

    http.match(`${environment.apiUrl}/tipos-identificacion`).forEach((r) =>
      r.flush({
        exitoso: true,
        datos: [{ id: 'tipo-1', tipoIdentificacion: 'CC', nombre: 'Cédula de Ciudadanía' }],
      })
    );
    http.match(`${environment.apiUrl}/programas-academicos`).forEach((r) =>
      r.flush({
        exitoso: true,
        datos: [{ id: 'prog-1', codigo: 'IS', nombre: 'Ingeniería de Sistemas' }],
      })
    );

    http.match(`${environment.apiUrl}/coordinador/planes-estudio`).forEach((r) => r.flush({ exitoso: true, datos: [] }));
    http.match(`${environment.apiUrl}/coordinador/periodos-academicos`).forEach((r) => r.flush({ exitoso: true, datos: [] }));
    http.match(`${environment.apiUrl}/docentes`).forEach((r) => r.flush([]));
    http.match(`${environment.apiUrl}/coordinador/docentes`).forEach((r) => r.flush({ exitoso: true, datos: [] }));

    fixture.detectChanges();
  }

  it('debe crearse e inicializar lista de coordinadores', () => {
    flushInitialRequests();
    expect(component).toBeTruthy();
    expect(component.coordinadores().length).toBe(2);
    expect(component.isLoading()).toBeFalse();
  });

  it('filteredCoordinadores filtra por texto de búsqueda', () => {
    flushInitialRequests();
    component.searchQuery = 'carlos';
    component.coordinadores.set([...component.coordinadores()]);
    fixture.detectChanges();

    expect(component.filteredCoordinadores().length).toBe(1);
    expect(component.filteredCoordinadores()[0].nombres).toBe('Carlos');
  });

  it('filteredCoordinadores filtra por estado', () => {
    flushInitialRequests();
    component.selectedEstado = 'INACTIVO';
    component.coordinadores.set([...component.coordinadores()]);
    fixture.detectChanges();

    expect(component.filteredCoordinadores().length).toBe(1);
    expect(component.filteredCoordinadores()[0].nombres).toBe('Ana');
  });

  it('abrirFormularioRegistro cambia la vista a REGISTRO', () => {
    flushInitialRequests();
    component.abrirFormularioRegistro();
    expect(component.vistaActual()).toBe('REGISTRO');
  });

  it('volverALista restablece la vista a LISTA', () => {
    flushInitialRequests();
    component.abrirFormularioRegistro();
    component.volverALista();
    expect(component.vistaActual()).toBe('LISTA');
  });

  it('toggleEstado envía PATCH para alternar estado y notifica', () => {
    flushInitialRequests();
    component.toggleEstado(mockCoordinadores[0]);

    const req = http.expectOne(`${environment.apiUrl}/decano/coordinadores/coord-1/toggle`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ exitoso: true, datos: { ...mockCoordinadores[0], estado: 'INACTIVO' } });

    expect(toastService.success).toHaveBeenCalled();
  });

  it('onNumeroIdentificacionInput limpia caracteres no numéricos', () => {
    flushInitialRequests();
    const event = { target: { value: '1017-abc-999' } } as unknown as Event;
    component.onNumeroIdentificacionInput(event);
    expect(component.formData.numeroIdentificacion).toBe('1017999');
  });

  it('guardarCoordinador valida campos obligatorios antes de enviar', () => {
    flushInitialRequests();
    component.abrirFormularioRegistro();

    // Sin documento
    component.formData.numeroIdentificacion = '';
    component.guardarCoordinador();
    expect(toastService.warning).toHaveBeenCalled();

    // Documento válido pero sin nombres
    component.formData.numeroIdentificacion = '1017123456';
    component.formData.primerNombre = '';
    component.guardarCoordinador();
    expect(toastService.warning).toHaveBeenCalled();

    // Con nombre pero sin apellido
    component.formData.primerNombre = 'Jorge';
    component.formData.primerApellido = '';
    component.guardarCoordinador();
    expect(toastService.warning).toHaveBeenCalled();

    // Con apellido pero correo inválido
    component.formData.primerApellido = 'Henao';
    component.formData.correo = 'invalido';
    component.guardarCoordinador();
    expect(toastService.warning).toHaveBeenCalled();

    // Con correo válido pero sin programa
    component.formData.correo = 'jorge.henao@uco.edu.co';
    component.formData.programaAcademico = '';
    component.guardarCoordinador();
    expect(toastService.warning).toHaveBeenCalled();
  });

  it('guardarCoordinador envía POST y agrega el nuevo coordinador a la lista', () => {
    flushInitialRequests();
    component.abrirFormularioRegistro();
    component.formData.numeroIdentificacion = '1017555444';
    component.formData.primerNombre = 'Jorge';
    component.formData.primerApellido = 'Henao';
    component.formData.correo = 'jorge.henao@uco.edu.co';
    component.formData.programaAcademico = 'Ingeniería de Sistemas';

    component.guardarCoordinador();

    const req = http.expectOne(`${environment.apiUrl}/decano/coordinadores`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.numeroIdentificacion).toBe('1017555444');
    expect(req.request.body.primerNombre).toBe('Jorge');
    expect(req.request.body.primerApellido).toBe('Henao');
    expect(req.request.body.correo).toBe('jorge.henao@uco.edu.co');
    req.flush({
      exitoso: true,
      mensajeUsuario: 'Coordinador creado.',
      datos: {
        id: 'coord-nuevo',
        ...component.formData,
        totalDocentes: 0,
        totalGrupos: 0,
      },
    });

    const getReq = http.expectOne(`${environment.apiUrl}/decano/coordinadores`);
    expect(getReq.request.method).toBe('GET');
    getReq.flush({
      exitoso: true,
      datos: [
        ...mockCoordinadores,
        {
          id: 'coord-nuevo',
          ...component.formData,
          totalDocentes: 0,
          totalGrupos: 0,
        },
      ],
    });

    expect(component.coordinadores().length).toBe(3);
    expect(component.vistaActual()).toBe('LISTA');
    expect(toastService.success).toHaveBeenCalled();
  });

  it('abrirModalSeleccionarCoordinador y onSolicitarRegistroNuevo gestionan estado del modal', () => {
    flushInitialRequests();
    expect(component.isPickerModalOpen()).toBeFalse();
    component.abrirModalSeleccionarCoordinador();
    expect(component.isPickerModalOpen()).toBeTrue();
    component.onSolicitarRegistroNuevo();
    expect(component.isPickerModalOpen()).toBeFalse();
    expect(component.vistaActual()).toBe('REGISTRO');
  });

  it('onCoordinadorSeleccionadoDelDirectorio avisa si el usuario ya coordina un programa', () => {
    flushInitialRequests();
    component.onCoordinadorSeleccionadoDelDirectorio({
      id: 'coord-1',
      numeroIdentificacion: '1017001',
      nombres: 'Carlos',
      apellidos: 'Aristizábal',
      correo: 'caristizabal@uco.edu.co',
    });

    expect(toastService.info).toHaveBeenCalled();
  });

  it('onCoordinadorSeleccionadoDelDirectorio precarga datos cuando es un nuevo coordinador', () => {
    flushInitialRequests();
    component.onCoordinadorSeleccionadoDelDirectorio({
      id: 'usr-nuevo-directorio',
      numeroIdentificacion: '1017998877',
      primerNombre: 'Valeria',
      primerApellido: 'Restrepo',
      nombres: 'Valeria',
      apellidos: 'Restrepo',
      correo: 'valeria.restrepo@uco.edu.co',
      tipoIdentificacion: 'CC',
    });

    expect(component.vistaActual()).toBe('REGISTRO');
    expect(component.formData.numeroIdentificacion).toBe('1017998877');
    expect(component.formData.primerNombre).toBe('Valeria');
    expect(component.formData.primerApellido).toBe('Restrepo');
    expect(component.formData.correo).toBe('valeria.restrepo@uco.edu.co');
    expect(component.formData.programaAcademico).toBe('SIN_PROGRAMA');
    expect(toastService.info).toHaveBeenCalled();
  });

  it('guardarCoordinador permite aprovisionar coordinador con SIN_PROGRAMA cuando la facultad aún no tiene programas', () => {
    flushInitialRequests();
    component.programasAcademicos.set([]);
    component.abrirFormularioRegistro();
    expect(component.formData.programaAcademico).toBe('SIN_PROGRAMA');

    component.formData.numeroIdentificacion = '1017666777';
    component.formData.primerNombre = 'Elena';
    component.formData.primerApellido = 'Montoya';
    component.formData.correo = 'elena.montoya@uco.edu.co';

    component.guardarCoordinador();

    const req = http.expectOne(`${environment.apiUrl}/decano/coordinadores`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.idPrograma).toBeNull();
    req.flush({
      exitoso: true,
      mensajeUsuario: 'Coordinador aprovisionado sin programa.',
      datos: {
        id: 'coord-sin-prog',
        ...component.formData,
        programaAcademico: 'Sin Programa Asignado',
        totalDocentes: 0,
        totalGrupos: 0,
      },
    });

    const getReq = http.expectOne(`${environment.apiUrl}/decano/coordinadores`);
    expect(getReq.request.method).toBe('GET');
    getReq.flush({
      exitoso: true,
      datos: [
        ...mockCoordinadores,
        {
          id: 'coord-sin-prog',
          ...component.formData,
          programaAcademico: 'Sin Programa Asignado',
          totalDocentes: 0,
          totalGrupos: 0,
        },
      ],
    });

    expect(component.coordinadores().some((c) => c.id === 'coord-sin-prog')).toBeTrue();
    expect(component.vistaActual()).toBe('LISTA');
    expect(toastService.success).toHaveBeenCalled();
  });
});
