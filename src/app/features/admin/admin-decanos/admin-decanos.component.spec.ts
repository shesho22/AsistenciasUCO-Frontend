import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AdminDecanosComponent } from './admin-decanos.component';
import { AdminManagementService } from '../../../core/services/admin-management.service';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { TeacherService } from '../../../core/services/teacher.service';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { environment } from '../../../../environments/environment';
import { UserPickerItem } from '../../../shared/components/user-picker-modal/user-picker-modal.component';

describe('AdminDecanosComponent', () => {
  let fixture: ComponentFixture<AdminDecanosComponent>;
  let component: AdminDecanosComponent;
  let adminService: AdminManagementService;
  let toastService: jasmine.SpyObj<ToastService>;
  let http: HttpTestingController;

  const mockDecanos = [
    {
      id: 'dec-1',
      idUsuario: 'usr-1',
      numeroIdentificacion: '1017000001',
      primerNombre: 'Roberto',
      segundoNombre: 'Carlos',
      primerApellido: 'Gómez',
      segundoApellido: 'Pérez',
      nombres: 'Roberto Carlos',
      apellidos: 'Gómez Pérez',
      nombreCompleto: 'Roberto Carlos Gómez Pérez',
      correo: 'rgomez@uco.edu.co',
      facultad: 'Facultad de Ingeniería',
      idFacultad: 'fac-1',
      telefono: '123456',
      fechaAsignacion: '2026-01-01',
      estado: 'ACTIVO' as const,
      estaActivoDecano: true,
    },
    {
      id: 'dec-2',
      idUsuario: 'usr-2',
      numeroIdentificacion: '1017000002',
      primerNombre: 'María',
      primerApellido: 'Zapata',
      nombres: 'María',
      apellidos: 'Zapata',
      nombreCompleto: 'María Zapata',
      correo: 'mzapata@uco.edu.co',
      facultad: 'Facultad de Ciencias de la Salud',
      idFacultad: 'fac-2',
      telefono: '',
      fechaAsignacion: '2026-02-01',
      estado: 'INACTIVO' as const,
      estaActivoDecano: false,
    },
  ];

  const mockTiposDoc = [
    { id: 'tipo-1', tipoIdentificacion: 'CC', nombre: 'Cédula de Ciudadanía', codigo: 'CC', estado: 'ACTIVO' as const },
    { id: 'tipo-2', tipoIdentificacion: 'CE', nombre: 'Cédula de Extranjería', codigo: 'CE', estado: 'ACTIVO' as const },
  ];

  const mockFacultades = [
    { id: 'fac-1', codigo: 'ING', nombre: 'Facultad de Ingeniería', estado: 'ACTIVO' as const },
    { id: 'fac-2', codigo: 'SAL', nombre: 'Facultad de Ciencias de la Salud', estado: 'ACTIVO' as const },
  ];

  beforeEach(() => {
    const toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    TestBed.configureTestingModule({
      imports: [AdminDecanosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toastSpy },
        { provide: TeacherService, useValue: { getAllTeachers: () => of([]) } },
        { provide: CoordinatorManagementService, useValue: { getDocentes: () => of({ exitoso: true, datos: [] }) } },
      ],
    });

    adminService = TestBed.inject(AdminManagementService);
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
    http = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(AdminDecanosComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    http.verify();
  });

  function satisfyInitRequests() {
    const reqTipos = http.expectOne(`${environment.apiUrl}/tipos-identificacion`);
    reqTipos.flush(mockTiposDoc);

    const reqFac = http.expectOne(`${environment.apiUrl}/admin/facultades`);
    reqFac.flush({ exitoso: true, datos: mockFacultades });

    const reqDec = http.expectOne(`${environment.apiUrl}/admin/decanos`);
    reqDec.flush({ exitoso: true, datos: mockDecanos });
  }

  it('debe crearse y cargar datos iniciales correctamente', () => {
    fixture.detectChanges();
    satisfyInitRequests();

    expect(component).toBeTruthy();
    expect(component.decanos().length).toBe(2);
    expect(component.facultades().length).toBe(2);
    expect(component.tiposIdentificacion().length).toBe(2);
    expect(component.isLoading()).toBeFalse();
  });

  it('maneja errores en cargarFacultades, cargarTiposIdentificacion y cargarDecanos', () => {
    spyOn(console, 'warn');
    fixture.detectChanges();

    const reqTipos = http.expectOne(`${environment.apiUrl}/tipos-identificacion`);
    reqTipos.error(new ProgressEvent('Network error'));

    const reqFac = http.expectOne(`${environment.apiUrl}/admin/facultades`);
    reqFac.error(new ProgressEvent('Network error'));

    const reqDec = http.expectOne(`${environment.apiUrl}/admin/decanos`);
    reqDec.error(new ProgressEvent('Network error'));

    expect(console.warn).toHaveBeenCalledWith('Usando catálogo local de tipos de documento.');
    expect(console.warn).toHaveBeenCalledWith('Usando catálogo local de facultades.');
    // F-ADM-010: el mensaje ya no es un texto fijo; sin respuesta HTTP se usa el mensaje semántico de red.
    expect(toastService.error).toHaveBeenCalledWith('No fue posible conectar con el servidor. Verifique su conexión de red.');
    expect(component.isLoading()).toBeFalse();
  });

  it('onTipoIdentificacionChange actualiza tipoIdentificacion correctamente', () => {
    fixture.detectChanges();
    satisfyInitRequests();

    const eventFound = { target: { value: 'tipo-2' } } as unknown as Event;
    component.onTipoIdentificacionChange(eventFound);
    expect(component.formData.tipoIdentificacion).toBe('CE');
    expect(component.formData.tipoIdentificacionId).toBe('tipo-2');

    const eventNotFound = { target: { value: 'inexistente' } } as unknown as Event;
    component.onTipoIdentificacionChange(eventNotFound);
    expect(component.formData.tipoIdentificacion).toBe('CE');
  });

  it('filteredDecanos filtra por todos los campos soportados y por estado', () => {
    fixture.detectChanges();
    satisfyInitRequests();

    const triggerFilter = () => component.decanos.set([...component.decanos()]);

    component.searchQuery = 'roberto';
    component.selectedEstado = 'TODOS';
    triggerFilter();
    expect(component.filteredDecanos().length).toBe(1);

    component.searchQuery = 'carlos';
    triggerFilter();
    expect(component.filteredDecanos().length).toBe(1);

    component.searchQuery = 'zapata';
    triggerFilter();
    expect(component.filteredDecanos().length).toBe(1);

    component.searchQuery = 'ingeniería';
    triggerFilter();
    expect(component.filteredDecanos().length).toBe(1);

    component.searchQuery = '1017000002';
    triggerFilter();
    expect(component.filteredDecanos().length).toBe(1);

    component.searchQuery = '';
    component.selectedEstado = 'INACTIVO';
    triggerFilter();
    expect(component.filteredDecanos().length).toBe(1);
    expect(component.filteredDecanos()[0].id).toBe('dec-2');

    component.selectedEstado = 'ACTIVO';
    triggerFilter();
    expect(component.filteredDecanos().length).toBe(1);
    expect(component.filteredDecanos()[0].id).toBe('dec-1');
  });

  it('toggleEstado cambia el estado del decano exitosamente', () => {
    fixture.detectChanges();
    satisfyInitRequests();

    component.toggleEstado(mockDecanos[0]);
    const req = http.expectOne(`${environment.apiUrl}/admin/decanos/dec-1/toggle`);
    expect(req.request.method).toBe('PATCH');

    const updated = { ...mockDecanos[0], estado: 'INACTIVO' as const, estaActivoDecano: false };
    req.flush({ exitoso: true, datos: updated, mensajeUsuario: 'Decano desactivado.' });

    expect(toastService.success).toHaveBeenCalledWith('Decano desactivado.');
    expect(component.decanos().find((d) => d.id === 'dec-1')?.estado).toBe('INACTIVO');
  });

  it('A2-F-03 el toggle refleja el estado que devuelve el backend (DecanoItemDTO) en la tarjeta', () => {
    fixture.detectChanges();
    satisfyInitRequests();

    component.toggleEstado(mockDecanos[0]);
    const req = http.expectOne(`${environment.apiUrl}/admin/decanos/dec-1/toggle`);
    // El backend responde con el DTO del decano sin el campo `estado` de presentacion.
    const { estado: _estado, ...dto } = { ...mockDecanos[0], estaActivoDecano: false };
    req.flush({ exitoso: true, datos: dto, mensajeUsuario: 'Se actualizó el estado del decano.' });

    expect(toastService.success).toHaveBeenCalledWith('Se actualizó el estado del decano.');
    const tarjeta = component.decanos().find((d) => d.id === 'dec-1');
    expect(tarjeta?.estaActivoDecano).toBeFalse();
    expect(tarjeta?.estado).toBe('INACTIVO');

    component.toggleEstado(tarjeta!);
    http.expectOne(`${environment.apiUrl}/admin/decanos/dec-1/toggle`).flush({
      exitoso: true,
      datos: { ...dto, estaActivoDecano: true },
      mensajeUsuario: 'Se actualizó el estado del decano.',
    });
    expect(component.decanos().find((d) => d.id === 'dec-1')?.estado).toBe('ACTIVO');
  });

  it('A2-F-03 un 409 al desactivar muestra el message del backend y no cambia la tarjeta', () => {
    fixture.detectChanges();
    satisfyInitRequests();

    component.toggleEstado(mockDecanos[0]);
    http
      .expectOne(`${environment.apiUrl}/admin/decanos/dec-1/toggle`)
      .flush(
        { message: 'No se puede desactivar al decano de una facultad con programas activos.' },
        { status: 409, statusText: 'Conflict' }
      );

    expect(toastService.error).toHaveBeenCalledWith('No se puede desactivar al decano de una facultad con programas activos.');
    expect(component.decanos().find((d) => d.id === 'dec-1')?.estado).toBe('ACTIVO');
  });

  it('toggleEstado notifica error cuando la llamada a la api falla', () => {
    fixture.detectChanges();
    satisfyInitRequests();

    component.toggleEstado(mockDecanos[0]);
    const req = http.expectOne(`${environment.apiUrl}/admin/decanos/dec-1/toggle`);
    req.flush({ message: 'Error al cambiar estado' }, { status: 500, statusText: 'Server Error' });

    expect(toastService.error).toHaveBeenCalled();
  });

  it('abrirFormularioRegistro, volverALista y onNumeroIdentificacionInput funcionan como se espera', () => {
    fixture.detectChanges();
    satisfyInitRequests();

    component.abrirFormularioRegistro();
    expect(component.vistaActual()).toBe('REGISTRO');
    expect(component.formData.numeroIdentificacion).toBe('');

    component.onNumeroIdentificacionInput({ target: { value: '102030ABC-40' } } as unknown as Event);
    expect(component.formData.numeroIdentificacion).toBe('10203040');

    component.volverALista();
    expect(component.vistaActual()).toBe('LISTA');
  });

  describe('validaciones de guardarDecano', () => {
    beforeEach(() => {
      fixture.detectChanges();
      satisfyInitRequests();
      component.abrirFormularioRegistro();
    });

    it('valida tipo de identificación obligatorio', () => {
      component.formData.tipoIdentificacionId = '';
      component.guardarDecano();
      expect(toastService.warning).toHaveBeenCalledWith('El campo Tipo de Documento es obligatorio.');
    });

    it('valida número de identificación válido', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '123';
      component.guardarDecano();
      expect(toastService.warning).toHaveBeenCalled();
    });

    it('valida primer nombre obligatorio', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = '';
      component.guardarDecano();
      expect(toastService.warning).toHaveBeenCalledWith('El campo Primer Nombre es obligatorio.');
    });

    it('valida primer apellido obligatorio', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = 'Ana';
      component.formData.primerApellido = '';
      component.guardarDecano();
      expect(toastService.warning).toHaveBeenCalledWith('El campo Primer Apellido es obligatorio.');
    });

    it('valida correo institucional obligatorio y válido', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = 'Ana';
      component.formData.primerApellido = 'Mora';
      component.formData.correo = 'correo-no-valido';
      component.guardarDecano();
      expect(toastService.warning).toHaveBeenCalled();
    });

    it('valida contraseña obligatoria', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = 'Ana';
      component.formData.primerApellido = 'Mora';
      component.formData.correo = 'ana.mora@uco.edu.co';
      component.formData.password = '';
      component.guardarDecano();
      expect(toastService.warning).toHaveBeenCalledWith('La contraseña inicial de acceso es obligatoria.');
    });

    it('no valida longitud mínima de 12 caracteres en cliente (política delegada al backend, F-ADM-011)', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = 'Ana';
      component.formData.primerApellido = 'Mora';
      component.formData.correo = 'ana.mora@uco.edu.co';
      component.formData.password = 'Pass123!';
      component.guardarDecano();
      // No debe advertir por longitud de 12 caracteres en cliente:
      expect(toastService.warning).not.toHaveBeenCalledWith('La contraseña inicial debe tener mínimo 12 caracteres según las políticas de Keycloak.');
      const req = http.expectOne(`${environment.apiUrl}/admin/decanos`);
      expect(req.request.method).toBe('POST');
      req.flush({ exitoso: true, datos: { ...mockDecanos[0], id: 'dec-nuevo' } });

      const reqDecReload = http.expectOne(`${environment.apiUrl}/admin/decanos`);
      reqDecReload.flush({ exitoso: true, datos: mockDecanos });

      const reqFacReload = http.expectOne(`${environment.apiUrl}/admin/facultades`);
      reqFacReload.flush({ exitoso: true, datos: mockFacultades });
    });

    it('no utiliza GUID quemado ni CC como fallback cuando el catálogo está vacío (F-ADM-011)', () => {
      component.tiposIdentificacion.set([]);
      component.abrirFormularioRegistro();
      expect(component.formData.tipoIdentificacionId).not.toContain('A1B2C3D4-0000-0000-0000-000000000001');
      expect(component.formData.tipoIdentificacion).not.toBe('CC');
    });

    it('F3-ADM-03: la tarjeta titula con el nombre completo, no muestra el GUID y no calcula DEC-{{numeroIdentificacion}}', () => {
      component.volverALista();
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const titulos = Array.from(el.querySelectorAll('h3')).map((h) => h.textContent!.trim());
      expect(titulos).toContain('Roberto Carlos Gómez Pérez');
      expect(el.innerHTML).not.toContain('DEC-1017000001');
      expect(el.textContent).not.toContain('dec-1');
    });

    it('guarda exitosamente el decano y actualiza la lista', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = 'Carlos';
      component.formData.segundoNombre = 'Andrés';
      component.formData.primerApellido = 'Zapata';
      component.formData.segundoApellido = 'Mejía';
      component.formData.correo = 'carlos.zapata@uco.edu.co';
      component.formData.password = 'ClaveSegura2026#';

      component.guardarDecano();

      const reqPost = http.expectOne(`${environment.apiUrl}/admin/decanos`);
      expect(reqPost.request.method).toBe('POST');
      expect(reqPost.request.body.primerNombre).toBe('Carlos');
      expect(reqPost.request.body.idFacultad).toBeNull();

      reqPost.flush({ exitoso: true, mensajeUsuario: 'Decano registrado exitosamente.' });

      const reqDecReload = http.expectOne(`${environment.apiUrl}/admin/decanos`);
      reqDecReload.flush({ exitoso: true, datos: mockDecanos });

      const reqFacReload = http.expectOne(`${environment.apiUrl}/admin/facultades`);
      reqFacReload.flush({ exitoso: true, datos: mockFacultades });

      expect(toastService.success).toHaveBeenCalledWith('Decano registrado exitosamente.');
      expect(component.vistaActual()).toBe('LISTA');
    });

    it('tras registrar un decano consulta y muestra el estado de acceso real (pendiente, sin declarar acceso)', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = 'Carlos';
      component.formData.primerApellido = 'Zapata';
      component.formData.correo = 'carlos.zapata@uco.edu.co';
      component.formData.password = 'ClaveSegura2026#';

      component.guardarDecano();
      http.expectOne(`${environment.apiUrl}/admin/decanos`).flush({ exitoso: true, mensajeUsuario: 'Decano registrado exitosamente.' });
      http.expectOne(`${environment.apiUrl}/admin/decanos`).flush({ exitoso: true, datos: mockDecanos });
      http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({ exitoso: true, datos: mockFacultades });

      fixture.detectChanges();
      fixture.detectChanges();
      const consulta = http.expectOne(`${environment.apiUrl}/identidad/cuentas/acceso/consultas`);
      expect(consulta.request.method).toBe('POST');
      expect(consulta.request.body).toEqual({ correo: 'carlos.zapata@uco.edu.co' });
      consulta.flush({
        exitoso: true,
        datos: { usuario: 'u-9', estado: 'PENDIENTE_SINCRONIZACION', detalle: 'DECANO: perfil por asignar', roles: [] },
      });
      fixture.detectChanges();

      const panel = fixture.nativeElement.querySelector('[data-testid="account-access-status"]') as HTMLElement;
      expect(panel.textContent).toContain('PENDIENTE DE SINCRONIZACIÓN');
      expect(panel.textContent).not.toContain('ACTIVA');
    });

  it('bloquea el doble clic y libera el formulario tras el primer alta', () => {
    component.abrirFormularioRegistro();
    component.formData.tipoIdentificacionId = 'tipo-1';
    component.formData.numeroIdentificacion = '1020304050';
    component.formData.primerNombre = 'Carlos';
    component.formData.primerApellido = 'Zapata';
    component.formData.correo = 'carlos.zapata@uco.edu.co';
    component.formData.password = 'ClaveSegura2026#';

    component.guardarDecano();
    component.guardarDecano();

    const posts = http.match(`${environment.apiUrl}/admin/decanos`);
    expect(posts.length).toBe(1);
    expect(component.isSubmitting()).toBeTrue();
    posts[0].flush({ exitoso: true, mensajeUsuario: 'Decano registrado exitosamente.' });
    http.expectOne(`${environment.apiUrl}/admin/decanos`).flush({ exitoso: true, datos: [
      ...mockDecanos,
      { ...mockDecanos[0], id: 'dec-nuevo', numeroIdentificacion: '1020304050', correo: 'carlos.zapata@uco.edu.co' },
    ] });
    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({ exitoso: true, datos: mockFacultades });

    expect(component.isSubmitting()).toBeFalse();
  });

  it('ignora una respuesta antigua del listado de decanos', () => {
    component.cargarDecanos();
    component.cargarDecanos();

    const requests = http.match(`${environment.apiUrl}/admin/decanos`);
    expect(requests.length).toBe(2);
    const nuevoListado = [
      ...mockDecanos,
      { ...mockDecanos[0], id: 'dec-nuevo', numeroIdentificacion: '1020304050' },
    ];
    requests[1].flush({ exitoso: true, datos: nuevoListado });
    requests[0].flush({ exitoso: true, datos: mockDecanos });

    expect(component.decanos().some((decano) => decano.id === 'dec-nuevo')).toBeTrue();
  });

    it('muestra error cuando el guardado falla en el backend', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = 'Carlos';
      component.formData.primerApellido = 'Zapata';
      component.formData.correo = 'carlos.zapata@uco.edu.co';
      component.formData.password = 'ClaveSegura2026#';

      component.guardarDecano();

      const reqPost = http.expectOne(`${environment.apiUrl}/admin/decanos`);
      reqPost.flush({ message: 'Error de servidor' }, { status: 500, statusText: 'Server Error' });

      expect(toastService.error).toHaveBeenCalled();
    });
  });

  describe('modal de selección y nombramiento de decano desde directorio', () => {
    beforeEach(() => {
      fixture.detectChanges();
      satisfyInitRequests();
    });

    it('abrirModalSeleccionarDecano y onSolicitarRegistroNuevo alternan estados correctamente', () => {
      component.abrirModalSeleccionarDecano();
      expect(component.isPickerModalOpen()).toBeTrue();

      component.onSolicitarRegistroNuevo();
      expect(component.isPickerModalOpen()).toBeFalse();
      expect(component.vistaActual()).toBe('REGISTRO');
    });

    it('onDecanoSeleccionadoDelDirectorio avisa si el usuario ya es decano', () => {
      const existingUser: UserPickerItem = {
        id: 'usr-1',
        numeroIdentificacion: '1017000001',
        nombres: 'Roberto Carlos',
        apellidos: 'Gómez Pérez',
        correo: 'rgomez@uco.edu.co',
      };

      component.onDecanoSeleccionadoDelDirectorio(existingUser);
      expect(toastService.info).toHaveBeenCalledWith('El profesional Roberto Carlos Gómez Pérez ya está nombrado como Decano.');
    });

    it('onDecanoSeleccionadoDelDirectorio precarga datos cuando es un nuevo decano', () => {
      const newUser: UserPickerItem = {
        id: 'usr-nuevo',
        numeroIdentificacion: '1099887766',
        primerNombre: 'Esteban',
        segundoNombre: 'David',
        primerApellido: 'López',
        segundoApellido: 'Restrepo',
        nombres: 'Esteban David',
        apellidos: 'López Restrepo',
        correo: 'esteban.lopez@uco.edu.co',
        tipoIdentificacion: 'CC',
      };

      component.onDecanoSeleccionadoDelDirectorio(newUser);

      expect(component.vistaActual()).toBe('REGISTRO');
      expect(component.formData.numeroIdentificacion).toBe('1099887766');
      expect(component.formData.primerNombre).toBe('Esteban');
      expect(component.formData.primerApellido).toBe('López');
      expect(component.formData.correo).toBe('esteban.lopez@uco.edu.co');
      expect(component.formData.password).toBe('');
      expect(toastService.info).toHaveBeenCalled();
    });
  });

  it("HU159: el administrador corrige los datos del decano, con aviso si la cuenta queda pendiente", () => {
    fixture.detectChanges();
    satisfyInitRequests();
    const decano = component.decanos()[0];
    const actual = component.identidadDe(decano);
    expect(actual.numeroIdentificacion).toBe(decano.numeroIdentificacion);

    component.decanoACorregir.set(decano);
    component.corregirDecano(decano, { primerNombre: "Luis", segundoNombre: "", primerApellido: "Ruiz", segundoApellido: "", motivo: "Tilde" });
    const put = http.expectOne(`${environment.apiUrl}/admin/decanos/${decano.id}/identidad`);
    expect(put.request.method).toBe("PUT");
    put.flush({ exitoso: true, datos: { idRegistro: decano.id, sincronizacionIdentidad: "PENDIENTE", mensajeUsuario: "Pendiente" } });
    http.expectOne(`${environment.apiUrl}/admin/decanos`).flush({ exitoso: true, datos: mockDecanos });

    expect(toastService.warning).toHaveBeenCalledWith("Pendiente");
    expect(component.decanoACorregir()).toBeNull();
  });

  it("HU159: un rechazo del backend deja el modal abierto con el error", () => {
    fixture.detectChanges();
    satisfyInitRequests();
    const decano = component.decanos()[0];
    component.decanoACorregir.set(decano);
    component.corregirDecano(decano, { primerNombre: "Luis", segundoNombre: "", primerApellido: "Ruiz", segundoApellido: "", motivo: "x" });
    http.expectOne(`${environment.apiUrl}/admin/decanos/${decano.id}/identidad`).flush({ exitoso: false }, { status: 409, statusText: "Conflict" });

    expect(component.errorCorreccion()).toBeTruthy();
    expect(component.decanoACorregir()).not.toBeNull();
    component.cerrarCorreccion();
    expect(component.decanoACorregir()).toBeNull();
  });

  it('HU171: permite abrir el módulo de carga masiva de decanos y recarga al completar', () => {
    fixture.detectChanges();
    satisfyInitRequests();

    expect(component.mostrarCargaMasiva()).toBeFalse();
    expect(fixture.nativeElement.querySelector('app-carga-masiva-usuarios')).toBeNull();

    // Abrir modulo
    component.mostrarCargaMasiva.set(true);
    fixture.detectChanges();

    const cargaComp = fixture.nativeElement.querySelector('app-carga-masiva-usuarios');
    expect(cargaComp).not.toBeNull();
    expect(cargaComp.getAttribute('destino')).toBe('DECANO');

    // Emitir cargaCompletada -> debe recargar lista de decanos
    component.onCargaMasivaCompletada();
    const reqDec = http.expectOne(`${environment.apiUrl}/admin/decanos`);
    expect(reqDec.request.method).toBe('GET');
    reqDec.flush({ exitoso: true, datos: mockDecanos });
  });

  describe('UX densidad: cabecera con una accion primaria', () => {
    function abrirMenu(): void {
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="action-menu-trigger"]')!.click();
      fixture.detectChanges();
    }

    it('muestra "Nombrar" como unica accion visible mas el menu "Mas"', () => {
      fixture.detectChanges();
      satisfyInitRequests();
      fixture.detectChanges();
      const cab = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="acciones-encabezado"]') as HTMLElement;
      expect(cab.querySelectorAll('button').length).toBe(2);
      expect(cab.textContent).toContain('Nombrar');
      expect(cab.textContent).not.toContain('Carga Masiva');
    });

    it('"Carga masiva CSV" y "Registrar nuevo" estan en el menu y ejecutan su accion', () => {
      fixture.detectChanges();
      satisfyInitRequests();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      abrirMenu();
      (el.querySelector('[data-testid="accion-carga-masiva"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(component.mostrarCargaMasiva()).toBeTrue();
      component.mostrarCargaMasiva.set(false);
      fixture.detectChanges();
      abrirMenu();
      (el.querySelector('[data-testid="accion-registrar-nuevo"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(component.vistaActual()).toBe('REGISTRO');
    });
  });
});
