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
    http.match((r) => r.url === `${environment.apiUrl}/decano/programas`).forEach((r) =>
      r.flush({
        exitoso: true,
        datos: [{ id: '7d0f6a52-0000-4000-8000-000000000001', nombre: 'Ingeniería de Sistemas', nombreFacultad: 'Facultad de Ingeniería' }],
        total: 1,
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

  it('T-FE-06 el selector de programa muestra los programas reales del decano (sin ids quemados)', () => {
    flushInitialRequests();
    expect(component.programasAcademicos().map((p) => ({ id: p.id, nombre: p.nombre }))).toEqual([
      { id: '7d0f6a52-0000-4000-8000-000000000001', nombre: 'Ingeniería de Sistemas' },
    ]);
    expect(component.programasAcademicos().some((p) => p.id.startsWith('PROG-'))).toBeFalse();
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

  // HU121-HU122 (CONTRACT §4, D6): antes `toggleEstado` enviaba PATCH …/toggle al instante (ruta inexistente en el
  // backend). Ahora abre una confirmación y, al confirmar, envía PATCH …/estado con el estado explícito.
  function expectRecarga(lista: CoordinadorItem[] = mockCoordinadores) {
    http.expectOne(`${environment.apiUrl}/decano/coordinadores`).flush({ exitoso: true, datos: lista });
  }

  const resultadoOk = { exitoso: true, datos: { idCoordinador: 'coord-1', sincronizacionIdentidad: 'OK', mensajeUsuario: null } };

  it('toggleEstado solo abre la confirmación y no envía ninguna petición', () => {
    flushInitialRequests();

    component.toggleEstado(mockCoordinadores[0]);

    expect(component.coordinadorParaCambioEstado()).toEqual(mockCoordinadores[0]);
    http.expectNone(`${environment.apiUrl}/decano/coordinadores/coord-1/estado`);
    http.expectNone(`${environment.apiUrl}/decano/coordinadores/coord-1/toggle`);
  });

  it('confirmarCambioEstado desactiva a un coordinador activo con PATCH …/estado y recarga la lista', () => {
    flushInitialRequests();
    component.toggleEstado(mockCoordinadores[0]);

    component.confirmarCambioEstado();

    const req = http.expectOne(`${environment.apiUrl}/decano/coordinadores/coord-1/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estaActivo: false });
    req.flush(resultadoOk);
    expectRecarga();

    expect(toastService.success).toHaveBeenCalled();
    expect(component.coordinadorParaCambioEstado()).toBeNull();
  });

  it('confirmarCambioEstado reactiva a un coordinador inactivo con estaActivo=true', () => {
    flushInitialRequests();
    component.toggleEstado(mockCoordinadores[1]);

    component.confirmarCambioEstado();

    const req = http.expectOne(`${environment.apiUrl}/decano/coordinadores/coord-2/estado`);
    expect(req.request.body).toEqual({ estaActivo: true });
    req.flush({ exitoso: true, datos: { idCoordinador: 'coord-2', sincronizacionIdentidad: 'OK', mensajeUsuario: null } });
    expectRecarga();
  });

  it('cancelarCambioEstado cierra la confirmación sin enviar peticiones', () => {
    flushInitialRequests();
    component.toggleEstado(mockCoordinadores[0]);

    component.cancelarCambioEstado();

    expect(component.coordinadorParaCambioEstado()).toBeNull();
    http.expectNone(`${environment.apiUrl}/decano/coordinadores/coord-1/estado`);
  });

  it('con identidad pendiente muestra la advertencia del backend como warning', () => {
    flushInitialRequests();
    component.toggleEstado(mockCoordinadores[0]);
    component.confirmarCambioEstado();

    http.expectOne(`${environment.apiUrl}/decano/coordinadores/coord-1/estado`).flush({
      exitoso: true,
      datos: { idCoordinador: 'coord-1', sincronizacionIdentidad: 'PENDIENTE', mensajeUsuario: 'El cambio se guardó; la cuenta se sincronizará pronto.' },
    });
    expectRecarga();

    expect(toastService.warning).toHaveBeenCalledWith('El cambio se guardó; la cuenta se sincronizará pronto.');
    expect(toastService.success).not.toHaveBeenCalled();
  });

  it('un 409 del backend se muestra tal cual, sin interpretar su texto', () => {
    flushInitialRequests();
    component.toggleEstado(mockCoordinadores[0]);
    component.confirmarCambioEstado();

    http.expectOne(`${environment.apiUrl}/decano/coordinadores/coord-1/estado`).flush(
      { message: 'No se puede desactivar al coordinador mientras tenga un programa activo a cargo.' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(toastService.error).toHaveBeenCalledWith('No se puede desactivar al coordinador mientras tenga un programa activo a cargo.');
    expect(component.coordinadorParaCambioEstado()).toBeNull();
  });

  it('abrirEdicion selecciona al coordinador y cerrarEdicion lo limpia', () => {
    flushInitialRequests();

    component.abrirEdicion(mockCoordinadores[0]);
    expect(component.coordinadorEnEdicion()).toEqual(mockCoordinadores[0]);

    component.cerrarEdicion();
    expect(component.coordinadorEnEdicion()).toBeNull();
  });

  it('guardarEdicion envía PUT con los datos editables, recarga y notifica', () => {
    flushInitialRequests();
    component.abrirEdicion(mockCoordinadores[0]);

    component.guardarEdicion({
      primerNombre: 'Carlos',
      segundoNombre: '',
      primerApellido: 'Ramírez',
      segundoApellido: '',
      correo: 'carlos.nuevo@uco.edu.co',
    });

    const req = http.expectOne(`${environment.apiUrl}/decano/coordinadores/coord-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.correo).toBe('carlos.nuevo@uco.edu.co');
    req.flush(resultadoOk);
    expectRecarga();

    expect(toastService.success).toHaveBeenCalled();
    expect(component.coordinadorEnEdicion()).toBeNull();
  });

  it('guardarEdicion con correo duplicado (409) muestra el mensaje del backend y conserva el formulario abierto', () => {
    flushInitialRequests();
    component.abrirEdicion(mockCoordinadores[0]);

    component.guardarEdicion({
      primerNombre: 'Carlos',
      segundoNombre: '',
      primerApellido: 'Ramírez',
      segundoApellido: '',
      correo: 'agomez@uco.edu.co',
    });

    http.expectOne(`${environment.apiUrl}/decano/coordinadores/coord-1`).flush(
      { message: 'La dirección de correo electrónico ya se encuentra registrada.' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(toastService.error).toHaveBeenCalledWith('La dirección de correo electrónico ya se encuentra registrada.');
    expect(component.coordinadorEnEdicion()).toEqual(mockCoordinadores[0]);
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

    // Con programa pero sin contraseña
    component.formData.programaAcademico = 'Ingeniería de Sistemas';
    component.formData.password = '';
    component.guardarCoordinador();
    expect(toastService.warning).toHaveBeenCalledWith('El campo Contraseña Inicial IAM es obligatorio.');

    // Con contraseña inválida (sin cumplir política o con documento)
    component.formData.password = '123';
    component.guardarCoordinador();
    expect(toastService.warning).toHaveBeenCalled();
  });

  it('tras registrar un coordinador consulta y muestra el estado de acceso real (pendiente, sin declarar acceso)', () => {
    flushInitialRequests();
    component.abrirFormularioRegistro();
    component.formData.numeroIdentificacion = '1017555444';
    component.formData.primerNombre = 'Jorge';
    component.formData.primerApellido = 'Henao';
    component.formData.correo = 'jorge.henao@uco.edu.co';
    component.formData.programaAcademico = 'Ingeniería de Sistemas';
    component.formData.password = 'ClaveSegura2026!';

    component.guardarCoordinador();
    http.expectOne(`${environment.apiUrl}/decano/coordinadores`).flush({ exitoso: true, mensajeUsuario: 'Coordinador creado.', datos: {} });
    http.expectOne(`${environment.apiUrl}/decano/coordinadores`).flush({ exitoso: true, datos: mockCoordinadores });

    fixture.detectChanges();
    fixture.detectChanges();
    const consulta = http.expectOne(`${environment.apiUrl}/identidad/cuentas/acceso/consultas`);
    expect(consulta.request.body).toEqual({ correo: 'jorge.henao@uco.edu.co' });
    consulta.flush({
      exitoso: true,
      datos: { usuario: 'u-9', estado: 'PENDIENTE_SINCRONIZACION', detalle: 'COORDINADOR: perfil por asignar', roles: [] },
    });
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('[data-testid="account-access-status"]') as HTMLElement;
    expect(panel.textContent).toContain('PENDIENTE DE SINCRONIZACIÓN');
    expect(panel.textContent).not.toContain('ACTIVA');
  });

  it('guardarCoordinador envía POST y agrega el nuevo coordinador a la lista', () => {
    flushInitialRequests();
    component.abrirFormularioRegistro();
    component.formData.numeroIdentificacion = '1017555444';
    component.formData.primerNombre = 'Jorge';
    component.formData.primerApellido = 'Henao';
    component.formData.correo = 'jorge.henao@uco.edu.co';
    component.formData.programaAcademico = 'Ingeniería de Sistemas';
    component.formData.password = 'ClaveSegura2026!';

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

  it('bloquea el doble clic y libera el formulario tras el primer alta', () => {
    flushInitialRequests();
    component.abrirFormularioRegistro();
    component.formData.numeroIdentificacion = '1017555444';
    component.formData.primerNombre = 'Jorge';
    component.formData.primerApellido = 'Valencia';
    component.formData.correo = 'coordinador231@uco.edu.co';
    component.formData.programaAcademico = 'Ingeniería de Sistemas';
    component.formData.password = 'ClaveSegura2026!';

    component.guardarCoordinador();
    component.guardarCoordinador();

    const posts = http.match(`${environment.apiUrl}/decano/coordinadores`);
    expect(posts.length).toBe(1);
    expect(component.isSubmitting()).toBeTrue();
    posts[0].flush({ exitoso: true, mensajeUsuario: 'Coordinador creado.', datos: {} });
    http.expectOne(`${environment.apiUrl}/decano/coordinadores`).flush({ exitoso: true, datos: [
      ...mockCoordinadores,
      { ...mockCoordinadores[0], id: 'coord-nuevo', numeroIdentificacion: '1017555444', correo: 'coordinador231@uco.edu.co' },
    ] });

    expect(component.isSubmitting()).toBeFalse();
  });

  it('ignora una respuesta antigua del listado de coordinadores', () => {
    flushInitialRequests();
    component.cargarCoordinadores();
    component.cargarCoordinadores();

    const requests = http.match(`${environment.apiUrl}/decano/coordinadores`);
    expect(requests.length).toBe(2);
    const nuevoListado = [
      ...mockCoordinadores,
      { ...mockCoordinadores[0], id: 'coord-nuevo', numeroIdentificacion: '1017555444' },
    ];
    requests[1].flush({ exitoso: true, datos: nuevoListado });
    requests[0].flush({ exitoso: true, datos: mockCoordinadores });

    expect(component.coordinadores().some((coord) => coord.id === 'coord-nuevo')).toBeTrue();
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
    component.formData.password = 'ClaveSegura2026!';

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
