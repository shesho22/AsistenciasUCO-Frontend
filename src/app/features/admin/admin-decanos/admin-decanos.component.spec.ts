import { convertToParamMap } from '@angular/router';
import { StudentRegistrationConfigService } from '../../../core/services/student-registration-config.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectorRef } from '@angular/core';
import { of } from 'rxjs';
import { TestRequest } from '@angular/common/http/testing';
import { AdminDecanosComponent } from './admin-decanos.component';
import { ToastService } from '../../../shared/components/toast/toast.component';
import { CoordinatorManagementService } from '../../../core/services/coordinator-management.service';
import { environment } from '../../../../environments/environment';
import { UserPickerItem } from '../../../shared/components/user-picker-modal/user-picker-modal.component';

describe('AdminDecanosComponent', () => {
  let fixture: ComponentFixture<AdminDecanosComponent>;
  let component: AdminDecanosComponent;
  let toastService: jasmine.SpyObj<ToastService>;
  let http: HttpTestingController;

  const mockDecanos = [
    {
      id: 'dec-1',
      idUsuario: 'usr-1',
      tipoIdentificacion: 'CC',
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
        { provide: CoordinatorManagementService, useValue: { getDocentes: () => of({ exitoso: true, datos: [] }) } },
      ],
    });

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

  it('acceso rápido del panel: ?busqueda=<facultad> abre la lista ya filtrada por esa facultad', () => {
    (component as unknown as { route: unknown }).route = {
      snapshot: { queryParamMap: convertToParamMap({ busqueda: ' Facultad de Ingeniería ' }) },
    };
    fixture.detectChanges();
    satisfyInitRequests();

    expect(component.busqueda()).toBe('Facultad de Ingeniería');
    expect(component.filteredDecanos().every((d) => (d.facultad || d.nombreFacultad || '').includes('Ingeniería'))).toBeTrue();
  });

  it('sin ?busqueda la lista abre sin filtro', () => {
    fixture.detectChanges();
    satisfyInitRequests();

    expect(component.busqueda()).toBe('');
  });

  it('debe crearse y cargar datos iniciales correctamente', () => {
    fixture.detectChanges();
    satisfyInitRequests();

    expect(component).toBeTruthy();
    expect(component.decanos()).toHaveSize(2);
    expect(component.facultades()).toHaveSize(2);
    expect(component.tiposIdentificacion()).toHaveSize(2);
    expect(component.isLoading()).toBeFalse();
  });

  it('la tabla muestra el correo y el tipo de documento que entrega el backend, sin inventar ninguno', () => {
    fixture.detectChanges();
    satisfyInitRequests();
    fixture.detectChanges();

    const filas = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('tbody tr'));
    const filaConTipo = filas.find((f) => f.textContent?.includes('rgomez@uco.edu.co'));
    expect(filaConTipo?.textContent).toContain('CC 1017000001');
    const filaSinTipo = filas.find((f) => f.textContent?.includes('mzapata@uco.edu.co'));
    expect(filaSinTipo?.textContent).toContain('1017000002');
    expect(filaSinTipo?.textContent).not.toContain('CC 1017000002');
    expect(component.decanos()[1].tipoIdentificacion).toBeUndefined();
  });

  it('el decano sin correo muestra el guion y no un valor inventado', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/tipos-identificacion`).flush(mockTiposDoc);
    http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({ exitoso: true, datos: mockFacultades });
    http.expectOne(`${environment.apiUrl}/admin/instituciones`).flush({ exitoso: true, datos: mockInstituciones });
    http.expectOne(`${environment.apiUrl}/admin/decanos`).flush({
      exitoso: true, datos: [{ ...mockDecanos[1], correo: undefined }],
    });
    fixture.detectChanges();

    const fila = fixture.nativeElement.querySelector('tbody tr') as HTMLElement;
    expect(fila.textContent).toContain('—');
    expect(fila.textContent).not.toContain('CC');
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
    // Sin datos quemados: si falla el listado de facultades queda vacío y la pantalla lo indica.
    expect(component.facultades()).toEqual([]);
    expect(component.errorFacultades()).toBeTrue();
    // F-ADM-010: el mensaje ya no es un texto fijo; sin respuesta HTTP se usa el mensaje semántico de red.
    expect(toastService.error).toHaveBeenCalledWith('No fue posible conectar con el servidor. Verifique su conexión de red.');
    expect(toastService.warning).toHaveBeenCalledWith('No fue posible conectar con el servidor. Verifique su conexión de red.');
    expect(component.isLoading()).toBeFalse();
  });

  it('alCambiarDato resuelve el tipo de documento del catálogo e ignora uno inexistente', () => {
    fixture.detectChanges();
    satisfyInitRequests();

    component.alCambiarDato({ campo: 'tipoIdentificacionId', valor: 'tipo-2' });
    expect(component.formData.tipoIdentificacion).toBe('CE');
    expect(component.formData.tipoIdentificacionId).toBe('tipo-2');

    component.alCambiarDato({ campo: 'tipoIdentificacionId', valor: 'inexistente' });
    expect(component.formData.tipoIdentificacion).toBe('CE');
  });

  it('filteredDecanos filtra por todos los campos soportados y por estado', () => {
    fixture.detectChanges();
    satisfyInitRequests();

    const triggerFilter = () => component.decanos.set([...component.decanos()]);

    component.busqueda.set('roberto');
    component.estado.set('TODOS');
    triggerFilter();
    expect(component.filteredDecanos()).toHaveSize(1);

    component.busqueda.set('carlos');
    triggerFilter();
    expect(component.filteredDecanos()).toHaveSize(1);

    component.busqueda.set('zapata');
    triggerFilter();
    expect(component.filteredDecanos()).toHaveSize(1);

    component.busqueda.set('ingeniería');
    triggerFilter();
    expect(component.filteredDecanos()).toHaveSize(1);

    component.busqueda.set('1017000002');
    triggerFilter();
    expect(component.filteredDecanos()).toHaveSize(1);

    component.busqueda.set('');
    component.estado.set('INACTIVO');
    triggerFilter();
    expect(component.filteredDecanos()).toHaveSize(1);
    expect(component.filteredDecanos()[0].id).toBe('dec-2');

    component.estado.set('ACTIVO');
    triggerFilter();
    expect(component.filteredDecanos()).toHaveSize(1);
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

  it('abrirFormularioRegistro, volverALista y alCambiarDato funcionan como se espera', () => {
    fixture.detectChanges();
    satisfyInitRequests();

    component.abrirFormularioRegistro();
    expect(component.vistaActual()).toBe('REGISTRO');
    expect(component.formData.numeroIdentificacion).toBe('');

    component.alCambiarDato({ campo: 'numeroIdentificacion', valor: '10203040' });
    expect(component.formData.numeroIdentificacion).toBe('10203040');
    component.alCambiarDato({ campo: 'primerNombre', valor: 'Ana' });
    expect(component.formData.primerNombre).toBe('Ana');

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

    it('IDENT-002: registra al decano sin contraseña; la define al activar la cuenta', () => {
      component.formData.tipoIdentificacionId = 'tipo-1';
      component.formData.numeroIdentificacion = '1020304050';
      component.formData.primerNombre = 'Ana';
      component.formData.primerApellido = 'Mora';
      component.formData.correo = 'ana.mora@uco.edu.co';
      component.modoFacultad.set('SIN');
      expect(component.formularioValido()).toBeTrue();
      component.guardarDecano();
      expect(toastService.warning).not.toHaveBeenCalled();
      const req = http.expectOne(`${environment.apiUrl}/admin/decanos`);
      expect(req.request.method).toBe('POST');
      expect('password' in (req.request.body as Record<string, unknown>)).toBeFalse();
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

    it('F3-ADM-03: la fila titula con el nombre completo, no muestra el GUID y no calcula DEC-{{numeroIdentificacion}}', () => {
      component.volverALista();
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const titulos = Array.from(el.querySelectorAll('tbody td span.font-semibold')).map((h) => h.textContent!.trim());
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

    component.modoFacultad.set('SIN');
component.guardarDecano();
    component.guardarDecano();

    const posts = http.match(`${environment.apiUrl}/admin/decanos`);
    expect(posts).toHaveSize(1);
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
    expect(requests).toHaveSize(2);
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
        nombreCompleto: 'Roberto Carlos Gómez Pérez',
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
        nombreCompleto: 'Esteban David López Restrepo',
        correo: 'esteban.lopez@uco.edu.co',
        tipoIdentificacion: 'CC',
      };

      component.onDecanoSeleccionadoDelDirectorio(newUser);

      expect(component.vistaActual()).toBe('REGISTRO');
      expect(component.formData.numeroIdentificacion).toBe('1099887766');
      expect(component.formData.primerNombre).toBe('Esteban');
      expect(component.formData.primerApellido).toBe('López');
      expect(component.formData.correo).toBe('esteban.lopez@uco.edu.co');
      expect('password' in component.formData).toBeFalse();
      expect(toastService.info).toHaveBeenCalled();
    });
  });

  it("CIERRE-W1B: identidadDe toma los cuatro campos del backend y no parte nombres ni apellidos agrupados", () => {
    fixture.detectChanges();
    satisfyInitRequests();
    const base = component.decanos()[0];

    const completo = component.identidadDe({ ...base, primerNombre: "Ana", segundoNombre: "Lucía", primerApellido: "Mora", segundoApellido: "Paz" });
    expect(completo.primerNombre).toBe("Ana");
    expect(completo.segundoNombre).toBe("Lucía");
    expect(completo.primerApellido).toBe("Mora");
    expect(completo.segundoApellido).toBe("Paz");

    const sinCampos = component.identidadDe({ ...base, nombres: "Ana Lucía", apellidos: "Mora Paz", primerNombre: undefined, segundoNombre: undefined, primerApellido: undefined, segundoApellido: undefined });
    expect(sinCampos.primerNombre).toBe("");
    expect(sinCampos.segundoNombre).toBeNull();
    expect(sinCampos.primerApellido).toBe("");
    expect(sinCampos.segundoApellido).toBeNull();
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

  describe('cabecera, tabla, filtros y paginación en el cliente', () => {
    const el = () => fixture.nativeElement as HTMLElement;
    const filas = () => Array.from(el().querySelectorAll('tbody tr'));

    function cargar(): void {
      fixture.detectChanges();
      satisfyInitRequests();
      fixture.detectChanges();
    }

    it('muestra un único botón primario "Registrar decano" y el contador, sin menú ni carga masiva (DEC-074)', () => {
      cargar();
      const cab = el().querySelector('[data-testid="acciones-encabezado"]') as HTMLElement;
      expect(cab.querySelectorAll('button')).toHaveSize(1);
      expect(cab.textContent).toContain('Registrar decano');
      expect(cab.textContent).not.toContain('Nombrar');
      expect(cab.querySelector('[data-testid="contador-decanos"]')!.textContent!.trim()).toBe('2 Decanos');
      expect(el().querySelector('[data-testid="action-menu-trigger"]')).toBeNull();
      expect(el().querySelector('[data-testid="accion-carga-masiva"]')).toBeNull();
    });

    it('"Registrar decano" abre el formulario de registro', () => {
      cargar();
      (el().querySelector('[data-testid="accion-registrar-decano"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(component.vistaActual()).toBe('REGISTRO');
    });

    it('la lista es una tabla con Decano, Documento, Facultad, Estado y Acciones', () => {
      cargar();
      const cols = Array.from(el().querySelectorAll('thead th')).map((t) => t.textContent!.trim());
      expect(cols).toEqual(['Decano', 'Documento', 'Facultad', 'Estado', 'Acciones']);
      expect(filas()).toHaveSize(2);
      expect(el().querySelector('app-card')).toBeNull();
      const primera = filas()[0].textContent!;
      expect(primera).toContain('Roberto Carlos Gómez Pérez');
      expect(primera).toContain('rgomez@uco.edu.co');
      expect(primera).toContain('1017000001');
      expect(primera).toContain('Facultad de Ingeniería');
      expect(primera).toContain('Activo');
    });

    it('cada fila ofrece Desactivar o Reactivar según el estado, y Corregir datos', () => {
      cargar();
      const acciones = (i: number) => Array.from(filas()[i].querySelectorAll('button')).map((b) => b.textContent!.trim());
      expect(acciones(0)).toEqual(['Desactivar', 'Corregir datos']);
      expect(acciones(1)).toEqual(['Reactivar', 'Corregir datos']);
    });

    it('los botones de la fila alternan el estado y abren la corrección de identidad', () => {
      cargar();
      (filas()[0].querySelector('[data-accion="alternar-estado"]') as HTMLButtonElement).click();
      const req = http.expectOne(`${environment.apiUrl}/admin/decanos/dec-1/toggle`);
      req.flush({ exitoso: true, datos: { ...mockDecanos[0], estado: 'INACTIVO', estaActivoDecano: false } });
      (filas()[1].querySelector('[data-accion="corregir-identidad"]') as HTMLButtonElement).click();
      expect(component.decanoACorregir()?.id).toBe('dec-2');
    });

    it('los filtros (búsqueda y estado) están plegados y actualizan la tabla y el contador', () => {
      cargar();
      expect(el().querySelector('app-filtros-plegables')).toBeTruthy();
      const buscador = el().querySelector('input[type="search"]') as HTMLInputElement;
      buscador.value = 'zapata';
      buscador.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(filas()).toHaveSize(1);
      expect(filas()[0].textContent).toContain('María Zapata');
      expect(el().querySelector('[data-testid="contador-decanos"]')!.textContent).toContain('1 Decanos');

      component.onBusqueda('');
      component.onEstado('ACTIVO');
      fixture.detectChanges();
      expect(filas()).toHaveSize(1);
      expect(filas()[0].textContent).toContain('Roberto');
      expect(component.filtrosActivos()).toBe(1);
    });

    it('sin coincidencias muestra el mensaje de lista vacía', () => {
      cargar();
      component.onBusqueda('nadie-con-ese-nombre');
      fixture.detectChanges();
      expect(filas()).toHaveSize(0);
      expect(el().textContent).toContain('No hay decanos que coincidan con la búsqueda.');
    });

    it('pagina en el cliente: parte la lista, navega y vuelve a la primera página al filtrar o cambiar el tamaño', () => {
      cargar();
      const muchos = Array.from({ length: 12 }, (_, i) => ({
        ...mockDecanos[0],
        id: `dec-${i + 10}`,
        numeroIdentificacion: `20000000${i}`,
        nombreCompleto: `Decano Número ${i + 1}`,
        primerNombre: 'Decano',
        nombres: 'Decano',
        apellidos: `Número ${i + 1}`,
      }));
      component.decanos.set(muchos);
      fixture.detectChanges();
      expect(filas()).toHaveSize(10);
      expect(component.totalPaginas()).toBe(2);
      expect(el().querySelector('app-pagination')).toBeTruthy();

      component.irAPagina(2);
      fixture.detectChanges();
      expect(filas()).toHaveSize(2);
      expect(filas()[0].textContent).toContain('Decano Número 11');

      component.onBusqueda('Número');
      expect(component.pagina()).toBe(1);
      component.irAPagina(2);
      component.onEstado('TODOS');
      expect(component.pagina()).toBe(1);

      component.cambiarTamano(5);
      fixture.detectChanges();
      expect(component.tamano()).toBe(5);
      expect(component.totalPaginas()).toBe(3);
      expect(filas()).toHaveSize(5);
    });

    it('al recargar una lista más corta la página actual se ajusta al rango', () => {
      cargar();
      component.tamano.set(1);
      component.irAPagina(2);
      component.cargarDecanos();
      http.expectOne(`${environment.apiUrl}/admin/decanos`).flush({ exitoso: true, datos: [mockDecanos[0]] });
      expect(component.pagina()).toBe(1);
    });

    it('un fallo de carga muestra app-error-carga con reintento que vuelve a consultar', () => {
      fixture.detectChanges();
      http.expectOne(`${environment.apiUrl}/tipos-identificacion`).flush(mockTiposDoc);
      http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({ exitoso: true, datos: mockFacultades });
      http.expectOne(`${environment.apiUrl}/admin/instituciones`).flush({ exitoso: true, datos: mockInstituciones });
      http.expectOne(`${environment.apiUrl}/admin/decanos`).flush({ message: 'caído' }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(component.errorCarga()).toBeTruthy();
      expect(toastService.error).toHaveBeenCalled();
      const error = el().querySelector('app-error-carga');
      expect(error).toBeTruthy();
      expect(el().querySelector('table')).toBeNull();

      const reintentar = Array.from(error!.querySelectorAll('button')).find((b) => /reintentar/i.test(b.textContent ?? ''));
      (reintentar as HTMLButtonElement).click();
      http.expectOne(`${environment.apiUrl}/admin/decanos`).flush({ exitoso: true, datos: mockDecanos });
      fixture.detectChanges();
      expect(component.errorCarga()).toBeNull();
      expect(filas()).toHaveSize(2);
    });

    it('mientras carga por primera vez muestra el estado de carga y el contador provisional', () => {
      fixture.detectChanges();
      expect(el().querySelector('[role="status"]')!.textContent).toContain('Cargando decanos');
      expect(el().querySelector('[data-testid="contador-decanos"]')!.textContent).toContain('…');
      satisfyInitRequests();
    });
  });

  describe('registro único: buscar en el directorio o llenar a mano', () => {
    const el = () => fixture.nativeElement as HTMLElement;

    beforeEach(() => {
      fixture.detectChanges();
      satisfyInitRequests();
      component.abrirFormularioRegistro();
      fixture.detectChanges();
    });

    it('el formulario empieza con el paso "Buscar en el directorio" y no hay banner ni "Nombrar Decano Existente"', () => {
      const paso = el().querySelector('[data-testid="paso-directorio"]') as HTMLElement;
      expect(paso.textContent).toContain('Buscar en el directorio');
      expect(el().textContent).not.toContain('Buscar Persona');
      expect(el().textContent).not.toContain('Nombrar Decano Existente');
      (paso.querySelector('button') as HTMLButtonElement).click();
      expect(component.isPickerModalOpen()).toBeTrue();
    });

    it('persona del directorio: precarga sus datos en el formulario y avisa', () => {
      component.abrirModalSeleccionarDecano();
      component.onDecanoSeleccionadoDelDirectorio({
        id: 'usr-n', numeroIdentificacion: '1099887766', primerNombre: 'Esteban', primerApellido: 'López',
        nombres: 'Esteban', apellidos: 'López', nombreCompleto: 'Esteban López', correo: 'esteban.lopez@uco.edu.co', tipoIdentificacion: 'CC',
      });
      expect(component.isPickerModalOpen()).toBeFalse();
      expect(component.vistaActual()).toBe('REGISTRO');
      expect(component.formData.numeroIdentificacion).toBe('1099887766');
      expect(component.formData.correo).toBe('esteban.lopez@uco.edu.co');
      expect(toastService.info).toHaveBeenCalledWith(jasmine.stringContaining('Esteban'));
    });

    it('persona nueva: cierra el buscador, conserva lo escrito y permite llenar a mano', () => {
      component.alCambiarDato({ campo: 'primerNombre', valor: 'Ana' });
      component.abrirModalSeleccionarDecano();
      component.onSolicitarRegistroNuevo();
      expect(component.isPickerModalOpen()).toBeFalse();
      expect(component.vistaActual()).toBe('REGISTRO');
      expect(component.formData.primerNombre).toBe('Ana');
    });

    it('persona que ya es decano: avisa, no precarga y deja el formulario como estaba', () => {
      component.onDecanoSeleccionadoDelDirectorio({
        id: 'usr-1', numeroIdentificacion: '1017000001', nombres: 'Roberto Carlos', apellidos: 'Gómez Pérez',
        nombreCompleto: 'Roberto Carlos Gómez Pérez', correo: 'rgomez@uco.edu.co',
      });
      expect(toastService.info).toHaveBeenCalledWith('El profesional Roberto Carlos Gómez Pérez ya está nombrado como Decano.');
      expect(component.formData.numeroIdentificacion).toBe('');
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

    it('vincular lista solo las facultades activas y sin decano; si no queda ninguna lo indica', () => {
      const el = fixture.nativeElement as HTMLElement;
      component.facultades.set([{ id: 'fac-1', nombre: 'Facultad de Ingeniería' }]);
      component.modoFacultad.set('VINCULAR');
      fixture.detectChanges();
      const opciones = Array.from(el.querySelectorAll('select[name="facultadExistente"] option')).map((o) => o.textContent?.trim());
      expect(opciones).toEqual(['-- Selecciona una facultad --', 'Facultad de Ingeniería']);
      expect(el.querySelector('[data-testid="sin-facultades-libres"]')).toBeNull();

      component.facultades.set([]);
      fixture.detectChanges();
      expect(el.querySelector('select[name="facultadExistente"] option')?.textContent).toContain('No hay facultades disponibles');
      expect(el.querySelector('[data-testid="sin-facultades-libres"]')?.textContent).toContain('No hay facultades libres');

      component.errorFacultades.set(true);
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="sin-facultades-libres"]')?.textContent).toContain('No se pudo cargar');
    });

    it('cargarFacultades descarta las facultades con decano o inactivas y lee nombreFacultad del backend', () => {
      component.cargarFacultades();
      http.expectOne(`${environment.apiUrl}/admin/facultades`).flush({
        exitoso: true,
        datos: [
          { id: 'f-1', nombreFacultad: 'Libre', estaActivaFacultad: true },
          { id: 'f-2', nombreFacultad: 'Con decano', idDecano: 'd-1', estaActivaFacultad: true },
          { id: 'f-3', nombreFacultad: 'Inactiva', estaActivaFacultad: false },
        ],
      });
      expect(component.facultades()).toEqual([{ id: 'f-1', nombre: 'Libre' }]);
      component.cargarFacultades();
      http.expectOne(`${environment.apiUrl}/admin/facultades`).flush('x', { status: 500, statusText: 'Error' });
      expect(component.facultades()).toEqual([]);
      expect(component.errorFacultades()).toBeTrue();
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
