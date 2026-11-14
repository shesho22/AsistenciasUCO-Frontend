import { StudentRegistrationConfigService } from '../../../core/services/student-registration-config.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectorRef } from '@angular/core';
import { of } from 'rxjs';
import { TestRequest } from '@angular/common/http/testing';
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

  const mockInstituciones = [{ id: 'inst-1', nombre: 'Universidad Católica de Oriente' }];

  beforeEach(() => {
    const toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);

    TestBed.configureTestingModule({
      imports: [AdminDecanosComponent],
      providers: [
        provideHttpClient(withXhr()),
        // DEC-073: el formulario consulta el dominio institucional; aquí se fija sin pasar por HttpTestingController.
        { provide: StudentRegistrationConfigService, useValue: { getEmailDomain: () => of('@uco.edu.co') } },
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

    const reqInst = http.expectOne(`${environment.apiUrl}/admin/instituciones`);
    reqInst.flush({ exitoso: true, datos: mockInstituciones });

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

    http.expectOne(`${environment.apiUrl}/admin/instituciones`).error(new ProgressEvent('Network error'));

    const reqDec = http.expectOne(`${environment.apiUrl}/admin/decanos`);
    reqDec.error(new ProgressEvent('Network error'));

    expect(console.warn).toHaveBeenCalledWith('Usando catálogo local de tipos de documento.');
    expect(console.warn).toHaveBeenCalledWith('Usando catálogo local de facultades.');
    // F-ADM-010: el mensaje ya no es un texto fijo; sin respuesta HTTP se usa el mensaje semántico de red.
    expect(toastService.error).toHaveBeenCalledWith('No fue posible conectar con el servidor. Verifique su conexión de red.');
    expect(toastService.warning).toHaveBeenCalledWith('No fue posible conectar con el servidor. Verifique su conexión de red.');
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

    // DEC-073: formato de nombres y correo institucional del personal.
    it('DEC-073: rechaza nombres con números o signos antes de enviar', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = 'Ana2';
      component.formData.primerApellido = 'Mora';
      component.guardarDecano();
      expect(toastService.warning).toHaveBeenCalledWith(
        'El campo Primer Nombre solo admite letras, espacios, apóstrofo y guion (sin números ni otros signos).'
      );
      expect(component.errorNombrePersona('primerNombre')).toContain('solo admite letras');
      component.formData.primerNombre = 'Ana';
      component.formData.segundoApellido = '<b>x</b>';
      component.guardarDecano();
      expect(toastService.warning).toHaveBeenCalledWith(
        'El campo Segundo Apellido solo admite letras, espacios, apóstrofo y guion (sin números ni otros signos).'
      );
      http.expectNone(() => true);
    });

    it('DEC-073: rechaza un correo que no es institucional', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = 'Ana';
      component.formData.primerApellido = 'Mora';
      component.formData.correo = 'ana.mora@gmail.com';
      component.guardarDecano();
      expect(toastService.warning).toHaveBeenCalledWith('El correo debe ser institucional y terminar en @uco.edu.co.');
      expect(component.errorCorreo()).toBe('El correo debe ser institucional y terminar en @uco.edu.co.');
      expect(component.formularioValido()).toBeFalse();
    });

    it('DEC-073: el nombre de la facultad nueva no admite < > ni comillas', () => {
      component.modoFacultad.set('CREAR');
      component.facultadNueva.nombre = 'Facultad <script>';
      expect(component.errorNombreFacultad()).toContain('solo admite');
      expect(component.errorFacultad()).toContain('solo admite');
    });

    it('valida contraseña obligatoria', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = 'Ana';
      component.formData.primerApellido = 'Mora';
      component.formData.correo = 'ana.mora@uco.edu.co';
      component.formData.password = '';
      component.modoFacultad.set('SIN');
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
      component.modoFacultad.set('SIN');
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

      component.modoFacultad.set('SIN');
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

      component.modoFacultad.set('SIN');
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

    component.modoFacultad.set('SIN');
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

      component.modoFacultad.set('SIN');
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

    it('"Registrar nuevo" esta en el menu y abre el registro; ya no hay carga masiva (DEC-074)', () => {
      fixture.detectChanges();
      satisfyInitRequests();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      abrirMenu();
      // DEC-074: sin carga masiva por CSV; el personal se registra uno por uno.
      expect(el.querySelector('[data-testid="accion-carga-masiva"]')).toBeNull();
      (el.querySelector('[data-testid="accion-registrar-nuevo"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(component.vistaActual()).toBe('REGISTRO');
    });
  });
  describe('DEC-065: decano y facultad en un solo formulario', () => {
    function llenarDatosPersonales() {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = 'Carlos';
      component.formData.primerApellido = 'Zapata';
      component.formData.correo = 'carlos.zapata@uco.edu.co';
      component.formData.password = 'ClaveSegura2026#';
    }

    function responderExito(post: TestRequest) {
      post.flush({ exitoso: true, mensajeUsuario: 'Decano y facultad registrados.' });
      http.expectOne(`${environment.apiUrl}/admin/decanos`).flush({ exitoso: true, datos: mockDecanos });
      http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({ exitoso: true, datos: mockFacultades });
    }

    beforeEach(() => {
      fixture.detectChanges();
      satisfyInitRequests();
      component.abrirFormularioRegistro();
      fixture.detectChanges();
    });

    it('por defecto crea facultad nueva, preselecciona la única institución y retira el texto antiguo', () => {
      expect(component.modoFacultad()).toBe('CREAR');
      expect(component.facultadNueva.idInstitucion).toBe('inst-1');
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[data-testid="facultad-crear"]')).toBeTruthy();
      expect(el.textContent).not.toContain('La facultad se asigna posteriormente');
    });

    it('no preselecciona institución cuando hay varias y conserva la ya elegida', () => {
      component.cargarInstituciones();
      http.expectOne(`${environment.apiUrl}/admin/instituciones`).flush({
        exitoso: true,
        datos: [
          { id: 'inst-1', nombre: 'A' },
          { id: 'inst-2', nombre: 'B' },
        ],
      });
      component.facultadNueva.idInstitucion = '';
      component.abrirFormularioRegistro();
      expect(component.facultadNueva.idInstitucion).toBe('');
      component.facultadNueva.idInstitucion = 'inst-2';
      component['preseleccionarInstitucion']([{ id: 'inst-1', nombre: 'A' }]);
      expect(component.facultadNueva.idInstitucion).toBe('inst-2');
    });

    it('cada modo muestra su sección', () => {
      const el = fixture.nativeElement as HTMLElement;
      component.modoFacultad.set('VINCULAR');
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="facultad-vincular"]')).toBeTruthy();
      expect(el.querySelector('[data-testid="facultad-crear"]')).toBeNull();
      component.modoFacultad.set('SIN');
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="facultad-sin"]')).toBeTruthy();
    });

    it('errorNombreFacultad solo avisa con texto escrito fuera de 3 a 50 caracteres', () => {
      component.facultadNueva.nombre = '';
      expect(component.errorNombreFacultad()).toBe('');
      component.facultadNueva.nombre = 'ab';
      expect(component.errorNombreFacultad()).toContain('entre 3 y 50');
      component.facultadNueva.nombre = 'x'.repeat(51);
      expect(component.errorNombreFacultad()).toContain('entre 3 y 50');
      component.facultadNueva.nombre = 'Facultad de Derecho';
      expect(component.errorNombreFacultad()).toBe('');
    });

    it('errorFacultad valida cada modo', () => {
      component.facultadNueva.nombre = '';
      expect(component.errorFacultad()).toContain('obligatorio');
      component.facultadNueva.nombre = 'x'.repeat(51);
      expect(component.errorFacultad()).toContain('obligatorio');
      component.facultadNueva.nombre = 'Derecho';
      component.facultadNueva.idInstitucion = '';
      expect(component.errorFacultad()).toBe('Seleccione la institución de la facultad.');
      component.facultadNueva.idInstitucion = 'inst-1';
      expect(component.errorFacultad()).toBeNull();
      component.modoFacultad.set('VINCULAR');
      expect(component.errorFacultad()).toBe('Seleccione la facultad existente.');
      component.idFacultadExistente = 'fac-1';
      expect(component.errorFacultad()).toBeNull();
      component.modoFacultad.set('SIN');
      expect(component.errorFacultad()).toBeNull();
    });

    it('Guardar queda deshabilitado mientras el formulario sea inválido o haya una petición en curso', () => {
      const boton = () => fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(component.formularioValido()).toBeFalse();
      fixture.detectChanges();
      expect(boton().disabled).toBeTrue();

      llenarDatosPersonales();
      component.facultadNueva.nombre = 'Facultad de Derecho';
      expect(component.formularioValido()).toBeTrue();
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
      expect(boton().disabled).toBeFalse();

      component.isSubmitting.set(true);
      fixture.detectChanges();
      expect(boton().disabled).toBeTrue();
    });

    it('formularioValido exige cada dato personal', () => {
      llenarDatosPersonales();
      component.modoFacultad.set('SIN');
      expect(component.formularioValido()).toBeTrue();
      const rotos: Array<() => void> = [
        () => (component.formData.tipoIdentificacionId = ''),
        () => (component.formData.numeroIdentificacion = 'abc'),
        () => (component.formData.primerNombre = ' '),
        () => (component.formData.primerApellido = ''),
        () => (component.formData.correo = 'no-es-correo'),
        () => (component.formData.password = ''),
      ];
      for (const romper of rotos) {
        llenarDatosPersonales();
        romper();
        expect(component.formularioValido()).toBeFalse();
      }
    });

    it('modo CREAR envía facultadNueva con código e idFacultad nulo', () => {
      llenarDatosPersonales();
      component.facultadNueva = { nombre: '  Facultad de Derecho ', codigo: ' DER ', idInstitucion: 'inst-1' };
      component.guardarDecano();

      const post = http.expectOne(`${environment.apiUrl}/admin/decanos`);
      expect(post.request.body.idFacultad).toBeNull();
      expect(post.request.body.facultadNueva).toEqual({ nombre: 'Facultad de Derecho', codigo: 'DER', idInstitucion: 'inst-1' });
      responderExito(post);
      expect(toastService.success).toHaveBeenCalledWith('Decano y facultad registrados.');
      expect(component.vistaActual()).toBe('LISTA');
    });

    it('modo CREAR omite el código cuando está vacío', () => {
      llenarDatosPersonales();
      component.facultadNueva = { nombre: 'Derecho', codigo: '  ', idInstitucion: 'inst-1' };
      component.guardarDecano();
      const post = http.expectOne(`${environment.apiUrl}/admin/decanos`);
      expect(post.request.body.facultadNueva).toEqual({ nombre: 'Derecho', idInstitucion: 'inst-1' });
      responderExito(post);
    });

    it('modo VINCULAR envía idFacultad y facultadNueva nulo', () => {
      llenarDatosPersonales();
      component.modoFacultad.set('VINCULAR');
      component.idFacultadExistente = 'fac-2';
      component.guardarDecano();
      const post = http.expectOne(`${environment.apiUrl}/admin/decanos`);
      expect(post.request.body.idFacultad).toBe('fac-2');
      expect(post.request.body.facultadNueva).toBeNull();
      responderExito(post);
    });

    it('modo SIN envía ambos nulos', () => {
      llenarDatosPersonales();
      component.modoFacultad.set('SIN');
      component.guardarDecano();
      const post = http.expectOne(`${environment.apiUrl}/admin/decanos`);
      expect(post.request.body.idFacultad).toBeNull();
      expect(post.request.body.facultadNueva).toBeNull();
      responderExito(post);
    });

    it('no envía nada si la facultad es inválida y avisa el motivo', () => {
      llenarDatosPersonales();
      component.facultadNueva.nombre = '';
      component.guardarDecano();
      expect(toastService.warning).toHaveBeenCalledWith('El nombre de la facultad es obligatorio y debe tener entre 3 y 50 caracteres.');
      http.expectNone(`${environment.apiUrl}/admin/decanos`);
    });

    for (const caso of [
      { status: 400, message: 'El nombre de la facultad no es válido.' },
      { status: 404, message: 'La institución indicada no existe.' },
      { status: 409, message: 'Ya existe una facultad con ese nombre.' },
      { status: 500, message: 'Error interno del servidor.' },
    ]) {
      it(`ante ${caso.status} muestra el mensaje del backend sin cerrar el formulario`, () => {
        llenarDatosPersonales();
        component.facultadNueva.nombre = 'Derecho';
        component.guardarDecano();
        http
          .expectOne(`${environment.apiUrl}/admin/decanos`)
          .flush({ code: 'ERR', message: caso.message, correlationId: 'c' }, { status: caso.status, statusText: 'err' });
        expect(toastService.error).toHaveBeenCalledWith(caso.message);
        expect(component.vistaActual()).toBe('REGISTRO');
        expect(component.isSubmitting()).toBeFalse();
      });
    }
  });
});
